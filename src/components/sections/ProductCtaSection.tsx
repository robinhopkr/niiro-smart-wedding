import Link from 'next/link'

import { Section } from '@/components/ui/Section'
import { getBillingPricing } from '@/lib/billing/constants'

export function ProductCtaSection() {
  const pricing = getBillingPricing()

  return (
    <Section className="pb-24">
      <div className="relative overflow-hidden rounded-[2rem] border border-rose-200/70 bg-[linear-gradient(180deg,#fffaf6_0%,#fff3ec_52%,#fffdf9_100%)] px-6 py-10 text-center shadow-elegant sm:px-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(214,170,112,0.2),_transparent_34%),radial-gradient(circle_at_80%_20%,_rgba(202,125,118,0.14),_transparent_26%),radial-gradient(circle_at_bottom_center,_rgba(173,191,163,0.14),_transparent_28%)]" />
        <div className="relative">
          <p className="text-sm uppercase tracking-[0.26em] text-gold-700">Bereit für den nächsten Schritt?</p>
          <h2 className="mt-4 font-display text-section text-charcoal-900">
            Wenn ihr möchtet, ist die App bereit für eure echte Hochzeit.
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-lg leading-8 text-charcoal-600">
            Ihr könnt die Demo zeigen, den Paarbereich prüfen und danach eure echte
            Hochzeit registrieren, per Stripe freischalten und eure Inhalte direkt pflegen.
          </p>
          <div className="mx-auto mt-6 flex max-w-2xl flex-wrap items-center justify-center gap-3 rounded-[1.75rem] border border-rose-200/80 bg-white/80 px-5 py-4 text-sm text-charcoal-700 shadow-elegant">
            <span className="font-semibold text-charcoal-900">Regulär {pricing.standardPriceLabel} inkl. MwSt.</span>
            {pricing.promoActive ? (
              <span className="rounded-full bg-gold-100 px-3 py-1 font-semibold text-gold-800">
                Jetzt {pricing.promoPriceLabel} bis {pricing.promoDeadlineLabel}
              </span>
            ) : null}
            <span>Der Gästebereich bleibt kostenlos.</span>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-gold-500 px-6 py-3 font-semibold text-charcoal-900 shadow-gold transition hover:bg-gold-400"
              href="/demo"
            >
              Demo öffnen
            </Link>
            <Link
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-gold-300 bg-white/90 px-6 py-3 font-semibold text-charcoal-800 transition hover:border-gold-500 hover:bg-white"
              href="/admin/registrieren?role=couple"
            >
              Brautpaar registrieren
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-3 text-sm">
            <Link className="font-semibold text-gold-700 hover:text-gold-800" href="/admin/login?role=couple">
              Login Brautpaare
            </Link>
            <span className="text-charcoal-300">•</span>
            <Link className="font-semibold text-gold-700 hover:text-gold-800" href="/admin/login?role=planner">
              Login Wedding Planner
            </Link>
          </div>
        </div>
      </div>
    </Section>
  )
}
