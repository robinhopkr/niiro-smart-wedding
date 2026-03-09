import { createHmac, timingSafeEqual } from 'node:crypto'

export const ADMIN_SESSION_COOKIE = 'niiro_admin_session'
const ADMIN_SESSION_MAX_AGE = 60 * 60 * 24 * 7

type CookieValue = {
  value: string
}

type CookieStore = {
  get: (name: string) => CookieValue | undefined
}

export interface AdminSession {
  email: string
  role: AdminSessionRole
}

export type AdminSessionRole = 'couple' | 'planner'

interface ConfiguredAdminAccount {
  email: string
  password: string
  role: AdminSessionRole
}

function normalizeEmail(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase()
  return normalized ? normalized : null
}

function getConfiguredAdminAccount(role: AdminSessionRole): ConfiguredAdminAccount | null {
  if (role === 'planner') {
    const email = normalizeEmail(process.env.WEDDING_PLANNER_EMAIL)
    const password = process.env.WEDDING_PLANNER_PASSWORD ?? null

    if (!email || !password) {
      return null
    }

    return {
      email,
      password,
      role,
    }
  }

  const email = normalizeEmail(process.env.ADMIN_EMAIL)
  const password = process.env.ADMIN_PASSWORD ?? null

  if (!email || !password) {
    return null
  }

  return {
    email,
    password,
    role,
  }
}

function getConfiguredAdminAccounts(): ConfiguredAdminAccount[] {
  return (['couple', 'planner'] as const)
    .map((role) => getConfiguredAdminAccount(role))
    .filter((account): account is ConfiguredAdminAccount => Boolean(account))
}

function getSessionSecret(): string | null {
  return process.env.ADMIN_SESSION_SECRET ?? process.env.ADMIN_PASSWORD ?? process.env.WEDDING_PLANNER_PASSWORD ?? null
}

function createSignature(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url')
}

function safeCompare(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return timingSafeEqual(leftBuffer, rightBuffer)
}

export function hasConfiguredAdminCredentials(role?: AdminSessionRole): boolean {
  if (role) {
    return Boolean(getConfiguredAdminAccount(role))
  }

  return getConfiguredAdminAccounts().length > 0
}

export function hasConfiguredCoupleCredentials(): boolean {
  return hasConfiguredAdminCredentials('couple')
}

export function hasConfiguredPlannerCredentials(): boolean {
  return hasConfiguredAdminCredentials('planner')
}

export function resolveAdminLogin(
  role: AdminSessionRole,
  email: string,
  password: string,
): AdminSession | null {
  const account = getConfiguredAdminAccount(role)

  if (!account) {
    return null
  }

  if (account.email !== email.trim().toLowerCase() || !safeCompare(account.password, password)) {
    return null
  }

  return {
    email: account.email,
    role: account.role,
  }
}

export function createAdminSessionToken(email: string, role: AdminSessionRole = 'couple'): string | null {
  const secret = getSessionSecret()
  if (!secret) {
    return null
  }

  const payload = {
    email: email.trim().toLowerCase(),
    role,
    expiresAt: Date.now() + ADMIN_SESSION_MAX_AGE * 1000,
  }
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = createSignature(encodedPayload, secret)

  return `${encodedPayload}.${signature}`
}

export function verifyAdminSessionToken(token: string | null | undefined): AdminSession | null {
  const secret = getSessionSecret()

  if (!token || !secret) {
    return null
  }

  const [encodedPayload, signature] = token.split('.')
  if (!encodedPayload || !signature) {
    return null
  }

  const expectedSignature = createSignature(encodedPayload, secret)
  if (!safeCompare(signature, expectedSignature)) {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as {
      email?: string
      expiresAt?: number
      role?: AdminSessionRole
    }

    if (!payload.email || !payload.expiresAt) {
      return null
    }

    if (payload.expiresAt < Date.now()) {
      return null
    }

    const role = payload.role === 'planner' ? 'planner' : 'couple'
    const account = getConfiguredAdminAccount(role)

    if (!account || payload.email !== account.email) {
      return null
    }

    return {
      email: payload.email,
      role,
    }
  } catch {
    return null
  }
}

export function getAdminSessionFromCookieStore(cookieStore: CookieStore): AdminSession | null {
  return verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)
}

export function getAdminSessionCookieOptions() {
  return {
    httpOnly: true,
    maxAge: ADMIN_SESSION_MAX_AGE,
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  }
}
