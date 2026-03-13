import { randomUUID } from 'node:crypto'

import type { PostgrestError } from '@supabase/supabase-js'
import type { BucketType } from '@supabase/storage-js'

import {
  DEFAULT_FAQ_ITEMS,
  DEFAULT_PROGRAM_ITEMS,
  ENV,
  GALLERY_STORAGE_HARD_LIMIT_BYTES,
  GALLERY_STORAGE_WARNING_BYTES,
  GALLERY_STORAGE_WARNING_PHOTO_COUNT,
  GALLERY_UPLOAD_SIZE_ESTIMATE_MULTIPLIER,
  MENU_CHOICE_LABELS,
} from '@/lib/constants'
import { buildGalleryUploadAssets } from '@/lib/images/gallery-variants'
import { isProgramIconName } from '@/lib/program-icons'
import { getDefaultTableShapeForKind, isSeatingTableShape } from '@/lib/seating-plan'
import { deleteR2Objects, isR2Configured, resolveR2ObjectUrl, uploadR2Object } from '@/lib/storage/r2'
import {
  DEFAULT_WEDDING_FONT_PRESET_ID,
  DEFAULT_WEDDING_TEMPLATE_ID,
  getWeddingFontPreset,
  getWeddingTemplate,
  type WeddingFontPresetId,
  type WeddingTemplateId,
} from '@/lib/wedding-design'
import { normaliseDateInput } from '@/lib/utils/date'
import { normalizeProgramTimeLabel, sortProgramItemsChronologically } from '@/lib/utils/time'
import type { Database, Json } from '@/types/database'
import type {
  AdminSummary,
  BuffetSong,
  ContentImageSection,
  CouplePhoto,
  DressCodeColorHint,
  EditableCouplePhoto,
  EditableFaqItem,
  EditableProgramItem,
  EditableSectionImage,
  EditableVendorProfile,
  FaqItem,
  GalleryCollections,
  GalleryPhoto,
  GalleryStorageSummary,
  GalleryVisibility,
  MusicRequestEntry,
  MusicWishlistData,
  PlanningGuest,
  PlannerWeddingSummary,
  ProgramItem,
  RsvpFormValues,
  RsvpRecord,
  SeatingPlanData,
  SeatingTable,
  SectionImage,
  VendorProfile,
  WeddingConfig,
  WeddingEditorValues,
  WeddingSource,
} from '@/types/wedding'

interface QueryResult<T> {
  data: T | null
  error: PostgrestError | null
}

interface StorageResult<T> {
  data: T | null
  error: Error | null
}

interface SupabaseQuery extends PromiseLike<QueryResult<unknown>> {
  select: (columns: string) => SupabaseQuery
  insert: (values: unknown) => SupabaseQuery
  upsert: (
    values: unknown,
    options?: {
      onConflict?: string
      ignoreDuplicates?: boolean
    },
  ) => SupabaseQuery
  update: (values: unknown) => SupabaseQuery
  delete: () => SupabaseQuery
  eq: (column: string, value: unknown) => SupabaseQuery
  limit: (count: number) => SupabaseQuery
  order: (column: string, options?: { ascending?: boolean }) => SupabaseQuery
  single: () => Promise<QueryResult<Record<string, unknown>>>
  maybeSingle: () => Promise<QueryResult<Record<string, unknown>>>
}

interface DbClient {
  from: (relation: string) => unknown
  storage?: {
    createBucket?: (
      bucket: string,
      options?: {
        public: boolean
        fileSizeLimit?: string | number | null
        allowedMimeTypes?: string[] | null
        type?: BucketType
      },
    ) => Promise<{
      data: { name: string } | null
      error: Error | null
    }>
    from: (bucket: string) => {
      list: (
        path: string,
        options?: { limit?: number; sortBy?: { column: string; order: 'asc' | 'desc' } },
      ) => Promise<StorageResult<Array<{ name: string; id?: string | null; created_at?: string | null }>>>
      download: (path: string) => Promise<StorageResult<Blob>>
      move: (
        fromPath: string,
        toPath: string,
      ) => Promise<StorageResult<unknown>>
      upload: (
        path: string,
        fileBody: ArrayBuffer | Uint8Array,
        options?: { cacheControl?: string; contentType?: string; upsert?: boolean },
      ) => Promise<StorageResult<{ path: string }>>
      remove: (
        paths: string[],
      ) => Promise<StorageResult<Array<{ name: string }>>>
    }
  }
}

function query(client: DbClient, relation: string): SupabaseQuery {
  return client.from(relation) as SupabaseQuery
}
type LegacyWeddingRow = Database['public']['Tables']['hochzeiten']['Row']
type WeddingContentRow = Database['public']['Tables']['wedding_content']['Row']
type AppSettingsRow = Database['public']['Tables']['app_einstellungen']['Row']
type CoupleAccountRow = Database['public']['Tables']['couple_accounts']['Row']
type PlannerAccountRow = Database['public']['Tables']['planner_accounts']['Row']
type PlannerWeddingAccessRow = Database['public']['Tables']['planner_wedding_access']['Row']
type GalleryMediaRow = Database['public']['Tables']['gallery_media']['Row']
type RsvpHouseholdDetailRow = Database['public']['Tables']['rsvp_household_details']['Row']
export const GALLERY_BUCKET = 'hochzeitsfotos'
const APP_SETTINGS_ID = 1
const CONTENT_ASSET_PREFIX = 'content'
const PUBLIC_GALLERY_FOLDER = 'public'
const PRIVATE_GALLERY_FOLDER = 'private'

interface ConfigOverlayRow {
  brautpaar?: string | null
  hochzeitsdatum?: string | null
  rsvp_deadline?: string | null
  fragen?: Json | null
  texte?: Json | null
}

interface LegacyTexts {
  formTitle?: string
  formDesc?: string
  successTitle?: string
  successDesc?: string
  galerieTitle?: string
  galerieDesc?: string
  einladungStory?: string
  einladungOrt?: string
  einladungAdresse?: string
  einladungCover?: string
  tagesablauf?: Array<{
    zeit?: string
    titel?: string
    beschreibung?: string
    icon?: string
  }>
  menuoptionen?: string[]
  faqItems?: Array<{
    question?: string
    answer?: string
  }>
  couplePhotos?: Array<{
    id?: string
    url?: string
    alt?: string
    caption?: string
  }>
  sectionImages?: Array<{
    id?: string
    section?: string
    title?: string
    url?: string
    alt?: string
  }>
}

interface AppSettingsTexts extends LegacyTexts {
  welcomeMessage?: string
  guestCode?: string
  photographerPassword?: string
  dressCodeNote?: string
  dressCodeWomen?: string
  dressCodeMen?: string
  dressCodeExtras?: string
  dressCodeColorHint?: string
  dressCodeColors?: string[]
  templateId?: WeddingTemplateId
  fontPresetId?: WeddingFontPresetId
  musicWishlistEnabled?: boolean
  sharePrivateGalleryWithGuests?: boolean
  vendorProfiles?: Array<{
    id?: string
    name?: string
    role?: string
    websiteUrl?: string | null
    instagramUrl?: string | null
    imageUrl?: string | null
  }>
  billingStatus?: 'paid' | 'unpaid'
  billingProvider?: 'stripe' | 'google_play' | 'legacy'
  billingEmail?: string | null
  billingPaidAt?: string | null
  billingStripeSessionId?: string | null
  billingStripePaymentIntentId?: string | null
  billingGooglePlayPurchaseToken?: string | null
  billingGooglePlayOrderId?: string | null
  billingGooglePlayProductId?: string | null
  billingGooglePlayPackageName?: string | null
  billingGooglePlayAcknowledgedAt?: string | null
  billingExpiresAt?: string | null
  plannerCustomerNumber?: string | null
  planningGuests?: Array<{
    id?: string
    name?: string
    kind?: string
    category?: string
    householdId?: string | null
    groupLabel?: string
    requiresHighChair?: boolean
    notes?: string
  }>
  seatingTables?: Array<{
    id?: string
    name?: string
    kind?: string
    shape?: string
    buffetSongId?: string | null
    seatCount?: number
    seatAssignments?: Array<string | null>
  }>
  publishSeatingPlan?: boolean
  buffetMode?: {
    enabled?: boolean
    songs?: Array<{
      id?: string
      title?: string
      artist?: string | null
      sortOrder?: number
    }>
  } | null
  musicRequests?: Array<{
    id?: string
    title?: string
    artist?: string | null
    requestedBy?: string | null
    createdAt?: string | null
    voterTokens?: string[]
  }>
  probe?: string | null
}

export interface StoredBillingRecord {
  status: 'paid' | 'unpaid'
  provider: 'stripe' | 'google_play' | 'legacy' | null
  email: string | null
  paidAt: string | null
  stripeCheckoutSessionId: string | null
  stripePaymentIntentId: string | null
  googlePlayPurchaseToken: string | null
  googlePlayOrderId: string | null
  googlePlayProductId: string | null
  googlePlayPackageName: string | null
  googlePlayAcknowledgedAt: string | null
  expiresAt: string | null
}

type BillingEntitlementRow = Database['public']['Tables']['billing_entitlements']['Row']

interface StoredMusicRequest {
  id: string
  title: string
  artist: string | null
  requestedBy: string | null
  createdAt: string
  voterTokens: string[]
}

interface StoredRsvpHouseholdDetail {
  rsvpRecordId: string
  smallChildrenCount: number
  highChairCount: number
}

interface DerivedHouseholdDetail {
  rsvpRecordId: string
  smallChildrenCount: number
  highChairCount: number
}

export interface CoupleAccount {
  id: string
  email: string
  passwordHash: string
  weddingSource: WeddingSource
  weddingSourceId: string
}

export interface PlannerAccount {
  id: string
  customerNumber: string
  displayName: string
  email: string
  passwordHash: string
}

function isObject(value: Json | null): value is Record<string, Json | undefined> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function isMissingRelation(error: PostgrestError | null): boolean {
  if (!error) {
    return false
  }

  return (
    error.code === '42P01' ||
    error.message.toLowerCase().includes('relation') ||
    error.message.toLowerCase().includes('could not find the table')
  )
}

function isMissingRelationError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && isMissingRelation(error as PostgrestError))
}

function splitCoupleLabel(label: string | null | undefined): { partner1Name: string; partner2Name: string | null } {
  if (!label) {
    return { partner1Name: 'Euer', partner2Name: 'Brautpaar' }
  }

  const parts = label
    .split(/\s*&\s*|\s+und\s+/i)
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length >= 2) {
    return {
      partner1Name: parts[0] ?? 'Euer',
      partner2Name: parts[1] ?? null,
    }
  }

  return {
    partner1Name: label,
    partner2Name: null,
  }
}

function parseLegacyTexts(row: LegacyWeddingRow): LegacyTexts {
  if (!isObject(row.texte)) {
    return {}
  }

  return row.texte as unknown as LegacyTexts
}

function parseSettingsTexts(row: ConfigOverlayRow | null): AppSettingsTexts {
  if (!row || !isObject(row.texte ?? null)) {
    return {}
  }

  return row.texte as unknown as AppSettingsTexts
}

function parseSettingsQuestions(row: ConfigOverlayRow | null): Record<string, Json | undefined> {
  if (!row || !isObject(row.fragen ?? null)) {
    return {}
  }

  return row.fragen as Record<string, Json | undefined>
}

function normalizeOptionalString(value: string | null | undefined): string | null {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

function normalizeRequiredEmail(value: string): string {
  return value.trim().toLowerCase()
}

function mapCoupleAccount(row: CoupleAccountRow): CoupleAccount {
  return {
    id: row.id,
    email: normalizeRequiredEmail(row.email),
    passwordHash: row.password_hash,
    weddingSource: row.wedding_source,
    weddingSourceId: row.wedding_source_id,
  }
}

function mapPlannerAccount(row: PlannerAccountRow): PlannerAccount {
  return {
    id: row.id,
    customerNumber: row.customer_number,
    displayName: row.display_name,
    email: normalizeRequiredEmail(row.email),
    passwordHash: row.password_hash,
  }
}

function parseStoredBillingRecord(row: ConfigOverlayRow | null): StoredBillingRecord {
  const texts = parseSettingsTexts(row)

  return {
    status: texts.billingStatus === 'paid' ? 'paid' : 'unpaid',
    provider:
      texts.billingProvider === 'stripe' ||
      texts.billingProvider === 'google_play' ||
      texts.billingProvider === 'legacy'
        ? texts.billingProvider
        : texts.billingStatus === 'paid'
          ? 'legacy'
          : null,
    email: normalizeOptionalString(texts.billingEmail)?.toLowerCase() ?? null,
    paidAt: normalizeOptionalString(texts.billingPaidAt),
    stripeCheckoutSessionId: normalizeOptionalString(texts.billingStripeSessionId),
    stripePaymentIntentId: normalizeOptionalString(texts.billingStripePaymentIntentId),
    googlePlayPurchaseToken: normalizeOptionalString(texts.billingGooglePlayPurchaseToken),
    googlePlayOrderId: normalizeOptionalString(texts.billingGooglePlayOrderId),
    googlePlayProductId: normalizeOptionalString(texts.billingGooglePlayProductId),
    googlePlayPackageName: normalizeOptionalString(texts.billingGooglePlayPackageName),
    googlePlayAcknowledgedAt: normalizeOptionalString(texts.billingGooglePlayAcknowledgedAt),
    expiresAt: normalizeOptionalString(texts.billingExpiresAt),
  }
}

function parseBillingEntitlementRecord(row: BillingEntitlementRow): StoredBillingRecord {
  return {
    status: row.status === 'paid' ? 'paid' : 'unpaid',
    provider: row.provider,
    email: normalizeOptionalString(row.email)?.toLowerCase() ?? null,
    paidAt: normalizeOptionalString(row.paid_at),
    stripeCheckoutSessionId: normalizeOptionalString(row.stripe_checkout_session_id),
    stripePaymentIntentId: normalizeOptionalString(row.stripe_payment_intent_id),
    googlePlayPurchaseToken: normalizeOptionalString(row.google_play_purchase_token),
    googlePlayOrderId: normalizeOptionalString(row.google_play_order_id),
    googlePlayProductId: normalizeOptionalString(row.google_play_product_id),
    googlePlayPackageName: normalizeOptionalString(row.google_play_package_name),
    googlePlayAcknowledgedAt: normalizeOptionalString(row.google_play_acknowledged_at),
    expiresAt: normalizeOptionalString(row.expires_at),
  }
}

function buildContentOverlayRow(row: WeddingContentRow | null): ConfigOverlayRow | null {
  if (!row) {
    return null
  }

  return {
    fragen: row.fragen,
    texte: row.texte,
  }
}

function buildLegacyOverlayRow(row: LegacyWeddingRow | null): ConfigOverlayRow | null {
  if (!row) {
    return null
  }

  return {
    brautpaar: row.brautpaar_name,
    hochzeitsdatum: row.hochzeitsdatum,
    rsvp_deadline: row.rsvp_deadline,
    fragen: row.fragen,
    texte: row.texte,
  }
}

function mergeOverlayRows(
  primary: ConfigOverlayRow | null,
  fallback: ConfigOverlayRow | null,
): ConfigOverlayRow | null {
  if (!primary && !fallback) {
    return null
  }

  const primaryTexts = parseSettingsTexts(primary)
  const fallbackTexts = parseSettingsTexts(fallback)
  const primaryQuestions = parseSettingsQuestions(primary)
  const fallbackQuestions = parseSettingsQuestions(fallback)

  return {
    brautpaar: primary?.brautpaar ?? fallback?.brautpaar ?? null,
    hochzeitsdatum: primary?.hochzeitsdatum ?? fallback?.hochzeitsdatum ?? null,
    rsvp_deadline: primary?.rsvp_deadline ?? fallback?.rsvp_deadline ?? null,
    fragen:
      Object.keys({ ...fallbackQuestions, ...primaryQuestions }).length > 0
        ? { ...fallbackQuestions, ...primaryQuestions }
        : null,
    texte:
      Object.keys({ ...fallbackTexts, ...primaryTexts }).length > 0
        ? { ...fallbackTexts, ...primaryTexts }
        : null,
  }
}

function buildWeddingContentPayload(
  configId: string,
  input: {
    fragen?: Json | null
    texte?: Json | null
  },
): Database['public']['Tables']['wedding_content']['Insert'] {
  return {
    config_id: configId,
    fragen: input.fragen ?? null,
    texte: input.texte ?? null,
  }
}

function toStoragePath(path: string): string {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

function buildGalleryPublicUrl(path: string): string {
  return `${ENV.supabaseUrl}/storage/v1/object/public/${GALLERY_BUCKET}/${toStoragePath(path)}`
}

function isGalleryMediaSupported(config: WeddingConfig): config is WeddingConfig & {
  source: WeddingSource
  sourceId: string
} {
  return config.source !== 'fallback' && Boolean(config.sourceId)
}

function mapLegacyGalleryPhoto(
  filePath: string,
  fileName: string,
  createdAt: string | null,
  visibility: GalleryVisibility,
): GalleryPhoto {
  return {
    name: fileName,
    path: filePath,
    publicUrl: buildGalleryPublicUrl(filePath),
    previewUrl: buildGalleryPublicUrl(filePath),
    createdAt,
    visibility,
    storageProvider: 'supabase',
    originalPath: filePath,
  }
}

async function mapGalleryMediaRowToPhoto(row: GalleryMediaRow): Promise<GalleryPhoto> {
  if (row.storage_provider === 'r2') {
    const lightboxKey = row.lightbox_key ?? row.preview_key ?? row.original_key
    const previewKey = row.preview_key ?? row.lightbox_key ?? row.original_key

    return {
      name: row.file_name,
      path: row.original_key,
      publicUrl: await resolveR2ObjectUrl(lightboxKey, {
        usePublicUrl: row.visibility === 'public',
      }),
      previewUrl: await resolveR2ObjectUrl(previewKey, {
        usePublicUrl: row.visibility === 'public',
      }),
      createdAt: row.created_at,
      visibility: row.visibility,
      storageProvider: 'r2',
      originalPath: row.original_key,
    }
  }

  return mapLegacyGalleryPhoto(
    row.original_key,
    row.file_name,
    row.created_at,
    row.visibility,
  )
}

function isMissingBucketError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const message = 'message' in error ? String(error.message).toLowerCase() : ''
  return message.includes('bucket not found')
}

function isExistingBucketError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const message = 'message' in error ? String(error.message).toLowerCase() : ''
  return message.includes('already exists') || message.includes('duplicate')
}

