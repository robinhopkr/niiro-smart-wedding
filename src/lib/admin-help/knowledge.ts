export interface AdminHelpKnowledgeSection {
  id: string
  title: string
  href: string
  summary: string
  bullets: string[]
  keywords: string[]
}

export interface AdminHelpSource {
  href: string
  title: string
}

export const ADMIN_HELP_KNOWLEDGE_SECTIONS: AdminHelpKnowledgeSection[] = [
  {
    id: 'overview',
    title: 'Übersicht',
    href: '/admin/uebersicht',
    summary:
      'Die Übersichtsseite ist der Einstieg in den Paarbereich und zeigt Status, Schnellzugriffe, QR-Code und die wichtigsten Kennzahlen.',
    bullets: [
      'Hier seht ihr die wichtigsten RSVP-Zahlen, Medienstände und den schnellsten nächsten Schritt.',
      'Der QR-Code und der Einladungslink für eure Gäste sind hier bewusst prominent zu finden.',
      'Von hier kommt ihr direkt in Planung, Inhalte, Vorschau und Hilfe.',
    ],
    keywords: ['übersicht', 'dashboard', 'start', 'status', 'qr', 'kennzahlen', 'schnellzugriff'],
  },
  {
    id: 'planning',
    title: 'Teilnehmer und Tischplan',
    href: '/admin/planung',
    summary:
      'Die Planungsseite ist eure interne Arbeitsfläche für Teilnehmerliste, Tischanzahl, Sitzplätze und Sitzverteilung.',
    bullets: [
      'Die Teilnehmerliste ist bewusst getrennt von den echten RSVP-Antworten und dient nur der internen Planung.',
      'RSVP-Antworten lassen sich in die Teilnehmerliste übernehmen.',
      'Ihr könnt Anzahl der Gästetische und Sitzplätze pro Gästetisch zentral festlegen und danach einzelne Tische feinjustieren.',
      'Ein Dienstleistertisch ist separat möglich und wird von der smarten Verteilung bevorzugt für Dienstleister genutzt.',
      'Der Sitzplan ist standardmäßig privat und nur optional für Gäste veröffentlichbar.',
      'Es gibt eine visuelle Vorschau des Tischplans direkt im Paarbereich.',
    ],
    keywords: [
      'planung',
      'teilnehmer',
      'gästeliste',
      'tischplan',
      'sitzplan',
      'tische',
      'sitzplätze',
      'stühle',
      'dienstleistertisch',
      'automatisch',
      'smarte',
    ],
  },
  {
    id: 'content',
    title: 'Inhalte',
    href: '/admin/inhalte',
    summary:
      'Auf der Inhaltsseite bearbeitet ihr Texte, Bilder, Design, Dienstleister, Dresscode, Tagesablauf, FAQ und optionale Gästefunktionen.',
    bullets: [
      'Hier werden Namen, Orte, Datum, Einladungstexte, Bestätigungstexte und Story gepflegt.',
      'Titelbild, Brautpaarfotos, Bereichsbilder und Dienstleisterprofile werden hier verwaltet.',
      'Dresscode, Farbpalette, Tagesablauf und FAQ liegen ebenfalls auf dieser Seite.',
      'Die Musikwunschliste und die Freigabe des privaten Fotobereichs für Gäste werden hier ein- oder ausgeschaltet.',
      'Auch Designvorlagen und Schriftstile werden hier ausgewählt.',
    ],
    keywords: [
      'inhalte',
      'texte',
      'bilder',
      'titelbild',
      'hero',
      'dresscode',
      'faq',
      'programm',
      'dienstleister',
      'musikwunschliste',
      'design',
      'schriftart',
      'template',
    ],
  },
  {
    id: 'access',
    title: 'Zugänge und Galerie',
    href: '/admin/zugaenge',
    summary:
      'Diese Seite bündelt Einladungslink, QR-Code, Galeriezugänge und den separaten Fotografenbereich.',
    bullets: [
      'Hier findet ihr den Gästelink, die Galerie und den Fotografen-Zugang.',
      'Die Galerie ist in öffentlichen und privaten Bereich getrennt.',
      'Private Fotos bleiben standardmäßig nur im Paarbereich, bis ihr sie freigebt.',
      'Der Fotograf kann Bilder in öffentlichen oder privaten Bereich hochladen.',
    ],
    keywords: [
      'zugänge',
      'zugang',
      'link',
      'qr',
      'teilen',
      'galerie',
      'fotograf',
      'privat',
      'öffentlich',
      'foto',
    ],
  },
  {
    id: 'rsvp',
    title: 'RSVP-Antworten',
    href: '/admin/rsvps',
    summary:
      'Hier seht ihr ausschließlich die echten Gästeantworten mit Zusagen, Absagen, Personenanzahl, Essensvarianten und Hinweisen.',
    bullets: [
      'Dieser Bereich ist von der internen Teilnehmerliste getrennt, damit die App weniger verwirrend ist.',
      'Antworten können aktualisiert, exportiert und bei Bedarf gelöscht werden.',
      'Allergien und Unverträglichkeiten sind getrennt von der normalen Nachricht sichtbar.',
      'CSV-Export und automatische Aktualisierung sind vorhanden.',
    ],
    keywords: [
      'rsvp',
      'antworten',
      'rückmeldungen',
      'zusage',
      'absage',
      'export',
      'csv',
      'löschen',
      'allergien',
      'unverträglichkeiten',
    ],
  },
  {
    id: 'preview',
    title: 'Gästevorschau',
    href: '/admin/vorschau',
    summary:
      'Die Vorschauseite zeigt den Gästebereich in derselben Reihenfolge und Gestaltung wie für eure Gäste.',
    bullets: [
      'Hier prüft ihr Lesbarkeit, Reihenfolge, Bilder, Dresscode, Dienstleister, Galerie und FAQ im echten Look.',
      'Die Vorschau übernimmt Template, Schriftstil und freigeschaltete Funktionen automatisch.',
      'So lassen sich Änderungen kontrollieren, bevor ihr den Gästelink teilt.',
    ],
    keywords: ['vorschau', 'preview', 'gastbereich', 'testen', 'ansicht', 'smartphone', 'desktop'],
  },
  {
    id: 'guest-area',
    title: 'Öffentlicher Gästebereich',
    href: '/einladung',
    summary:
      'Der Gästebereich ist kostenlos und enthält Einladung, Programm, Anfahrt, Dresscode, Galerie, RSVP, FAQ und optionale Zusatzfunktionen.',
    bullets: [
      'Gäste sehen nur veröffentlichte und freigegebene Inhalte.',
      'Optional sichtbar sind zum Beispiel Dienstleister, Musikwunschliste und veröffentlichter Sitzplan.',
      'Die mobile App lädt denselben Live-Stand wie die Browserversion.',
    ],
    keywords: ['gastbereich', 'einladung', 'gäste', 'kostenlos', 'öffentlich', 'app', 'browser'],
  },
  {
    id: 'help',
    title: 'Hilfe und Assistent',
    href: '/admin/hilfe',
    summary:
      'Die Hilfeseite erklärt die wichtigsten Bereiche und enthält den Assistenten für Fragen rund um die App.',
    bullets: [
      'Der Assistent beantwortet Fragen zur aktuellen App-Struktur und verweist auf die passende Unterseite.',
      'Ohne OpenAI-Key antwortet er aus der eingebauten Wissensbasis.',
      'Mit OpenAI-Key nutzt er standardmäßig das konfigurierbare GPT-5.2-Modell über die OpenAI Responses API.',
    ],
    keywords: ['hilfe', 'assistent', 'chatbot', 'chatgpt', 'frage', 'support', 'openai'],
  },
]

