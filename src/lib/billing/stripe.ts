import 'server-only'

import Stripe from 'stripe'

import {
  BILLING_AMOUNT_CENTS,
  BILLING_CURRENCY,
  BILLING_PRODUCT_DESCRIPTION,
  BILLING_PRODUCT_NAME,
} from '@/lib/billing/constants'
import { ENV } from '@/lib/constants'

let cachedStripeClient: Stripe | null | undefined

function getStripeSecretKey(): string | null {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim()
  return secretKey ? secretKey : null
}

export function getStripeWebhookSecret(): string | null {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  return webhookSecret ? webhookSecret : null
}

export function getStripeClient(): Stripe | null {
  if (cachedStripeClient !== undefined) {
    return cachedStripeClient
  }

  const secretKey = getStripeSecretKey()
  if (!secretKey) {
    cachedStripeClient = null
    return cachedStripeClient
  }

  cachedStripeClient = new Stripe(secretKey)
  return cachedStripeClient
}

export async function createBillingCheckoutSession(adminEmail: string): Promise<Stripe.Checkout.Session> {
  const stripe = getStripeClient()

  if (!stripe) {
    throw new Error('Stripe ist aktuell nicht konfiguriert.')
  }

  return stripe.checkout.sessions.create({
    mode: 'payment',
    locale: 'de',
    billing_address_collection: 'required',
    customer_email: adminEmail,
    success_url: `${ENV.appUrl}/admin/login?billing=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${ENV.appUrl}/admin/login?billing=cancelled`,
    metadata: {
      adminEmail,
      billingType: 'couple_access',
    },
    payment_intent_data: {
      metadata: {
        adminEmail,
        billingType: 'couple_access',
      },
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: BILLING_CURRENCY,
          unit_amount: BILLING_AMOUNT_CENTS,
          product_data: {
            name: BILLING_PRODUCT_NAME,
            description: BILLING_PRODUCT_DESCRIPTION,
          },
        },
      },
    ],
  })
}

export async function retrieveBillingCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  const stripe = getStripeClient()

  if (!stripe) {
    throw new Error('Stripe ist aktuell nicht konfiguriert.')
  }

  return stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent'],
  })
}