async function ensureGalleryBucket(supabase: DbClient): Promise<boolean> {
  if (!supabase.storage?.createBucket) {
    return false
  }

  const { error } = await supabase.storage.createBucket(GALLERY_BUCKET, {
    public: true,
  })

  return !error || isExistingBucketError(error)
}

function sanitizeGalleryFileName(fileName: string): string {
  const normalized = fileName.normalize('NFKD').replace(/[^\w.\-]+/g, '-')
  return normalized.replace(/-+/g, '-').replace(/^-|-$/g, '') || 'foto'
}

function getGalleryVisibilityForPath(
  config: WeddingConfig,
  path: string,
): GalleryVisibility | null {
  if (!config.sourceId || !path.startsWith(`${config.sourceId}/`)) {
    return null
  }

  if (path.startsWith(`${config.sourceId}/${PRIVATE_GALLERY_FOLDER}/`)) {
    return 'private'
  }

  if (
    path.startsWith(`${config.sourceId}/${PUBLIC_GALLERY_FOLDER}/`) ||
    path.split('/').length === 2
  ) {
    return 'public'
  }

  return null
}

function buildGalleryTargetPath(
  config: WeddingConfig,
  fileName: string,
  visibility: GalleryVisibility,
): string {
  const targetFolder =
    visibility === 'private' ? PRIVATE_GALLERY_FOLDER : PUBLIC_GALLERY_FOLDER

  return `${config.sourceId}/${targetFolder}/${fileName}`
}

function isStoragePathConflictError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const message = 'message' in error ? String(error.message).toLowerCase() : ''
  return message.includes('already exists') || message.includes('duplicate')
}

function mapEditableProgramItems(items: ProgramItem[]): EditableProgramItem[] {
  return sortProgramItemsChronologically(items).map((item) => ({
    id: item.id,
    timeLabel: normalizeProgramTimeLabel(item.timeLabel),
    title: item.title,
    description: item.description ?? '',
    icon: isProgramIconName(item.icon) ? item.icon : '',
  }))
}

function mapEditableFaqItems(items: FaqItem[]): EditableFaqItem[] {
  return items.map((item) => ({
    id: item.id,
    question: item.question,
    answer: item.answer,
  }))
}

function mapEditableCouplePhotos(items: CouplePhoto[]): EditableCouplePhoto[] {
  return items.map((item) => ({
    id: item.id,
    imageUrl: item.imageUrl,
    altText: item.altText ?? '',
    caption: item.caption ?? '',
  }))
}

function mapEditableSectionImages(items: SectionImage[]): EditableSectionImage[] {
  return items.map((item) => ({
    id: item.id,
    section: item.section,
    title: item.title ?? '',
    imageUrl: item.imageUrl,
    altText: item.altText ?? '',
  }))
}

function mapEditableVendorProfiles(items: VendorProfile[]): EditableVendorProfile[] {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    role: item.role,
    websiteUrl: item.websiteUrl ?? '',
    instagramUrl: item.instagramUrl ?? '',
    imageUrl: item.imageUrl ?? '',
  }))
}

function getDefaultDressCodeColors(): string[] {
  return ['pearl', 'champagner', 'sage', 'dusty-rose', 'navy']
}

const VALID_COLOR_HINTS = new Set<DressCodeColorHint>(['soft', 'moderate', 'strong'])

function getNormalizedColorHint(value: string | null | undefined): DressCodeColorHint {
  return VALID_COLOR_HINTS.has(value as DressCodeColorHint) ? (value as DressCodeColorHint) : 'soft'
}

function getNormalizedTemplateId(value: string | null | undefined): WeddingTemplateId {
  return getWeddingTemplate(value).id as WeddingTemplateId
}

function getNormalizedFontPresetId(value: string | null | undefined): WeddingFontPresetId {
  return getWeddingFontPreset(value).id as WeddingFontPresetId
}

function isContentImageSection(value: string | null | undefined): value is ContentImageSection {
  return (
    value === 'programm' ||
    value === 'anfahrt' ||
    value === 'dresscode' ||
    value === 'galerie' ||
    value === 'rsvp' ||
    value === 'faq'
  )
}

function parseCouplePhotos(texts: AppSettingsTexts): CouplePhoto[] {
  const items = texts.couplePhotos

  if (!Array.isArray(items)) {
    return []
  }

  return items
    .map((item, index) => ({
      id: item.id?.trim() || `couple-photo-${index + 1}`,
      imageUrl: item.url?.trim() ?? '',
      altText: item.alt?.trim() || null,
      caption: item.caption?.trim() || null,
    }))
    .filter((item) => item.imageUrl)
}

function parseSectionImages(texts: AppSettingsTexts): SectionImage[] {
  const items = texts.sectionImages

  if (!Array.isArray(items)) {
    return []
  }

  return items
    .map((item, index) => ({
      id: item.id?.trim() || `section-image-${index + 1}`,
      section: item.section?.trim(),
      title: item.title?.trim() || null,
      imageUrl: item.url?.trim() ?? '',
      altText: item.alt?.trim() || null,
    }))
    .filter(
      (item): item is {
        id: string
        section: ContentImageSection
        title: string | null
        imageUrl: string
        altText: string | null
      } => Boolean(item.imageUrl) && isContentImageSection(item.section),
    )
}

function parseVendorProfiles(texts: AppSettingsTexts): VendorProfile[] {
  const items = texts.vendorProfiles

  if (!Array.isArray(items)) {
    return []
  }

  return items
    .map((item, index) => ({
      id: item.id?.trim() || `vendor-profile-${index + 1}`,
      name: item.name?.trim() ?? '',
      role: item.role?.trim() ?? '',
      websiteUrl: normalizeOptionalString(item.websiteUrl),
      instagramUrl: normalizeOptionalString(item.instagramUrl),
      imageUrl: normalizeOptionalString(item.imageUrl),
    }))
    .filter((item) => item.name && item.role)
}

function isGuestCategory(
  value: string | null | undefined,
): value is PlanningGuest['category'] {
  return (
    value === 'family' ||
    value === 'close_friends' ||
    value === 'friends' ||
    value === 'work' ||
    value === 'single' ||
    value === 'bridal_party' ||
    value === 'children' ||
    value === 'vendors' ||
    value === 'other'
  )
}

function isPlanningGuestKind(
  value: string | null | undefined,
): value is PlanningGuest['kind'] {
  return value === 'adult' || value === 'child'
}

function isSeatingTableKind(value: string | null | undefined): value is SeatingTable['kind'] {
  return value === 'guest' || value === 'child' || value === 'service' || value === 'couple'
}

function parsePlanningGuests(texts: AppSettingsTexts): PlanningGuest[] {
  const items = texts.planningGuests

  if (!Array.isArray(items)) {
    return []
  }

  return items
    .map((item, index) => ({
      id: item.id?.trim() || `planning-guest-${index + 1}`,
      name: item.name?.trim() ?? '',
      kind: isPlanningGuestKind(item.kind) ? item.kind : 'adult',
      category: isGuestCategory(item.category) ? item.category : 'other',
      householdId: item.householdId?.trim() || null,
      groupLabel: item.groupLabel?.trim() || null,
      requiresHighChair: item.requiresHighChair === true,
      notes: item.notes?.trim() || null,
    }))
    .filter((item) => item.name)
}

function parseBuffetSongs(texts: AppSettingsTexts): BuffetSong[] {
  const items = texts.buffetMode?.songs

  if (!Array.isArray(items)) {
    return []
  }

  return items
    .map((item, index) => ({
      id: item.id?.trim() || `buffet-song-${index + 1}`,
      title: item.title?.trim() ?? '',
      artist: item.artist?.trim() || null,
      sortOrder:
        typeof item.sortOrder === 'number' && Number.isFinite(item.sortOrder)
          ? Math.max(0, Math.round(item.sortOrder))
          : index + 1,
    }))
    .filter((item) => item.title)
    .sort((left, right) => {
      const orderDelta = left.sortOrder - right.sortOrder
      if (orderDelta !== 0) {
        return orderDelta
      }

      return left.title.localeCompare(right.title, 'de')
    })
}

function parseSeatingTables(texts: AppSettingsTexts): SeatingTable[] {
  const items = texts.seatingTables

  if (!Array.isArray(items)) {
    return []
  }

  return items
    .map((item, index) => {
      const seatCount =
        typeof item.seatCount === 'number' && Number.isFinite(item.seatCount)
          ? Math.min(24, Math.max(1, Math.round(item.seatCount)))
          : 8
      const tableKind =
        isSeatingTableKind((item as { kind?: string }).kind)
          ? (item as { kind?: SeatingTable['kind'] }).kind ?? 'guest'
          : 'guest'
      const assignments = Array.isArray(item.seatAssignments)
        ? item.seatAssignments.slice(0, seatCount).map((entry) => (typeof entry === 'string' ? entry : null))
        : []

      while (assignments.length < seatCount) {
        assignments.push(null)
      }

      return {
        id: item.id?.trim() || `seating-table-${index + 1}`,
        name: item.name?.trim() || `Tisch ${index + 1}`,
        kind: tableKind,
        shape: isSeatingTableShape((item as { shape?: string }).shape)
          ? (item as { shape?: SeatingTable['shape'] }).shape ?? getDefaultTableShapeForKind(tableKind)
          : getDefaultTableShapeForKind(tableKind),
        buffetSongId: normalizeOptionalString(item.buffetSongId) ?? null,
        seatCount,
        seatAssignments: assignments,
      }
    })
    .filter((item) => item.name)
}

function parseStoredMusicRequests(texts: AppSettingsTexts): StoredMusicRequest[] {
  const items = texts.musicRequests

  if (!Array.isArray(items)) {
    return []
  }

  return items
    .map((item, index) => ({
      id: item.id?.trim() || `music-request-${index + 1}`,
      title: item.title?.trim() ?? '',
      artist: item.artist?.trim() || null,
      requestedBy: item.requestedBy?.trim() || null,
      createdAt: item.createdAt?.trim() || new Date(Math.max(index, 1) * 1_000).toISOString(),
      voterTokens: Array.isArray(item.voterTokens)
        ? item.voterTokens
            .map((token) => token.trim())
            .filter(Boolean)
        : [],
    }))
    .filter((item) => item.title)
}

function sortStoredMusicRequests(entries: StoredMusicRequest[]): StoredMusicRequest[] {
  return entries
    .slice()
    .sort((left, right) => {
      const voteDelta = right.voterTokens.length - left.voterTokens.length
      if (voteDelta !== 0) {
        return voteDelta
      }

      const createdAtDelta =
        new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
      if (createdAtDelta !== 0) {
        return createdAtDelta
      }

      const titleDelta = left.title.localeCompare(right.title, 'de')
      if (titleDelta !== 0) {
        return titleDelta
      }

      return left.id.localeCompare(right.id, 'de')
    })
}

function mapMusicWishlistData(
  texts: AppSettingsTexts,
  visitorToken?: string | null,
): MusicWishlistData {
  const storedRequests = sortStoredMusicRequests(parseStoredMusicRequests(texts))
  const requests: MusicRequestEntry[] = storedRequests.map((entry, index) => ({
    id: entry.id,
    title: entry.title,
    artist: entry.artist,
    requestedBy: entry.requestedBy,
    votes: entry.voterTokens.length,
    createdAt: entry.createdAt,
    hasVoted: visitorToken ? entry.voterTokens.includes(visitorToken) : false,
    isTopTen: index < 10,
    rank: index + 1,
  }))

  return {
    enabled: texts.musicWishlistEnabled === true,
    requests,
  }
}

function createFallbackConfig(): WeddingConfig {
  return {
    id: 'fallback-config',
    source: 'fallback',
    sourceId: null,
    partner1Name: 'Euer',
    partner2Name: 'Brautpaar',
    coupleLabel: 'Euer Brautpaar',
    guestCode: null,
    plannerCustomerNumber: null,
    photoPassword: null,
    weddingDate: ENV.weddingDate,
    venueName: 'Unsere Hochzeitslocation',
    venueAddress: 'Adresse folgt in Kürze',
    venueMapsUrl: null,
    welcomeMessage:
      'Bitte gebt uns kurz Bescheid, ob ihr dabei sein könnt. Wir freuen uns schon sehr auf euch.',
    formTitle: null,
    formDescription: null,
    successTitle: null,
    successDescription: null,
    invitationStory: null,
    galleryTitle: null,
    galleryDescription: null,
    dressCode: 'Festlich und entspannt. Orientiert euch gern an unserer Farbwelt.',
    dressCodeWomen: null,
    dressCodeMen: null,
    dressCodeExtras: null,
    dressCodeColorHint: 'soft',
    dressCodeColors: getDefaultDressCodeColors(),
    templateId: DEFAULT_WEDDING_TEMPLATE_ID,
    fontPresetId: DEFAULT_WEDDING_FONT_PRESET_ID,
    musicWishlistEnabled: false,
    sharePrivateGalleryWithGuests: false,
    rsvpDeadline: ENV.rsvpDeadline,
    heroImageUrl: null,
    couplePhotos: [],
    sectionImages: [],
    vendorProfiles: [],
    menuOptions: ['meat', 'fish', 'vegetarian', 'vegan'],
    isActive: true,
  }
}

function mapModernConfig(row: Database['public']['Tables']['wedding_config']['Row']): WeddingConfig {
  return {
    id: row.id,
    source: 'modern',
    sourceId: row.id,
    partner1Name: row.partner_1_name,
    partner2Name: row.partner_2_name,
    coupleLabel: [row.partner_1_name, row.partner_2_name].filter(Boolean).join(' & '),
    guestCode: null,
    plannerCustomerNumber: null,
    photoPassword: null,
    weddingDate: row.wedding_date,
    venueName: row.venue_name ?? 'Unsere Hochzeitslocation',
    venueAddress: row.venue_address ?? 'Adresse folgt in Kürze',
    venueMapsUrl: row.venue_maps_url,
    welcomeMessage:
      row.welcome_message ??
      'Bitte gebt uns kurz Bescheid, ob ihr dabei sein könnt. Wir freuen uns auf euch.',
    formTitle: null,
    formDescription: null,
    successTitle: null,
    successDescription: null,
    invitationStory: null,
    galleryTitle: null,
    galleryDescription: null,
    dressCode: row.dress_code,
    dressCodeWomen: null,
    dressCodeMen: null,
    dressCodeExtras: null,
    dressCodeColorHint: 'soft',
    dressCodeColors: getDefaultDressCodeColors(),
    templateId: DEFAULT_WEDDING_TEMPLATE_ID,
    fontPresetId: DEFAULT_WEDDING_FONT_PRESET_ID,
    musicWishlistEnabled: false,
    sharePrivateGalleryWithGuests: false,
    rsvpDeadline: row.rsvp_deadline,
    heroImageUrl: null,
    couplePhotos: [],
    sectionImages: [],
    vendorProfiles: [],
    menuOptions: ['meat', 'fish', 'vegetarian', 'vegan'],
    isActive: row.is_active,
  }
}

function mapLegacyConfig(row: LegacyWeddingRow): WeddingConfig {
  const texts = parseLegacyTexts(row)
  const appTexts = texts as AppSettingsTexts
  const couple = splitCoupleLabel(row.brautpaar_name)
  const dressCodeColors =
    Array.isArray(appTexts.dressCodeColors) && appTexts.dressCodeColors?.length
      ? (appTexts.dressCodeColors ?? []).filter(Boolean)
      : getDefaultDressCodeColors()

  return {
    id: row.id,
    source: 'legacy',
    sourceId: row.id,
    partner1Name: couple.partner1Name,
    partner2Name: couple.partner2Name,
    coupleLabel:
      row.brautpaar_name ?? [couple.partner1Name, couple.partner2Name].filter(Boolean).join(' & '),
    guestCode: row.gastcode,
    plannerCustomerNumber: normalizeOptionalString(appTexts.plannerCustomerNumber),
    photoPassword: row.foto_passwort,
    weddingDate: normaliseDateInput(row.hochzeitsdatum) ?? ENV.weddingDate,
    venueName: texts.einladungOrt ?? 'Unsere Hochzeitslocation',
    venueAddress: texts.einladungAdresse ?? 'Adresse folgt in Kürze',
    venueMapsUrl: null,
    welcomeMessage:
      texts.formDesc ??
      texts.einladungStory ??
      'Bitte gebt uns kurz Bescheid, ob ihr dabei sein könnt. Wir freuen uns schon sehr auf euch.',
    formTitle: texts.formTitle ?? null,
    formDescription: texts.formDesc ?? null,
    successTitle: texts.successTitle ?? null,
    successDescription: texts.successDesc ?? null,
    invitationStory: texts.einladungStory ?? null,
    galleryTitle: texts.galerieTitle ?? null,
    galleryDescription: texts.galerieDesc ?? null,
    dressCode: appTexts.dressCodeNote ?? null,
    dressCodeWomen: appTexts.dressCodeWomen ?? null,
    dressCodeMen: appTexts.dressCodeMen ?? null,
    dressCodeExtras: appTexts.dressCodeExtras ?? null,
    dressCodeColorHint: getNormalizedColorHint(appTexts.dressCodeColorHint),
    dressCodeColors,
    templateId: getNormalizedTemplateId(appTexts.templateId),
    fontPresetId: getNormalizedFontPresetId(appTexts.fontPresetId),
    musicWishlistEnabled: appTexts.musicWishlistEnabled === true,
    sharePrivateGalleryWithGuests: appTexts.sharePrivateGalleryWithGuests === true,
    rsvpDeadline: normaliseDateInput(row.rsvp_deadline) ?? ENV.rsvpDeadline,
    heroImageUrl: texts.einladungCover ?? null,
    couplePhotos: parseCouplePhotos(appTexts),
    sectionImages: parseSectionImages(appTexts),
    vendorProfiles: parseVendorProfiles(appTexts),
    menuOptions: texts.menuoptionen?.filter(Boolean) ?? ['meat', 'fish', 'vegetarian', 'vegan'],
    isActive: true,
  }
}

