const EURO_CURRENCY_FORMATTER = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
})

export const BILLING_CURRENCY = 'eur'
export const BILLING_STANDARD_AMOUNT_CENTS = 17900
export const BILLING_PROMO_AMOUNT_CENTS = 12900
export const BILLING_STANDARD_PRICE_LABEL = formatBillingPrice(BILLING_STANDARD_AMOUNT_CENTS)
export const BILLING_PROMO_PRICE_LABEL = formatBillingPrice(BILLING_PROMO_AMOUNT_CENTS)
export const BILLING_PROMO_VALID_UNTIL_ISO = '2026-04-30T23:59:59.999+02:00'
export const BILLING_PROMO_VALID_UNTIL_LABEL = '30.04.2026'
export const BILLING_PRICE_NOTE = 'einmalig pro Brautpaar inkl. MwSt.'
export const BILLING_PRODUCT_NAME = 'NiiRo Smart Wedding - Brautpaar-Zugang'
export const BILLING_PRODUCT_DESCRIPTION =
  'Einmaliger Zugriff auf den geschützten Brautpaar-Bereich inklusive gesetzlicher MwSt.'
export const BILLING_STANDARD_PRICE_LOOKUP_KEY = 'niiro-smart-wedding-couple-access-one-time-eur'
export const BILLING_PROMO_PRICE_LOOKUP_KEY = 'niiro-smart-wedding-couple-access-promo-eur'
export const BILLING_STATEMENT_DESCRIPTOR_SUFFIX = 'SMARTWEDDING'
export const GOOGLE_PLAY_COUPLE_ACCESS_PRODUCT_ID = 'niiro_smart_wedding_couple_access'

export const DEFAULT_BILLING_BYPASS_EMAILS = [
  'robin_kolb@yahoo.com',
  'aninaehl@gmail.com',
] as const

function formatBillingPrice(amountCents: number): string {
  return EURO_CURRENCY_FORMATTER.format(amountCents / 100)
}

export function isBillingPromoActive(now: Date = new Date()): boolean {
  return now.getTime() <= new Date(BILLING_PROMO_VALID_UNTIL_ISO).getTime()
}

export interface BillingPricingSnapshot {
  activeAmountCents: number
  activePriceLabel: string
  standardPriceLabel: string
  promoPriceLabel: string
  promoActive: boolean
  promoDeadlineLabel: string
  promoSavingsLabel: string
  priceNote: string
}

export function getBillingPricing(now: Date = new Date()): BillingPricingSnapshot {
  const promoActive = isBillingPromoActive(now)
  const activeAmountCents = promoActive ? BILLING_PROMO_AMOUNT_CENTS : BILLING_STANDARD_AMOUNT_CENTS

  return {
    activeAmountCents,
    activePriceLabel: formatBillingPrice(activeAmountCents),
    standardPriceLabel: BILLING_STANDARD_PRICE_LABEL,
    promoPriceLabel: BILLING_PROMO_PRICE_LABEL,
    promoActive,
    promoDeadlineLabel: BILLING_PROMO_VALID_UNTIL_LABEL,
    promoSavingsLabel: formatBillingPrice(BILLING_STANDARD_AMOUNT_CENTS - BILLING_PROMO_AMOUNT_CENTS),
    priceNote: BILLING_PRICE_NOTE,
  }
}

export function getBillingAmountCents(now: Date = new Date()): number {
  return getBillingPricing(now).activeAmountCents
}

export function getBillingPriceLookupKey(now: Date = new Date()): string {
  return isBillingPromoActive(now)
    ? BILLING_PROMO_PRICE_LOOKUP_KEY
    : BILLING_STANDARD_PRICE_LOOKUP_KEY
}
