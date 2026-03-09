import { redirect } from 'next/navigation'

import { BillingPaywall } from '@/components/billing/BillingPaywall'
import { LoginForm } from '@/components/forms/LoginForm'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import {
  hasConfiguredCoupleCredentials,
  hasConfiguredPlannerCredentials,
} from '@/lib/auth/admin-session'
import { getServerSession } from '@/lib/auth/get-session'
import { getBillingAccessState } from '@/lib/billing/access'
import { finalizeCheckoutSession, type FinalizeCheckoutResult } from '@/lib/billing/service'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getAdminWeddingConfig } from '@/lib/supabase/repository'

function getSearchParamValue(value: string | string[] | undefined): string | null {
  if (typeof value === 'string') {
    return value
  }

  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return null
}

function getNotice(
  billingState: string | null,
  checkoutResult: FinalizeCheckoutResult | null,
  requiresPayment: boolean,
) {
  if (billingState === 'cancelled') {
    return {
      tone: 'warning' as const,
      title: 'Zahlung abgebrochen',
      body: 'Der Stripe-Checkout wurde abgebrochen. Der Gastbereich bleibt kostenlos, der Paarbereich wird nach dem Kauf freigeschaltet.',
    }
  }

  if (billingState !== 'success') {
    return null
  }

  if (checkoutResult?.code === 'PAID' || (!requiresPayment && checkoutResult?.code === 'ALREADY_UNLOCKED')) {
    return {
      tone: 'success' as const,
      title: 'Zahlung bestaetigt',
      body: 'Der Paarbereich ist jetzt freigeschaltet. Ihr koennt euch direkt anmelden.',
    }
  }

  return {
    tone: 'info' as const,
    title: 'Zahlung wird geprueft',
    body: 'Wenn ihr den Checkout gerade abgeschlossen habt, wird die Freischaltung in der Regel innerhalb weniger Sekunden sichtbar.',
  }
}

interface AdminLoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const resolvedSearchParams = await searchParams
  const billingState = getSearchParamValue(resolvedSearchParams.billing)
  const checkoutSessionId = getSearchParamValue(resolvedSearchParams.session_id)
  const checkoutResult =
    billingState === 'success' ? await finalizeCheckoutSession(checkoutSessionId) : null
  const session = await getServerSession()
  const supabase = createAdminClient() ?? (await createClient())
  const config = await getAdminWeddingConfig(supabase, undefined)
  const billingAccess = await getBillingAccessState(supabase, config)
  const coupleLoginConfigured = hasConfiguredCoupleCredentials()
  const plannerLoginConfigured = hasConfiguredPlannerCredentials()

  if (session && !billingAccess.requiresPayment) {
    redirect('/admin/uebersicht')
  }

  const notice = getNotice(billingState, checkoutResult, billingAccess.requiresPayment)

  const noticeStyles =
    notice?.tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : notice?.tone === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : 'border-sky-200 bg-sky-50 text-sky-800'

  return (
    <Section className="space-y-8">
      <div className="mx-auto max-w-2xl text-center">
        <SectionHeading as="h1">Login für Brautpaare und Wedding Planner</SectionHeading>
        <p className="mt-4 text-charcoal-600">
          Dieser geschützte Bereich steht dem Brautpaar und optional dem Wedding Planner derselben Hochzeit zur Verfügung.
        </p>
      </div>
      {notice ? (
        <div className={`mx-auto max-w-3xl rounded-[1.75rem] border px-5 py-4 text-sm ${noticeStyles}`}>
          <p className="font-semibold">{notice.title}</p>
          <p className="mt-1">{notice.body}</p>
        </div>
      ) : null}
      {billingAccess.requiresPayment ? (
        <BillingPaywall adminEmail={billingAccess.adminEmail} />
      ) : (
        <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-2">
          <div className="surface-card px-6 py-8 sm:px-8">
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.18em] text-gold-700">Brautpaar</p>
              <h2 className="font-display text-card text-charcoal-900">Zugang für das Paar</h2>
              <p className="text-charcoal-600">
                Für alle Inhalte, QR-Code, RSVP-Auswertung, Tischplan und Vorschau.
              </p>
            </div>
            {coupleLoginConfigured ? (
              <div className="mt-6">
                <LoginForm embedded role="couple" submitLabel="Als Brautpaar anmelden" />
              </div>
            ) : (
              <div className="mt-6 rounded-[1.5rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
                Der Brautpaar-Login ist aktuell noch nicht konfiguriert.
              </div>
            )}
          </div>

          <div className="surface-card px-6 py-8 sm:px-8">
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.18em] text-sage-700">Wedding Planner</p>
              <h2 className="font-display text-card text-charcoal-900">Zugang für den Wedding Planner</h2>
              <p className="text-charcoal-600">
                Gleiche Rechte wie das Brautpaar, aber mit separaten Zugangsdaten für Planung und Abstimmung.
              </p>
            </div>
            {plannerLoginConfigured ? (
              <div className="mt-6">
                <LoginForm embedded role="planner" submitLabel="Als Wedding Planner anmelden" />
              </div>
            ) : (
              <div className="mt-6 rounded-[1.5rem] border border-cream-300 bg-cream-50 px-5 py-4 text-sm text-charcoal-700">
                Dieser Zugang ist optional und aktuell noch nicht eingerichtet. Setzt dafür
                `WEDDING_PLANNER_EMAIL` und `WEDDING_PLANNER_PASSWORD`.
              </div>
            )}
          </div>
        </div>
      )}
    </Section>
  )
}
