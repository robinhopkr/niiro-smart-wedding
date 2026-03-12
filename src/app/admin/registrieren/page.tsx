import { redirect } from 'next/navigation'

import { AdminRegistrationForm } from '@/components/admin/AdminRegistrationForm'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { getServerSession } from '@/lib/auth/get-session'
import { getBillingPricing } from '@/lib/billing/constants'

function getRoleFromSearchParams(value: string | string[] | undefined): 'couple' | 'planner' {
  if (value === 'planner' || (Array.isArray(value) && value[0] === 'planner')) {
    return 'planner'
  }

  return 'couple'
}

interface AdminRegistrationPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminRegistrationPage({
  searchParams,
}: AdminRegistrationPageProps) {
  const pricing = getBillingPricing()
  const session = await getServerSession()

  if (session) {
    redirect(session.role === 'planner' ? '/admin/hochzeiten' : '/admin/kauf')
  }

  const resolvedSearchParams = await searchParams
  const activeRole = getRoleFromSearchParams(resolvedSearchParams.role)

  return (
    <Section className="space-y-8">
      <div className="mx-auto max-w-3xl text-center">
        <SectionHeading as="h1">Konto für NiiRo Smart Wedding erstellen</SectionHeading>
        <p className="mt-4 text-charcoal-600">
          Brautpaare registrieren ihre Hochzeit selbst. Wedding Planner erhalten eine eigene Kundennummer
          und sehen später kostenlos alle freigegebenen Brautpaare in einer Auswahl.
        </p>
        <p className="mt-2 text-sm text-charcoal-600">
          Der Paarbereich kostet regulär {pricing.standardPriceLabel} inkl. MwSt.
          {pricing.promoActive
            ? ` Aktuell gilt der Einführungspreis von ${pricing.promoPriceLabel} bis ${pricing.promoDeadlineLabel}.`
            : ''}
        </p>
      </div>

      <div className="mx-auto grid w-full max-w-6xl gap-6 xl:grid-cols-2">
        <div className="surface-card px-6 py-8 sm:px-8">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.18em] text-gold-700">Brautpaar</p>
            <h2 className="font-display text-card text-charcoal-900">Eigene Hochzeit registrieren</h2>
            <p className="text-charcoal-600">
              Nach der Registrierung geht es direkt zur Freischaltung. Erst der Kauf schaltet euren Paarbereich vollständig frei.
            </p>
          </div>
          <div className="mt-6">
            <AdminRegistrationForm role="couple" />
          </div>
        </div>

        <div className="surface-card px-6 py-8 sm:px-8">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.18em] text-sage-700">Wedding Planner</p>
            <h2 className="font-display text-card text-charcoal-900">Planner-Konto erstellen</h2>
            <p className="text-charcoal-600">
              Die Registrierung ist kostenlos. Ihr erhaltet eine Kundennummer. Diese gibt das Brautpaar bei sich ein, damit die Hochzeit in eurer Auswahl erscheint.
            </p>
          </div>
          <div className="mt-6">
            <AdminRegistrationForm role="planner" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl rounded-[1.75rem] border border-cream-200 bg-cream-50 px-6 py-5 text-sm text-charcoal-600">
        Aktueller Fokus: <span className="font-semibold text-charcoal-900">{activeRole === 'planner' ? 'Wedding Planner' : 'Brautpaar'}</span>
      </div>
    </Section>
  )
}