export const ADMIN_HELP_QUICK_QUESTIONS = [
  'Wo ändere ich Texte und Bilder für die Einladung?',
  'Wie übernehme ich RSVP-Antworten in den Tischplan?',
  'Wo teile ich den Gästelink oder den QR-Code?',
  'Wie schalte ich private Fotos für Gäste frei?',
  'Wo aktiviere ich die Musikwunschliste oder Dienstleister?',
] as const

const HELP_STOPWORDS = new Set([
  'aber',
  'als',
  'am',
  'an',
  'auch',
  'auf',
  'aus',
  'bei',
  'bin',
  'bis',
  'da',
  'damit',
  'das',
  'dass',
  'dein',
  'deine',
  'dem',
  'den',
  'der',
  'des',
  'die',
  'diese',
  'dieser',
  'doch',
  'du',
  'eher',
  'ein',
  'eine',
  'einem',
  'einen',
  'einer',
  'er',
  'es',
  'euch',
  'euer',
  'eure',
  'für',
  'hat',
  'hier',
  'ich',
  'ihr',
  'ihre',
  'im',
  'in',
  'ist',
  'ja',
  'kann',
  'können',
  'mein',
  'meine',
  'mit',
  'nach',
  'nur',
  'oder',
  'sehr',
  'sein',
  'sind',
  'so',
  'soll',
  'sollen',
  'um',
  'und',
  'uns',
  'von',
  'was',
  'wenn',
  'wer',
  'wie',
  'wo',
  'zu',
  'zum',
  'zur',
])

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .split(/[^a-z0-9äöüß]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !HELP_STOPWORDS.has(token))
}

