import { NextResponse, type NextRequest } from 'next/server'
import type Stripe from 'stripe'

import { syncBillingFromCheckoutSession } from '@/lib/billing/service'
import { getStripeClient, getStripeWebhookSecret } from '@/lib/billing/stripe'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const stripe = getStripeClient()
  const webhookSecret = getStripeWebhookSecret()

  if (!stripe || !webhookSecret) {
    return NextResponse.json(
      {
        success: false,
        error: 'Stripe-Webhook ist nicht konfiguriert.',
      },
      { status: 503 },
    )
  }

  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      {
        success: false,
        error: 'Fehlende Stripe-Signatur.',
      },
      { status: 400 },
    )
  }

  const payload = await request.text()
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Ungueltige Stripe-Signatur.',
      },
      { status: 400 },
    )
  }

  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      await syncBillingFromCheckoutSession(event.data.object as Stripe.Checkout.Session)
    }
  } catch (error) {
    console.error('Stripe webhook handling failed', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Der Stripe-Webhook konnte nicht verarbeitet werden.',
      },
      { status: 500 },
    )
  }

  return NextResponse.json({ received: true })
}
