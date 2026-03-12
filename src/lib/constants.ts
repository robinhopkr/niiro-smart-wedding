import type { ContentImageSection, FaqItem, GuestCategory, MenuChoice, ProgramItem } from '@/types/wedding'

const publicSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const publicSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const publicWeddingDate = process.env.NEXT_PUBLIC_WEDDING_DATE
const publicRsvpDeadline = process.env.NEXT_PUBLIC_RSVP_DEADLINE
const publicAppUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL
const canonicalAppUrl =
  process.env.NEXT_PUBLIC_CANONICAL_APP_URL?.trim() || 'https://smartwedding.niiro.ai'

function readAppUrl(): string {
  const normalized = publicAppUrl?.trim()

  if (!normalized) {
    return canonicalAppUrl
  }

  try {
    const parsed = new URL(normalized)

    if (parsed.hostname === 'hochzeits-rsvp.vercel.app') {
      return canonicalAppUrl
    }

    return parsed.origin
  } catch {
    return canonicalAppUrl
  }
}

function readRequiredPublicSupabaseConfig(
  value: string | undefined,
  key: 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
): string {
  if (!value) {
    throw new Error(`Fehlende Public-Env-Var: ${key}. Siehe .env.example`)
  }

  return value
}

export const ENV = {
  supabaseUrl: readRequiredPublicSupabaseConfig(publicSupabaseUrl, 'NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: readRequiredPublicSupabaseConfig(
    publicSupabaseAnonKey,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ),
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? null,
  r2AccountId: process.env.R2_ACCOUNT_ID ?? null,
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID ?? null,
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? null,
  r2Bucket: process.env.R2_BUCKET ?? null,
  r2PublicBaseUrl: process.env.R2_PUBLIC_BASE_URL ?? null,
  weddingDate: publicWeddingDate ?? '2026-11-03T14:00:00+01:00',
  rsvpDeadline: publicRsvpDeadline ?? '2026-10-01T23:59:59+02:00',
  appUrl: readAppUrl(),
  googleMapsEmbedUrl: process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_URL ?? null,
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 5),
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 3_600_000),
  adminEmail: process.env.ADMIN_EMAIL ?? null,
} as const

export const APP_BRAND_NAME = 'NiiRo Smart Wedding'
export const APP_SHORT_NAME = 'SmartWedding'
export const APP_DESCRIPTION =
  'NiiRo Smart Wedding — stilvolle Einladungen, klare Rückmeldungen und eine Fotogalerie an einem Ort.'

export const GALLERY_UPLOAD_MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024
export const GALLERY_STORAGE_WARNING_BYTES = 10 * 1024 * 1024 * 1024
export const GALLERY_STORAGE_HARD_LIMIT_BYTES = 20 * 1024 * 1024 * 1024
export const GALLERY_STORAGE_WARNING_PHOTO_COUNT = 1500
export const GALLERY_UPLOAD_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const
export const GALLERY_UPLOAD_SIZE_ESTIMATE_MULTIPLIER = 1.35

export const DEMO_NAV_ITEMS = [
  { href: '#programm', label: 'Programm' },
  { href: '#anfahrt', label: 'Anfahrt' },
  { href: '#dresscode', label: 'Dresscode' },
  { href: '#galerie', label: 'Galerie' },
  { href: '#rsvp', label: 'RSVP' },
  { href: '#faq', label: 'FAQ' },
] as const

export const MARKETING_NAV_ITEMS = [
  { href: '#funktionen', label: 'Funktionen' },
  { href: '#ablauf', label: 'Ablauf' },
  { href: '#vorteile', label: 'Vorteile' },
  { href: '#demo', label: 'Demo' },
] as const

export const ADMIN_NAV_ITEMS = [
  { href: '#uebersicht', label: 'Übersicht' },
  { href: '#gaeste', label: 'Teilnehmer' },
  { href: '#sitzplan', label: 'Tischplan' },
  { href: '#inhalte', label: 'Inhalte' },
  { href: '#zugaenge', label: 'Zugänge' },
  { href: '#rsvps', label: 'RSVP' },
  { href: '#vorschau', label: 'Vorschau' },
] as const

export const MENU_CHOICES = [
  { value: 'meat', label: 'Fleisch', emoji: '🥩' },
  { value: 'fish', label: 'Fisch', emoji: '🐟' },
  { value: 'vegetarian', label: 'Vegetarisch', emoji: '🥗' },
  { value: 'vegan', label: 'Vegan', emoji: '🌱' },
] as const

export const MENU_CHOICE_LABELS: Record<MenuChoice, string> = {
  meat: 'Fleisch',
  fish: 'Fisch',
  vegetarian: 'Vegetarisch',
  vegan: 'Vegan',
}

export const GUEST_CATEGORY_OPTIONS = [
  { value: 'family', label: 'Familie' },
  { value: 'close_friends', label: 'Enge Freunde' },
  { value: 'friends', label: 'Freunde' },
  { value: 'work', label: 'Arbeitskollegen' },
  { value: 'single', label: 'Singles' },
  { value: 'bridal_party', label: 'Trauzeugen & engster Kreis' },
  { value: 'children', label: 'Kinder' },
  { value: 'vendors', label: 'Dienstleister' },
  { value: 'other', label: 'Sonstige' },
] as const satisfies ReadonlyArray<{ value: GuestCategory; label: string }>

export const GUEST_CATEGORY_LABELS: Record<GuestCategory, string> = {
  family: 'Familie',
  close_friends: 'Enge Freunde',
  friends: 'Freunde',
  work: 'Arbeitskollegen',
  single: 'Singles',
  bridal_party: 'Trauzeugen & engster Kreis',
  children: 'Kinder',
  vendors: 'Dienstleister',
  other: 'Sonstige',
}