function scoreSection(section: AdminHelpKnowledgeSection, tokens: string[]): number {
  const haystack = `${section.title} ${section.summary} ${section.bullets.join(' ')} ${section.keywords.join(' ')}`.toLowerCase()
  const haystackTokens = new Set(tokenize(haystack))
  const keywordTokens = new Set(section.keywords.flatMap((keyword) => tokenize(keyword)))

  return tokens.reduce((score, token) => {
    if (keywordTokens.has(token)) {
      return score + 8
    }

    if (tokenize(section.title).includes(token)) {
      return score + 5
    }

    if (haystackTokens.has(token)) {
      return score + 2
    }

    return score
  }, 0)
}

function getIntentBoost(section: AdminHelpKnowledgeSection, query: string): number {
  const lowerQuery = query.toLowerCase()
  let boost = 0

  const boostIfMatched = (sectionId: string, expression: RegExp, value: number) => {
    if (section.id === sectionId && expression.test(lowerQuery)) {
      boost += value
    }
  }

  boostIfMatched('content', /(texte|bilder|titelbild|hero|dresscode|farbpalette|dienstleister|musikwunsch|faq|programm|ablauf|schrift|template|design)/, 18)
  boostIfMatched('content', /(private[nr]? fotos?.*(frei|teilen|sichtbar)|freigabe.*private[nr]? fotos?)/, 18)
  boostIfMatched('planning', /(tischplan|sitzplan|tische|sitzplätze|stühle|dienstleistertisch|teilnehmerliste)/, 18)
  boostIfMatched('planning', /(rsvp.*übernehmen|antworten.*übernehmen|übernehm.*rsvp|übernehm.*antworten|tischplan.*übernehm)/, 15)
  boostIfMatched('access', /(qr|gästelink|einladungslink|fotograf|galerie|zugang|teilen)/, 16)
  boostIfMatched('access', /(fotos?.*(hochladen|upload)|bilder.*(hochladen|upload))/, 10)
  boostIfMatched('rsvp', /(rsvp|rückmeldungen|gästeantworten|zusage|absage|allergien|unverträglichkeiten|csv|export)/, 18)
  boostIfMatched('preview', /(vorschau|gäste sehen|mobil prüfen|desktop prüfen|live look|ansicht prüfen)/, 16)
  boostIfMatched('overview', /(start|übersicht|dashboard|einstieg|qr-code|schnellzugriff)/, 16)
  boostIfMatched('help', /(hilfe|assistent|chatbot|chatgpt|frage zur app|support)/, 18)
  boostIfMatched('guest-area', /(gastbereich|einladung|öffentlicher bereich|gästeseite)/, 16)

  return boost
}

