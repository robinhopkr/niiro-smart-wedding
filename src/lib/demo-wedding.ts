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
  photoPassword: null,
  weddingDate: '2027-06-19T15:30:00+02:00',
  venueName: 'Landgut Sonnenried',
  venueAddress: 'Alte Lindenstrasse 7, 21465 Wentorf bei Hamburg',
  venueMapsUrl: null,
  welcomeMessage:
    'Willkommen zu einer Beispielhochzeit. So kann eure Einladung auf Mobilgeraeten und am Desktop aussehen, inklusive RSVP, Zeitplan und Galerie.',
  formTitle: 'Beispiel-RSVP testen',
  formDescription:
    'Dieses Formular ist Teil der Demo. Beim Absenden wird nichts gespeichert, die Erfolgsansicht koennt ihr aber komplett ausprobieren.',
  successTitle: 'Danke, {name}. So wirkt die Bestaetigung fuer eure Gaeste.',
  successDescription:
    'In der echten Einladung steht hier die finale Rueckmeldung mit Datum, Ort und persoenlicher Nachricht an eure Gaeste.',
  invitationStory:
    'Mila und Jonas feiern eine entspannte Sommerhochzeit mit Trauung im Garten, Dinner in der Scheune und einer langen Tanznacht unter Lichterketten.',
  galleryTitle: 'Beispielgalerie',
  galleryDescription:
    'Eine kleine Vorschau darauf, wie Hochzeitsfotos nach dem Fest elegant praesentiert werden koennen.',
  dressCode: 'Sommerlich elegant in soften Naturtoenen, gern mit Leinen, Satin und warmen Akzenten.',
  dressCodeWomen: 'Midi- oder Maxikleider, Jumpsuits oder leichte Zweiteiler in warmen Naturfarben.',
  dressCodeMen: 'Leichte Anzuege, Stoffhosen mit Hemd oder lockere Kombinationen in Sand, Olive und Navy.',
  dressCodeExtras:
    'Bitte verzichtet moeglichst auf reines Signalrot und Neonfarben, damit die Bildsprache harmonisch bleibt.',
  dressCodeColors: ['pearl', 'champagner', 'sage', 'dusty-rose', 'powder-blue', 'navy'],
  templateId: 'rose-garden',
  fontPresetId: 'cormorant-nunito',
  musicWishlistEnabled: false,
  sharePrivateGalleryWithGuests: false,
  rsvpDeadline: '2027-05-15T23:59:59+02:00',
  heroImageUrl: '/images/demo/cover-couple.svg',
  couplePhotos: [
    {
      id: 'demo-couple-cover',
      imageUrl: '/images/demo/cover-couple.svg',
      altText: 'Illustration eines stilisierten Brautpaares vor floraler Kulisse',
      caption: 'Willkommensbild',
    },
    {
      id: 'demo-couple-portrait-1',
      imageUrl: '/images/demo/couple-portrait-1.svg',
      altText: 'Illustration eines Paares mit Blumenbogen und Abendlicht',
      caption: 'Paarportrait im Garten',
    },
    {
      id: 'demo-couple-portrait-2',
      imageUrl: '/images/demo/couple-portrait-2.svg',
      altText: 'Illustration eines Paares beim Sektempfang',
      caption: 'Sektempfang bei Sonnenuntergang',
    },
  ],
  sectionImages: [],
  menuOptions: ['meat', 'fish', 'vegetarian', 'vegan'],
  isActive: true,
}

export const DEMO_PROGRAM_ITEMS: ProgramItem[] = [
  {
    id: 'demo-program-1',
    timeLabel: '15:30',
    title: 'Freie Trauung im Garten',
    description:
      'Die Zeremonie beginnt unter alten Linden. Danach folgen Glueckwuensche, Musik und ein lockerer Aperitif.',
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
      'Ein langes Dinner mit saisonalem Menu, Reden, Kerzenlicht und viel Zeit fuer gute Geschichten am Tisch.',
    icon: 'UtensilsCrossed',
    sortOrder: 3,
  },
  {
    id: 'demo-program-4',
    timeLabel: '21:30',
    title: 'Tanzflaeche und Late-Night-Bar',
    description:
      'Danach geht es direkt auf die Tanzflaeche. Spaeter wartet noch eine kleine Dessertbar mit Espresso und Mitternachtssnacks.',
    icon: 'Music4',
    sortOrder: 4,
  },
]

export const DEMO_FAQ_ITEMS: FaqItem[] = [
  {
    id: 'demo-faq-1',
    question: 'Wie wirkt die Demo auf dem Smartphone?',
    answer:
      'Genau dafuer ist diese Beispielhochzeit gedacht. Alle Inhalte sind responsiv aufgebaut und zeigen denselben Stil auf Mobilgeraeten und am Desktop.',
    sortOrder: 1,
  },
  {
    id: 'demo-faq-2',
    question: 'Bleibt der Gaestebereich kostenlos?',
    answer:
      'Ja. Die Bezahlpflicht betrifft nur den geschuetzten Paarbereich. Einladung, RSVP und Galerie bleiben fuer eure Gaeste kostenlos.',
    sortOrder: 2,
  },
  {
    id: 'demo-faq-3',
    question: 'Kann das Paar spaeter alles anpassen?',
    answer:
      'Ja. Namen, Texte, Ablauf, Dresscode, Bilder und Galerie koennen spaeter im Paarbereich bearbeitet werden.',
    sortOrder: 3,
  },
  {
    id: 'demo-faq-4',
    question: 'Werden Demo-RSVPs gespeichert?',
    answer: 'Nein. In dieser Demo wird beim Testen nichts an eine echte Hochzeit uebermittelt.',
    sortOrder: 4,
  },
]

export const DEMO_GALLERY_PHOTOS: GalleryPhoto[] = [
  {
    name: 'Golden Hour Empfang',
    path: 'demo/gallery-golden-hour.svg',
    publicUrl: '/images/demo/gallery-golden-hour.svg',
    createdAt: '2027-06-19T18:05:00+02:00',
    visibility: 'public',
  },
  {
    name: 'Dinner unter Lichterketten',
    path: 'demo/gallery-dinner.svg',
    publicUrl: '/images/demo/gallery-dinner.svg',
    createdAt: '2027-06-19T20:14:00+02:00',
    visibility: 'public',
  },
  {
    name: 'Tanzflaeche am Abend',
    path: 'demo/gallery-dance.svg',
    publicUrl: '/images/demo/gallery-dance.svg',
    createdAt: '2027-06-19T22:48:00+02:00',
    visibility: 'public',
  },
]
