import type { PostgrestError } from '@supabase/supabase-js'

import { DEFAULT_FAQ_ITEMS, DEFAULT_PROGRAM_ITEMS, ENV, MENU_CHOICE_LABELS } from '@/lib/constants'
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
  ContentImageSection,
  CouplePhoto,
  EditableCouplePhoto,
  EditableFaqItem,
  EditableProgramItem,
  EditableSectionImage,
  FaqItem,
  GalleryPhoto,
  MusicRequestEntry,
  MusicWishlistData,
  PlanningGuest,
  ProgramItem,
  RsvpFormValues,
  RsvpRecord,
  SeatingPlanData,
  SeatingTable,
  SectionImage,
  WeddingConfig,
  WeddingEditorValues,
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
  upsert: (values: unknown) => SupabaseQuery
  update: (values: unknown) => SupabaseQuery
  eq: (column: string, value: unknown) => SupabaseQuery
  limit: (count: number) => SupabaseQuery
  order: (column: string, options?: { ascending?: boolean }) => SupabaseQuery
  single: () => Promise<QueryResult<Record<string, unknown>>>
}

interface DbClient {
  from: (relation: string) => unknown
  storage?: {
    from: (bucket: string) => {
      list: (
        path: string,
        options?: { limit?: number; sortBy?: { column: string; order: 'asc' | 'desc' } },
      ) => Promise<StorageResult<Array<{ name: string; id?: string | null; created_at?: string | null }>>>
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
const GALLERY_BUCKET = 'hochzeitsfotos'
const APP_SETTINGS_ID = 1
const CONTENT_ASSET_PREFIX = 'content'

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
  dressCodeColors?: string[]
  templateId?: WeddingTemplateId
  fontPresetId?: WeddingFontPresetId
  musicWishlistEnabled?: boolean
  billingStatus?: 'paid' | 'unpaid'
  billingEmail?: string | null
  billingPaidAt?: string | null
  billingStripeSessionId?: string | null
  billingStripePaymentIntentId?: string | null
  planningGuests?: Array<{
    id?: string
    name?: string
    category?: string
    groupLabel?: string
    notes?: string
  }>
  seatingTables?: Array<{
    id?: string
    name?: string
    kind?: string
    seatCount?: number
    seatAssignments?: Array<string | null>
  }>
  publishSeatingPlan?: boolean
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
  email: string | null
  paidAt: string | null
  stripeCheckoutSessionId: string | null
  stripePaymentIntentId: string | null
}

interface StoredMusicRequest {
  id: string
  title: string
  artist: string | null
  requestedBy: string | null
  createdAt: string
  voterTokens: string[]
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

function parseStoredBillingRecord(row: ConfigOverlayRow | null): StoredBillingRecord {
  const texts = parseSettingsTexts(row)

  return {
    status: texts.billingStatus === 'paid' ? 'paid' : 'unpaid',
    email: normalizeOptionalString(texts.billingEmail)?.toLowerCase() ?? null,
    paidAt: normalizeOptionalString(texts.billingPaidAt),
    stripeCheckoutSessionId: normalizeOptionalString(texts.billingStripeSessionId),
    stripePaymentIntentId: normalizeOptionalString(texts.billingStripePaymentIntentId),
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

function isMissingBucketError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const message = 'message' in error ? String(error.message).toLowerCase() : ''
  return message.includes('bucket not found')
}

function sanitizeGalleryFileName(fileName: string): string {
  const normalized = fileName.normalize('NFKD').replace(/[^\w.\-]+/g, '-')
  return normalized.replace(/-+/g, '-').replace(/^-|-$/g, '') || 'foto'
}

function mapEditableProgramItems(items: ProgramItem[]): EditableProgramItem[] {
  return sortProgramItemsChronologically(items).map((item) => ({
    id: item.id,
    timeLabel: normalizeProgramTimeLabel(item.timeLabel),
    title: item.title,
    description: item.description ?? '',
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

function getDefaultDressCodeColors(): string[] {
  return ['pearl', 'champagner', 'sage', 'dusty-rose', 'navy']
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

function isSeatingTableKind(value: string | null | undefined): value is SeatingTable['kind'] {
  return value === 'guest' || value === 'service'
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
      category: isGuestCategory(item.category) ? item.category : 'other',
      groupLabel: item.groupLabel?.trim() || null,
      notes: item.notes?.trim() || null,
    }))
    .filter((item) => item.name)
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
      const assignments = Array.isArray(item.seatAssignments)
        ? item.seatAssignments.slice(0, seatCount).map((entry) => (typeof entry === 'string' ? entry : null))
        : []

      while (assignments.length < seatCount) {
        assignments.push(null)
      }

      return {
        id: item.id?.trim() || `seating-table-${index + 1}`,
        name: item.name?.trim() || `Tisch ${index + 1}`,
        kind: isSeatingTableKind((item as { kind?: string }).kind) ? (item as { kind?: SeatingTable['kind'] }).kind ?? 'guest' : 'guest',
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
    dressCodeColors: getDefaultDressCodeColors(),
    templateId: DEFAULT_WEDDING_TEMPLATE_ID,
    fontPresetId: DEFAULT_WEDDING_FONT_PRESET_ID,
    musicWishlistEnabled: false,
    rsvpDeadline: ENV.rsvpDeadline,
    heroImageUrl: null,
    couplePhotos: [],
    sectionImages: [],
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
    dressCodeColors: getDefaultDressCodeColors(),
    templateId: DEFAULT_WEDDING_TEMPLATE_ID,
    fontPresetId: DEFAULT_WEDDING_FONT_PRESET_ID,
    musicWishlistEnabled: false,
    rsvpDeadline: row.rsvp_deadline,
    heroImageUrl: null,
    couplePhotos: [],
    sectionImages: [],
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
    dressCodeColors,
    templateId: getNormalizedTemplateId(appTexts.templateId),
    fontPresetId: getNormalizedFontPresetId(appTexts.fontPresetId),
    musicWishlistEnabled: appTexts.musicWishlistEnabled === true,
    rsvpDeadline: normaliseDateInput(row.rsvp_deadline) ?? ENV.rsvpDeadline,
    heroImageUrl: texts.einladungCover ?? null,
    couplePhotos: parseCouplePhotos(appTexts),
    sectionImages: parseSectionImages(appTexts),
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
    const contentRow = await getWeddingContentRow(supabase, config.sourceId)

    if (contentRow) {
      return buildContentOverlayRow(contentRow)
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
    billingEmail: values.email,
    billingPaidAt: values.paidAt,
    billingStripeSessionId: values.stripeCheckoutSessionId,
    billingStripePaymentIntentId: values.stripePaymentIntentId,
    probe: undefined,
  })

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

      return parseStoredBillingRecord(buildContentOverlayRow(data))
  } catch (error) {
      if (!isMissingRelationError(error)) {
        throw error
      }
    }
  }

  if (config.source === 'legacy' && config.sourceId) {
    const legacyRow = await getLegacyWeddingRowById(supabase, config.sourceId)

    if (!legacyRow) {
      throw new Error('Die aktive Hochzeit konnte fuer die Zahlung nicht geladen werden.')
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

    return parseStoredBillingRecord(data)
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

  return parseStoredBillingRecord(data)
}

function buildPlanningTexts(
  existingTexts: AppSettingsTexts,
  values: SeatingPlanData,
): Json {
  return {
    ...existingTexts,
    publishSeatingPlan: values.isPublished,
    planningGuests: values.guests.map((guest) => ({
      id: guest.id,
      name: guest.name,
      category: guest.category,
      groupLabel: guest.groupLabel,
      notes: guest.notes,
    })),
    seatingTables: values.tables.map((table) => ({
      id: table.id,
      name: table.name,
      kind: table.kind,
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
    guests: parsePlanningGuests(texts),
    tables: parseSeatingTables(texts),
  }
}

export async function saveSeatingPlanData(
  supabase: DbClient,
  config: WeddingConfig,
  values: SeatingPlanData,
): Promise<SeatingPlanData> {
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

      return {
        isPublished: texts.publishSeatingPlan === true,
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
    return {
      isPublished: texts.publishSeatingPlan === true,
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
  return {
    isPublished: texts.publishSeatingPlan === true,
    guests: parsePlanningGuests(texts),
    tables: parseSeatingTables(texts),
  }
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

  return {
    ...baseConfig,
    partner1Name: couple.partner1Name,
    partner2Name: couple.partner2Name,
    coupleLabel,
    guestCode: texts.guestCode?.trim().toUpperCase() || baseConfig.guestCode,
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
    dressCodeColors,
    templateId: getNormalizedTemplateId(texts.templateId ?? baseConfig.templateId),
    fontPresetId: getNormalizedFontPresetId(texts.fontPresetId ?? baseConfig.fontPresetId),
    musicWishlistEnabled:
      texts.musicWishlistEnabled === true || baseConfig.musicWishlistEnabled === true,
    heroImageUrl: texts.einladungCover?.trim() || baseConfig.heroImageUrl,
    couplePhotos: hasCouplePhotos ? parseCouplePhotos(texts) : baseConfig.couplePhotos,
    sectionImages: hasSectionImages ? parseSectionImages(texts) : baseConfig.sectionImages,
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
      icon: null,
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
      icon: null,
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
    dressCodeColors: config.dressCodeColors,
    templateId: config.templateId,
    fontPresetId: config.fontPresetId,
    musicWishlistEnabled: config.musicWishlistEnabled,
    coverImageUrl: config.heroImageUrl ?? '',
    couplePhotos: mapEditableCouplePhotos(config.couplePhotos),
    sectionImages: mapEditableSectionImages(config.sectionImages),
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

function mapModernRsvps(rows: Database['public']['Tables']['rsvps']['Row'][]): RsvpRecord[] {
  return rows.map((row) => ({
    id: row.id,
    guestName: row.guest_name,
    guestEmail: row.guest_email,
    isAttending: row.is_attending,
    plusOne: row.plus_one ?? false,
    plusOneName: row.plus_one_name,
    totalGuests: row.total_guests ?? 1,
    menuChoice: combineMenuSelectionLabels(row.menu_choice, row.plus_one_menu),
    plusOneMenu: row.plus_one_menu,
    dietaryNotes: row.dietary_notes,
    message: row.message,
    createdAt: row.submitted_at,
    source: 'modern',
  }))
}

function mapLegacyRsvps(rows: Database['public']['Tables']['rsvp_antworten']['Row'][]): RsvpRecord[] {
  return rows.map((row) => ({
    id: row.id,
    guestName: row.name ?? 'Gast',
    guestEmail: null,
    isAttending: (row.teilnahme ?? '').toLowerCase().includes('ja'),
    plusOne: (row.anzahl_personen ?? 1) > 1,
    plusOneName: null,
    totalGuests: row.anzahl_personen ?? 1,
    menuChoice: row.menuwahl,
    plusOneMenu: null,
    dietaryNotes: row.ernaehrung,
    message: row.liedwunsch,
    createdAt: row.created_at,
    source: 'legacy',
  }))
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
  const normalizedGuestCode = guestCode.toUpperCase()
  const activeConfig = await getActiveWeddingConfig(supabase)

  if (activeConfig.guestCode?.toUpperCase() === normalizedGuestCode) {
    return activeConfig
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
    dressCodeColors: config.dressCodeColors,
    templateId: config.templateId,
    fontPresetId: config.fontPresetId,
    musicWishlistEnabled: config.musicWishlistEnabled,
    coverImageUrl: config.heroImageUrl ?? '',
    couplePhotos: mapEditableCouplePhotos(config.couplePhotos),
    sectionImages: mapEditableSectionImages(config.sectionImages),
    programItems: mapEditableProgramItems(programItems),
    faqItems: mapEditableFaqItems(faqItems),
  }
}

export async function listGalleryPhotos(
  supabase: DbClient,
  config: WeddingConfig,
): Promise<GalleryPhoto[]> {
  if (!config.sourceId || !supabase.storage) {
    return []
  }

  const { data, error } = await supabase.storage.from(GALLERY_BUCKET).list(config.sourceId, {
    limit: 1000,
    sortBy: {
      column: 'created_at',
      order: 'desc',
    },
  })

  if (error) {
    if (isMissingBucketError(error)) {
      return []
    }

    throw error
  }

  return (data ?? [])
    .filter((file) => file.id)
    .map((file) => ({
      name: file.name,
      path: `${config.sourceId}/${file.name}`,
      publicUrl: buildGalleryPublicUrl(`${config.sourceId}/${file.name}`),
      createdAt: file.created_at ?? null,
    }))
}

export async function uploadGalleryFiles(
  supabase: DbClient,
  config: WeddingConfig,
  files: Array<{
    name: string
    contentType: string
    body: Uint8Array
  }>,
): Promise<void> {
  if (!config.sourceId || !supabase.storage) {
    throw new Error('Die Galerie ist aktuell nicht verfügbar.')
  }

  for (const file of files) {
    const safeName = sanitizeGalleryFileName(file.name)
    const uniqueName = `${Date.now()}-${safeName}`
    const path = `${config.sourceId}/${uniqueName}`
    const { error } = await supabase.storage.from(GALLERY_BUCKET).upload(path, file.body, {
      cacheControl: '3600',
      contentType: file.contentType,
      upsert: false,
    })

    if (error) {
      if (isMissingBucketError(error)) {
        throw new Error('Die Fotogalerie ist noch nicht eingerichtet.')
      }

      throw error
    }
  }
}

export async function uploadContentImageFile(
  supabase: DbClient,
  config: WeddingConfig,
  input: {
    name: string
    contentType: string
    body: Uint8Array
    folder: 'cover' | 'couple' | 'section'
  },
): Promise<{ path: string; publicUrl: string }> {
  if (!config.sourceId || !supabase.storage) {
    throw new Error('Die Bildverwaltung ist aktuell nicht verfügbar.')
  }

  const safeName = sanitizeGalleryFileName(input.name)
  const uniqueName = `${Date.now()}-${safeName}`
  const path = `${CONTENT_ASSET_PREFIX}/${config.sourceId}/${input.folder}/${uniqueName}`
  const { error } = await supabase.storage.from(GALLERY_BUCKET).upload(path, input.body, {
    cacheControl: '3600',
    contentType: input.contentType,
    upsert: false,
  })

  if (error) {
    if (isMissingBucketError(error)) {
      throw new Error('Der Bildspeicher ist noch nicht eingerichtet.')
    }

    throw error
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
    dressCodeColors: values.dressCodeColors,
    templateId: values.templateId,
    fontPresetId: values.fontPresetId,
    musicWishlistEnabled: values.musicWishlistEnabled,
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
      partner_2_name: splitCouple.partner2Name ?? currentModernRow.partner_2_name,
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
  if (config.source === 'modern' && config.sourceId) {
    const { data: modernRowsRaw, error } = (await query(supabase, 'rsvps')
      .select('*')
      .eq('config_id', config.sourceId)
      .order('submitted_at', { ascending: false })) as QueryResult<
      Database['public']['Tables']['rsvps']['Row'][]
    >
    const data = modernRowsRaw ?? []

    if (data) {
      return mapModernRsvps(data)
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
      return mapLegacyRsvps(data)
    }

    if (error && !isMissingRelation(error)) {
      throw error
    }
  }

  return []
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

    return data.id
  }

  throw new Error('Es steht aktuell keine aktive Hochzeitskonfiguration zur Verfügung.')
}
