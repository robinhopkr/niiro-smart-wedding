import { NextResponse } from 'next/server'

import { createBillingCheckoutSession } from '@/lib/billing/stripe'
import { ENV } from '@/lib/constants'
import { getBillingAccessState } from '@/lib/billing/access'
import { createAdminClient } from '@/lib/supabase/admin'
import { createPublicClient } from '@/lib/supabase/public'
import type { ApiResponse } from '@/types/api'

type CheckoutResponse = {
  url: string
}

export async function POST(): Promise<NextResponse<ApiResponse<CheckoutResponse>>> {
  const supabase = createAdminClient() ?? createPublicClient()
  const access = await getBillingAccessState(supabase)

  if (!access.billingEnabled) {
    return NextResponse.json(
      {
        success: false,
        error: 'Die Stripe-Zahlung ist aktuell noch nicht konfiguriert.',
        code: 'BILLING_NOT_CONFIGURED',
      },
      { status: 503 },
    )
  }

  if (!access.adminEmail) {
    return NextResponse.json(
      {
        success: false,
        error: 'Die Admin-E-Mail fuer das Brautpaar ist aktuell nicht konfiguriert.',
        code: 'ADMIN_EMAIL_NOT_CONFIGURED',
      },
      { status: 503 },
    )
  }

  if (!access.requiresPayment) {
    return NextResponse.json({
      success: true,
      data: {
        url: `${ENV.appUrl}/admin/login`,
      },
    })
  }

  try {
    const session = await createBillingCheckoutSession(access.adminEmail)

    if (!session.url) {
      throw new Error('Stripe hat keine Checkout-URL zurueckgegeben.')
    }

    return NextResponse.json({
      success: true,
      data: {
        url: session.url,
      },
    })
  } catch (error) {
    console.error('Stripe checkout creation failed', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Der Stripe-Checkout konnte gerade nicht erstellt werden.',
        code: 'CHECKOUT_CREATION_FAILED',
      },
      { status: 500 },
    )
  }
}
