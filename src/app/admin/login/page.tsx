import { redirect } from 'next/navigation'

import { LoginForm } from '@/components/forms/LoginForm'
import { ActionLink } from '@/components/ui/ActionLink'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { getServerSession } from '@/lib/auth/get-session'
import { resolveWeddingAccessForSession } from '@/lib/auth/admin-accounts'
import { getBillingPricing } from '@/lib/billing/constants'

function getRoleFromSearchParams(value: string | string[] | undefined): 'couple' | 'planner' {
  if (value === 'planner' || (Array.isArray(value) && value[0] === 'planner')) {
    return 'planner'
  }

  return 'couple'
}

interface AdminLoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const pricing = getBillingPricing()
  const session = await getServerSession()

  if (session) {
    if (session.role === 'planner' && (!session.weddingSource || !session.weddingSourceId)) {
      redirect('/admin/hochzeiten')
    }

    try {
      const { billingAccess } = await resolveWeddingAccessForSession(session)
      redirect(
        billingAccess.requiresPayment
          ? session.role === 'planner'
            ? '/admin/hochzeiten'
            : '/admin/kauf'
          : '/admin/uebersicht',
      )
    } catch {}
  }

  const resolvedSearchParams = await searchParams
  const activeRole = getRoleFromSearchParams(resolvedSearchParams.role)

  return (
    <Section className="space-y-8">
      <div className="mx-auto max-w-3xl text-center">
        <SectionHeading as="h1">Login für Brautpaare und Wedding Planner</SectionHeading>
        <p className="mt-4 text-charcoal-600">
          Brautpaare registrieren ihre Hochzeit selbst und schließen den Kauf für ihren Paarbereich eigenständig ab.
          Wedding Planner greifen danach über ihre Kundennummer auf freigegebene Hochzeiten zu.
        </p>
        <p className="mt-2 text-sm text-charcoal-600">
          Paarbereich regulär {pricing.standardPriceLabel} inkl. MwSt.
          {pricing.promoActive
            ? ` Aktuell ${pricing.promoPriceLabel} bis ${pricing.promoDeadlineLabel}.`
            : ''}
        </p>
      </div>

      <div className="mx-auto grid w-full max-w-6xl gap-6 xl:grid-cols-2">
        <div className={`surface-card px-6 py-8 sm:px-8 ${activeRole === 'couple' ? 'ring-2 ring-gold-200' : ''}`}>
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.18em] text-gold-700">Brautpaar</p>
            <h2 className="font-display text-card text-charcoal-900">Eigene Hochzeit verwalten</h2>
            <p className="text-charcoal-600">
              Für Inhalte, Einladungslink, RSVP, Tischplan, PDF-Download, Galerie und Freischaltung eurer Hochzeit.
            </p>
          </div>
          <div className="mt-6 space-y-4">
            <LoginForm
              embedded
              role="couple"
              secondaryReturnUrl="/admin/einrichtung"
              secondarySubmitLabel="Fragebogen zur Einrichtung von myWed"
              submitLabel="Als Brautpaar anmelden"
            />
            <div className="rounded-[1.5rem] border border-cream-200 bg-cream-50 px-5 py-5">
              <p className="font-semibold text-charcoal-900">Noch kein Brautpaar-Konto?</p>
              <p className="mt-2 text-sm leading-6 text-charcoal-600">
                Registriert eure Hochzeit zuerst selbst. Danach landet ihr direkt in der Freischaltung eures Paarbereichs.
              </p>
              <div className="mt-4">
                <ActionLink href="/admin/registrieren?role=couple" variant="secondary">
                  Brautpaar registrieren
                </ActionLink>
              </div>
            </div>
          </div>
        </div>

        <div className={`surface-card px-6 py-8 sm:px-8 ${activeRole === 'planner' ? 'ring-2 ring-sage-200' : ''}`}>
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.18em] text-sage-700">Wedding Planner</p>
            <h2 className="font-display text-card text-charcoal-900">Mehrere Brautpaare verwalten</h2>
            <p className="text-charcoal-600">
              Nach dem Login wählt ihr aus euren freigegebenen Hochzeiten. Zugriff auf alle Bereiche außer auf private Fotos.
            </p>
          </div>
          <div className="mt-6 space-y-4">
            <LoginForm embedded role="planner" submitLabel="Als Wedding Planner anmelden" />
            <div className="rounded-[1.5rem] border border-cream-200 bg-cream-50 px-5 py-5">
              <p className="font-semibold text-charcoal-900">Noch kein Wedding-Planer-Konto?</p>
              <p className="mt-2 text-sm leading-6 text-charcoal-600">
                Erstellt euer Planner-Konto. Ihr erhaltet eine Kundennummer, die euch Brautpaare in ihrem Paarbereich freigeben.
              </p>
              <div className="mt-4">
                <ActionLink href="/admin/registrieren?role=planner" variant="secondary">
                  Wedding Planner registrieren
                </ActionLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  )
}
