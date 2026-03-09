import {
  Bus,
  CakeSlice,
  CalendarHeart,
  Camera,
  CarFront,
  ChefHat,
  Church,
  Flower2,
  Gift,
  GlassWater,
  Handshake,
  Heart,
  Hotel,
  MapPin,
  MicVocal,
  MoonStar,
  Music4,
  PartyPopper,
  Sparkles,
  Sun,
  Users,
  UtensilsCrossed,
  Wine,
  type LucideIcon,
} from 'lucide-react'

export const PROGRAM_ICON_COMPONENTS = {
  Bus,
  CakeSlice,
  CalendarHeart,
  Camera,
  CarFront,
  ChefHat,
  Church,
  Flower2,
  Gift,
  GlassWater,
  Handshake,
  Heart,
  Hotel,
  MapPin,
  MicVocal,
  MoonStar,
  Music4,
  PartyPopper,
  Sparkles,
  Sun,
  Users,
  UtensilsCrossed,
  Wine,
} as const

export type ProgramIconName = keyof typeof PROGRAM_ICON_COMPONENTS

export interface ProgramIconOption {
  value: ProgramIconName
  label: string
  description: string
  icon: LucideIcon
}

export const DEFAULT_PROGRAM_ICON: ProgramIconName = 'CalendarHeart'

export const PROGRAM_ICON_OPTIONS: readonly ProgramIconOption[] = [
  { value: 'Church', label: 'Trauung', description: 'Für Zeremonie, Kirche oder Standesamt.', icon: Church },
  { value: 'Heart', label: 'Herzensmoment', description: 'Für Ringtausch, Ja-Wort oder Couple-Momente.', icon: Heart },
  { value: 'CalendarHeart', label: 'Ablauf', description: 'Neutral für allgemeine Programmpunkte.', icon: CalendarHeart },
  { value: 'Sparkles', label: 'Sektempfang', description: 'Für Empfang, Apero und Glückwünsche.', icon: Sparkles },
  { value: 'GlassWater', label: 'Anstoßen', description: 'Für Drinks, Empfang und Toasts.', icon: GlassWater },
  { value: 'Wine', label: 'Cocktailstunde', description: 'Für Bar, Wein oder Sundowner.', icon: Wine },
  { value: 'UtensilsCrossed', label: 'Dinner', description: 'Für Essen, Buffet oder Abendessen.', icon: UtensilsCrossed },
  { value: 'ChefHat', label: 'Catering', description: 'Für Food-Stationen oder Küchen-Highlights.', icon: ChefHat },
  { value: 'CakeSlice', label: 'Torte', description: 'Für Hochzeitstorte, Dessert oder Sweet Table.', icon: CakeSlice },
  { value: 'Music4', label: 'Musik', description: 'Für DJ, Live-Musik oder Tanzfläche.', icon: Music4 },
  { value: 'PartyPopper', label: 'Party', description: 'Für Feier, Mitternachtssnack oder Afterparty.', icon: PartyPopper },
  { value: 'Camera', label: 'Fotos', description: 'Für Shooting, Fotobox oder Gruppenbilder.', icon: Camera },
  { value: 'Flower2', label: 'Floristik', description: 'Für Blumen, Dekoration oder Styling.', icon: Flower2 },
  { value: 'Gift', label: 'Geschenke', description: 'Für Überraschungen oder Wunschmomente.', icon: Gift },
  { value: 'MicVocal', label: 'Reden', description: 'Für Ansprachen, Moderation oder Beiträge.', icon: MicVocal },
  { value: 'Users', label: 'Gäste', description: 'Für Begrüßung, Kennenlernen oder Gruppenmomente.', icon: Users },
  { value: 'CarFront', label: 'Anreise', description: 'Für Fahrt, Taxi, Parken oder Abfahrt.', icon: CarFront },
  { value: 'Bus', label: 'Shuttle', description: 'Für Transfer oder Bus-Shuttle.', icon: Bus },
  { value: 'Hotel', label: 'Hotel', description: 'Für Check-in, Zimmer oder Übernachtung.', icon: Hotel },
  { value: 'MapPin', label: 'Location', description: 'Für Venue-Wechsel oder Treffpunkte.', icon: MapPin },
  { value: 'Handshake', label: 'Empfang', description: 'Für Begrüßung, Gästeempfang oder Meet-up.', icon: Handshake },
  { value: 'Sun', label: 'Brunch', description: 'Für Morgenprogramm, Frühstück oder Brunch.', icon: Sun },
  { value: 'MoonStar', label: 'Late Night', description: 'Für Nachtprogramm oder Ausklang.', icon: MoonStar },
] as const

export function isProgramIconName(value: string | null | undefined): value is ProgramIconName {
  return Boolean(value && value in PROGRAM_ICON_COMPONENTS)
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function resolveProgramIconName(input: {
  icon?: string | null
  title?: string | null
  description?: string | null
}): ProgramIconName {
  if (isProgramIconName(input.icon)) {
    return input.icon
  }

  const haystack = normalizeSearchText([input.title, input.description].filter(Boolean).join(' '))

  if (/(trauung|zeremonie|kirche|standesamt|freie trauung|ja wort|jawort|ringtausch|eheversprechen)/.test(haystack)) {
    return 'Church'
  }

  if (/(sektempfang|empfang|apero|aperitif|toast|anstossen|anstoßen|cocktail|sundowner)/.test(haystack)) {
    return 'GlassWater'
  }

  if (/(dinner|essen|abendessen|mittagessen|buffet|menu|menue|menü)/.test(haystack)) {
    return 'UtensilsCrossed'
  }

  if (/(catering|kueche|kuche|chef|food station)/.test(haystack)) {
    return 'ChefHat'
  }

  if (/(torte|kuchen|dessert|sweet table|nachspeise)/.test(haystack)) {
    return 'CakeSlice'
  }

  if (/(party|afterparty|feier|tanzen|tanz|dj|musik|band|dancefloor)/.test(haystack)) {
    return 'Music4'
  }

  if (/(fotobox|shooting|paarshooting|fotos|gruppenfoto|bilder|portrait)/.test(haystack)) {
    return 'Camera'
  }

  if (/(shuttle|transfer|bus)/.test(haystack)) {
    return 'Bus'
  }

  if (/(anreise|ankunft|abfahrt|fahrt|taxi|parken|parkplatz)/.test(haystack)) {
    return 'CarFront'
  }

  if (/(hotel|check in|check-in|ubernachtung|ubernachten|zimmer)/.test(haystack)) {
    return 'Hotel'
  }

  if (/(rede|ansprache|moderation|toastmaster|trauzeuge|traueredner|redner)/.test(haystack)) {
    return 'MicVocal'
  }

  if (/(geschenk|wunsch|uberraschung|ueberraschung)/.test(haystack)) {
    return 'Gift'
  }

  if (/(blumen|floristik|bouquet|deko|dekoration)/.test(haystack)) {
    return 'Flower2'
  }

  if (/(brunch|fruhstuck|fruehstuck|morgen|breakfast)/.test(haystack)) {
    return 'Sun'
  }

  if (/(mitternacht|late night|ausklang|nacht)/.test(haystack)) {
    return 'MoonStar'
  }

  if (/(begrußung|begrussung|begruessung|welcome|gaste|gasteempfang|kennenlernen)/.test(haystack)) {
    return 'Users'
  }

  if (/(location|treffpunkt|venue|ortswechsel)/.test(haystack)) {
    return 'MapPin'
  }

  return DEFAULT_PROGRAM_ICON
}
