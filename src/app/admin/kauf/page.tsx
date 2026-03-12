import { redirect } from 'next/navigation'

import { BillingPaywall } from '@/components/billing/BillingPaywall'
import { LogoutButton } from '@/components/admin/LogoutButton'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { getServerSession } from '@/lib/auth/get-session'
import { getBillingPricing } from '@/lib/billing/constants'
import { finalizeCheckoutSession } from '@/lib/billing/service'
import { resolveWeddingAccessForSession } from '@/lib/auth/admin-accounts'

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
  checkoutCode: Awaited<ReturnType<typeof finalizeCheckoutSession>>['code'],
) {
  if (billingState === 'cancelled') {
    return {
      tone: 'warning' as const,
      title: 'Zahlung abgebrochen',
      body: 'Der Checkout wurde abgebrochen. Ihr könnt die Freischaltung jederzeit erneut starten.',
    }
  }

  if (billingState !== 'success') {
    return null
  }

  if (checkoutCode === 'PAID' || checkoutCode === 'ALREADY_UNLOCKED') {
    return {
      tone: 'success' as const,
      title: 'Zahlung bestätigt',
      body: 'Euer Paarbereich ist jetzt freigeschaltet. Ihr könnt direkt weiterarbeiten.',
    }
  }

  return {
    tone: 'info' as const,
    title: 'Zahlung wird geprüft',
    body: 'Wenn ihr den Checkout gerade abgeschlossen habt, ist die Freischaltung meist innerhalb weniger Sekunden sichtbar.',
  }
}

interface PurchasePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function PurchasePage({ searchParams }: PurchasePageProps) {
  const pricing = getBillingPricing()
  const session = await getServerSession()

  if (!session) {
    redirect('/admin/login')
  }

  if (session.role !== 'couple') {
    redirect('/admin/hochzeiten')
  }

  const { billingAccess, config, coupleAccount } = await resolveWeddingAccessForSession(session).catch(() => {
    redirect('/admin/login')
  })
  const resolvedSearchParams = await searchParams
  const billingState = getSearchParamValue(resolvedSearchParams.billing)
  const checkoutSessionId = getSearchParamValue(resolvedSearchParams.session_id)
  const checkoutResult =
    billingState === 'success'
      ? await finalizeCheckoutSession(checkoutSessionId, {
          adminEmail: coupleAccount?.email ?? null,
          config,
        })
      : null
  const access = checkoutResult?.access ?? billingAccess

  if (!access.requiresPayment) {
    redirect('/admin/uebersicht')
  }

  const notice = getNotice(billingState, checkoutResult?.code ?? 'MISSING_SESSION')
  const noticeStyles =
    notice?.tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : notice?.tone === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : 'border-sky-200 bg-sky-50 text-sky-800'

  return (
    <Section className="space-y-8">
      <div className="mx-auto max-w-3xl text-center">
        <SectionHeading as="h1">NiiRo Smart Wedding freischalten</SectionHeading>
        <p className="mt-4 text-charcoal-600">
          Der Gästebereich bleibt kostenlos. Für euren geschützten Paarbereich wird die Hochzeit einmalig per Stripe freigeschaltet.
        </p>
        <p className="mt-2 text-sm text-charcoal-600">
          Regulär {pricing.standardPriceLabel} inkl. MwSt.
          {pricing.promoActive
            ? `, aktuell ${pricing.promoPriceLabel} als Launch-Angebot bis ${pricing.promoDeadlineLabel}.`
            : '.'}
        </p>
        <div className="mt-5 flex justify-center">
          <LogoutButton label="Logout" variant="secondary" />
        </div>
      </div>

      {notice ? (
        <div className={`mx-auto max-w-3xl rounded-[1.75rem] border px-5 py-4 text-sm ${noticeStyles}`}>
          <p className="font-semibold">{notice.title}</p>
          <p className="mt-1">{notice.body}</p>
        </div>
      ) : null}

      <BillingPaywall adminEmail={coupleAccount?.email ?? null} />
    </Section>
  )
}
