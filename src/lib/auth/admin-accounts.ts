import 'server-only'

import { randomBytes } from 'node:crypto'

import { getBillingAccessState } from '@/lib/billing/access'
import {
  createAdminSessionToken,
  type AdminSession,
  type AdminSessionRole,
  withSelectedWedding,
} from '@/lib/auth/admin-session'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  createCoupleAccount,
  createPlannerAccount,
  createWeddingForRegistration,
  findClaimableWeddingForRegistration,
  generateUniqueGuestCode,
  getActiveWeddingConfig,
  getCoupleAccountByEmail,
  getCoupleAccountByWeddingRef,
  getLinkedPlannerForWedding,
  getPlannerAccountByCustomerNumber,
  getPlannerAccountByEmail,
  getWeddingConfigBySourceRef,
  isPlannerLinkedToWedding,
  listPlannerWeddingAccessRows,
  type CoupleAccount,
  type PlannerAccount,
} from '@/lib/supabase/repository'
import type { PlannerWeddingSummary, WeddingConfig, WeddingSource } from '@/types/wedding'

function getRequiredAdminClient() {
  const client = createAdminClient()

  if (!client) {
    throw new Error('Der geschützte Admin-Zugang benötigt einen konfigurierten Service-Role-Key.')
  }

  return client
}

function buildCoupleSession(account: CoupleAccount): AdminSession {
  return {
    accountId: account.id,
    email: account.email,
    role: 'couple',
    weddingSource: account.weddingSource,
    weddingSourceId: account.weddingSourceId,
  }
}

function buildPlannerSession(account: PlannerAccount): AdminSession {
  return {
    accountId: account.id,
    email: account.email,
    role: 'planner',
    weddingSource: null,
    weddingSourceId: null,
  }
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

function isLegacyCoupleLogin(input: {
  email: string
  password: string
}): boolean {
  const configuredEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const configuredPassword = process.env.ADMIN_PASSWORD

  if (!configuredEmail || !configuredPassword) {
    return false
  }

  return normalizeEmail(input.email) === configuredEmail && input.password === configuredPassword
}

async function buildLegacyCoupleSession(
  supabase: ReturnType<typeof getRequiredAdminClient>,
  email: string,
): Promise<AdminSession> {
  const config = await getActiveWeddingConfig(supabase)

  if (config.source === 'fallback' || !config.sourceId) {
    throw new Error('Für den Legacy-Login konnte keine bearbeitbare Hochzeit gefunden werden.')
  }

  return {
    accountId: `legacy-couple:${normalizeEmail(email)}`,
    email: normalizeEmail(email),
    role: 'couple',
    weddingSource: config.source,
    weddingSourceId: config.sourceId,
  }
}

async function generatePlannerCustomerNumber(): Promise<string> {
  const supabase = getRequiredAdminClient()

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const customerNumber = `WP-${randomBytes(3).toString('hex').toUpperCase()}`
    const existing = await getPlannerAccountByCustomerNumber(supabase, customerNumber)

    if (!existing) {
      return customerNumber
    }
  }

  return `WP-${Date.now().toString().slice(-8)}`
}

export async function resolveWeddingAccessForSession(
  session: AdminSession,
): Promise<{
  billingAccess: Awaited<ReturnType<typeof getBillingAccessState>>
  config: WeddingConfig
  coupleAccount: CoupleAccount | null
}> {
  if (!session.weddingSource || !session.weddingSourceId) {
    throw new Error('Für diese Sitzung wurde noch keine Hochzeit ausgewählt.')
  }

  const supabase = getRequiredAdminClient()
  const config = await getWeddingConfigBySourceRef(supabase, session.weddingSource, session.weddingSourceId)

  if (!config) {
    throw new Error('Die ausgewählte Hochzeit konnte nicht mehr geladen werden.')
  }

  const coupleAccount = await getCoupleAccountByWeddingRef(
    supabase,
    session.weddingSource,
    session.weddingSourceId,
  )
  const billingAccess = await getBillingAccessState(
    supabase,
    config,
    session.role === 'couple' ? session.email : coupleAccount?.email ?? null,
  )

  return {
    billingAccess,
    config,
    coupleAccount,
  }
}