async function getAppSettingsRow(supabase: DbClient): Promise<AppSettingsRow | null> {
  const { data: rowsRaw, error } = (await query(supabase, 'app_einstellungen')
    .select('*')
    .eq('id', APP_SETTINGS_ID)
    .limit(1)) as QueryResult<Database['public']['Tables']['app_einstellungen']['Row'][]>
  const rows = rowsRaw ?? []

  if (rows.length) {
    const row = rows[0]
    if (row) {
      return row
    }
  }

  if (error && !isMissingRelation(error)) {
    throw error
  }

  return null
}

async function getWeddingContentRow(
  supabase: DbClient,
  configId: string,
): Promise<WeddingContentRow | null> {
  const { data: rowsRaw, error } = (await query(supabase, 'wedding_content')
    .select('*')
    .eq('config_id', configId)
    .limit(1)) as QueryResult<Database['public']['Tables']['wedding_content']['Row'][]>
  const rows = rowsRaw ?? []

  if (rows.length) {
    const row = rows[0]
    if (row) {
      return row
    }
  }

  if (error && !isMissingRelation(error)) {
    throw error
  }

  return null
}

async function findModernConfigByGuestCode(
  supabase: DbClient,
  guestCode: string,
): Promise<WeddingConfig | null> {
  const normalizedGuestCode = guestCode.trim().toUpperCase()
  const { data: contentRowsRaw, error: contentError } = (await query(supabase, 'wedding_content')
    .select('*')) as QueryResult<Database['public']['Tables']['wedding_content']['Row'][]>
  const contentRows = contentRowsRaw ?? []

  const matchingContentRow =
    contentRows.find((row) => {
      const guestCodeFromTexts = normalizeOptionalString(parseSettingsTexts(buildContentOverlayRow(row)).guestCode)
      return guestCodeFromTexts?.toUpperCase() === normalizedGuestCode
    }) ?? null

  if (matchingContentRow) {
    const { data: configRowsRaw, error: configError } = (await query(supabase, 'wedding_config')
      .select('*')
      .eq('id', matchingContentRow.config_id)
      .limit(1)) as QueryResult<Database['public']['Tables']['wedding_config']['Row'][]>
    const configRows = configRowsRaw ?? []

    if (configRows.length) {
      const configRow = configRows[0]
      if (configRow) {
        return applyConfigOverlayToConfig(
          mapModernConfig(configRow),
          buildContentOverlayRow(matchingContentRow),
        )
      }
    }

    if (configError && !isMissingRelation(configError)) {
      throw configError
    }
  }

  if (contentError && !isMissingRelation(contentError)) {
    throw contentError
  }

  return null
}

async function getLegacyWeddingRowById(
  supabase: DbClient,
  rowId: string,
): Promise<LegacyWeddingRow | null> {
  const { data: rowsRaw, error } = (await query(supabase, 'hochzeiten')
    .select('*')
    .eq('id', rowId)
    .limit(1)) as QueryResult<Database['public']['Tables']['hochzeiten']['Row'][]>
  const rows = rowsRaw ?? []

  if (rows.length) {
    const row = rows[0]
    if (row) {
      return row
    }
  }

  if (error && !isMissingRelation(error)) {
    throw error
  }

  return null
}

async function getModernWeddingRowById(
  supabase: DbClient,
  rowId: string,
): Promise<Database['public']['Tables']['wedding_config']['Row'] | null> {
  const { data: rowsRaw, error } = (await query(supabase, 'wedding_config')
    .select('*')
    .eq('id', rowId)
    .limit(1)) as QueryResult<Database['public']['Tables']['wedding_config']['Row'][]>
  const rows = rowsRaw ?? []

  if (rows.length) {
    const row = rows[0]
    if (row) {
      return row
    }
  }

  if (error && !isMissingRelation(error)) {
    throw error
  }

  return null
}

export async function getWeddingConfigBySourceRef(
  supabase: DbClient,
  weddingSource: WeddingSource,
  weddingSourceId: string,
): Promise<WeddingConfig | null> {
  if (weddingSource === 'modern') {
    const row = await getModernWeddingRowById(supabase, weddingSourceId)

    if (!row) {
      return null
    }

    const overlayRow = await getConfigOverlayRow(supabase, mapModernConfig(row))
    return applyConfigOverlayToConfig(mapModernConfig(row), overlayRow)
  }

  const row = await getLegacyWeddingRowById(supabase, weddingSourceId)

  if (!row) {
    return null
  }

  const overlayRow = await getConfigOverlayRow(supabase, mapLegacyConfig(row))
  return applyConfigOverlayToConfig(mapLegacyConfig(row), overlayRow)
}

export async function getCoupleAccountByEmail(
  supabase: DbClient,
  email: string,
): Promise<CoupleAccount | null> {
  const normalizedEmail = normalizeRequiredEmail(email)
  const { data: rowsRaw, error } = (await query(supabase, 'couple_accounts')
    .select('*')
    .eq('email', normalizedEmail)
    .limit(1)) as QueryResult<CoupleAccountRow[]>
  const rows = rowsRaw ?? []

  if (rows.length) {
    const row = rows[0]
    if (row) {
      return mapCoupleAccount(row)
    }
  }

  if (error && !isMissingRelation(error)) {
    throw error
  }

  return null
}

export async function getCoupleAccountByWeddingRef(
  supabase: DbClient,
  weddingSource: WeddingSource,
  weddingSourceId: string,
): Promise<CoupleAccount | null> {
  const { data: rowsRaw, error } = (await query(supabase, 'couple_accounts')
    .select('*')
    .eq('wedding_source', weddingSource)
    .eq('wedding_source_id', weddingSourceId)
    .limit(1)) as QueryResult<CoupleAccountRow[]>
  const rows = rowsRaw ?? []

  if (rows.length) {
    const row = rows[0]
    if (row) {
      return mapCoupleAccount(row)
    }
  }

  if (error && !isMissingRelation(error)) {
    throw error
  }

  return null
}

export async function getPlannerAccountByEmail(
  supabase: DbClient,
  email: string,
): Promise<PlannerAccount | null> {
  const normalizedEmail = normalizeRequiredEmail(email)
  const { data: rowsRaw, error } = (await query(supabase, 'planner_accounts')
    .select('*')
    .eq('email', normalizedEmail)
    .limit(1)) as QueryResult<PlannerAccountRow[]>
  const rows = rowsRaw ?? []

  if (rows.length) {
    const row = rows[0]
    if (row) {
      return mapPlannerAccount(row)
    }
  }

  if (error && !isMissingRelation(error)) {
    throw error
  }

  return null
}

export async function getPlannerAccountById(
  supabase: DbClient,
  plannerAccountId: string,
): Promise<PlannerAccount | null> {
  const { data: rowsRaw, error } = (await query(supabase, 'planner_accounts')
    .select('*')
    .eq('id', plannerAccountId)
    .limit(1)) as QueryResult<PlannerAccountRow[]>
  const rows = rowsRaw ?? []

  if (rows.length) {
    const row = rows[0]
    if (row) {
      return mapPlannerAccount(row)
    }
  }

  if (error && !isMissingRelation(error)) {
    throw error
  }

  return null
}

export async function getPlannerAccountByCustomerNumber(
  supabase: DbClient,
  customerNumber: string,
): Promise<PlannerAccount | null> {
  const normalizedCustomerNumber = customerNumber.trim().toUpperCase()
  const { data: rowsRaw, error } = (await query(supabase, 'planner_accounts')
    .select('*')
    .eq('customer_number', normalizedCustomerNumber)
    .limit(1)) as QueryResult<PlannerAccountRow[]>
  const rows = rowsRaw ?? []

  if (rows.length) {
    const row = rows[0]
    if (row) {
      return mapPlannerAccount(row)
    }
  }

  if (error && !isMissingRelation(error)) {
    throw error
  }

  return null
}

async function hasAnyCoupleAccounts(supabase: DbClient): Promise<boolean> {
  const { data: rowsRaw, error } = (await query(supabase, 'couple_accounts')
    .select('*')
    .limit(1)) as QueryResult<CoupleAccountRow[]>
  const rows = rowsRaw ?? []

  if (rows.length) {
    return true
  }

  if (error && !isMissingRelation(error)) {
    throw error
  }

  return false
}

export async function findClaimableWeddingForRegistration(
  supabase: DbClient,
): Promise<WeddingConfig | null> {
  if (await hasAnyCoupleAccounts(supabase)) {
    return null
  }

  const activeConfig = await getActiveWeddingConfig(supabase)

  if (activeConfig.source !== 'fallback' && activeConfig.sourceId) {
    return activeConfig
  }

  return null
}

function slugifyGuestCodeBase(value: string): string {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24)

  return normalized || 'SMARTWEDDING'
}

async function isGuestCodeTaken(supabase: DbClient, guestCode: string): Promise<boolean> {
  const existingConfig = await getWeddingConfigByGuestCode(supabase, guestCode)
  return Boolean(existingConfig)
}

export async function generateUniqueGuestCode(
  supabase: DbClient,
  coupleLabel: string,
): Promise<string> {
  const base = slugifyGuestCodeBase(coupleLabel)

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
    const candidate = `${base}-${suffix}`

    if (!(await isGuestCodeTaken(supabase, candidate))) {
      return candidate
    }
  }

  return `${base}-${Date.now().toString().slice(-6)}`
}

function buildDefaultWeddingDate(): string {
  const date = new Date()
  date.setMonth(date.getMonth() + 12)
  date.setHours(14, 0, 0, 0)
  return date.toISOString()
}

function buildDefaultRsvpDeadline(weddingDate: string): string {
  const date = new Date(weddingDate)
  date.setDate(date.getDate() - 30)
  date.setHours(23, 59, 59, 0)
  return date.toISOString()
}

export async function createWeddingForRegistration(
  supabase: DbClient,
  input: {
    coupleLabel: string
    guestCode: string
  },
): Promise<WeddingConfig> {
  const splitCouple = splitCoupleLabel(input.coupleLabel)
  const weddingDate = buildDefaultWeddingDate()
  const rsvpDeadline = buildDefaultRsvpDeadline(weddingDate)
  const welcomeMessage =
    'Willkommen zu eurer neuen NiiRo-Smart-Wedding-Hochzeit. Ergänzt jetzt Schritt für Schritt eure Details.'
  const guestCode = input.guestCode.toUpperCase()

  const { data: row, error } = (await query(supabase, 'wedding_config')
    .insert({
      partner_1_name: splitCouple.partner1Name,
      partner_2_name: splitCouple.partner2Name,
      wedding_date: weddingDate,
      venue_name: 'Eure Hochzeitslocation',
      venue_address: 'Adresse ergänzt ihr im Paarbereich',
      welcome_message: welcomeMessage,
      rsvp_deadline: rsvpDeadline,
      dress_code: 'Festlich und entspannt. Genaue Hinweise könnt ihr im Paarbereich festlegen.',
      is_active: false,
    })
    .select('*')
    .single()) as QueryResult<Database['public']['Tables']['wedding_config']['Row']>

  if (error && isMissingRelation(error)) {
    const legacyTexts: AppSettingsTexts = {
      welcomeMessage,
      formDesc: welcomeMessage,
      einladungStory: welcomeMessage,
      einladungOrt: 'Eure Hochzeitslocation',
      einladungAdresse: 'Adresse ergänzt ihr im Paarbereich',
      guestCode,
      dressCodeNote: 'Festlich und entspannt. Genaue Hinweise könnt ihr im Paarbereich festlegen.',
      menuoptionen: ['meat', 'fish', 'vegetarian', 'vegan'],
    }
    const legacyQuestions: Record<string, Json> = {
      customQuestions: [],
      disabledQuestions: [],
    }
    const { data: legacyRow, error: legacyError } = (await query(supabase, 'hochzeiten')
      .insert({
        user_id: randomUUID(),
        brautpaar_name: input.coupleLabel,
        gastcode: guestCode,
        hochzeitsdatum: weddingDate,
        rsvp_deadline: rsvpDeadline,
        fragen: legacyQuestions,
        texte: legacyTexts,
      })
      .select('*')
      .single()) as QueryResult<Database['public']['Tables']['hochzeiten']['Row']>

    if (legacyError) {
      throw legacyError
    }

    if (!legacyRow) {
      throw new Error('Die Hochzeit konnte nicht angelegt werden.')
    }

    return mapLegacyConfig(legacyRow)
  }

  if (error) {
    throw error
  }

  if (!row) {
    throw new Error('Die Hochzeit konnte nicht angelegt werden.')
  }

  try {
    await query(supabase, 'wedding_content').upsert(
      buildWeddingContentPayload(row.id, {
        texte: {
          guestCode,
          welcomeMessage,
          probe: undefined,
        },
      }),
    )
  } catch (error) {
    if (!isMissingRelationError(error)) {
      throw error
    }
  }

  return applyConfigOverlayToConfig(mapModernConfig(row), {
    texte: {
      guestCode,
      welcomeMessage,
    },
  })
}

export async function createCoupleAccount(
  supabase: DbClient,
  input: {
    email: string
    passwordHash: string
    weddingSource: WeddingSource
    weddingSourceId: string
  },
): Promise<CoupleAccount> {
  const { data: row, error } = (await query(supabase, 'couple_accounts')
    .insert({
      email: normalizeRequiredEmail(input.email),
      password_hash: input.passwordHash,
      wedding_source: input.weddingSource,
      wedding_source_id: input.weddingSourceId,
    })
    .select('*')
    .single()) as QueryResult<CoupleAccountRow>

  if (error) {
    throw error
  }

  if (!row) {
    throw new Error('Das Brautpaar-Konto konnte nicht angelegt werden.')
  }

  return mapCoupleAccount(row)
}

export async function createPlannerAccount(
  supabase: DbClient,
  input: {
    customerNumber: string
    displayName: string
    email: string
    passwordHash: string
  },
): Promise<PlannerAccount> {
  const { data: row, error } = (await query(supabase, 'planner_accounts')
    .insert({
      customer_number: input.customerNumber.trim().toUpperCase(),
      display_name: input.displayName.trim(),
      email: normalizeRequiredEmail(input.email),
      password_hash: input.passwordHash,
    })
    .select('*')
    .single()) as QueryResult<PlannerAccountRow>

  if (error) {
    throw error
  }

  if (!row) {
    throw new Error('Das Wedding-Planer-Konto konnte nicht angelegt werden.')
  }

  return mapPlannerAccount(row)
}

export async function listPlannerWeddingAccessRows(
  supabase: DbClient,
  plannerAccountId: string,
): Promise<PlannerWeddingAccessRow[]> {
  const { data: rowsRaw, error } = (await query(supabase, 'planner_wedding_access')
    .select('*')
    .eq('planner_account_id', plannerAccountId)) as QueryResult<PlannerWeddingAccessRow[]>
  const rows = rowsRaw ?? []

  if (error && !isMissingRelation(error)) {
    throw error
  }

  return rows
}

export async function linkPlannerAccountToWedding(
  supabase: DbClient,
  input: {
    plannerAccountId: string
    weddingSource: WeddingSource
    weddingSourceId: string
    customerNumber: string | null
  },
): Promise<void> {
  const { error } = await query(supabase, 'planner_wedding_access').upsert({
    planner_account_id: input.plannerAccountId,
    wedding_source: input.weddingSource,
    wedding_source_id: input.weddingSourceId,
    linked_via_customer_number: normalizeOptionalString(input.customerNumber),
  })

  if (error) {
    throw error
  }
}

export async function unlinkPlannerAccessFromWedding(
  supabase: DbClient,
  weddingSource: WeddingSource,
  weddingSourceId: string,
): Promise<void> {
  const { error } = await query(supabase, 'planner_wedding_access')
    .delete()
    .eq('wedding_source', weddingSource)
    .eq('wedding_source_id', weddingSourceId)

  if (error && !isMissingRelation(error)) {
    throw error
  }
}

export async function isPlannerLinkedToWedding(
  supabase: DbClient,
  plannerAccountId: string,
  weddingSource: WeddingSource,
  weddingSourceId: string,
): Promise<boolean> {
  const { data: rowsRaw, error } = (await query(supabase, 'planner_wedding_access')
    .select('*')
    .eq('planner_account_id', plannerAccountId)
    .eq('wedding_source', weddingSource)
    .eq('wedding_source_id', weddingSourceId)
    .limit(1)) as QueryResult<PlannerWeddingAccessRow[]>
  const rows = rowsRaw ?? []

  if (rows.length) {
    return true
  }

  if (error && !isMissingRelation(error)) {
    throw error
  }

  return false
}

