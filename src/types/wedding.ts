import type { WeddingFontPresetId, WeddingTemplateId } from '@/lib/wedding-design'

export type DataSource = 'modern' | 'legacy' | 'fallback'
export type MenuChoice = 'meat' | 'fish' | 'vegetarian' | 'vegan'
export type ContentImageSection = 'programm' | 'anfahrt' | 'dresscode' | 'galerie' | 'rsvp' | 'faq'

export interface CouplePhoto {
  id: string
  imageUrl: string
  altText: string | null
  caption: string | null
}

export interface SectionImage {
  id: string
  section: ContentImageSection
  title: string | null
  imageUrl: string
  altText: string | null
}

export interface WeddingConfig {
  id: string
  source: DataSource
  sourceId: string | null
  partner1Name: string
  partner2Name: string | null
  coupleLabel: string
  guestCode: string | null
  photoPassword: string | null
  weddingDate: string
  venueName: string
  venueAddress: string
  venueMapsUrl: string | null
  welcomeMessage: string
  formTitle: string | null
  formDescription: string | null
  successTitle: string | null
  successDescription: string | null
  invitationStory: string | null
  galleryTitle: string | null
  galleryDescription: string | null
  dressCode: string | null
  dressCodeWomen: string | null
  dressCodeMen: string | null
  dressCodeExtras: string | null
  dressCodeColors: string[]
  templateId: WeddingTemplateId
  fontPresetId: WeddingFontPresetId
  rsvpDeadline: string
  heroImageUrl: string | null
  couplePhotos: CouplePhoto[]
  sectionImages: SectionImage[]
  menuOptions: string[]
  isActive: boolean
}

export interface ProgramItem {
  id: string
  timeLabel: string
  title: string
  description: string | null
  icon: string | null
  sortOrder: number
}

export interface FaqItem {
  id: string
  question: string
  answer: string
  sortOrder: number
}

export interface RsvpRecord {
  id: string
  guestName: string
  guestEmail: string | null
  isAttending: boolean
  plusOne: boolean
  plusOneName: string | null
  totalGuests: number
  menuChoice: string | null
  plusOneMenu: string | null
  dietaryNotes: string | null
  message: string | null
  createdAt: string | null
  source: Exclude<DataSource, 'fallback'>
}

export interface RsvpFormValues {
  guestName: string
  guestEmail: string
  isAttending: 'yes' | 'no'
  plusOne: boolean
  plusOneName: string
  totalGuests: number
  menuChoices: MenuChoice[]
  dietaryNotes: string
  message: string
  honeypot: ''
}

export interface AdminSummary {
  total: number
  attending: number
  declined: number
  guestCount: number
}

export interface LoginFormValues {
  email: string
  password: string
}

export interface GalleryPhoto {
  name: string
  path: string
  publicUrl: string
  createdAt: string | null
}

export interface EditableProgramItem {
  id: string
  timeLabel: string
  title: string
  description: string
}

export interface EditableFaqItem {
  id: string
  question: string
  answer: string
}

export interface EditableCouplePhoto {
  id: string
  imageUrl: string
  altText: string
  caption: string
}

export interface EditableSectionImage {
  id: string
  section: ContentImageSection
  title: string
  imageUrl: string
  altText: string
}

export interface WeddingEditorValues {
  source: Exclude<DataSource, 'fallback'>
  sourceId: string
  coupleLabel: string
  guestCode: string
  photographerPassword: string
  weddingDate: string
  rsvpDeadline: string
  venueName: string
  venueAddress: string
  welcomeMessage: string
  formTitle: string
  formDescription: string
  successTitle: string
  successDescription: string
  invitationStory: string
  galleryTitle: string
  galleryDescription: string
  dressCodeNote: string
  dressCodeWomen: string
  dressCodeMen: string
  dressCodeExtras: string
  dressCodeColors: string[]
  templateId: WeddingTemplateId
  fontPresetId: WeddingFontPresetId
  coverImageUrl: string
  couplePhotos: EditableCouplePhoto[]
  sectionImages: EditableSectionImage[]
  programItems: EditableProgramItem[]
  faqItems: EditableFaqItem[]
}
