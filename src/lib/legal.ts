import { APP_BRAND_NAME, ENV } from '@/lib/constants'

function normalizeLegalValue(value: string | null | undefined): string | null {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

function buildPlaceholder(label: string): string {
  return `Bitte ${label} ergänzen`
}

function readLegalValue(value: string | null | undefined, fallbackLabel: string): string {
  return normalizeLegalValue(value) ?? buildPlaceholder(fallbackLabel)
}

function isPlaceholder(value: string): boolean {
  return value.startsWith('Bitte ')
}

export const LEGAL = {
  companyName: readLegalValue(process.env.LEGAL_COMPANY_NAME, 'Firmennamen'),
  ownerName: readLegalValue(process.env.LEGAL_OWNER_NAME, 'Vertretungsberechtigte Person'),
  street: readLegalValue(process.env.LEGAL_STREET, 'Straße und Hausnummer'),
  postalCode: readLegalValue(process.env.LEGAL_POSTAL_CODE, 'Postleitzahl'),
  city: readLegalValue(process.env.LEGAL_CITY, 'Ort'),
  country: readLegalValue(process.env.LEGAL_COUNTRY, 'Land'),
  phone: readLegalValue(process.env.LEGAL_PHONE, 'Telefonnummer'),
  email: readLegalValue(process.env.LEGAL_EMAIL ?? ENV.adminEmail, 'Kontakt-E-Mail'),
  vatId: normalizeLegalValue(process.env.LEGAL_VAT_ID),
  registerCourt: normalizeLegalValue(process.env.LEGAL_REGISTER_COURT),
  registerNumber: normalizeLegalValue(process.env.LEGAL_REGISTER_NUMBER),
  responsiblePerson: readLegalValue(
    process.env.LEGAL_RESPONSIBLE_PERSON ?? process.env.LEGAL_OWNER_NAME,
    'verantwortliche Person nach § 18 Abs. 2 MStV',
  ),
  supportUrl: normalizeLegalValue(process.env.LEGAL_SUPPORT_URL) ?? ENV.appUrl,
  appUrl: ENV.appUrl,
  brandName: APP_BRAND_NAME,
} as const

const legalRequiredFields: Array<[string, string]> = [
  ['Firmennamen', LEGAL.companyName],
  ['Vertretungsberechtigte Person', LEGAL.ownerName],
  ['Straße und Hausnummer', LEGAL.street],
  ['Postleitzahl', LEGAL.postalCode],
  ['Ort', LEGAL.city],
  ['Land', LEGAL.country],
  ['Telefonnummer', LEGAL.phone],
  ['Kontakt-E-Mail', LEGAL.email],
  ['verantwortliche Person', LEGAL.responsiblePerson],
]

export const LEGAL_MISSING_FIELDS = legalRequiredFields
  .filter(([, value]) => isPlaceholder(value))
  .map(([label]) => label)

export const LEGAL_ADDRESS_LINES = [LEGAL.street, `${LEGAL.postalCode} ${LEGAL.city}`, LEGAL.country]

export const LEGAL_IS_INCOMPLETE = LEGAL_MISSING_FIELDS.length > 0
