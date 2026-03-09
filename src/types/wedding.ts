import type { WeddingFontPresetId, WeddingTemplateId } from '@/lib/wedding-design'

export type DataSource = 'modern' | 'legacy' | 'fallback'
export type MenuChoice = 'meat' | 'fish' | 'vegetarian' | 'vegan'
export type ContentImageSection = 'programm' | 'anfahrt' | 'dresscode' | 'galerie' | 'rsvp' | 'faq'
export type GalleryVisibility = 'public' | 'private'
export type GuestCategory =
  | 'family'
  | 'close_friends'
  | 'friends'
  | 'work'
  | 'single'
  | 'bridal_party'
  | 'children'
  | 'vendors'
  | 'other'

export type SeatingTableKind = 'guest' | 'service' | 'couple'

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

export interface VendorProfile {
  id: string
  name: string
  role: string
  websiteUrl: string | null
  instagramUrl: string | null
  imageUrl: string | null
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
  musicWishlistEnabled: boolean
  sharePrivateGalleryWithGuests: boolean
  rsvpDeadline: string
  heroImageUrl: string | null
  couplePhotos: CouplePhoto[]
  sectionImages: SectionImage[]
  vendorProfiles: VendorProfile[]
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

export interface MusicRequestEntry {
  id: string
  title: string
  artist: string | null
  requestedBy: string | null
  votes: number
  createdAt: string
  hasVoted: boolean
  isTopTen: boolean
  rank: number
}

export interface MusicWishlistData {
  enabled: boolean
  requests: MusicRequestEntry[]
}

export interface PlanningGuest {
  id: string
  name: string
  category: GuestCategory
  groupLabel: string | null
  notes: string | null
}

export interface SeatingTable {
  id: string
  name: string
  kind: SeatingTableKind
  seatCount: number
  seatAssignments: Array<string | null>
}

export interface SeatingPlanData {
  isPublished: boolean
  guests: PlanningGuest[]
  tables: SeatingTable[]
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
  visibility: GalleryVisibility
}

export interface GalleryCollections {
  publicPhotos: GalleryPhoto[]
  privatePhotos: GalleryPhoto[]
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

export interface EditableVendorProfile {
  id: string
  name: string
  role: string
  websiteUrl: string
  instagramUrl: string
  imageUrl: string
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
  musicWishlistEnabled: boolean
  sharePrivateGalleryWithGuests: boolean
  coverImageUrl: string
  couplePhotos: EditableCouplePhoto[]
  sectionImages: EditableSectionImage[]
  vendorProfiles: EditableVendorProfile[]
  programItems: EditableProgramItem[]
  faqItems: EditableFaqItem[]
}
