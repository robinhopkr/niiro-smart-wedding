import { readFile } from 'node:fs/promises'
import { createSign } from 'node:crypto'

function parseArgs(argv) {
  const args = {
    credentials: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_PATH ?? null,
    packageName: process.env.GOOGLE_PLAY_PACKAGE_NAME ?? 'com.niiro.smartwedding',
    productId:
      process.env.GOOGLE_PLAY_COUPLE_ACCESS_PRODUCT_ID ?? 'niiro_smart_wedding_couple_access',
  }

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]

    if (value === '--credentials') {
      args.credentials = argv[index + 1] ?? null
      index += 1
      continue
    }

    if (value === '--package') {
      args.packageName = argv[index + 1] ?? args.packageName
      index += 1
      continue
    }

    if (value === '--product') {
      args.productId = argv[index + 1] ?? args.productId
      index += 1
    }
  }

  return args
}

function toBase64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

async function getAccessToken(credentials) {
  const issuedAt = Math.floor(Date.now() / 1000)
  const header = toBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = toBase64Url(
    JSON.stringify({
      iss: credentials.client_email,
      scope: 'https://www.googleapis.com/auth/androidpublisher',
      aud: 'https://oauth2.googleapis.com/token',
      iat: issuedAt,
      exp: issuedAt + 3600,
    }),
  )
  const signer = createSign('RSA-SHA256')
  signer.update(`${header}.${payload}`)
  signer.end()
  const signature = toBase64Url(signer.sign(credentials.private_key))
  const assertion = `${header}.${payload}.${signature}`

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })

  const payloadJson = await response.json()

  if (!response.ok || !payloadJson.access_token) {
    throw new Error(`OAuth fehlgeschlagen: ${JSON.stringify(payloadJson)}`)
  }

  return payloadJson.access_token
}

async function runCheck(label, url, accessToken, method = 'GET') {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  })
  const body = await response.text()

  return {
    label,
    ok: response.ok,
    status: response.status,
    body,
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (!args.credentials) {
    throw new Error('Bitte --credentials <pfad-zur-json> angeben.')
  }

  const credentials = JSON.parse(await readFile(args.credentials, 'utf8'))

  if (!credentials.client_email || !credentials.private_key) {
    throw new Error('Die Service-Account-JSON enthält nicht client_email/private_key.')
  }

  const accessToken = await getAccessToken(credentials)
  const packageName = encodeURIComponent(args.packageName)
  const productId = encodeURIComponent(args.productId)

  const checks = await Promise.all([
    runCheck(
      'edits.insert',
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/edits`,
      accessToken,
      'POST',
    ),
    runCheck(
      'inappproducts.get',
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/inappproducts/${productId}`,
      accessToken,
    ),
  ])

  console.log(
    JSON.stringify(
      {
        packageName: args.packageName,
        productId: args.productId,
        serviceAccountEmail: credentials.client_email,
        checks,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
