import 'server-only'

import { DEFAULT_BILLING_BYPASS_EMAILS } from '@/lib/billing/constants'
import { ENV } from '@/lib/constants'
import {
  getCoupleAccountByWeddingRef,
  getStoredBillingRecord,
  type StoredBillingRecord,
} from '@/lib/supabase/repository'
import type { WeddingConfig } from '@/types/wedding'
import { isGooglePlayBillingConfigured } from './google-play'

function normalizeEmail(email: string | null | undefined): string | null {
  const normalized = email?.trim().toLowerCase()
  return normalized ? normalized : null
}

function parseEnvBillingBypassEmails(): string[] {
  const rawValue = process.env.BILLING_BYPASS_EMAILS

  if (!rawValue) {
    return []
  }

  return rawValue
    .split(',')
    .map((item) => normalizeEmail(item))
    .filter((item): item is string => Boolean(item))
}

export function getConfiguredAdminEmail(): string | null {
  return normalizeEmail(ENV.adminEmail)
}

export function getBillingBypassEmails(): string[] {
  return Array.from(new Set([...DEFAULT_BILLING_BYPASS_EMAILS, ...parseEnvBillingBypassEmails()]))
}

export function isBillingBypassedEmail(email: string | null | undefined): boolean {
  const normalized = normalizeEmail(email)

  if (!normalized) {
    return false
  }

  return getBillingBypassEmails().includes(normalized)
}

export function isBillingConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim()) || isGooglePlayBillingConfigured()
}

export interface BillingAccessState {
  adminEmail: string | null
  billingEnabled: boolean
  hasPaid: boolean
  isBypassed: boolean
  paidAt: string | null
  provider: StoredBillingRecord['provider']
  requiresPayment: boolean
  status: StoredBillingRecord['status']
}

export function buildBillingAccessState(
  adminEmail: string | null | undefined,
  billingRecord: StoredBillingRecord,
): BillingAccessState {
  const normalizedAdminEmail = normalizeEmail(adminEmail)
  const billingEnabled = isBillingConfigured()
  const isBypassed = isBillingBypassedEmail(normalizedAdminEmail)
  const hasPaid = billingRecord.status === 'paid'

  return {
    adminEmail: normalizedAdminEmail,
    billingEnabled,
    hasPaid,
    isBypassed,
    paidAt: billingRecord.paidAt,
    provider: billingRecord.provider,
    requiresPayment: Boolean(normalizedAdminEmail) && !isBypassed && !hasPaid,
    status: billingRecord.status,
  }
}

export async function getBillingAccessState(
  supabase: Parameters<typeof getStoredBillingRecord>[0],
  config: WeddingConfig,
  adminEmailOverride?: string | null,
): Promise<BillingAccessState> {
  const billingRecord = await getStoredBillingRecord(supabase, config)
  const normalizedOverride = normalizeEmail(adminEmailOverride)

  if (normalizedOverride) {
    return buildBillingAccessState(normalizedOverride, billingRecord)
  }

  if (config.source !== 'fallback' && config.sourceId) {
    const coupleAccount = await getCoupleAccountByWeddingRef(supabase, config.source, config.sourceId)

    if (coupleAccount?.email) {
      return buildBillingAccessState(coupleAccount.email, billingRecord)
    }

    if (config.source === 'legacy') {
      return buildBillingAccessState(getConfiguredAdminEmail(), billingRecord)
    }
  }

  return buildBillingAccessState(null, billingRecord)
}
