import { z } from 'zod'

import { DRESSCODE_COLOR_OPTIONS } from '@/lib/constants'
import { PROGRAM_ICON_OPTIONS } from '@/lib/program-icons'
import {
  WEDDING_FONT_OPTIONS,
  WEDDING_TEMPLATE_OPTIONS,
} from '@/lib/wedding-design'

const weddingTemplateIds = WEDDING_TEMPLATE_OPTIONS.map((option) => option.id) as [
  (typeof WEDDING_TEMPLATE_OPTIONS)[number]['id'],
  ...(typeof WEDDING_TEMPLATE_OPTIONS)[number]['id'][],
]

const weddingFontPresetIds = WEDDING_FONT_OPTIONS.map((option) => option.id) as [
  (typeof WEDDING_FONT_OPTIONS)[number]['id'],
  ...(typeof WEDDING_FONT_OPTIONS)[number]['id'][],
]

const programIconNames = new Set<string>(PROGRAM_ICON_OPTIONS.map((option) => option.value))

const imageUrlSchema = z
  .string()
  .trim()
  .min(1, 'Bitte gib eine Bild-URL ein.')
  .max(2_000_000)
  .regex(/^(https?:\/\/|\/|data:image\/)/, 'Bitte gib eine gültige Bild-URL ein.')

const editableProgramItemSchema = z.object({
  id: z.string().min(1),
  timeLabel: z.string().trim().max(50),
  title: z.string().trim().min(1, 'Bitte gib einen Programmtitel ein.').max(200),
  description: z.string().trim().max(500),
  icon: z
    .string()
    .trim()
    .refine((value) => !value || programIconNames.has(value), 'Bitte wähle ein gültiges Icon aus.'),
})

const editableFaqItemSchema = z.object({
  id: z.string().min(1),
  question: z.string().trim().min(1, 'Bitte gib eine Frage ein.').max(200),
  answer: z.string().trim().min(1, 'Bitte gib eine Antwort ein.').max(1000),
})

const editableCouplePhotoSchema = z.object({
  id: z.string().min(1),
  imageUrl: imageUrlSchema,
  altText: z.string().trim().max(200),
  caption: z.string().trim().max(200),
})

const editableSectionImageSchema = z.object({
  id: z.string().min(1),
  section: z.enum(['programm', 'anfahrt', 'dresscode', 'galerie', 'rsvp', 'faq']),
  title: z.string().trim().max(120),
  imageUrl: imageUrlSchema,
  altText: z.string().trim().max(200),
})

const optionalUrlSchema = z
  .string()
  .trim()
  .max(2_000_000)
  .refine((value) => !value || /^https?:\/\//.test(value), 'Bitte gib eine gültige URL ein.')

const editableVendorProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, 'Bitte gib einen Namen ein.').max(160),
  role: z.string().trim().min(1, 'Bitte gib eine Funktion ein.').max(160),
  websiteUrl: optionalUrlSchema,
  instagramUrl: optionalUrlSchema,
  imageUrl: z
    .string()
    .trim()
    .max(2_000_000)
    .refine(
      (value) => !value || /^(https?:\/\/|\/|data:image\/)/.test(value),
      'Bitte gib eine gültige Bild-URL ein.',
    ),
})

export const weddingEditorSchema = z.object({
  source: z.enum(['modern', 'legacy']),
  sourceId: z.string().min(1),
  coupleLabel: z.string().trim().min(2, 'Bitte gib den Namen des Brautpaares ein.').max(200),
  guestCode: z.string().trim().min(2).max(120),
  photographerPassword: z.string().trim().max(200),
  weddingDate: z.string().trim().min(4, 'Bitte gib ein Hochzeitsdatum ein.').max(50),
  rsvpDeadline: z.string().trim().min(4, 'Bitte gib eine RSVP-Frist ein.').max(50),
  venueName: z.string().trim().min(2, 'Bitte gib einen Ort ein.').max(200),
  venueAddress: z.string().trim().min(2, 'Bitte gib eine Adresse ein.').max(300),
  welcomeMessage: z.string().trim().min(2, 'Bitte gib einen Begrüßungstext ein.').max(1000),
  formTitle: z.string().trim().max(200),
  formDescription: z.string().trim().max(1000),
  successTitle: z.string().trim().max(200),
  successDescription: z.string().trim().max(1000),
  invitationStory: z.string().trim().max(2000),
  galleryTitle: z.string().trim().max(200),
  galleryDescription: z.string().trim().max(1000),
  dressCodeNote: z.string().trim().max(1000),
  dressCodeWomen: z.string().trim().max(1000),
  dressCodeMen: z.string().trim().max(1000),
  dressCodeExtras: z.string().trim().max(1000),
  dressCodeColors: z.array(z.string().trim().min(1).max(50)).max(DRESSCODE_COLOR_OPTIONS.length),
  templateId: z.enum(weddingTemplateIds),
  fontPresetId: z.enum(weddingFontPresetIds),
  musicWishlistEnabled: z.boolean().default(false),
  sharePrivateGalleryWithGuests: z.boolean().default(false),
  coverImageUrl: z.string().trim().max(2_000_000),
  couplePhotos: z.array(editableCouplePhotoSchema).max(8),
  sectionImages: z.array(editableSectionImageSchema).max(24),
  vendorProfiles: z.array(editableVendorProfileSchema).max(24),
  programItems: z.array(editableProgramItemSchema).max(20),
  faqItems: z.array(editableFaqItemSchema).max(20),
})

export type WeddingEditorSchema = z.infer<typeof weddingEditorSchema>