export async function getLinkedPlannerForWedding(
  supabase: DbClient,
  weddingSource: WeddingSource,
  weddingSourceId: string,
): Promise<PlannerAccount | null> {
  const { data: accessRowsRaw, error: accessError } = (await query(supabase, 'planner_wedding_access')
    .select('*')
    .eq('wedding_source', weddingSource)
    .eq('wedding_source_id', weddingSourceId)
    .limit(1)) as QueryResult<PlannerWeddingAccessRow[]>
  const accessRows = accessRowsRaw ?? []

  if (accessRows.length) {
    const accessRow = accessRows[0]

    if (!accessRow) {
      return null
    }

    const { data: plannerRowsRaw, error: plannerError } = (await query(supabase, 'planner_accounts')
      .select('*')
      .eq('id', accessRow.planner_account_id)
      .limit(1)) as QueryResult<PlannerAccountRow[]>
    const plannerRows = plannerRowsRaw ?? []

    if (plannerRows.length) {
      const plannerRow = plannerRows[0]
      if (plannerRow) {
        return mapPlannerAccount(plannerRow)
      }
    }

    if (plannerError && !isMissingRelation(plannerError)) {
      throw plannerError
    }
  }

  if (accessError && !isMissingRelation(accessError)) {
    throw accessError
  }

  return null
}

async function listGalleryMediaRows(
  supabase: DbClient,
  config: WeddingConfig,
  visibility?: GalleryVisibility,
): Promise<GalleryMediaRow[]> {
  if (!isGalleryMediaSupported(config)) {
    return []
  }

  let galleryQuery = query(supabase, 'gallery_media')
    .select('*')
    .eq('wedding_source', config.source)
    .eq('wedding_source_id', config.sourceId)
    .order('created_at', { ascending: false }) as SupabaseQuery

  if (visibility) {
    galleryQuery = galleryQuery.eq('visibility', visibility)
  }

  const { data: rowsRaw, error } = (await galleryQuery) as QueryResult<GalleryMediaRow[]>
  const rows = rowsRaw ?? []

  if (error && !isMissingRelation(error)) {
    throw error
  }

  return rows
}

async function getGalleryMediaRowByOriginalKey(
  supabase: DbClient,
  config: WeddingConfig,
  originalKey: string,
): Promise<GalleryMediaRow | null> {
  if (!isGalleryMediaSupported(config)) {
    return null
  }

  const { data: rowsRaw, error } = (await query(supabase, 'gallery_media')
    .select('*')
    .eq('wedding_source', config.source)
    .eq('wedding_source_id', config.sourceId)
    .eq('original_key', originalKey)
    .limit(1)) as QueryResult<GalleryMediaRow[]>
  const rows = rowsRaw ?? []

  if (rows.length) {
    const row = rows[0]
    if (row) {
      return row
    }
  }

  if (error && !isMissingRelation(error)) {
    throw error
  }

  return null
}

async function createGalleryMediaRow(
  supabase: DbClient,
  input: Database['public']['Tables']['gallery_media']['Insert'],
): Promise<GalleryMediaRow> {
  const { data: row, error } = (await query(supabase, 'gallery_media')
    .insert(input)
    .select('*')
    .single()) as QueryResult<GalleryMediaRow>

  if (error) {
    throw error
  }

  if (!row) {
    throw new Error('Der Galerieeintrag konnte nicht gespeichert werden.')
  }

  return row
}

async function updateGalleryMediaVisibility(
  supabase: DbClient,
  galleryMediaId: string,
  visibility: GalleryVisibility,
): Promise<GalleryMediaRow> {
  const { data: row, error } = (await query(supabase, 'gallery_media')
    .update({
      visibility,
      updated_at: new Date().toISOString(),
    })
    .eq('id', galleryMediaId)
    .select('*')
    .single()) as QueryResult<GalleryMediaRow>

  if (error) {
    throw error
  }

  if (!row) {
    throw new Error('Der Galerieeintrag konnte nicht aktualisiert werden.')
  }

  return row
}

async function deleteGalleryMediaRow(
  supabase: DbClient,
  galleryMediaId: string,
): Promise<void> {
  const { error } = await query(supabase, 'gallery_media').delete().eq('id', galleryMediaId)

  if (error && !isMissingRelation(error)) {
    throw error
  }
}

function doesCompatibilityRowMatchConfig(config: WeddingConfig, row: AppSettingsRow | null): boolean {
  if (!row) {
    return false
  }

  const texts = parseSettingsTexts(row)
  const overlayGuestCode = normalizeOptionalString(texts.guestCode)?.toUpperCase()
  const configGuestCode = normalizeOptionalString(config.guestCode)?.toUpperCase()

  if (overlayGuestCode && configGuestCode && overlayGuestCode === configGuestCode) {
    return true
  }

  const overlayCoupleLabel = normalizeOptionalString(row.brautpaar)?.toLowerCase()
  const configCoupleLabel = normalizeOptionalString(config.coupleLabel)?.toLowerCase()

  return Boolean(overlayCoupleLabel && configCoupleLabel && overlayCoupleLabel === configCoupleLabel)
}

async function getCompatibilityAppSettingsRow(
  supabase: DbClient,
  config: WeddingConfig,
): Promise<AppSettingsRow | null> {
  const row = await getAppSettingsRow(supabase)
  return doesCompatibilityRowMatchConfig(config, row) ? row : null
}

async function getConfigOverlayRow(
  supabase: DbClient,
  config: WeddingConfig,
): Promise<ConfigOverlayRow | null> {
  if (config.source === 'modern' && config.sourceId) {
    const [contentRow, compatibilityRow] = await Promise.all([
      getWeddingContentRow(supabase, config.sourceId),
      getCompatibilityAppSettingsRow(supabase, config),
    ])
    const contentOverlay = buildContentOverlayRow(contentRow)
    const mergedOverlay = mergeOverlayRows(contentOverlay, compatibilityRow)

    if (!mergedOverlay) {
      return null
    }

    return {
      brautpaar: contentOverlay?.brautpaar ?? null,
      hochzeitsdatum: contentOverlay?.hochzeitsdatum ?? null,
      rsvp_deadline: contentOverlay?.rsvp_deadline ?? null,
      fragen: mergedOverlay.fragen ?? null,
      texte: mergedOverlay.texte ?? null,
    }
  }

  if (config.source === 'legacy' && config.sourceId) {
    const [legacyRow, compatibilityRow] = await Promise.all([
      getLegacyWeddingRowById(supabase, config.sourceId),
      getCompatibilityAppSettingsRow(supabase, config),
    ])

    return mergeOverlayRows(buildLegacyOverlayRow(legacyRow), compatibilityRow)
  }

  return getCompatibilityAppSettingsRow(supabase, config)
}

async function saveCompatibilityAppSettingsRow(
  supabase: DbClient,
  values: Database['public']['Tables']['app_einstellungen']['Insert'],
): Promise<AppSettingsRow> {
  const { data, error } = (await query(supabase, 'app_einstellungen')
    .upsert(values)
    .select('*')
    .single()) as QueryResult<Database['public']['Tables']['app_einstellungen']['Row']>

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error('Die App-Einstellungen konnten nicht gespeichert werden.')
  }

  return data
}

export async function getStoredBillingRecord(
  supabase: DbClient,
  config: WeddingConfig,
): Promise<StoredBillingRecord> {
  if (config.source !== 'fallback' && config.sourceId) {
    try {
      const { data, error } = (await query(supabase, 'billing_entitlements')
        .select('*')
        .eq('wedding_source', config.source)
        .eq('wedding_source_id', config.sourceId)
        .maybeSingle()) as QueryResult<BillingEntitlementRow>

      if (error) {
        throw error
      }

      if (data) {
        return parseBillingEntitlementRecord(data)
      }
    } catch (error) {
      if (!isMissingRelationError(error)) {
        throw error
      }
    }
  }

  if (config.source === 'modern' && config.sourceId) {
    const contentRow = await getWeddingContentRow(supabase, config.sourceId)

    if (contentRow) {
      return parseStoredBillingRecord(buildContentOverlayRow(contentRow))
    }
  }

  if (config.source === 'legacy' && config.sourceId) {
    const legacyRow = await getLegacyWeddingRowById(supabase, config.sourceId)

    if (legacyRow) {
      return parseStoredBillingRecord(legacyRow)
    }
  }

  return parseStoredBillingRecord(await getCompatibilityAppSettingsRow(supabase, config))
}

export async function saveStoredBillingRecord(
  supabase: DbClient,
  config: WeddingConfig,
  values: StoredBillingRecord,
): Promise<StoredBillingRecord> {
  const applyBillingFields = (existingTexts: AppSettingsTexts): Json => ({
    ...existingTexts,
    billingStatus: values.status,
    billingProvider: values.provider,
    billingEmail: values.email,
    billingPaidAt: values.paidAt,
    billingStripeSessionId: values.stripeCheckoutSessionId,
    billingStripePaymentIntentId: values.stripePaymentIntentId,
    billingGooglePlayPurchaseToken: values.googlePlayPurchaseToken,
    billingGooglePlayOrderId: values.googlePlayOrderId,
    billingGooglePlayProductId: values.googlePlayProductId,
    billingGooglePlayPackageName: values.googlePlayPackageName,
    billingGooglePlayAcknowledgedAt: values.googlePlayAcknowledgedAt,
    billingExpiresAt: values.expiresAt,
    probe: undefined,
  })

  if (config.source !== 'fallback' && config.sourceId) {
    try {
      const { data, error } = (await query(supabase, 'billing_entitlements')
        .upsert(
          {
            wedding_source: config.source,
            wedding_source_id: config.sourceId,
            status: values.status,
            provider: values.provider ?? (values.status === 'paid' ? 'legacy' : 'stripe'),
            email: values.email,
            paid_at: values.paidAt,
            stripe_checkout_session_id: values.stripeCheckoutSessionId,
            stripe_payment_intent_id: values.stripePaymentIntentId,
            google_play_purchase_token: values.googlePlayPurchaseToken,
            google_play_order_id: values.googlePlayOrderId,
            google_play_product_id: values.googlePlayProductId,
            google_play_package_name: values.googlePlayPackageName,
            google_play_acknowledged_at: values.googlePlayAcknowledgedAt,
            expires_at: values.expiresAt,
          },
          { onConflict: 'wedding_source,wedding_source_id' },
        )
        .select('*')
        .single()) as QueryResult<BillingEntitlementRow>

      if (error) {
        throw error
      }

      if (data) {
        values = parseBillingEntitlementRecord(data)
      }
    } catch (error) {
      if (!isMissingRelationError(error)) {
        throw error
      }
    }
  }

  if (config.source === 'modern' && config.sourceId) {
    const currentContentRow = await getWeddingContentRow(supabase, config.sourceId)
    const existingTexts = parseSettingsTexts(buildContentOverlayRow(currentContentRow))

    try {
      const { data, error } = (await query(supabase, 'wedding_content')
        .upsert(
          buildWeddingContentPayload(config.sourceId, {
            fragen: currentContentRow?.fragen ?? null,
            texte: applyBillingFields(existingTexts),
          }),
        )
        .select('*')
        .single()) as QueryResult<Database['public']['Tables']['wedding_content']['Row']>

      if (error) {
        throw error
      }

      return values.provider ? values : parseStoredBillingRecord(buildContentOverlayRow(data))
  } catch (error) {
      if (!isMissingRelationError(error)) {
        throw error
      }
    }
  }

  if (config.source === 'legacy' && config.sourceId) {
    const legacyRow = await getLegacyWeddingRowById(supabase, config.sourceId)

    if (!legacyRow) {
      throw new Error('Die aktive Hochzeit konnte für die Zahlung nicht geladen werden.')
    }

    const existingTexts = parseLegacyTexts(legacyRow) as AppSettingsTexts
    const { data, error } = (await query(supabase, 'hochzeiten')
      .update({
        texte: applyBillingFields(existingTexts),
      })
      .eq('id', config.sourceId)
      .select('*')
      .single()) as QueryResult<Database['public']['Tables']['hochzeiten']['Row']>

    if (error) {
      throw error
    }

    return values.provider ? values : parseStoredBillingRecord(data)
  }

  const compatibilityRow = await getCompatibilityAppSettingsRow(supabase, config)
  const existingTexts = parseSettingsTexts(compatibilityRow)
  const data = await saveCompatibilityAppSettingsRow(supabase, {
    id: APP_SETTINGS_ID,
    brautpaar: compatibilityRow?.brautpaar ?? config.coupleLabel,
    hochzeitsdatum: compatibilityRow?.hochzeitsdatum ?? config.weddingDate,
    rsvp_deadline: compatibilityRow?.rsvp_deadline ?? config.rsvpDeadline,
    fragen: compatibilityRow?.fragen ?? null,
    texte: applyBillingFields(existingTexts),
  })

  return values.provider ? values : parseStoredBillingRecord(data)
}

function buildPlanningTexts(
  existingTexts: AppSettingsTexts,
  values: SeatingPlanData,
): Json {
  return {
    ...existingTexts,
    publishSeatingPlan: values.isPublished,
    buffetMode: {
      enabled: values.buffetMode.enabled,
      songs: values.buffetMode.songs.map((song) => ({
        id: song.id,
        title: song.title,
        artist: song.artist,
        sortOrder: song.sortOrder,
      })),
    },
    planningGuests: values.guests.map((guest) => ({
      id: guest.id,
      name: guest.name,
      kind: guest.kind,
      category: guest.category,
      householdId: guest.householdId,
      groupLabel: guest.groupLabel,
      requiresHighChair: guest.requiresHighChair,
      notes: guest.notes,
    })),
    seatingTables: values.tables.map((table) => ({
      id: table.id,
      name: table.name,
      kind: table.kind,
      shape: table.shape,
      buffetSongId: table.buffetSongId,
      seatCount: table.seatCount,
      seatAssignments: table.seatAssignments,
    })),
    probe: undefined,
  }
}

export async function getSeatingPlanData(
  supabase: DbClient,
  config: WeddingConfig,
): Promise<SeatingPlanData> {
  const row = await getConfigOverlayRow(supabase, config)
  const texts = parseSettingsTexts(row)

  return {
    isPublished: texts.publishSeatingPlan === true,
    buffetMode: {
      enabled: texts.buffetMode?.enabled === true,
      songs: parseBuffetSongs(texts),
    },
    guests: parsePlanningGuests(texts),
    tables: parseSeatingTables(texts),
  }
}

export async function saveSeatingPlanData(
  supabase: DbClient,
  config: WeddingConfig,
  values: SeatingPlanData,
): Promise<SeatingPlanData> {
  const syncHouseholdDetails = async (): Promise<void> => {
    const existingDetails = await listRsvpHouseholdDetailRows(supabase, config)
    const nextDetails = buildDerivedHouseholdDetails(values.guests)
    const nextByRecordId = new Map(nextDetails.map((detail) => [detail.rsvpRecordId, detail]))

    await Promise.all(
      nextDetails.map((detail) =>
        upsertRsvpHouseholdDetail(supabase, config, {
          rsvpRecordId: detail.rsvpRecordId,
          smallChildrenCount: detail.smallChildrenCount,
          highChairCount: detail.highChairCount,
        }),
      ),
    )

    await Promise.all(
      existingDetails
        .filter((detail) => !nextByRecordId.has(detail.rsvp_record_id))
        .map((detail) => deleteRsvpHouseholdDetail(supabase, config, detail.rsvp_record_id)),
    )
  }

  if (config.source === 'modern' && config.sourceId) {
    const currentContentRow = await getWeddingContentRow(supabase, config.sourceId)
    const compatibilityRow = await getCompatibilityAppSettingsRow(supabase, config)
    const existingTexts = {
      ...parseSettingsTexts(compatibilityRow),
      ...parseSettingsTexts(buildContentOverlayRow(currentContentRow)),
    }

    try {
      const { data, error } = (await query(supabase, 'wedding_content')
        .upsert(
          buildWeddingContentPayload(config.sourceId, {
            fragen: currentContentRow?.fragen ?? compatibilityRow?.fragen ?? null,
            texte: buildPlanningTexts(existingTexts, values),
          }),
        )
        .select('*')
        .single()) as QueryResult<Database['public']['Tables']['wedding_content']['Row']>

      if (error) {
        throw error
      }

      const texts = parseSettingsTexts(buildContentOverlayRow(data))
      await syncHouseholdDetails()

      return {
        isPublished: texts.publishSeatingPlan === true,
        buffetMode: {
          enabled: texts.buffetMode?.enabled === true,
          songs: parseBuffetSongs(texts),
        },
        guests: parsePlanningGuests(texts),
        tables: parseSeatingTables(texts),
      }
    } catch (error) {
      if (!isMissingRelationError(error)) {
        throw error
      }
    }
  }

  if (config.source === 'legacy' && config.sourceId) {
    const currentRow = await getLegacyWeddingRowById(supabase, config.sourceId)

    if (!currentRow) {
      throw new Error('Die aktive Hochzeit konnte nicht geladen werden.')
    }

    const compatibilityRow = await getCompatibilityAppSettingsRow(supabase, mapLegacyConfig(currentRow))
    const existingTexts = {
      ...parseSettingsTexts(compatibilityRow),
      ...(parseLegacyTexts(currentRow) as AppSettingsTexts),
    }

    const { data, error } = (await query(supabase, 'hochzeiten')
      .update({
        texte: buildPlanningTexts(existingTexts, values),
      })
      .eq('id', config.sourceId)
      .select('*')
      .single()) as QueryResult<Database['public']['Tables']['hochzeiten']['Row']>

    if (error) {
      throw error
    }

    if (!data) {
      throw new Error('Die Sitzplanung konnte nicht gespeichert werden.')
    }

    const texts = parseLegacyTexts(data) as AppSettingsTexts
    await syncHouseholdDetails()

    return {
      isPublished: texts.publishSeatingPlan === true,
      buffetMode: {
        enabled: texts.buffetMode?.enabled === true,
        songs: parseBuffetSongs(texts),
      },
      guests: parsePlanningGuests(texts),
      tables: parseSeatingTables(texts),
    }
  }

  const compatibilityRow = await getCompatibilityAppSettingsRow(supabase, config)
  const existingTexts = parseSettingsTexts(compatibilityRow)
  const data = await saveCompatibilityAppSettingsRow(supabase, {
    id: APP_SETTINGS_ID,
    brautpaar: compatibilityRow?.brautpaar ?? config.coupleLabel,
    hochzeitsdatum: compatibilityRow?.hochzeitsdatum ?? config.weddingDate,
    rsvp_deadline: compatibilityRow?.rsvp_deadline ?? config.rsvpDeadline,
    fragen: compatibilityRow?.fragen ?? null,
    texte: buildPlanningTexts(existingTexts, values),
  })

  const texts = parseSettingsTexts(data)
  await syncHouseholdDetails()

  return {
    isPublished: texts.publishSeatingPlan === true,
    buffetMode: {
      enabled: texts.buffetMode?.enabled === true,
      songs: parseBuffetSongs(texts),
    },
    guests: parsePlanningGuests(texts),
    tables: parseSeatingTables(texts),
  }
}

