import { Check, HeartHandshake, ShieldCheck, Users } from 'lucide-react'

import {
  BILLING_PRICE_LABEL,
  BILLING_PRICE_NOTE,
} from '@/lib/billing/constants'

import { BillingCheckoutButton } from './BillingCheckoutButton'

interface BillingPaywallProps {
  adminEmail: string | null
}

const VALUE_POINTS = [
  'Geschuetzter Paarbereich fuer Inhalte, RSVPs und Galeriepflege',
  'Einmalige Zahlung pro Brautpaar statt laufender Monatskosten',
  'Gaestebereich, RSVP und Galerie fuer eure Gaeste bleiben kostenlos',
] as const

export function BillingPaywall({ adminEmail }: BillingPaywallProps) {
  return (
    <div className="surface-card mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-8 sm:px-10">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-gold-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold-700">
            <ShieldCheck className="h-4 w-4" />
            Brautpaar-Zugang
          </div>

          <div className="space-y-3">
            <h2 className="font-display text-3xl text-charcoal-900 sm:text-4xl">
              Freischaltung fuer den Paarbereich
            </h2>
            <p className="max-w-2xl text-charcoal-600">
              Der geschuetzte Bereich fuer das Brautpaar wird einmalig pro Hochzeit freigeschaltet.
              Eure Gaeste koennen Einladung, RSVP und Galerie weiterhin kostenlos nutzen.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <article className="rounded-[1.75rem] border border-cream-200 bg-cream-50 px-4 py-4">
              <HeartHandshake className="h-5 w-5 text-gold-700" />
              <p className="mt-3 text-sm font-semibold text-charcoal-900">Einmalig statt Abo</p>
              <p className="mt-1 text-sm text-charcoal-600">{BILLING_PRICE_NOTE}</p>
            </article>
            <article className="rounded-[1.75rem] border border-cream-200 bg-cream-50 px-4 py-4">
              <Users className="h-5 w-5 text-gold-700" />
              <p className="mt-3 text-sm font-semibold text-charcoal-900">Gaestebereich frei</p>
              <p className="mt-1 text-sm text-charcoal-600">
                Einladung, Rueckmeldung und Galerie bleiben fuer eure Gaeste kostenlos.
              </p>
            </article>
            <article className="rounded-[1.75rem] border border-cream-200 bg-cream-50 px-4 py-4">
              <ShieldCheck className="h-5 w-5 text-gold-700" />
              <p className="mt-3 text-sm font-semibold text-charcoal-900">Sofort nutzbar</p>
              <p className="mt-1 text-sm text-charcoal-600">
                Nach erfolgreicher Zahlung wird der Paarbereich direkt freigeschaltet.
              </p>
            </article>
          </div>

          <ul className="space-y-3 text-sm text-charcoal-700">
            {VALUE_POINTS.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold-100 text-gold-700">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <aside className="rounded-[2rem] border border-gold-200 bg-white px-6 py-6 shadow-elegant">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-700">Preis</p>
          <div className="mt-4 flex items-end gap-3">
            <span className="font-display text-5xl text-charcoal-900">{BILLING_PRICE_LABEL}</span>
          </div>
          <p className="mt-3 text-sm text-charcoal-600">{BILLING_PRICE_NOTE}</p>
          {adminEmail ? (
            <p className="mt-5 rounded-3xl bg-cream-50 px-4 py-4 text-sm text-charcoal-700">
              Freischaltung fuer: <span className="font-semibold text-charcoal-900">{adminEmail}</span>
            </p>
          ) : null}
          <div className="mt-6">
            <BillingCheckoutButton />
          </div>
        </aside>
      </div>
    </div>
  )
}
