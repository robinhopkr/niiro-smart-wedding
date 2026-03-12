import type { FaqItem, GalleryPhoto, ProgramItem, WeddingConfig } from '@/types/wedding'

export const DEMO_GUEST_CODE = 'DEMO'

export const DEMO_WEDDING_CONFIG: WeddingConfig = {
  id: 'demo-wedding',
  source: 'fallback',
  sourceId: 'demo-wedding',
  partner1Name: 'Mila',
  partner2Name: 'Jonas',
  coupleLabel: 'Mila & Jonas',
  guestCode: DEMO_GUEST_CODE,
  plannerCustomerNumber: null,
  photoPassword: null,
  weddingDate: '2027-06-19T15:30:00+02:00',
  venueName: 'Landgut Sonnenried',
  venueAddress: 'Alte Lindenstrasse 7, 21465 Wentorf bei Hamburg',
  venueMapsUrl: null,
  welcomeMessage:
    'Willkommen zu einer Beispielhochzeit. So kann eure Einladung auf Mobilgeräten und am Desktop aussehen, inklusive RSVP, Zeitplan und Galerie.',
  formTitle: 'Beispiel-RSVP testen',
  formDescription:
    'Dieses Formular ist Teil der Demo. Beim Absenden wird nichts gespeichert, die Erfolgsansicht könnt ihr aber komplett ausprobieren.',
  successTitle: 'Danke, {name}. So wirkt die Bestätigung für eure Gäste.',
  successDescription:
    'In der echten Einladung steht hier die finale Rückmeldung mit Datum, Ort und persönlicher Nachricht an eure Gäste.',
  invitationStory:
    'Mila und Jonas feiern eine entspannte Sommerhochzeit mit Trauung im Garten, Dinner in der Scheune und einer langen Tanznacht unter Lichterketten.',
  galleryTitle: 'Beispielgalerie',
  galleryDescription:
    'Eine kleine Vorschau darauf, wie Hochzeitsfotos nach dem Fest elegant präsentiert werden können.',
  dressCode: 'Sommerlich elegant in soften Naturtoenen, gern mit Leinen, Satin und warmen Akzenten.',
  dressCodeWomen: 'Midi- oder Maxikleider, Jumpsuits oder leichte Zweiteiler in warmen Naturfarben.',
  dressCodeMen: 'Leichte Anzuege, Stoffhosen mit Hemd oder lockere Kombinationen in Sand, Olive und Navy.',
  dressCodeExtras:
    'Bitte verzichtet moeglichst auf reines Signalrot und Neonfarben, damit die Bildsprache harmonisch bleibt.',
  dressCodeColorHint: 'soft',
  dressCodeColors: ['pearl', 'champagner', 'sage', 'dusty-rose', 'powder-blue', 'navy'],
  templateId: 'rose-garden',
  fontPresetId: 'cormorant-nunito',
  musicWishlistEnabled: false,
  sharePrivateGalleryWithGuests: false,
  rsvpDeadline: '2027-05-15T23:59:59+02:00',
  heroImageUrl: '/images/demo/section-location-new.jpg',
  couplePhotos: [
    {
      id: 'demo-couple-cover',
      imageUrl: '/images/demo/cover-couple-new.jpg',
      altText: 'Brautpaar in einem eleganten Close-up unter einem Schleier',
      caption: 'Romantisches Titelportrait',
    },
    {
      id: 'demo-couple-portrait-1',
      imageUrl: '/images/demo/couple-portrait-1-new.jpg',
      altText: 'Brautpaar bei einem Portrait auf einer Palmenallee',
      caption: 'Paarportrait vor der Feier',
    },
    {
      id: 'demo-couple-portrait-2',
      imageUrl: '/images/demo/couple-portrait-2-new.jpg',
      altText: 'Brautpaar bei einem stilvollen Editorial-Portrait im weichen Abendlicht',
      caption: 'Editorial Portrait im Abendlicht',
    },
  ],
  sectionImages: [
    {
      id: 'demo-section-program',
      section: 'programm',
      title: 'Stimmung für den Ablauf',
      imageUrl: '/images/demo/gallery-dinner-new.jpg',
      altText: 'Warm beleuchtete Hochzeitstafel unter Lichterketten im Freien',
    },
    {
      id: 'demo-section-location',
      section: 'anfahrt',
      title: 'Location & Anreise',
      imageUrl: '/images/demo/section-location-new.jpg',
      altText: 'Stilvoll vorbereitete freie Trauung im Gruenen mit Blumenbogen',
    },
    {
      id: 'demo-section-dresscode',
      section: 'dresscode',
      title: 'Dresscode Inspiration',
      imageUrl: '/images/demo/section-dresscode-new.jpg',
      altText: 'Braut mit modernem weissem Bouquet und eleganten Accessoires',
    },
    {
      id: 'demo-section-rsvp',
      section: 'rsvp',
      title: 'Antworten mit Stil',
      imageUrl: '/images/demo/section-rsvp-new.jpg',
      altText: 'Hochzeitseinladung mit Ringen und Briefpapier in zarten Naturtoenen',
    },
    {
      id: 'demo-section-faq',
      section: 'faq',
      title: 'Wichtige Details',
      imageUrl: '/images/demo/section-faq.jpg',
      altText: 'Nahaufnahme eines Paares mit Eheringen und ruhigem Hochzeitsdetail',
    },
  ],
  vendorProfiles: [
    {
      id: 'demo-vendor-photography',
      name: 'Studio Elara',
      role: 'Fotografie',
      websiteUrl: 'https://example.com/studio-elara',
      instagramUrl: 'https://instagram.com/studio.elara',
      imageUrl: '/images/demo/vendor-photography.jpg',
    },
    {
      id: 'demo-vendor-dj',
      name: 'Noir Notes',
      role: 'DJ & Live-Sets',
      websiteUrl: 'https://example.com/noir-notes',
      instagramUrl: 'https://instagram.com/noirnotes.music',
      imageUrl: '/images/demo/vendor-dj.jpg',
    },
    {
      id: 'demo-vendor-catering',
      name: 'Atelier Table',
      role: 'Catering & Dinner',
      websiteUrl: 'https://example.com/atelier-table',
      instagramUrl: 'https://instagram.com/ateliertable.events',
      imageUrl: '/images/demo/vendor-catering.jpg',
    },
  ],
  menuOptions: ['meat', 'fish', 'vegetarian', 'vegan'],
  isActive: true,
}