export async function savePhotographerPassword(
  supabase: DbClient,
  config: WeddingConfig,
  password: string,
): Promise<void> {
  const trimmedPassword = password.trim() || null

  if (config.source === 'modern' && config.sourceId) {
    const currentContentRow = await getWeddingContentRow(supabase, config.sourceId)
    const compatibilityRow = await getCompatibilityAppSettingsRow(supabase, config)
    const existingTexts = {
      ...parseSettingsTexts(compatibilityRow),
      ...parseSettingsTexts(buildContentOverlayRow(currentContentRow)),
    }

    try {
      const { error } = await query(supabase, 'wedding_content')
        .upsert(
          buildWeddingContentPayload(config.sourceId, {
            fragen: currentContentRow?.fragen ?? compatibilityRow?.fragen ?? null,
            texte: { ...existingTexts, photographerPassword: trimmedPassword, probe: undefined },
          }),
        )
        .select('*')
        .single()

      if (error) {
        throw error
      }

      return
    } catch (error) {
      if (!isMissingRelationError(error)) {
        throw error
      }
    }
  }

  if (config.source === 'legacy' && config.sourceId) {
    const { error } = await query(supabase, 'hochzeiten')
      .update({ foto_passwort: trimmedPassword })
      .eq('id', config.sourceId)

    if (error) {
      throw error
    }

    return
  }

  const compatibilityRow = await getCompatibilityAppSettingsRow(supabase, config)
  const existingTexts = parseSettingsTexts(compatibilityRow)
  await saveCompatibilityAppSettingsRow(supabase, {
    id: APP_SETTINGS_ID,
    brautpaar: compatibilityRow?.brautpaar ?? config.coupleLabel,
    hochzeitsdatum: compatibilityRow?.hochzeitsdatum ?? config.weddingDate,
    rsvp_deadline: compatibilityRow?.rsvp_deadline ?? config.rsvpDeadline,
    fragen: compatibilityRow?.fragen ?? null,
    texte: { ...existingTexts, photographerPassword: trimmedPassword, probe: undefined },
  })
}

export async function savePlannerCustomerNumber(
  supabase: DbClient,
  config: WeddingConfig,
  customerNumber: string,
): Promise<PlannerAccount | null> {
  const normalizedCustomerNumber = normalizeOptionalString(customerNumber)?.toUpperCase() ?? null
  const linkedPlanner = normalizedCustomerNumber
    ? await getPlannerAccountByCustomerNumber(supabase, normalizedCustomerNumber)
    : null

  if (normalizedCustomerNumber && !linkedPlanner) {
    throw new Error('Zu dieser Kundennummer wurde kein Wedding-Planer-Konto gefunden.')
  }

  if (!config.sourceId) {
    throw new Error('Die aktive Hochzeit konnte nicht geladen werden.')
  }

  if (config.source === 'fallback') {
    throw new Error('Die aktive Hochzeit konnte nicht geladen werden.')
  }

  await unlinkPlannerAccessFromWedding(supabase, config.source, config.sourceId)

  if (linkedPlanner) {
    await linkPlannerAccountToWedding(supabase, {
      plannerAccountId: linkedPlanner.id,
      weddingSource: config.source,
      weddingSourceId: config.sourceId,
      customerNumber: normalizedCustomerNumber,
    })
  }

  if (config.source === 'modern' && config.sourceId) {
    const currentContentRow = await getWeddingContentRow(supabase, config.sourceId)
    const compatibilityRow = await getCompatibilityAppSettingsRow(supabase, config)
    const existingTexts = {
      ...parseSettingsTexts(compatibilityRow),
      ...parseSettingsTexts(buildContentOverlayRow(currentContentRow)),
    }

    try {
      const { error } = await query(supabase, 'wedding_content')
        .upsert(
          buildWeddingContentPayload(config.sourceId, {
            fragen: currentContentRow?.fragen ?? compatibilityRow?.fragen ?? null,
            texte: {
              ...existingTexts,
              plannerCustomerNumber: normalizedCustomerNumber,
              probe: undefined,
            },
          }),
        )
        .select('*')
        .single()

      if (error) {
        throw error
      }

      return linkedPlanner
    } catch (error) {
      if (!isMissingRelationError(error)) {
        throw error
      }
    }
  }

  if (config.source === 'legacy' && config.sourceId) {
    const currentRow = await getLegacyWeddingRowById(supabase, config.sourceId)

    if (!currentRow) {
      throw new Error('Die aktive Hochzeit konnte nicht geladen werden.')
    }

    const compatibilityRow = await getCompatibilityAppSettingsRow(supabase, mapLegacyConfig(currentRow))
    const existingTexts = {
      ...parseSettingsTexts(compatibilityRow),
      ...(parseLegacyTexts(currentRow) as AppSettingsTexts),
    }

    const { error } = await query(supabase, 'hochzeiten')
      .update({
        texte: {
          ...existingTexts,
          plannerCustomerNumber: normalizedCustomerNumber,
          probe: undefined,
        },
      })
      .eq('id', config.sourceId)

    if (error) {
      throw error
    }

    return linkedPlanner
  }

  const compatibilityRow = await getCompatibilityAppSettingsRow(supabase, config)
  const existingTexts = parseSettingsTexts(compatibilityRow)
  await saveCompatibilityAppSettingsRow(supabase, {
    id: APP_SETTINGS_ID,
    brautpaar: compatibilityRow?.brautpaar ?? config.coupleLabel,
    hochzeitsdatum: compatibilityRow?.hochzeitsdatum ?? config.weddingDate,
    rsvp_deadline: compatibilityRow?.rsvp_deadline ?? config.rsvpDeadline,
    fragen: compatibilityRow?.fragen ?? null,
    texte: {
      ...existingTexts,
      plannerCustomerNumber: normalizedCustomerNumber,
      probe: undefined,
    },
  })

  return linkedPlanner
}

function buildMusicWishlistTexts(
  existingTexts: AppSettingsTexts,
  input: {
    enabled?: boolean
    requests?: StoredMusicRequest[]
  },
): Json {
  const currentRequests = input.requests ?? parseStoredMusicRequests(existingTexts)

  return {
    ...existingTexts,
    musicWishlistEnabled:
      input.enabled ?? existingTexts.musicWishlistEnabled ?? false,
    musicRequests: currentRequests.map((entry) => ({
      id: entry.id,
      title: entry.title,
      artist: entry.artist,
      requestedBy: entry.requestedBy,
      createdAt: entry.createdAt,
      voterTokens: entry.voterTokens,
    })),
    probe: undefined,
  }
}

async function saveMusicWishlistTexts(
  supabase: DbClient,
  config: WeddingConfig,
  input: {
    enabled?: boolean
    requests?: StoredMusicRequest[]
  },
): Promise<AppSettingsTexts> {
  if (config.source === 'modern' && config.sourceId) {
    const currentContentRow = await getWeddingContentRow(supabase, config.sourceId)
    const compatibilityRow = await getCompatibilityAppSettingsRow(supabase, config)
    const existingTexts = {
      ...parseSettingsTexts(compatibilityRow),
      ...parseSettingsTexts(buildContentOverlayRow(currentContentRow)),
    }

    try {
      const { data, error } = (await query(supabase, 'wedding_content')
        .upsert(
          buildWeddingContentPayload(config.sourceId, {
            fragen: currentContentRow?.fragen ?? compatibilityRow?.fragen ?? null,
            texte: buildMusicWishlistTexts(existingTexts, input),
          }),
        )
        .select('*')
        .single()) as QueryResult<Database['public']['Tables']['wedding_content']['Row']>

      if (error) {
        throw error
      }

      return parseSettingsTexts(buildContentOverlayRow(data))
    } catch (error) {
      if (!isMissingRelationError(error)) {
        throw error
      }
    }
  }

  if (config.source === 'legacy' && config.sourceId) {
    const currentRow = await getLegacyWeddingRowById(supabase, config.sourceId)

    if (!currentRow) {
      throw new Error('Die aktive Hochzeit konnte nicht geladen werden.')
    }

    const compatibilityRow = await getCompatibilityAppSettingsRow(supabase, mapLegacyConfig(currentRow))
    const existingTexts = {
      ...parseSettingsTexts(compatibilityRow),
      ...(parseLegacyTexts(currentRow) as AppSettingsTexts),
    }

    const { data, error } = (await query(supabase, 'hochzeiten')
      .update({
        texte: buildMusicWishlistTexts(existingTexts, input),
      })
      .eq('id', config.sourceId)
      .select('*')
      .single()) as QueryResult<Database['public']['Tables']['hochzeiten']['Row']>

    if (error) {
      throw error
    }

    if (!data) {
      throw new Error('Die Musikwunschliste konnte nicht gespeichert werden.')
    }

    return parseLegacyTexts(data) as AppSettingsTexts
  }

  const compatibilityRow = await getCompatibilityAppSettingsRow(supabase, config)
  const existingTexts = parseSettingsTexts(compatibilityRow)
  const data = await saveCompatibilityAppSettingsRow(supabase, {
    id: APP_SETTINGS_ID,
    brautpaar: compatibilityRow?.brautpaar ?? config.coupleLabel,
    hochzeitsdatum: compatibilityRow?.hochzeitsdatum ?? config.weddingDate,
    rsvp_deadline: compatibilityRow?.rsvp_deadline ?? config.rsvpDeadline,
    fragen: compatibilityRow?.fragen ?? null,
    texte: buildMusicWishlistTexts(existingTexts, input),
  })

  return parseSettingsTexts(data)
}

