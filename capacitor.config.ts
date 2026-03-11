import type { CapacitorConfig } from '@capacitor/cli'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

function loadEnvFile(filename: string) {
  const filePath = join(process.cwd(), filename)

  if (!existsSync(filePath)) {
    return
  }

  const content = readFileSync(filePath, 'utf8')

  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim()

    if (!line || line.startsWith('#')) {
      continue
    }

    const separatorIndex = line.indexOf('=')

    if (separatorIndex === -1) {
      continue
    }

    const key = line.slice(0, separatorIndex).trim()

    if (!key || process.env[key]) {
      continue
    }

    let value = line.slice(separatorIndex + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    process.env[key] = value
  }
}

loadEnvFile('.env.local')
loadEnvFile('.env')

function withPath(baseUrl: string, path: string) {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/u, '')
  const normalizedPath = path === '/' ? '' : path.startsWith('/') ? path : `/${path}`

  return `${normalizedBaseUrl}${normalizedPath}`
}

function isLoopbackUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return ['127.0.0.1', '::1', 'localhost'].includes(url.hostname)
  } catch {
    return false
  }
}

function readHostedAppUrl(): string {
  return 'https://mywed.niiro.ai'
}

function resolveAppBaseUrl(): string {
  const explicitMobileUrl = process.env.CAPACITOR_SERVER_URL?.trim()

  if (explicitMobileUrl) {
    return explicitMobileUrl
  }

  const publicAppUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ?? process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? null
  const allowLocalhost = process.env.CAPACITOR_ALLOW_LOCALHOST === 'true'

  if (!publicAppUrl) {
    return readHostedAppUrl()
  }

  if (isLoopbackUrl(publicAppUrl) && !allowLocalhost) {
    console.warn(
      '[capacitor] NEXT_PUBLIC_APP_URL zeigt auf localhost. ' +
        'Für native Builds wird stattdessen die gehostete Domain verwendet. ' +
        'Setze CAPACITOR_ALLOW_LOCALHOST=true oder CAPACITOR_SERVER_URL, falls du bewusst lokal entwickeln willst.',
    )
    return readHostedAppUrl()
  }

  return publicAppUrl
}

const appBaseUrl = resolveAppBaseUrl()

const appStartPath = process.env.CAPACITOR_APP_START_PATH ?? '/'
const remoteAppUrl = withPath(appBaseUrl, appStartPath)
const allowNavigationHost = new URL(appBaseUrl).host

if (!process.env.CAPACITOR_SERVER_URL && !process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_SITE_URL) {
  console.warn(
    '[capacitor] Keine Mobile-URL gefunden. Fallback auf https://mywed.niiro.ai. ' +
      'Setze CAPACITOR_SERVER_URL, falls du eine andere Domain verwenden willst.',
  )
}

const config: CapacitorConfig = {
  appId: process.env.CAPACITOR_APP_ID ?? 'com.niiro.mywed',
  appName: process.env.CAPACITOR_APP_NAME ?? 'myWed by NiiRo AI',
  webDir: 'mobile-shell',
  bundledWebRuntime: false,
  server: {
    url: remoteAppUrl,
    cleartext: remoteAppUrl.startsWith('http://'),
    allowNavigation: [allowNavigationHost],
    errorPath: `offline.html?target=${encodeURIComponent(remoteAppUrl)}`,
  },
}

export default config