export const DEMO_PROGRAM_ITEMS: ProgramItem[] = [
  {
    id: 'demo-program-1',
    timeLabel: '15:30',
    title: 'Freie Trauung im Garten',
    description:
      'Die Zeremonie beginnt unter alten Linden. Danach folgen Glückwünsche, Musik und ein lockerer Aperitif.',
    icon: 'Heart',
    sortOrder: 1,
  },
  {
    id: 'demo-program-2',
    timeLabel: '17:00',
    title: 'Aperitif und erste Portraits',
    description:
      'Bei Drinks, kleinen Snacks und Sonnenuntergangslicht entstehen erste Gruppenfotos und entspannte Gespraeche.',
    icon: 'GlassWater',
    sortOrder: 2,
  },
  {
    id: 'demo-program-3',
    timeLabel: '19:00',
    title: 'Dinner in der Scheune',
    description:
      'Ein langes Dinner mit saisonalem Menü, Reden, Kerzenlicht und viel Zeit für gute Geschichten am Tisch.',
    icon: 'UtensilsCrossed',
    sortOrder: 3,
  },
  {
    id: 'demo-program-4',
    timeLabel: '21:30',
    title: 'Tanzfläche und Late-Night-Bar',
    description:
      'Danach geht es direkt auf die Tanzfläche. Später wartet noch eine kleine Dessertbar mit Espresso und Mitternachtssnacks.',
    icon: 'Music4',
    sortOrder: 4,
  },
]

export const DEMO_FAQ_ITEMS: FaqItem[] = [
  {
    id: 'demo-faq-1',
    question: 'Wie wirkt die Demo auf dem Smartphone?',
    answer:
      'Genau dafür ist diese Beispielhochzeit gedacht. Alle Inhalte sind responsiv aufgebaut und zeigen denselben Stil auf Mobilgeräten und am Desktop.',
    sortOrder: 1,
  },
  {
    id: 'demo-faq-2',
    question: 'Bleibt der Gästebereich kostenlos?',
    answer:
      'Ja. Die Bezahlpflicht betrifft nur den geschützten Paarbereich. Einladung, RSVP und Galerie bleiben für eure Gäste kostenlos.',
    sortOrder: 2,
  },
  {
    id: 'demo-faq-3',
    question: 'Kann das Paar später alles anpassen?',
    answer:
      'Ja. Namen, Texte, Ablauf, Dresscode, Bilder und Galerie können später im Paarbereich bearbeitet werden.',
    sortOrder: 3,
  },
  {
    id: 'demo-faq-4',
    question: 'Werden Demo-RSVPs gespeichert?',
    answer: 'Nein. In dieser Demo wird beim Testen nichts an eine echte Hochzeit übermittelt.',
    sortOrder: 4,
  },
]

export const DEMO_GALLERY_PHOTOS: GalleryPhoto[] = [
  {
    name: 'Portrait im Abendlicht',
    path: 'demo/gallery-golden-hour.jpg',
    publicUrl: '/images/demo/cover-couple-new.jpg',
    previewUrl: '/images/demo/cover-couple-new.jpg',
    createdAt: '2027-06-19T18:05:00+02:00',
    visibility: 'public',
    storageProvider: 'supabase',
    originalPath: 'demo/gallery-golden-hour.jpg',
  },
  {
    name: 'Dinner unter Lichterketten',
    path: 'demo/gallery-dinner.jpg',
    publicUrl: '/images/demo/gallery-dinner-new.jpg',
    previewUrl: '/images/demo/gallery-dinner-new.jpg',
    createdAt: '2027-06-19T20:14:00+02:00',
    visibility: 'public',
    storageProvider: 'supabase',
    originalPath: 'demo/gallery-dinner.jpg',
  },
  {
    name: 'Erster Tanz am Abend',
    path: 'demo/gallery-dance.jpg',
    publicUrl: '/images/demo/gallery-first-dance-new.jpg',
    previewUrl: '/images/demo/gallery-first-dance-new.jpg',
    createdAt: '2027-06-19T22:48:00+02:00',
    visibility: 'public',
    storageProvider: 'supabase',
    originalPath: 'demo/gallery-dance.jpg',
  },
]
