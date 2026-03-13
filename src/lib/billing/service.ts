import 'server-only'

import type Stripe from 'stripe'

import { getBillingAccessState } from '@/lib/billing/access'
import { createAdminClient } from '@/lib/supabase/admin'
import { createPublicClient } from '@/lib/supabase/public'
import {
  getActiveWeddingConfig,
  getCoupleAccountByWeddingRef,
  getWeddingConfigBySourceRef,
} from '@/lib/supabase/repository'
import type { WeddingSource } from '@/types/wedding'

import { retrieveBillingCheckoutSession } from './stripe'
import { persistBillingAccessState } from './service-utils'

function normalizeEmail(email: string | null | undefined): string | null {
  const normalized = email?.trim().toLowerCase()
  return normalized ? normalized : null
}

function getBillingPersistenceClient() {
  return createAdminClient() ?? createPublicClient()
}

function resolveCheckoutAdminEmail(session: Stripe.Checkout.Session): string | null {
  const metadataEmail = normalizeEmail(session.metadata?.adminEmail)
  const customerEmail = normalizeEmail(session.customer_details?.email ?? session.customer_email)

  return metadataEmail ?? customerEmail
}

function resolveCheckoutWeddingReference(
  session: Stripe.Checkout.Session,
): { weddingSource: WeddingSource; weddingSourceId: string } | null {
  const weddingSource = session.metadata?.weddingSource
  const weddingSourceId = session.metadata?.weddingSourceId

  if (
    (weddingSource !== 'modern' && weddingSource !== 'legacy') ||
    !weddingSourceId?.trim()
  ) {
    return null
  }

  return {
    weddingSource,
    weddingSourceId: weddingSourceId.trim(),
  }
}

function resolvePaymentIntentId(
  paymentIntent: string | Stripe.PaymentIntent | null,
): string | null {
  if (!paymentIntent) {
    return null
  }

  return typeof paymentIntent === 'string' ? paymentIntent : paymentIntent.id
}

export async function syncBillingFromCheckoutSession(session: Stripe.Checkout.Session): Promise<void> {
  if (session.mode !== 'payment' || session.payment_status !== 'paid') {
    return
  }

  const adminEmail = resolveCheckoutAdminEmail(session)

  if (!adminEmail) {
    throw new Error('Der Stripe-Checkout enthaelt keine zuordenbare Admin-E-Mail.')
  }

  const weddingReference = resolveCheckoutWeddingReference(session)

  if (!weddingReference) {
    throw new Error('Der Stripe-Checkout enthaelt keine zuordenbare Hochzeit.')
  }

  const supabase = getBillingPersistenceClient()
  const config = await getWeddingConfigBySourceRef(
    supabase,
    weddingReference.weddingSource,
    weddingReference.weddingSourceId,
  )

  if (!config) {
    throw new Error('Die zugehörige Hochzeit für den Stripe-Checkout wurde nicht gefunden.')
  }

  await persistBillingAccessState(config, {
    status: 'paid',
    provider: 'stripe',
    email: adminEmail,
    paidAt: new Date().toISOString(),
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: resolvePaymentIntentId(session.payment_intent),
    googlePlayPurchaseToken: null,
    googlePlayOrderId: null,
    googlePlayProductId: null,
    googlePlayPackageName: null,
    googlePlayAcknowledgedAt: null,
    expiresAt: null,
  })
}

export interface FinalizeCheckoutResult {
  access: Awaited<ReturnType<typeof getBillingAccessState>>
  code:
    | 'ALREADY_UNLOCKED'
    | 'INVALID_SESSION'
    | 'MISSING_SESSION'
    | 'NOT_CONFIGURED'
    | 'PAID'
    | 'PAYMENT_PENDING'
}

export async function finalizeCheckoutSession(
  sessionId: string | null | undefined,
  context?: {
    adminEmail?: string | null
    config?: Awaited<ReturnType<typeof getWeddingConfigBySourceRef>> | null
  },
): Promise<FinalizeCheckoutResult> {
  const supabase = getBillingPersistenceClient()
  const fallbackConfig = context?.config ?? (await getActiveWeddingConfig(supabase))
  const accessBefore = await getBillingAccessState(supabase, fallbackConfig, context?.adminEmail ?? null)

  if (!sessionId) {
    return {
      access: accessBefore,
      code: 'MISSING_SESSION',
    }
  }

  if (!accessBefore.billingEnabled && !accessBefore.hasPaid) {
    return {
      access: accessBefore,
      code: 'NOT_CONFIGURED',
    }
  }

  if (!accessBefore.requiresPayment) {
    return {
      access: accessBefore,
      code: 'ALREADY_UNLOCKED',
    }
  }

  const checkoutSession = await retrieveBillingCheckoutSession(sessionId).catch(() => null)

  if (!checkoutSession || checkoutSession.mode !== 'payment') {
    return {
      access: accessBefore,
      code: 'INVALID_SESSION',
    }
  }

  if (checkoutSession.payment_status !== 'paid') {
    return {
      access: accessBefore,
      code: 'PAYMENT_PENDING',
    }
  }

  await syncBillingFromCheckoutSession(checkoutSession)

  const weddingReference = resolveCheckoutWeddingReference(checkoutSession)
  const updatedConfig =
    weddingReference
      ? await getWeddingConfigBySourceRef(
          supabase,
          weddingReference.weddingSource,
          weddingReference.weddingSourceId,
        )
      : null
  const coupleAccount =
    updatedConfig?.sourceId && updatedConfig.source !== 'fallback'
      ? await getCoupleAccountByWeddingRef(supabase, updatedConfig.source, updatedConfig.sourceId)
      : null

  return {
    access: await getBillingAccessState(supabase, updatedConfig ?? fallbackConfig, coupleAccount?.email ?? null),
    code: 'PAID',
  }
}