function createMusicRequestId(): string {
  return `music-request-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export async function getMusicWishlistData(
  supabase: DbClient,
  config: WeddingConfig,
  visitorToken?: string | null,
): Promise<MusicWishlistData> {
  const row = await getConfigOverlayRow(supabase, config)
  const texts = parseSettingsTexts(row)

  return mapMusicWishlistData(texts, visitorToken)
}

export async function addMusicRequest(
  supabase: DbClient,
  config: WeddingConfig,
  input: {
    title: string
    artist?: string | null
    requestedBy?: string | null
  },
  visitorToken?: string | null,
): Promise<MusicWishlistData> {
  if (!config.musicWishlistEnabled) {
    throw new Error('Die Musikwunschliste ist aktuell nicht freigeschaltet.')
  }

  const row = await getConfigOverlayRow(supabase, config)
  const texts = parseSettingsTexts(row)
  const currentRequests = parseStoredMusicRequests(texts)
  const nextTexts = await saveMusicWishlistTexts(supabase, config, {
    requests: [
      ...currentRequests,
      {
        id: createMusicRequestId(),
        title: input.title.trim(),
        artist: input.artist?.trim() || null,
        requestedBy: input.requestedBy?.trim() || null,
        createdAt: new Date().toISOString(),
        voterTokens: [],
      },
    ],
  })

  return mapMusicWishlistData(nextTexts, visitorToken)
}

export async function voteForMusicRequest(
  supabase: DbClient,
  config: WeddingConfig,
  input: {
    requestId: string
    visitorToken: string
  },
): Promise<MusicWishlistData> {
  if (!config.musicWishlistEnabled) {
    throw new Error('Die Musikwunschliste ist aktuell nicht freigeschaltet.')
  }

  const row = await getConfigOverlayRow(supabase, config)
  const texts = parseSettingsTexts(row)
  const currentRequests = parseStoredMusicRequests(texts)
  const hasMatchingRequest = currentRequests.some((entry) => entry.id === input.requestId)

  if (!hasMatchingRequest) {
    throw new Error('Dieser Musikwunsch wurde nicht gefunden.')
  }

  const nextRequests = currentRequests.map((entry) => {
    if (entry.id !== input.requestId || entry.voterTokens.includes(input.visitorToken)) {
      return entry
    }

    return {
      ...entry,
      voterTokens: [...entry.voterTokens, input.visitorToken],
    }
  })

  const nextTexts = await saveMusicWishlistTexts(supabase, config, {
    requests: nextRequests,
  })

  return mapMusicWishlistData(nextTexts, input.visitorToken)
}

function applyConfigOverlayToConfig(baseConfig: WeddingConfig, row: ConfigOverlayRow | null): WeddingConfig {
  if (!row) {
    return baseConfig
  }

  const texts = parseSettingsTexts(row)
  const coupleLabel = row.brautpaar?.trim() || baseConfig.coupleLabel
  const couple = splitCoupleLabel(coupleLabel)
  const dressCodeColors =
    texts.dressCodeColors?.filter(Boolean).length
      ? texts.dressCodeColors.filter(Boolean)
      : baseConfig.dressCodeColors.length
        ? baseConfig.dressCodeColors
        : getDefaultDressCodeColors()
  const hasCouplePhotos = Array.isArray(texts.couplePhotos)
  const hasSectionImages = Array.isArray(texts.sectionImages)
  const hasVendorProfiles = Array.isArray(texts.vendorProfiles)

  return {
    ...baseConfig,
    partner1Name: couple.partner1Name,
    partner2Name: couple.partner2Name,
    coupleLabel,
    guestCode: texts.guestCode?.trim().toUpperCase() || baseConfig.guestCode,
    plannerCustomerNumber:
      normalizeOptionalString(texts.plannerCustomerNumber) ?? baseConfig.plannerCustomerNumber,
    photoPassword: texts.photographerPassword?.trim() || baseConfig.photoPassword,
    weddingDate: normaliseDateInput(row.hochzeitsdatum) ?? baseConfig.weddingDate,
    rsvpDeadline: normaliseDateInput(row.rsvp_deadline) ?? baseConfig.rsvpDeadline,
    venueName: texts.einladungOrt?.trim() || baseConfig.venueName,
    venueAddress: texts.einladungAdresse?.trim() || baseConfig.venueAddress,
    welcomeMessage:
      texts.welcomeMessage?.trim() ||
      texts.formDesc?.trim() ||
      texts.einladungStory?.trim() ||
      baseConfig.welcomeMessage,
    formTitle: texts.formTitle?.trim() || baseConfig.formTitle,
    formDescription: texts.formDesc?.trim() || baseConfig.formDescription,
    successTitle: texts.successTitle?.trim() || baseConfig.successTitle,
    successDescription: texts.successDesc?.trim() || baseConfig.successDescription,
    invitationStory: texts.einladungStory?.trim() || baseConfig.invitationStory,
    galleryTitle: texts.galerieTitle?.trim() || baseConfig.galleryTitle,
    galleryDescription: texts.galerieDesc?.trim() || baseConfig.galleryDescription,
    dressCode: texts.dressCodeNote?.trim() || baseConfig.dressCode,
    dressCodeWomen: texts.dressCodeWomen?.trim() || baseConfig.dressCodeWomen,
    dressCodeMen: texts.dressCodeMen?.trim() || baseConfig.dressCodeMen,
    dressCodeExtras: texts.dressCodeExtras?.trim() || baseConfig.dressCodeExtras,
    dressCodeColorHint: getNormalizedColorHint(texts.dressCodeColorHint || baseConfig.dressCodeColorHint),
    dressCodeColors,
    templateId: getNormalizedTemplateId(texts.templateId ?? baseConfig.templateId),
    fontPresetId: getNormalizedFontPresetId(texts.fontPresetId ?? baseConfig.fontPresetId),
    musicWishlistEnabled:
      texts.musicWishlistEnabled === true || baseConfig.musicWishlistEnabled === true,
    sharePrivateGalleryWithGuests:
      texts.sharePrivateGalleryWithGuests === true ||
      baseConfig.sharePrivateGalleryWithGuests === true,
    heroImageUrl: texts.einladungCover?.trim() || baseConfig.heroImageUrl,
    couplePhotos: hasCouplePhotos ? parseCouplePhotos(texts) : baseConfig.couplePhotos,
    sectionImages: hasSectionImages ? parseSectionImages(texts) : baseConfig.sectionImages,
    vendorProfiles: hasVendorProfiles ? parseVendorProfiles(texts) : baseConfig.vendorProfiles,
  }
}

function mapProgramItemsFromSettings(row: ConfigOverlayRow | null): ProgramItem[] | null {
  const texts = parseSettingsTexts(row)
  const items = texts.tagesablauf ?? []

  if (!items.length) {
    return null
  }

  return sortProgramItemsChronologically(
    items.map((item, index) => ({
      id: `app-settings-program-${index + 1}`,
      timeLabel: normalizeProgramTimeLabel(item.zeit ?? '00:00'),
      title: item.titel ?? 'Programmpunkt',
      description: item.beschreibung ?? null,
      icon: isProgramIconName(item.icon) ? item.icon : null,
      sortOrder: index + 1,
    })),
  )
}

function mapFaqItemsFromSettings(row: ConfigOverlayRow | null): FaqItem[] | null {
  const texts = parseSettingsTexts(row)
  const items = texts.faqItems ?? []

  if (!items.length) {
    return null
  }

  return items.map((item, index) => ({
    id: `app-settings-faq-${index + 1}`,
    question: item.question ?? 'Frage',
    answer: item.answer ?? 'Antwort folgt.',
    sortOrder: index + 1,
  }))
}

function mapLegacyProgramItems(row: LegacyWeddingRow): ProgramItem[] {
  const texts = parseLegacyTexts(row)
  const items = texts.tagesablauf ?? []

  if (!items.length) {
    return DEFAULT_PROGRAM_ITEMS
  }

  return sortProgramItemsChronologically(
    items.map((item, index) => ({
      id: `${row.id}-program-${index + 1}`,
      timeLabel: normalizeProgramTimeLabel(item.zeit ?? '00:00'),
      title: item.titel ?? 'Programmpunkt',
      description: item.beschreibung ?? null,
      icon: isProgramIconName(item.icon) ? item.icon : null,
      sortOrder: index + 1,
    })),
  )
}

function mapLegacyFaqItems(row: LegacyWeddingRow): FaqItem[] {
  const texts = parseLegacyTexts(row)
  const items = texts.faqItems ?? []

  if (!items.length) {
    return DEFAULT_FAQ_ITEMS
  }

  return items.map((item, index) => ({
    id: `${row.id}-faq-${index + 1}`,
    question: item.question ?? 'Frage',
    answer: item.answer ?? 'Antwort folgt.',
    sortOrder: index + 1,
  }))
}

function mapLegacyWeddingEditorValues(
  row: LegacyWeddingRow,
  programItems: ProgramItem[],
  faqItems: FaqItem[],
): WeddingEditorValues {
  const config = mapLegacyConfig(row)

  return {
    source: 'legacy',
    sourceId: row.id,
    coupleLabel: config.coupleLabel,
    guestCode: row.gastcode ?? '',
    photographerPassword: row.foto_passwort ?? '',
    weddingDate: row.hochzeitsdatum ?? config.weddingDate,
    rsvpDeadline: row.rsvp_deadline ?? config.rsvpDeadline,
    venueName: config.venueName,
    venueAddress: config.venueAddress,
    welcomeMessage: config.welcomeMessage,
    formTitle: config.formTitle ?? '',
    formDescription: config.formDescription ?? '',
    successTitle: config.successTitle ?? '',
    successDescription: config.successDescription ?? '',
    invitationStory: config.invitationStory ?? '',
    galleryTitle: config.galleryTitle ?? '',
    galleryDescription: config.galleryDescription ?? '',
    dressCodeNote: config.dressCode ?? '',
    dressCodeWomen: config.dressCodeWomen ?? '',
    dressCodeMen: config.dressCodeMen ?? '',
    dressCodeExtras: config.dressCodeExtras ?? '',
    dressCodeColorHint: config.dressCodeColorHint,
    dressCodeColors: config.dressCodeColors,
    templateId: config.templateId,
    fontPresetId: config.fontPresetId,
    musicWishlistEnabled: config.musicWishlistEnabled,
    sharePrivateGalleryWithGuests: config.sharePrivateGalleryWithGuests,
    coverImageUrl: config.heroImageUrl ?? '',
    couplePhotos: mapEditableCouplePhotos(config.couplePhotos),
    sectionImages: mapEditableSectionImages(config.sectionImages),
    vendorProfiles: mapEditableVendorProfiles(config.vendorProfiles),
    programItems: mapEditableProgramItems(programItems),
    faqItems: mapEditableFaqItems(faqItems),
  }
}

function mapModernProgramItems(rows: Database['public']['Tables']['program_items']['Row'][]): ProgramItem[] {
  return sortProgramItemsChronologically(
    rows.map((row) => ({
      id: row.id,
      timeLabel: normalizeProgramTimeLabel(row.time_label),
      title: row.title,
      description: row.description,
      icon: row.icon,
      sortOrder: row.sort_order,
    })),
  )
}

function mapModernFaqItems(rows: Database['public']['Tables']['faq_items']['Row'][]): FaqItem[] {
  return rows.map((row) => ({
    id: row.id,
    question: row.question,
    answer: row.answer,
    sortOrder: row.sort_order,
  }))
}

function combineMenuSelectionLabels(
  primaryChoice: string | null | undefined,
  secondaryChoice: string | null | undefined,
): string | null {
  const values = [primaryChoice, secondaryChoice]
    .map((entry) => entry?.trim())
    .filter((entry): entry is string => Boolean(entry))

  if (!values.length) {
    return null
  }

  return Array.from(new Set(values)).join(', ')
}

function formatMenuSelection(menuChoices: RsvpFormValues['menuChoices']): string | null {
  const labels = menuChoices
    .map((choice) => MENU_CHOICE_LABELS[choice])
    .filter((entry, index, array) => Boolean(entry) && array.indexOf(entry) === index)

  return labels.length ? labels.join(', ') : null
}

function normalizeHouseholdCounts(values: Pick<RsvpFormValues, 'isAttending' | 'smallChildrenCount' | 'highChairCount'>) {
  if (values.isAttending !== 'yes') {
    return {
      smallChildrenCount: 0,
      highChairCount: 0,
    }
  }

  const smallChildrenCount = Math.max(0, Math.min(10, Math.round(values.smallChildrenCount || 0)))
  const highChairCount = Math.max(0, Math.min(smallChildrenCount, Math.round(values.highChairCount || 0)))

  return {
    smallChildrenCount,
    highChairCount,
  }
}

function buildDerivedHouseholdDetails(guests: PlanningGuest[]): DerivedHouseholdDetail[] {
  const countsByHousehold = new Map<string, { smallChildrenCount: number; highChairCount: number }>()

  guests.forEach((guest) => {
    const householdId = normalizeOptionalString(guest.householdId)

    if (!householdId || guest.kind !== 'child') {
      return
    }

    const currentCounts = countsByHousehold.get(householdId) ?? {
      smallChildrenCount: 0,
      highChairCount: 0,
    }

    currentCounts.smallChildrenCount += 1

    if (guest.requiresHighChair) {
      currentCounts.highChairCount += 1
    }

    countsByHousehold.set(householdId, currentCounts)
  })

  return Array.from(countsByHousehold.entries()).map(([rsvpRecordId, counts]) => ({
    rsvpRecordId,
    smallChildrenCount: counts.smallChildrenCount,
    highChairCount: counts.highChairCount,
  }))
}

async function listRsvpHouseholdDetailRows(
  supabase: DbClient,
  config: WeddingConfig,
): Promise<RsvpHouseholdDetailRow[]> {
  if (config.source === 'fallback' || !config.sourceId) {
    return []
  }

  try {
    const { data: rowsRaw, error } = (await query(supabase, 'rsvp_household_details')
      .select('*')
      .eq('wedding_source', config.source)
      .eq('wedding_source_id', config.sourceId)) as QueryResult<RsvpHouseholdDetailRow[]>
    const rows = rowsRaw ?? []

    if (error) {
      throw error
    }

    return rows
  } catch (error) {
    if (!isMissingRelationError(error)) {
      throw error
    }
  }

  return []
}

function mapRsvpHouseholdDetailsByRecordId(
  rows: RsvpHouseholdDetailRow[],
): Map<string, StoredRsvpHouseholdDetail> {
  return new Map(
    rows.map((row) => [
      row.rsvp_record_id,
      {
        rsvpRecordId: row.rsvp_record_id,
        smallChildrenCount: Math.max(0, row.small_children_count ?? 0),
        highChairCount: Math.max(0, row.high_chair_count ?? 0),
      },
    ]),
  )
}

async function upsertRsvpHouseholdDetail(
  supabase: DbClient,
  config: WeddingConfig,
  input: StoredRsvpHouseholdDetail,
): Promise<void> {
  if (config.source === 'fallback' || !config.sourceId) {
    return
  }

  try {
    const { error } = await query(supabase, 'rsvp_household_details').upsert(
      {
        wedding_source: config.source,
        wedding_source_id: config.sourceId,
        rsvp_record_id: input.rsvpRecordId,
        small_children_count: input.smallChildrenCount,
        high_chair_count: input.highChairCount,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'wedding_source,wedding_source_id,rsvp_record_id' },
    )

    if (error) {
      throw error
    }
  } catch (error) {
    if (!isMissingRelationError(error)) {
      throw error
    }
  }
}

async function deleteRsvpHouseholdDetail(
  supabase: DbClient,
  config: WeddingConfig,
  rsvpRecordId: string,
): Promise<void> {
  if (config.source === 'fallback' || !config.sourceId) {
    return
  }

  try {
    const { error } = await query(supabase, 'rsvp_household_details')
      .delete()
      .eq('wedding_source', config.source)
      .eq('wedding_source_id', config.sourceId)
      .eq('rsvp_record_id', rsvpRecordId)

    if (error) {
      throw error
    }
  } catch (error) {
    if (!isMissingRelationError(error)) {
      throw error
    }
  }
}

function mapModernRsvps(
  rows: Database['public']['Tables']['rsvps']['Row'][],
  detailMap: Map<string, StoredRsvpHouseholdDetail>,
): RsvpRecord[] {
  return rows.map((row) => {
    const details = detailMap.get(String(row.id))

    return {
      id: row.id,
      guestName: row.guest_name,
      guestEmail: row.guest_email,
      isAttending: row.is_attending,
      plusOne: row.plus_one ?? false,
      plusOneName: row.plus_one_name,
      totalGuests: row.total_guests ?? 1,
      smallChildrenCount: details?.smallChildrenCount ?? 0,
      highChairCount: details?.highChairCount ?? 0,
      menuChoice: combineMenuSelectionLabels(row.menu_choice, row.plus_one_menu),
      plusOneMenu: row.plus_one_menu,
      dietaryNotes: row.dietary_notes,
      message: row.message,
      createdAt: row.submitted_at,
      source: 'modern',
    }
  })
}

function mapLegacyRsvps(
  rows: Database['public']['Tables']['rsvp_antworten']['Row'][],
  detailMap: Map<string, StoredRsvpHouseholdDetail>,
): RsvpRecord[] {
  return rows.map((row) => {
    const details = detailMap.get(String(row.id))

    return {
      id: row.id,
      guestName: row.name ?? 'Gast',
      guestEmail: null,
      isAttending: (row.teilnahme ?? '').toLowerCase().includes('ja'),
      plusOne: (row.anzahl_personen ?? 1) > 1,
      plusOneName: null,
      totalGuests: row.anzahl_personen ?? 1,
      smallChildrenCount: details?.smallChildrenCount ?? 0,
      highChairCount: details?.highChairCount ?? 0,
      menuChoice: row.menuwahl,
      plusOneMenu: null,
      dietaryNotes: row.ernaehrung,
      message: row.liedwunsch,
      createdAt: row.created_at,
      source: 'legacy',
    }
  })
}

export async function getActiveWeddingConfig(supabase: DbClient): Promise<WeddingConfig> {
  const { data: modernRowsRaw, error: modernError } = (await query(supabase, 'wedding_config')
    .select('*')
    .eq('is_active', true)
    .limit(1)) as QueryResult<Database['public']['Tables']['wedding_config']['Row'][]>
  const modernRows = modernRowsRaw ?? []

  if (modernRows?.length) {
    const firstModernRow = modernRows[0]
    if (firstModernRow) {
      const baseConfig = mapModernConfig(firstModernRow)
      const overlayRow = await getConfigOverlayRow(supabase, baseConfig)
      return applyConfigOverlayToConfig(baseConfig, overlayRow)
    }
  }

  if (modernError && !isMissingRelation(modernError)) {
    throw modernError
  }

  const { data: legacyRowsRaw, error: legacyError } = (await query(supabase, 'hochzeiten')
    .select('*')
    .limit(1)) as QueryResult<Database['public']['Tables']['hochzeiten']['Row'][]>
  const legacyRows = legacyRowsRaw ?? []

  if (legacyRows?.length) {
    const firstLegacyRow = legacyRows[0]
    if (firstLegacyRow) {
      const baseConfig = mapLegacyConfig(firstLegacyRow)
      const overlayRow = await getConfigOverlayRow(supabase, baseConfig)
      return applyConfigOverlayToConfig(baseConfig, overlayRow)
    }
  }

  if (legacyError && !isMissingRelation(legacyError)) {
    throw legacyError
  }

  return createFallbackConfig()
}

export async function getAdminWeddingConfig(
  supabase: DbClient,
  userId: string | undefined,
): Promise<WeddingConfig> {
  const { data: modernRowsRaw, error: modernError } = (await query(supabase, 'wedding_config')
    .select('*')
    .eq('is_active', true)
    .limit(1)) as QueryResult<Database['public']['Tables']['wedding_config']['Row'][]>
  const modernRows = modernRowsRaw ?? []

  if (modernRows?.length) {
    const firstModernRow = modernRows[0]
    if (firstModernRow) {
      const baseConfig = mapModernConfig(firstModernRow)
      const overlayRow = await getConfigOverlayRow(supabase, baseConfig)
      return applyConfigOverlayToConfig(baseConfig, overlayRow)
    }
  }

  if (modernError && !isMissingRelation(modernError)) {
    throw modernError
  }

  let legacyQuery = query(supabase, 'hochzeiten').select('*').limit(1)
  if (userId) {
    legacyQuery = legacyQuery.eq('user_id', userId)
  }

  const { data: legacyRowsRaw, error: legacyError } =
    (await legacyQuery) as QueryResult<Database['public']['Tables']['hochzeiten']['Row'][]>
  const legacyRows = legacyRowsRaw ?? []

  if (legacyRows?.length) {
    const firstLegacyRow = legacyRows[0]
    if (firstLegacyRow) {
      const baseConfig = mapLegacyConfig(firstLegacyRow)
      const overlayRow = await getConfigOverlayRow(supabase, baseConfig)
      return applyConfigOverlayToConfig(baseConfig, overlayRow)
    }
  }

  if (legacyError && !isMissingRelation(legacyError)) {
    throw legacyError
  }

  return createFallbackConfig()
}

export async function getWeddingConfigByGuestCode(
  supabase: DbClient,
  guestCode: string,
): Promise<WeddingConfig | null> {
  const normalizedGuestCode = guestCode.trim().toUpperCase()
  const activeConfig = await getActiveWeddingConfig(supabase)

  if (activeConfig.guestCode?.toUpperCase() === normalizedGuestCode) {
    return activeConfig
  }

  const modernConfig = await findModernConfigByGuestCode(supabase, normalizedGuestCode)

  if (modernConfig) {
    return modernConfig
  }

  const { data: legacyRowsRaw, error } = (await query(supabase, 'hochzeiten')
    .select('*')
    .eq('gastcode', normalizedGuestCode)
    .limit(1)) as QueryResult<Database['public']['Tables']['hochzeiten']['Row'][]>
  const rows = legacyRowsRaw ?? []

  if (rows.length) {
    const row = rows[0]
    if (row) {
      const baseConfig = mapLegacyConfig(row)
      const overlayRow = await getConfigOverlayRow(supabase, baseConfig)
      return applyConfigOverlayToConfig(baseConfig, overlayRow)
    }
  }

  if (error && !isMissingRelation(error)) {
    throw error
  }

  return null
}

export async function listAllManagedWeddingConfigs(supabase: DbClient): Promise<WeddingConfig[]> {
  const { data: modernRowsRaw, error: modernError } = (await query(supabase, 'wedding_config')
    .select('*')
    .order('wedding_date', { ascending: true })) as QueryResult<
    Database['public']['Tables']['wedding_config']['Row'][]
  >
  const modernRows = modernRowsRaw ?? []

  if (modernError && !isMissingRelation(modernError)) {
    throw modernError
  }

  const modernConfigs = await Promise.all(
    modernRows.map(async (row) => {
      const baseConfig = mapModernConfig(row)
      const overlayRow = await getConfigOverlayRow(supabase, baseConfig)
      return applyConfigOverlayToConfig(baseConfig, overlayRow)
    }),
  )

  const { data: legacyRowsRaw, error: legacyError } = (await query(supabase, 'hochzeiten')
    .select('*')
    .order('hochzeitsdatum', { ascending: true })) as QueryResult<LegacyWeddingRow[]>
  const legacyRows = legacyRowsRaw ?? []

  if (legacyError && !isMissingRelation(legacyError)) {
    throw legacyError
  }

  const legacyConfigs = await Promise.all(
    legacyRows.map(async (row) => {
      const baseConfig = mapLegacyConfig(row)
      const overlayRow = await getConfigOverlayRow(supabase, baseConfig)
      return applyConfigOverlayToConfig(baseConfig, overlayRow)
    }),
  )

  return [...modernConfigs, ...legacyConfigs]
}

export async function getWeddingEditorValues(
  supabase: DbClient,
  config: WeddingConfig,
): Promise<WeddingEditorValues | null> {
  if (config.source === 'fallback' || !config.sourceId) {
    return null
  }

  const [programItems, faqItems] = await Promise.all([
    getProgramItems(supabase, config),
    getFaqItems(supabase, config),
  ])

  return {
    source: config.source,
    sourceId: config.sourceId,
    coupleLabel: config.coupleLabel,
    guestCode: config.guestCode ?? '',
    photographerPassword: config.photoPassword ?? '',
    weddingDate: config.weddingDate,
    rsvpDeadline: config.rsvpDeadline,
    venueName: config.venueName,
    venueAddress: config.venueAddress,
    welcomeMessage: config.welcomeMessage,
    formTitle: config.formTitle ?? '',
    formDescription: config.formDescription ?? '',
    successTitle: config.successTitle ?? '',
    successDescription: config.successDescription ?? '',
    invitationStory: config.invitationStory ?? '',
    galleryTitle: config.galleryTitle ?? '',
    galleryDescription: config.galleryDescription ?? '',
    dressCodeNote: config.dressCode ?? '',
    dressCodeWomen: config.dressCodeWomen ?? '',
    dressCodeMen: config.dressCodeMen ?? '',
    dressCodeExtras: config.dressCodeExtras ?? '',
    dressCodeColorHint: config.dressCodeColorHint,
    dressCodeColors: config.dressCodeColors,
    templateId: config.templateId,
    fontPresetId: config.fontPresetId,
    musicWishlistEnabled: config.musicWishlistEnabled,
    sharePrivateGalleryWithGuests: config.sharePrivateGalleryWithGuests,
    coverImageUrl: config.heroImageUrl ?? '',
    couplePhotos: mapEditableCouplePhotos(config.couplePhotos),
    sectionImages: mapEditableSectionImages(config.sectionImages),
    vendorProfiles: mapEditableVendorProfiles(config.vendorProfiles),
    programItems: mapEditableProgramItems(programItems),
    faqItems: mapEditableFaqItems(faqItems),
  }
}

function sortGalleryPhotos(photos: GalleryPhoto[]): GalleryPhoto[] {
  return photos
    .slice()
    .sort(
      (left, right) =>
        new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime(),
    )
}

async function listGalleryPhotosForPath(
  supabase: DbClient,
  path: string,
  visibility: GalleryVisibility,
): Promise<GalleryPhoto[]> {
  if (!supabase.storage) {
    return []
  }

  const { data, error } = await supabase.storage.from(GALLERY_BUCKET).list(path, {
    limit: 1000,
    sortBy: {
      column: 'created_at',
      order: 'desc',
    },
  })

  if (error) {
    if (isMissingBucketError(error)) {
      const bucketCreated = await ensureGalleryBucket(supabase)

      if (bucketCreated) {
        const retry = await supabase.storage.from(GALLERY_BUCKET).list(path, {
          limit: 1000,
          sortBy: {
            column: 'created_at',
            order: 'desc',
          },
        })

        if (!retry.error) {
          return (retry.data ?? [])
            .filter((file) => file.id)
            .map((file) => mapLegacyGalleryPhoto(
              `${path}/${file.name}`,
              file.name,
              file.created_at ?? null,
              visibility,
            ))
        }
      }

      return []
    }

    const message = error instanceof Error ? error.message.toLowerCase() : ''
    if (message.includes('not found')) {
      return []
    }

    throw error
  }

  return (data ?? [])
    .filter((file) => file.id)
    .map((file) => mapLegacyGalleryPhoto(
      `${path}/${file.name}`,
      file.name,
      file.created_at ?? null,
      visibility,
    ))
}

export async function getGalleryCollections(
  supabase: DbClient,
  config: WeddingConfig,
): Promise<GalleryCollections> {
  if (!config.sourceId || !supabase.storage) {
    return {
      publicPhotos: [],
      privatePhotos: [],
    }
  }

  const [galleryMediaPublicRows, galleryMediaPrivateRows, legacyPublicPhotos, publicFolderPhotos, privateFolderPhotos] = await Promise.all([
    listGalleryMediaRows(supabase, config, 'public'),
    listGalleryMediaRows(supabase, config, 'private'),
    listGalleryPhotosForPath(supabase, config.sourceId, 'public'),
    listGalleryPhotosForPath(supabase, `${config.sourceId}/${PUBLIC_GALLERY_FOLDER}`, 'public'),
    listGalleryPhotosForPath(supabase, `${config.sourceId}/${PRIVATE_GALLERY_FOLDER}`, 'private'),
  ])
  const [galleryMediaPublicPhotos, galleryMediaPrivatePhotos] = await Promise.all([
    Promise.all(galleryMediaPublicRows.map((row) => mapGalleryMediaRowToPhoto(row))),
    Promise.all(galleryMediaPrivateRows.map((row) => mapGalleryMediaRowToPhoto(row))),
  ])

  return {
    publicPhotos: sortGalleryPhotos([
      ...galleryMediaPublicPhotos,
      ...legacyPublicPhotos,
      ...publicFolderPhotos,
    ]),
    privatePhotos: sortGalleryPhotos([...galleryMediaPrivatePhotos, ...privateFolderPhotos]),
  }
}

export async function getGalleryStorageSummary(
  supabase: DbClient,
  config: WeddingConfig,
): Promise<GalleryStorageSummary> {
  if (!config.sourceId || !supabase.storage) {
    return {
      totalPhotos: 0,
      publicPhotoCount: 0,
      privatePhotoCount: 0,
      managedPhotoCount: 0,
      legacyPhotoCount: 0,
      originalBytes: 0,
      derivedBytes: 0,
      totalManagedBytes: 0,
      warningThresholdBytes: GALLERY_STORAGE_WARNING_BYTES,
      hardLimitBytes: GALLERY_STORAGE_HARD_LIMIT_BYTES,
      warningPhotoCount: GALLERY_STORAGE_WARNING_PHOTO_COUNT,
      usesR2: isR2Configured(),
      warningLevel: 'ok',
      warningMessages: [],
    }
  }

  const [galleryMediaPublicRows, galleryMediaPrivateRows, legacyPublicPhotos, publicFolderPhotos, privateFolderPhotos] = await Promise.all([
    listGalleryMediaRows(supabase, config, 'public'),
    listGalleryMediaRows(supabase, config, 'private'),
    listGalleryPhotosForPath(supabase, config.sourceId, 'public'),
    listGalleryPhotosForPath(supabase, `${config.sourceId}/${PUBLIC_GALLERY_FOLDER}`, 'public'),
    listGalleryPhotosForPath(supabase, `${config.sourceId}/${PRIVATE_GALLERY_FOLDER}`, 'private'),
  ])

  const galleryMediaRows = [...galleryMediaPublicRows, ...galleryMediaPrivateRows]
  const publicPhotoCount =
    galleryMediaPublicRows.length + legacyPublicPhotos.length + publicFolderPhotos.length
  const privatePhotoCount = galleryMediaPrivateRows.length + privateFolderPhotos.length
  const totalPhotos = publicPhotoCount + privatePhotoCount
  const managedPhotoCount = galleryMediaRows.length
  const legacyPhotoCount = Math.max(0, totalPhotos - managedPhotoCount)
  const originalBytes = galleryMediaRows.reduce((sum, row) => sum + Number(row.original_bytes ?? 0), 0)
  const derivedBytes = galleryMediaRows.reduce(
    (sum, row) => sum + Number(row.preview_bytes ?? 0) + Number(row.lightbox_bytes ?? 0),
    0,
  )
  const totalManagedBytes = originalBytes + derivedBytes
  const warningMessages: string[] = []
  let warningLevel: GalleryStorageSummary['warningLevel'] = 'ok'

  if (totalManagedBytes >= GALLERY_STORAGE_HARD_LIMIT_BYTES) {
    warningLevel = 'limit'
    warningMessages.push(
      'Das Galerie-Limit dieser Hochzeit ist erreicht. Bitte löscht Bilder oder ladet keine weiteren Originale hoch.',
    )
  } else if (totalManagedBytes >= GALLERY_STORAGE_WARNING_BYTES) {
    warningLevel = 'warning'
    warningMessages.push(
      'Die Galerie nähert sich 10 GB verwaltetem Speicher. Plant Löschungen oder einen Komplettdownload ein.',
    )
  }

  if (totalPhotos >= GALLERY_STORAGE_WARNING_PHOTO_COUNT) {
    warningLevel = warningLevel === 'limit' ? 'limit' : 'warning'
    warningMessages.push(
      `Die Galerie enthält bereits ${totalPhotos} Fotos. Ab etwa ${GALLERY_STORAGE_WARNING_PHOTO_COUNT} Bildern wird die Pflege deutlich aufwendiger.`,
    )
  }

  if (legacyPhotoCount > 0) {
    warningMessages.push(
      `${legacyPhotoCount} ältere Fotos liegen noch im bisherigen Speicherpfad und sind in der Byte-Auswertung nicht vollständig enthalten.`,
    )
  }

  return {
    totalPhotos,
    publicPhotoCount,
    privatePhotoCount,
    managedPhotoCount,
    legacyPhotoCount,
    originalBytes,
    derivedBytes,
    totalManagedBytes,
    warningThresholdBytes: GALLERY_STORAGE_WARNING_BYTES,
    hardLimitBytes: GALLERY_STORAGE_HARD_LIMIT_BYTES,
    warningPhotoCount: GALLERY_STORAGE_WARNING_PHOTO_COUNT,
    usesR2: managedPhotoCount > 0 || isR2Configured(),
    warningLevel,
    warningMessages,
  }
}

export async function listGalleryPhotos(
  supabase: DbClient,
  config: WeddingConfig,
): Promise<GalleryPhoto[]> {
  const collections = await getGalleryCollections(supabase, config)

  if (config.sharePrivateGalleryWithGuests) {
    return sortGalleryPhotos([...collections.publicPhotos, ...collections.privatePhotos])
  }

  return collections.publicPhotos
}

export async function uploadGalleryFiles(
  supabase: DbClient,
  config: WeddingConfig,
  files: Array<{
    name: string
    contentType: string
    body: Uint8Array
  }>,
  visibility: GalleryVisibility = 'public',
): Promise<void> {
  if (!config.sourceId || !supabase.storage) {
    throw new Error('Die Galerie ist aktuell nicht verfügbar.')
  }

  const currentStorageSummary = await getGalleryStorageSummary(supabase, config)
  const projectedAdditionalBytes = files.reduce(
    (sum, file) => sum + Math.ceil(file.body.byteLength * GALLERY_UPLOAD_SIZE_ESTIMATE_MULTIPLIER),
    0,
  )

  if (currentStorageSummary.totalManagedBytes + projectedAdditionalBytes > GALLERY_STORAGE_HARD_LIMIT_BYTES) {
    throw new Error(
      'Dieser Upload würde das Galerie-Limit von 20 GB überschreiten. Bitte löscht zunächst Bilder oder verteilt den Upload auf weniger Originaldateien.',
    )
  }

  if (isGalleryMediaSupported(config) && isR2Configured()) {
    for (const file of files) {
      const assets = await buildGalleryUploadAssets({
        config,
        visibility,
        fileName: file.name,
        contentType: file.contentType,
        body: file.body,
      })

      await uploadR2Object({
        key: assets.original.key,
        body: assets.original.body,
        contentType: assets.original.contentType,
        cacheControl: 'private, max-age=0, no-store',
      })
      await uploadR2Object({
        key: assets.preview.key,
        body: assets.preview.body,
        contentType: assets.preview.contentType,
        cacheControl: 'public, max-age=31536000, immutable',
      })
      await uploadR2Object({
        key: assets.lightbox.key,
        body: assets.lightbox.body,
        contentType: assets.lightbox.contentType,
        cacheControl: 'public, max-age=31536000, immutable',
      })

      await createGalleryMediaRow(supabase, {
        wedding_source: config.source,
        wedding_source_id: config.sourceId,
        visibility,
        storage_provider: 'r2',
        file_name: file.name,
        original_key: assets.original.key,
        preview_key: assets.preview.key,
        lightbox_key: assets.lightbox.key,
        original_content_type: assets.original.contentType,
        preview_content_type: assets.preview.contentType,
        lightbox_content_type: assets.lightbox.contentType,
        width: assets.width,
        height: assets.height,
        original_bytes: assets.original.sizeBytes,
        preview_bytes: assets.preview.sizeBytes,
        lightbox_bytes: assets.lightbox.sizeBytes,
        uploaded_by: 'photographer',
      })
    }

    return
  }

  const targetFolder =
    visibility === 'private' ? PRIVATE_GALLERY_FOLDER : PUBLIC_GALLERY_FOLDER

  for (const file of files) {
    const safeName = sanitizeGalleryFileName(file.name)
    const uniqueName = `${Date.now()}-${safeName}`
    const path = `${config.sourceId}/${targetFolder}/${uniqueName}`
    const uploadFile = () =>
      supabase.storage!.from(GALLERY_BUCKET).upload(path, file.body, {
        cacheControl: '3600',
        contentType: file.contentType,
        upsert: false,
      })
    let { error } = await uploadFile()

    if (error) {
      if (isMissingBucketError(error)) {
        const bucketCreated = await ensureGalleryBucket(supabase)

        if (bucketCreated) {
          const retry = await uploadFile()
          error = retry.error
        }
      }

      if (error && isMissingBucketError(error)) {
        throw new Error('Die Fotogalerie ist noch nicht eingerichtet.')
      }

      if (error) {
        throw error
      }
    }
  }
}

export async function downloadGalleryPhotoBlob(
  supabase: DbClient,
  config: WeddingConfig,
  path: string,
): Promise<Blob> {
  if (!config.sourceId || !supabase.storage) {
    throw new Error('Die Galerie ist aktuell nicht verfügbar.')
  }

  if (!path.startsWith(`${config.sourceId}/`)) {
    throw new Error('Ungültiger Dateipfad.')
  }

  const { data, error } = await supabase.storage.from(GALLERY_BUCKET).download(path)

  if (error) {
    if (isMissingBucketError(error)) {
      throw new Error('Die Fotogalerie ist noch nicht eingerichtet.')
    }

    throw error
  }

  if (!data) {
    throw new Error('Das Foto konnte nicht geladen werden.')
  }

  return data
}

export async function uploadContentImageFile(
  supabase: DbClient,
  config: WeddingConfig,
  input: {
    name: string
    contentType: string
    body: Uint8Array
    folder: 'cover' | 'couple' | 'section' | 'vendor'
  },
): Promise<{ path: string; publicUrl: string }> {
  if (!config.sourceId || !supabase.storage) {
    throw new Error('Die Bildverwaltung ist aktuell nicht verfügbar.')
  }

  const safeName = sanitizeGalleryFileName(input.name)
  const uniqueName = `${Date.now()}-${safeName}`
  const path = `${CONTENT_ASSET_PREFIX}/${config.sourceId}/${input.folder}/${uniqueName}`
  const uploadFile = () =>
    supabase.storage!.from(GALLERY_BUCKET).upload(path, input.body, {
      cacheControl: '3600',
      contentType: input.contentType,
      upsert: false,
    })
  let { error } = await uploadFile()

  if (error) {
    if (isMissingBucketError(error)) {
      const bucketCreated = await ensureGalleryBucket(supabase)

      if (bucketCreated) {
        const retry = await uploadFile()
        error = retry.error
      }
    }

    if (error && isMissingBucketError(error)) {
      throw new Error('Der Bildspeicher ist noch nicht eingerichtet.')
    }

    if (error) {
      throw error
    }
  }

  return {
    path,
    publicUrl: buildGalleryPublicUrl(path),
  }
}

export async function deleteGalleryPhoto(
  supabase: DbClient,
  config: WeddingConfig,
  path: string,
): Promise<void> {
  if (!config.sourceId || !supabase.storage) {
    throw new Error('Die Galerie ist aktuell nicht verfügbar.')
  }

  const galleryMedia = await getGalleryMediaRowByOriginalKey(supabase, config, path)

  if (galleryMedia) {
    if (galleryMedia.storage_provider === 'r2') {
      await deleteR2Objects(
        [galleryMedia.original_key, galleryMedia.preview_key, galleryMedia.lightbox_key].filter(
          (key): key is string => Boolean(key),
        ),
      )
    } else {
      const { error } = await supabase.storage.from(GALLERY_BUCKET).remove([galleryMedia.original_key])

      if (error) {
        if (isMissingBucketError(error)) {
          throw new Error('Die Fotogalerie ist noch nicht eingerichtet.')
        }

        throw error
      }
    }

    await deleteGalleryMediaRow(supabase, galleryMedia.id)
    return
  }

  if (!path.startsWith(`${config.sourceId}/`)) {
    throw new Error('Ungültiger Dateipfad.')
  }

  const { error } = await supabase.storage.from(GALLERY_BUCKET).remove([path])

  if (error) {
    if (isMissingBucketError(error)) {
      throw new Error('Die Fotogalerie ist noch nicht eingerichtet.')
    }

    throw error
  }
}

export async function moveGalleryPhoto(
  supabase: DbClient,
  config: WeddingConfig,
  path: string,
  targetVisibility: GalleryVisibility,
): Promise<GalleryPhoto> {
  if (!config.sourceId || !supabase.storage) {
    throw new Error('Die Galerie ist aktuell nicht verfügbar.')
  }

  const galleryMedia = await getGalleryMediaRowByOriginalKey(supabase, config, path)

  if (galleryMedia) {
    if (galleryMedia.visibility === targetVisibility) {
      throw new Error('Das Foto liegt bereits in diesem Bereich.')
    }

    const updatedRow = await updateGalleryMediaVisibility(supabase, galleryMedia.id, targetVisibility)
    return mapGalleryMediaRowToPhoto(updatedRow)
  }

  const currentVisibility = getGalleryVisibilityForPath(config, path)

  if (!currentVisibility) {
    throw new Error('Ungültiger Dateipfad.')
  }

  if (currentVisibility === targetVisibility) {
    throw new Error('Das Foto liegt bereits in diesem Bereich.')
  }

  const fileName = path.split('/').at(-1)?.trim()

  if (!fileName) {
    throw new Error('Ungültiger Dateipfad.')
  }

  const storage = supabase.storage.from(GALLERY_BUCKET)
  const movePhoto = async (destinationPath: string) => storage.move(path, destinationPath)

  let destinationPath = buildGalleryTargetPath(config, fileName, targetVisibility)
  let { error } = await movePhoto(destinationPath)

  if (error && isStoragePathConflictError(error)) {
    const uniqueFileName = `${Date.now()}-${fileName}`
    destinationPath = buildGalleryTargetPath(config, uniqueFileName, targetVisibility)
    const retry = await movePhoto(destinationPath)
    error = retry.error
  }

  if (error) {
    if (isMissingBucketError(error)) {
      throw new Error('Die Fotogalerie ist noch nicht eingerichtet.')
    }

    throw error
  }

  return {
    name: destinationPath.split('/').at(-1) ?? fileName,
    path: destinationPath,
    publicUrl: buildGalleryPublicUrl(destinationPath),
    previewUrl: buildGalleryPublicUrl(destinationPath),
    createdAt: new Date().toISOString(),
    visibility: targetVisibility,
    storageProvider: 'supabase',
    originalPath: destinationPath,
  }
}

export async function saveWeddingEditorValues(
  supabase: DbClient,
  values: WeddingEditorValues,
): Promise<WeddingConfig> {
  const buildEditorTexts = (existingTexts: AppSettingsTexts): Json => ({
    ...existingTexts,
    formTitle: values.formTitle || null,
    formDesc: values.formDescription || null,
    successTitle: values.successTitle || null,
    successDesc: values.successDescription || null,
    galerieTitle: values.galleryTitle || null,
    galerieDesc: values.galleryDescription || null,
    einladungStory: values.invitationStory || null,
    einladungOrt: values.venueName || null,
    einladungAdresse: values.venueAddress || null,
    einladungCover: values.coverImageUrl || null,
    welcomeMessage: values.welcomeMessage || null,
    guestCode: values.guestCode.toUpperCase(),
    photographerPassword: values.photographerPassword || null,
    dressCodeNote: values.dressCodeNote || null,
    dressCodeWomen: values.dressCodeWomen || null,
    dressCodeMen: values.dressCodeMen || null,
    dressCodeExtras: values.dressCodeExtras || null,
    dressCodeColorHint: values.dressCodeColorHint,
    dressCodeColors: values.dressCodeColors,
    templateId: values.templateId,
    fontPresetId: values.fontPresetId,
    musicWishlistEnabled: values.musicWishlistEnabled,
    sharePrivateGalleryWithGuests: values.sharePrivateGalleryWithGuests,
    vendorProfiles: values.vendorProfiles.map((item) => ({
      id: item.id,
      name: item.name,
      role: item.role,
      websiteUrl: normalizeOptionalString(item.websiteUrl),
      instagramUrl: normalizeOptionalString(item.instagramUrl),
      imageUrl: normalizeOptionalString(item.imageUrl),
    })),
    couplePhotos: values.couplePhotos.map((item) => ({
      id: item.id,
      url: item.imageUrl,
      alt: item.altText || null,
      caption: item.caption || null,
    })),
    sectionImages: values.sectionImages.map((item) => ({
      id: item.id,
      section: item.section,
      title: item.title || null,
      url: item.imageUrl,
      alt: item.altText || null,
    })),
    tagesablauf: sortProgramItemsChronologically(values.programItems).map((item) => ({
      zeit: normalizeProgramTimeLabel(item.timeLabel),
      titel: item.title,
      beschreibung: item.description || '',
      icon: isProgramIconName(item.icon) ? item.icon : null,
    })),
    faqItems: values.faqItems.map((item) => ({
      question: item.question,
      answer: item.answer,
    })),
    probe: undefined,
  })

  const buildEditorQuestions = (existingQuestions: Record<string, Json | undefined>): Json => ({
    customQuestions: existingQuestions.customQuestions ?? [],
    disabledQuestions: existingQuestions.disabledQuestions ?? [],
  })

  if (values.source === 'legacy') {
    const currentRow = await getLegacyWeddingRowById(supabase, values.sourceId)

    if (!currentRow) {
      throw new Error('Die aktive Hochzeit konnte nicht geladen werden.')
    }

    const compatibilityRow = await getCompatibilityAppSettingsRow(supabase, mapLegacyConfig(currentRow))
    const existingTexts = {
      ...(parseLegacyTexts(currentRow) as AppSettingsTexts),
      ...parseSettingsTexts(compatibilityRow),
    }
    const existingQuestions = {
      ...parseSettingsQuestions(currentRow),
      ...parseSettingsQuestions(compatibilityRow),
    }

    const { data, error } = (await query(supabase, 'hochzeiten')
      .update({
        brautpaar_name: values.coupleLabel,
        gastcode: values.guestCode.toUpperCase(),
        foto_passwort: values.photographerPassword || null,
        hochzeitsdatum: values.weddingDate,
        rsvp_deadline: values.rsvpDeadline,
        fragen: buildEditorQuestions(existingQuestions),
        texte: buildEditorTexts(existingTexts),
      })
      .eq('id', values.sourceId)
      .select('*')
      .single()) as QueryResult<Database['public']['Tables']['hochzeiten']['Row']>

    if (error) {
      throw error
    }

    if (!data) {
      throw new Error('Die Hochzeitsdaten konnten nicht gespeichert werden.')
    }

    return mapLegacyConfig(data)
  }

  const currentModernRowRaw = (await query(supabase, 'wedding_config')
    .select('*')
    .eq('id', values.sourceId)
    .limit(1)) as QueryResult<Database['public']['Tables']['wedding_config']['Row'][]>
  const currentModernRow = currentModernRowRaw.data?.[0] ?? null

  if (!currentModernRow) {
    throw new Error('Die aktive Hochzeit konnte nicht geladen werden.')
  }

  const currentContentRow = await getWeddingContentRow(supabase, values.sourceId)
  const compatibilityRow = await getCompatibilityAppSettingsRow(supabase, mapModernConfig(currentModernRow))
  const existingTexts = {
    ...parseSettingsTexts(compatibilityRow),
    ...parseSettingsTexts(buildContentOverlayRow(currentContentRow)),
  }
  const existingQuestions = {
    ...parseSettingsQuestions(compatibilityRow),
    ...parseSettingsQuestions(buildContentOverlayRow(currentContentRow)),
  }
  const splitCouple = splitCoupleLabel(values.coupleLabel)

  const { data: updatedConfigRow, error: updateError } = (await query(supabase, 'wedding_config')
    .update({
      partner_1_name: splitCouple.partner1Name,
      partner_2_name: splitCouple.partner2Name,
      wedding_date: values.weddingDate,
      venue_name: values.venueName || null,
      venue_address: values.venueAddress || null,
      welcome_message: values.welcomeMessage || null,
      dress_code: values.dressCodeNote || null,
      rsvp_deadline: values.rsvpDeadline,
      updated_at: new Date().toISOString(),
    })
    .eq('id', values.sourceId)
    .select('*')
    .single()) as QueryResult<Database['public']['Tables']['wedding_config']['Row']>

  if (updateError) {
    throw updateError
  }

  if (!updatedConfigRow) {
    throw new Error('Die Hochzeitsdaten konnten nicht gespeichert werden.')
  }

  try {
    const { data, error } = (await query(supabase, 'wedding_content')
      .upsert(
        buildWeddingContentPayload(values.sourceId, {
          fragen: buildEditorQuestions(existingQuestions),
          texte: buildEditorTexts(existingTexts),
        }),
      )
      .select('*')
      .single()) as QueryResult<Database['public']['Tables']['wedding_content']['Row']>

    if (error) {
      throw error
    }

    return applyConfigOverlayToConfig(mapModernConfig(updatedConfigRow), buildContentOverlayRow(data))
  } catch (error) {
    if (!isMissingRelationError(error)) {
      throw error
    }
  }

  const fallbackData = await saveCompatibilityAppSettingsRow(supabase, {
    id: APP_SETTINGS_ID,
    brautpaar: values.coupleLabel,
    hochzeitsdatum: values.weddingDate,
    rsvp_deadline: values.rsvpDeadline,
    fragen: buildEditorQuestions(existingQuestions),
    texte: buildEditorTexts(existingTexts),
  })

  return applyConfigOverlayToConfig(mapModernConfig(updatedConfigRow), fallbackData)
}

export async function getProgramItems(
  supabase: DbClient,
  config: WeddingConfig,
): Promise<ProgramItem[]> {
  const settingsRow = await getConfigOverlayRow(supabase, config)
  const appSettingsItems = mapProgramItemsFromSettings(settingsRow)

  if (appSettingsItems?.length) {
    return appSettingsItems
  }

  if (config.source === 'modern' && config.sourceId) {
    const { data: modernRowsRaw, error } = (await query(supabase, 'program_items')
      .select('*')
      .eq('config_id', config.sourceId)
      .order('sort_order', { ascending: true })) as QueryResult<
      Database['public']['Tables']['program_items']['Row'][]
    >
    const data = modernRowsRaw ?? []

    if (data?.length) {
      return mapModernProgramItems(data)
    }

    if (error && !isMissingRelation(error)) {
      throw error
    }
  }

  if (config.source === 'legacy' && config.sourceId) {
    const { data: legacyRowsRaw, error } = (await query(supabase, 'hochzeiten')
      .select('*')
      .eq('id', config.sourceId)) as QueryResult<Database['public']['Tables']['hochzeiten']['Row'][]>
    const data = legacyRowsRaw ?? []

    if (data?.length) {
      const firstLegacyRow = data[0]
      if (firstLegacyRow) {
        return mapLegacyProgramItems(firstLegacyRow)
      }
    }

    if (error && !isMissingRelation(error)) {
      throw error
    }
  }

  return DEFAULT_PROGRAM_ITEMS
}

export async function getFaqItems(supabase: DbClient, config: WeddingConfig): Promise<FaqItem[]> {
  const settingsRow = await getConfigOverlayRow(supabase, config)
  const appSettingsItems = mapFaqItemsFromSettings(settingsRow)

  if (appSettingsItems?.length) {
    return appSettingsItems
  }

  if (config.source === 'modern' && config.sourceId) {
    const { data: modernRowsRaw, error } = (await query(supabase, 'faq_items')
      .select('*')
      .eq('config_id', config.sourceId)
      .order('sort_order', { ascending: true })) as QueryResult<
      Database['public']['Tables']['faq_items']['Row'][]
    >
    const data = modernRowsRaw ?? []

    if (data?.length) {
      return mapModernFaqItems(data)
    }

    if (error && !isMissingRelation(error)) {
      throw error
    }
  }

  if (config.source === 'legacy' && config.sourceId) {
    const { data: legacyRowsRaw, error } = (await query(supabase, 'hochzeiten')
      .select('*')
      .eq('id', config.sourceId)) as QueryResult<Database['public']['Tables']['hochzeiten']['Row'][]>
    const data = legacyRowsRaw ?? []

    if (data?.length) {
      const firstLegacyRow = data[0]
      if (firstLegacyRow) {
        return mapLegacyFaqItems(firstLegacyRow)
      }
    }

    if (error && !isMissingRelation(error)) {
      throw error
    }
  }

  return DEFAULT_FAQ_ITEMS
}

export async function listRsvps(supabase: DbClient, config: WeddingConfig): Promise<RsvpRecord[]> {
  const householdDetailMap = mapRsvpHouseholdDetailsByRecordId(
    await listRsvpHouseholdDetailRows(supabase, config),
  )

  if (config.source === 'modern' && config.sourceId) {
    const { data: modernRowsRaw, error } = (await query(supabase, 'rsvps')
      .select('*')
      .eq('config_id', config.sourceId)
      .order('submitted_at', { ascending: false })) as QueryResult<
      Database['public']['Tables']['rsvps']['Row'][]
    >
    const data = modernRowsRaw ?? []

    if (data) {
      return mapModernRsvps(data, householdDetailMap)
    }

    if (error && !isMissingRelation(error)) {
      throw error
    }
  }

  if (config.source === 'legacy' && config.sourceId) {
    const { data: legacyRowsRaw, error } = (await query(supabase, 'rsvp_antworten')
      .select('*')
      .eq('hochzeit_id', config.sourceId)
      .order('created_at', { ascending: false })) as QueryResult<
      Database['public']['Tables']['rsvp_antworten']['Row'][]
    >
    const data = legacyRowsRaw ?? []

    if (data) {
      return mapLegacyRsvps(data, householdDetailMap)
    }

    if (error && !isMissingRelation(error)) {
      throw error
    }
  }

  return []
}

export async function deleteRsvp(
  supabase: DbClient,
  config: WeddingConfig,
  rsvpId: string,
): Promise<void> {
  await deleteRsvpHouseholdDetail(supabase, config, rsvpId)

  if (config.source === 'modern' && config.sourceId) {
    const { error } = (await query(supabase, 'rsvps')
      .delete()
      .eq('config_id', config.sourceId)
      .eq('id', rsvpId)) as QueryResult<null>

    if (!error) {
      return
    }

    if (!isMissingRelation(error)) {
      throw error
    }
  }

  if (config.sourceId) {
    const { error } = (await query(supabase, 'rsvp_antworten')
      .delete()
      .eq('hochzeit_id', config.sourceId)
      .eq('id', rsvpId)) as QueryResult<null>

    if (error) {
      throw error
    }

    return
  }

  throw new Error('Es steht aktuell keine aktive Hochzeitskonfiguration zur Verfügung.')
}

export function buildAdminSummary(rsvps: RsvpRecord[]): AdminSummary {
  return rsvps.reduce<AdminSummary>(
    (summary, entry) => {
      summary.total += 1
      if (entry.isAttending) {
        summary.attending += 1
        summary.guestCount += entry.totalGuests
      } else {
        summary.declined += 1
      }
      return summary
    },
    {
      total: 0,
      attending: 0,
      declined: 0,
      guestCount: 0,
    },
  )
}

interface SubmitRsvpInput {
  values: RsvpFormValues
  config: WeddingConfig
  ipHash: string | null
  userAgent: string | null
}

export async function submitRsvp(supabase: DbClient, input: SubmitRsvpInput): Promise<string> {
  const { values, config, ipHash, userAgent } = input
  const menuSelection = formatMenuSelection(values.menuChoices)
  const householdCounts = normalizeHouseholdCounts(values)

  if (config.source === 'modern' && config.sourceId) {
    const modernPayload: Database['public']['Tables']['rsvps']['Insert'] = {
      config_id: config.sourceId,
      guest_name: values.guestName,
      guest_email: values.guestEmail || null,
      is_attending: values.isAttending === 'yes',
      plus_one: values.plusOne,
      plus_one_name: values.plusOneName || null,
      total_guests: values.totalGuests,
      menu_choice: menuSelection,
      plus_one_menu: null,
      dietary_notes: values.dietaryNotes || null,
      message: values.message || null,
      ip_address: ipHash,
      user_agent: userAgent,
      honeypot: values.honeypot,
      submitted_at: new Date().toISOString(),
    }

    const { data, error } = (await query(supabase, 'rsvps')
      .insert(modernPayload)
      .select('id')
      .single()) as QueryResult<{ id: string }>

    if (!error && data) {
      await upsertRsvpHouseholdDetail(supabase, config, {
        rsvpRecordId: data.id,
        smallChildrenCount: householdCounts.smallChildrenCount,
        highChairCount: householdCounts.highChairCount,
      })
      return data.id
    }

    if (error && !isMissingRelation(error)) {
      throw error
    }
  }

  if (config.sourceId) {
    const legacyPayload: Database['public']['Tables']['rsvp_antworten']['Insert'] = {
      hochzeit_id: config.sourceId,
      name: values.guestName,
      teilnahme: values.isAttending === 'yes' ? 'Ja' : 'Nein',
      anzahl_personen: values.isAttending === 'yes' ? values.totalGuests : 1,
      zeremonie: values.isAttending === 'yes' ? 'Ja' : 'Nein',
      abendfeier: values.isAttending === 'yes' ? 'Ja' : 'Nein',
      menuwahl: menuSelection,
      ernaehrung: values.dietaryNotes || null,
      liedwunsch: values.message || null,
      vorfreude: values.isAttending === 'yes' ? 7 : 1,
    }

    const { data, error } = (await query(supabase, 'rsvp_antworten')
      .insert(legacyPayload)
      .select('id')
      .single()) as QueryResult<{ id: string }>

    if (error) {
      throw error
    }

    if (!data) {
      throw new Error('Die RSVP konnte nicht gespeichert werden.')
    }

    await upsertRsvpHouseholdDetail(supabase, config, {
      rsvpRecordId: data.id,
      smallChildrenCount: householdCounts.smallChildrenCount,
      highChairCount: householdCounts.highChairCount,
    })

    return data.id
  }

  throw new Error('Es steht aktuell keine aktive Hochzeitskonfiguration zur Verfügung.')
}