export function findRelevantAdminHelpSections(query: string, limit = 3): AdminHelpKnowledgeSection[] {
  const tokens = tokenize(query)

  if (!tokens.length) {
    return ADMIN_HELP_KNOWLEDGE_SECTIONS.slice(0, limit)
  }

  return ADMIN_HELP_KNOWLEDGE_SECTIONS
    .map((section) => ({
      section,
      score: scoreSection(section, tokens) + getIntentBoost(section, query),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((entry) => entry.section)
}

export function buildAdminHelpSystemPrompt(): string {
  const knowledge = ADMIN_HELP_KNOWLEDGE_SECTIONS.map((section) => {
    const bullets = section.bullets.map((bullet) => `- ${bullet}`).join('\n')
    return `[${section.title}] (${section.href})\n${section.summary}\n${bullets}`
  }).join('\n\n')

  return [
    'Du bist der Hilfsassistent für den geschützten Paarbereich von myWed by NiiRo AI.',
    'Antworte auf Deutsch, konkret, ruhig und lösungsorientiert.',
    'Nutze nur das bereitgestellte Wissen über die App. Wenn etwas nicht im Wissen steht, sage das klar.',
    'Verweise nach Möglichkeit immer auf die passende Unterseite mit dem exakten Pfad.',
    'Erkläre Unterschiede zwischen Teilnehmerliste und RSVP-Antworten besonders klar, weil das ein häufiger Verwirrungspunkt ist.',
    'Gib keine technischen Halluzinationen über nicht vorhandene Funktionen aus.',
    '',
    'Wissen über die App:',
    knowledge,
  ].join('\n')
}

export function buildFallbackAdminHelpAnswer(query: string): {
  answer: string
  sources: AdminHelpSource[]
} {
  const relevantSections = findRelevantAdminHelpSections(query)

  if (!relevantSections.length) {
    return {
      answer: [
        'Ich habe dazu in der eingebauten Wissensbasis nichts Eindeutiges gefunden.',
        'Am besten schaust du zuerst in `/admin/uebersicht` für den Einstieg, in `/admin/inhalte` für Texte und Bilder, in `/admin/planung` für Tischplan und Teilnehmer oder in `/admin/rsvps` für echte Gästeantworten.',
      ].join('\n\n'),
      sources: ADMIN_HELP_KNOWLEDGE_SECTIONS.slice(0, 4).map((section) => ({
        href: section.href,
        title: section.title,
      })),
    }
  }

  const primarySection = relevantSections[0]

  if (!primarySection) {
    return {
      answer:
        'Ich habe dazu gerade keine passende Stelle in der eingebauten Wissensbasis gefunden. Schau bitte zuerst in `/admin/uebersicht` oder `/admin/hilfe`.',
      sources: [],
    }
  }

  const secondarySections = relevantSections.slice(1)
  const answerParts = [
    `Am besten gehst du zuerst in \`${primarySection.href}\` auf **${primarySection.title}**.`,
    primarySection.summary,
    primarySection.bullets.slice(0, 3).map((bullet) => `- ${bullet}`).join('\n'),
  ]

  if (secondarySections.length) {
    answerParts.push(
      `Zusätzlich relevant können ${secondarySections
        .map((section) => `\`${section.href}\` (${section.title})`)
        .join(', ')} sein.`,
    )
  }

  return {
    answer: answerParts.join('\n\n'),
    sources: relevantSections.map((section) => ({
      href: section.href,
      title: section.title,
    })),
  }
}