export async function registerCoupleAdmin(input: {
  coupleLabel: string
  email: string
  password: string
}): Promise<{
  session: AdminSession
  sessionToken: string
}> {
  const supabase = getRequiredAdminClient()
  const existingAccount = await getCoupleAccountByEmail(supabase, input.email)

  if (existingAccount) {
    throw new Error('Für diese E-Mail existiert bereits ein Brautpaar-Konto.')
  }

  const claimableWedding = await findClaimableWeddingForRegistration(supabase)
  const wedding =
    claimableWedding ??
    (await createWeddingForRegistration(supabase, {
      coupleLabel: input.coupleLabel,
      guestCode: await generateUniqueGuestCode(supabase, input.coupleLabel),
    }))

  if (!wedding.sourceId) {
    throw new Error('Die Hochzeit konnte nicht angelegt werden.')
  }

  if (wedding.source === 'fallback') {
    throw new Error('Die Hochzeit konnte nicht als bearbeitbare myWed-Hochzeit angelegt werden.')
  }

  const account = await createCoupleAccount(supabase, {
    email: input.email,
    passwordHash: hashPassword(input.password),
    weddingSource: wedding.source,
    weddingSourceId: wedding.sourceId,
  })

  const session = buildCoupleSession(account)
  const sessionToken = createAdminSessionToken(session)

  if (!sessionToken) {
    throw new Error('Die Sitzung konnte nicht erstellt werden.')
  }

  return { session, sessionToken }
}

export async function registerPlannerAdmin(input: {
  displayName: string
  email: string
  password: string
}): Promise<{
  customerNumber: string
  session: AdminSession
  sessionToken: string
}> {
  const supabase = getRequiredAdminClient()
  const existingAccount = await getPlannerAccountByEmail(supabase, input.email)

  if (existingAccount) {
    throw new Error('Für diese E-Mail existiert bereits ein Wedding-Planer-Konto.')
  }

  const planner = await createPlannerAccount(supabase, {
    customerNumber: await generatePlannerCustomerNumber(),
    displayName: input.displayName,
    email: input.email,
    passwordHash: hashPassword(input.password),
  })

  const session = buildPlannerSession(planner)
  const sessionToken = createAdminSessionToken(session)

  if (!sessionToken) {
    throw new Error('Die Sitzung konnte nicht erstellt werden.')
  }

  return {
    customerNumber: planner.customerNumber,
    session,
    sessionToken,
  }
}

export async function loginAdminAccount(input: {
  role: AdminSessionRole
  email: string
  password: string
}): Promise<{
  nextUrl: string
  session: AdminSession
  sessionToken: string
}> {
  const supabase = getRequiredAdminClient()

  if (input.role === 'couple') {
    const account = await getCoupleAccountByEmail(supabase, input.email)

    if (!account) {
      if (!isLegacyCoupleLogin(input)) {
        throw new Error('E-Mail oder Passwort sind nicht korrekt.')
      }

      const session = await buildLegacyCoupleSession(supabase, input.email)
      const sessionToken = createAdminSessionToken(session)

      if (!sessionToken) {
        throw new Error('Die Sitzung konnte nicht erstellt werden.')
      }

      const { billingAccess } = await resolveWeddingAccessForSession(session)

      return {
        nextUrl: billingAccess.requiresPayment ? '/admin/kauf' : '/admin/uebersicht',
        session,
        sessionToken,
      }
    }

    if (!verifyPassword(input.password, account.passwordHash)) {
      throw new Error('E-Mail oder Passwort sind nicht korrekt.')
    }

    const session = buildCoupleSession(account)
    const sessionToken = createAdminSessionToken(session)

    if (!sessionToken) {
      throw new Error('Die Sitzung konnte nicht erstellt werden.')
    }

    const config = await getWeddingConfigBySourceRef(supabase, account.weddingSource, account.weddingSourceId)

    if (!config) {
      throw new Error('Die zugehörige Hochzeit konnte nicht geladen werden.')
    }

    const billingAccess = await getBillingAccessState(supabase, config, account.email)

    return {
      nextUrl: billingAccess.requiresPayment ? '/admin/kauf' : '/admin/uebersicht',
      session,
      sessionToken,
    }
  }

  const account = await getPlannerAccountByEmail(supabase, input.email)

  if (!account || !verifyPassword(input.password, account.passwordHash)) {
    throw new Error('E-Mail oder Passwort sind nicht korrekt.')
  }

  const session = buildPlannerSession(account)
  const sessionToken = createAdminSessionToken(session)

  if (!sessionToken) {
    throw new Error('Die Sitzung konnte nicht erstellt werden.')
  }

  return {
    nextUrl: '/admin/hochzeiten',
    session,
    sessionToken,
  }
}