export const DRESSCODE_COLOR_OPTIONS = [
  { value: 'pearl', label: 'Perlweiß', hex: '#F5EFE6' },
  { value: 'champagner', label: 'Champagner', hex: '#E8D7B8' },
  { value: 'black', label: 'Schwarz', hex: '#171717' },
  { value: 'blush', label: 'Blush', hex: '#EEC8C3' },
  { value: 'sage', label: 'Sage', hex: '#A8B8A1' },
  { value: 'dusty-rose', label: 'Dusty Rose', hex: '#D8A7A6' },
  { value: 'mauve', label: 'Mauve', hex: '#B99AAD' },
  { value: 'terracotta', label: 'Terrakotta', hex: '#C77458' },
  { value: 'apricot', label: 'Apricot', hex: '#E6B18E' },
  { value: 'burgundy', label: 'Burgunder', hex: '#7D2E3A' },
  { value: 'plum', label: 'Pflaume', hex: '#6E476C' },
  { value: 'navy', label: 'Navy', hex: '#2D4364' },
  { value: 'powder-blue', label: 'Puderblau', hex: '#C7D7E8' },
  { value: 'forest', label: 'Tannengrün', hex: '#365845' },
  { value: 'eucalyptus', label: 'Eukalyptus', hex: '#8FA89A' },
  { value: 'lavender', label: 'Lavendel', hex: '#B7A6D8' },
  { value: 'sand', label: 'Sand', hex: '#DCC7A1' },
  { value: 'taupe', label: 'Taupe', hex: '#B9A99A' },
  { value: 'mocha', label: 'Mocca', hex: '#8A6B58' },
  { value: 'charcoal', label: 'Anthrazit', hex: '#44484F' },
  { value: 'sky', label: 'Himmelblau', hex: '#A9C7E8' },
  { value: 'olive', label: 'Oliv', hex: '#7D8455' },
  { value: 'emerald', label: 'Smaragd', hex: '#2F7467' },
] as const

export const DRESSCODE_COLOR_HINT_OPTIONS = [
  { value: 'soft', label: 'Sanft – „Wenn ihr mögt, könnt ihr euch locker an dieser Farbwelt orientieren."' },
  { value: 'moderate', label: 'Empfehlung – „Wir würden uns freuen, wenn ihr euch an unserer Farbwelt orientiert."' },
  { value: 'strong', label: 'Deutlich – „Bitte orientiert euch bei eurer Outfitwahl an unserer Farbpalette."' },
] as const

export const DRESSCODE_COLOR_HINT_TEXTS: Record<string, string> = {
  soft: 'Wenn ihr mögt, könnt ihr euch locker an dieser Farbwelt orientieren.',
  moderate: 'Wir würden uns freuen, wenn ihr euch an unserer Farbwelt orientiert.',
  strong: 'Bitte orientiert euch bei eurer Outfitwahl an unserer Farbpalette.',
}

export const CONTENT_IMAGE_SECTION_OPTIONS = [
  { value: 'programm', label: 'Programm' },
  { value: 'anfahrt', label: 'Anfahrt' },
  { value: 'dresscode', label: 'Dresscode' },
  { value: 'galerie', label: 'Galerie' },
  { value: 'rsvp', label: 'RSVP' },
  { value: 'faq', label: 'FAQ' },
] as const satisfies ReadonlyArray<{ value: ContentImageSection; label: string }>

export const DEFAULT_PROGRAM_ITEMS: ProgramItem[] = [
  {
    id: 'program-1',
    timeLabel: '14:00',
    title: 'Trauung',
    description: 'Wir beginnen mit der Trauung und freuen uns darauf, diesen Moment mit euch zu teilen.',
    icon: 'Heart',
    sortOrder: 1,
  },
  {
    id: 'program-2',
    timeLabel: '16:00',
    title: 'Sektempfang',
    description: 'Zeit für erste Glückwünsche, kleine Häppchen und gute Gespräche.',
    icon: 'Sparkles',
    sortOrder: 2,
  },
  {
    id: 'program-3',
    timeLabel: '18:30',
    title: 'Dinner',
    description: 'Gemeinsames Essen, kleine Reden und viel Zeit für gute Gespräche.',
    icon: 'UtensilsCrossed',
    sortOrder: 3,
  },
  {
    id: 'program-4',
    timeLabel: '21:00',
    title: 'Party',
    description: 'Danach wird getanzt, gefeiert und bis spät in den Abend angestoßen.',
    icon: 'Music4',
    sortOrder: 4,
  },
]

export const DEFAULT_FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq-1',
    question: 'Gibt es einen Dresscode?',
    answer: 'Festlich und entspannt. Kommt so, dass ihr euch wohlfühlt und gern mit uns feiert.',
    sortOrder: 1,
  },
  {
    id: 'faq-2',
    question: 'Kann ich eine Begleitperson mitbringen?',
    answer: 'Wenn auf eurer Einladung eine Begleitperson vorgesehen ist, könnt ihr sie direkt im RSVP angeben.',
    sortOrder: 2,
  },
  {
    id: 'faq-3',
    question: 'Gibt es Parkmöglichkeiten?',
    answer: 'Ja. Vor Ort und in der direkten Umgebung stehen ausreichend Parkplätze zur Verfügung.',
    sortOrder: 3,
  },
  {
    id: 'faq-4',
    question: 'Wie können wir Lebensmittelunverträglichkeiten mitteilen?',
    answer: 'Bitte nutzt dafür einfach das Feld für Ernährungswünsche im RSVP-Formular.',
    sortOrder: 4,
  },
]
