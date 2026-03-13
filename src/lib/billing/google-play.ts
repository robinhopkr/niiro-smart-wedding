import 'server-only'

import { createSign } from 'node:crypto'

const GOOGLE_PLAY_SCOPE = 'https://www.googleapis.com/auth/androidpublisher'
const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_PLAY_API_BASE_URL = 'https://androidpublisher.googleapis.com/androidpublisher/v3'

interface GooglePlayProductLineItem {
  productId?: string
}

interface GooglePlayPurchaseStateContext {
  purchaseState?: string
}

interface GooglePlayPurchaseResponse {
  acknowledgementState?: string
  kind?: string
  orderId?: string
  productLineItem?: GooglePlayProductLineItem[]
  purchaseCompletionTime?: string
  purchaseStateContext?: GooglePlayPurchaseStateContext
  regionCode?: string
  testPurchaseContext?: Record<string, unknown>
}

export interface GooglePlayPurchaseVerificationResult {
  acknowledgedAt: string | null
  isAcknowledged: boolean
  orderId: string | null
  packageName: string
  paidAt: string
  productId: string
  purchaseToken: string
  raw: GooglePlayPurchaseResponse
}

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Fehlende Env-Var ${name} für Google Play Billing.`)
  }

  return value
}

function getGooglePlayServiceAccountEmail(): string {
  return readRequiredEnv('GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL')
}

function getGooglePlayServiceAccountPrivateKey(): string {
  return readRequiredEnv('GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY').replace(/\\n/g, '\n')
}

export function getGooglePlayPackageName(): string {
  return readRequiredEnv('GOOGLE_PLAY_PACKAGE_NAME')
}

export function getGooglePlayCoupleAccessProductId(): string {
  return readRequiredEnv('GOOGLE_PLAY_COUPLE_ACCESS_PRODUCT_ID')
}

export function isGooglePlayBillingConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL?.trim() &&
      process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY?.trim() &&
      process.env.GOOGLE_PLAY_PACKAGE_NAME?.trim() &&
      process.env.GOOGLE_PLAY_COUPLE_ACCESS_PRODUCT_ID?.trim(),
  )
}

function toBase64Url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

async function getGooglePlayAccessToken(): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000)
  const header = toBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = toBase64Url(
    JSON.stringify({
      iss: getGooglePlayServiceAccountEmail(),
      scope: GOOGLE_PLAY_SCOPE,
      aud: GOOGLE_OAUTH_TOKEN_URL,
      iat: issuedAt,
      exp: issuedAt + 3600,
    }),
  )
  const signer = createSign('RSA-SHA256')
  signer.update(`${header}.${payload}`)
  signer.end()
  const signature = toBase64Url(signer.sign(getGooglePlayServiceAccountPrivateKey()))
  const assertion = `${header}.${payload}.${signature}`

  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })

  if (!response.ok) {
    throw new Error(`Google OAuth Token konnte nicht geladen werden (${response.status}).`)
  }

  const result = (await response.json()) as { access_token?: string }

  if (!result.access_token) {
    throw new Error('Google OAuth Token-Antwort enthält kein access_token.')
  }

  return result.access_token
}

function buildGooglePlayHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
}

function isPaidGooglePlayPurchase(result: GooglePlayPurchaseResponse): boolean {
  return result.purchaseStateContext?.purchaseState === 'PURCHASED'
}

function isAcknowledgedGooglePlayPurchase(result: GooglePlayPurchaseResponse): boolean {
  return result.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED'
}

export async function verifyGooglePlayCoupleAccessPurchase(input: {
  purchaseToken: string
  productId?: string
  packageName?: string
}): Promise<GooglePlayPurchaseVerificationResult> {
  if (!isGooglePlayBillingConfigured()) {
    throw new Error('Google Play Billing ist noch nicht vollständig konfiguriert.')
  }

  const accessToken = await getGooglePlayAccessToken()
  const packageName = getGooglePlayPackageName()
  const productId = getGooglePlayCoupleAccessProductId()
  const requestedPackageName = input.packageName?.trim()
  const requestedProductId = input.productId?.trim()

  if (requestedPackageName && requestedPackageName !== packageName) {
    throw new Error('Der Google-Play-Kauf gehört nicht zum erwarteten Android-Paket.')
  }

  if (requestedProductId && requestedProductId !== productId) {
    throw new Error('Der Google-Play-Kauf gehört nicht zum freigeschalteten Brautpaar-Produkt.')
  }

  const encodedPackageName = encodeURIComponent(packageName)
  const encodedPurchaseToken = encodeURIComponent(input.purchaseToken.trim())

  const response = await fetch(
    `${GOOGLE_PLAY_API_BASE_URL}/applications/${encodedPackageName}/purchases/productsv2/tokens/${encodedPurchaseToken}`,
    {
      headers: buildGooglePlayHeaders(accessToken),
      method: 'GET',
    },
  )

  if (!response.ok) {
    throw new Error(`Google Play Kaufprüfung fehlgeschlagen (${response.status}).`)
  }

  const purchase = (await response.json()) as GooglePlayPurchaseResponse
  const resolvedProductId = purchase.productLineItem?.[0]?.productId ?? productId

  if (!resolvedProductId) {
    throw new Error('Google Play hat keine Product-ID für diesen Kauf geliefert.')
  }

  if (resolvedProductId !== productId) {
    throw new Error('Der Google-Play-Kauf gehört nicht zum freigeschalteten Brautpaar-Produkt.')
  }

  if (!isPaidGooglePlayPurchase(purchase)) {
    throw new Error('Der Google-Play-Kauf ist noch nicht abgeschlossen.')
  }

  if (!isAcknowledgedGooglePlayPurchase(purchase)) {
    const acknowledgeResponse = await fetch(
      `${GOOGLE_PLAY_API_BASE_URL}/applications/${encodedPackageName}/purchases/products/${encodeURIComponent(resolvedProductId)}/tokens/${encodedPurchaseToken}:acknowledge`,
      {
        headers: buildGooglePlayHeaders(accessToken),
        method: 'POST',
        body: JSON.stringify({
          developerPayload: 'niiro-smart-wedding-couple-access',
        }),
      },
    )

    if (!acknowledgeResponse.ok) {
      throw new Error(`Google Play Kauf konnte nicht bestätigt werden (${acknowledgeResponse.status}).`)
    }
  }

  const paidAt = purchase.purchaseCompletionTime ?? new Date().toISOString()

  return {
    acknowledgedAt: new Date().toISOString(),
    isAcknowledged: true,
    orderId: purchase.orderId ?? null,
    packageName,
    paidAt,
    productId: resolvedProductId,
    purchaseToken: input.purchaseToken.trim(),
    raw: purchase,
  }
}