export async function listPlannerWeddingOptions(
  plannerAccountId: string,
): Promise<PlannerWeddingSummary[]> {
  const supabase = getRequiredAdminClient()
  const accessRows = await listPlannerWeddingAccessRows(supabase, plannerAccountId)

  const entries = await Promise.all(
    accessRows.map(async (entry) => {
      const config = await getWeddingConfigBySourceRef(
        supabase,
        entry.wedding_source,
        entry.wedding_source_id,
      )

      if (!config || !config.sourceId || config.source === 'fallback') {
        return null
      }

      const coupleAccount = await getCoupleAccountByWeddingRef(supabase, config.source, config.sourceId)
      const billingAccess = await getBillingAccessState(supabase, config, coupleAccount?.email ?? null)
      const linkedPlanner = await getLinkedPlannerForWedding(supabase, config.source, config.sourceId)

      return {
        weddingSource: config.source,
        weddingSourceId: config.sourceId,
        coupleLabel: config.coupleLabel,
        guestCode: config.guestCode,
        venueName: config.venueName,
        weddingDate: config.weddingDate,
        plannerCustomerNumber: linkedPlanner?.customerNumber ?? config.plannerCustomerNumber,
        billingUnlocked: !billingAccess.requiresPayment,
      } satisfies PlannerWeddingSummary
    }),
  )

  return entries
    .filter((entry): entry is PlannerWeddingSummary => Boolean(entry))
    .sort((left, right) => left.coupleLabel.localeCompare(right.coupleLabel, 'de'))
}

export async function selectPlannerWedding(
  session: AdminSession,
  input: {
    weddingSource: WeddingSource
    weddingSourceId: string
  },
): Promise<{
  nextUrl: string
  session: AdminSession
  sessionToken: string
}> {
  if (session.role !== 'planner') {
    throw new Error('Nur Wedding Planner können eine Hochzeit auswählen.')
  }

  const supabase = getRequiredAdminClient()
  const isLinked = await isPlannerLinkedToWedding(
    supabase,
    session.accountId,
    input.weddingSource,
    input.weddingSourceId,
  )

  if (!isLinked) {
    throw new Error('Für diese Hochzeit habt ihr noch keinen Zugriff.')
  }

  const config = await getWeddingConfigBySourceRef(supabase, input.weddingSource, input.weddingSourceId)

  if (!config) {
    throw new Error('Die ausgewählte Hochzeit konnte nicht geladen werden.')
  }

  const coupleAccount = await getCoupleAccountByWeddingRef(
    supabase,
    input.weddingSource,
    input.weddingSourceId,
  )
  const billingAccess = await getBillingAccessState(supabase, config, coupleAccount?.email ?? null)

  if (billingAccess.requiresPayment) {
    throw new Error('Dieses Brautpaar hat myWed noch nicht freigeschaltet.')
  }

  const nextSession = withSelectedWedding(session, input.weddingSource, input.weddingSourceId)
  const sessionToken = createAdminSessionToken(nextSession)

  if (!sessionToken) {
    throw new Error('Die Sitzung konnte nicht aktualisiert werden.')
  }

  return {
    nextUrl: '/admin/uebersicht',
    session: nextSession,
    sessionToken,
  }
}
