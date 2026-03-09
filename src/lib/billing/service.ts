import 'server-only'

import type Stripe from 'stripe'

import { getBillingAccessState } from '@/lib/billing/access'
import { createAdminClient } from '@/lib/supabase/admin'
import { createPublicClient } from '@/lib/supabase/public'
import { saveStoredBillingRecord } from '@/lib/supabase/repository'

import { retrieveBillingCheckoutSession } from './stripe'

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

  const supabase = getBillingPersistenceClient()

  await saveStoredBillingRecord(supabase, {
    status: 'paid',
    email: adminEmail,
    paidAt: new Date().toISOString(),
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: resolvePaymentIntentId(session.payment_intent),
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
): Promise<FinalizeCheckoutResult> {
  const supabase = getBillingPersistenceClient()
  const accessBefore = await getBillingAccessState(supabase)

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

  return {
    access: await getBillingAccessState(supabase),
    code: 'PAID',
  }
}
