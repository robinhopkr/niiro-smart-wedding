import Link from 'next/link'
import { CalendarHeart, Camera, LayoutDashboard, MapPinned, MessageCircleHeart } from 'lucide-react'

import { Divider } from '@/components/ui/Divider'
import { getBillingPricing } from '@/lib/billing/constants'
import { APP_BRAND_NAME } from '@/lib/constants'

const trustPoints = [
  'Digitale Einladung, RSVP und Fotogalerie an einem Ort',
  'Für Gäste klar verständlich auf dem Smartphone und am Desktop',
  'Paarbereich mit Übersicht, Textpflege und geschützten Zugängen',
] as const

export function ProductHeroSection() {
  const pricing = getBillingPricing()

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(212,154,29,0.18),_transparent_38%),radial-gradient(circle_at_80%_20%,_rgba(201,90,88,0.12),_transparent_26%),linear-gradient(180deg,#fffaf1_0%,#fffcf7_48%,#ffffff_100%)]" />
      <div className="absolute left-[-5rem] top-16 h-72 w-72 rounded-full bg-gold-100 blur-3xl" />
      <div className="absolute right-[-5rem] top-40 h-72 w-72 rounded-full bg-sage-100 blur-3xl" />

      <div className="relative mx-auto grid min-h-screen max-w-6xl gap-12 px-6 py-hero sm:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="space-y-8">
          <div className="space-y-5">
            <p className="text-eyebrow uppercase text-sage-600">
              {APP_BRAND_NAME}
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-gold-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-gold-800">
                Einmalig {pricing.standardPriceLabel} inkl. MwSt.
              </span>
              {pricing.promoActive ? (
                <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-dusty-rose-700 shadow-elegant">
                  Launch-Angebot: {pricing.promoPriceLabel} bis {pricing.promoDeadlineLabel}
                </span>
              ) : null}
            </div>
            <h1 className="font-display text-hero text-charcoal-900">
              myWed — stilvolle Einladungen, klare Rückmeldungen und eine Galerie danach.
            </h1>
            <p className="max-w-2xl text-body-lg text-charcoal-600">
              Eine elegante Hochzeitsseite für eure Gäste mit RSVP, Ablauf, Anfahrt, FAQ,
              Fotogalerie und einem geschützten Paarbereich für Inhalte, Rückmeldungen und Zugänge.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-gold-500 px-6 py-3 text-base font-semibold text-charcoal-900 shadow-gold transition hover:bg-gold-400"
              href="/demo"
            >
              Live-Demo öffnen
            </Link>
            <Link
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-gold-300 bg-white px-6 py-3 text-base font-semibold text-charcoal-800 transition hover:border-gold-500"
              href="/admin/login?role=couple"
            >
              Login Brautpaare
            </Link>
            <Link
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-gold-300 bg-white px-6 py-3 text-base font-semibold text-charcoal-800 transition hover:border-gold-500"
              href="/admin/login?role=planner"
            >
              Login Wedding Planner
            </Link>
          </div>

          <div className="rounded-[1.75rem] border border-cream-200 bg-white/85 px-5 py-5 shadow-elegant">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-700">Brautpaar-Zugang</span>
              <span className="rounded-full bg-sage-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sage-700">
                Sichere Zahlung per Stripe
              </span>
            </div>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <span className="font-display text-4xl text-charcoal-900">{pricing.activePriceLabel}</span>
              {pricing.promoActive ? (
                <span className="pb-1 text-lg text-charcoal-400 line-through">{pricing.standardPriceLabel}</span>
              ) : null}
            </div>
            <p className="mt-3 text-body-md text-charcoal-600">
              {pricing.priceNote}. Der Gästebereich bleibt kostenlos, der geschützte Paarbereich wird erst nach der Zahlung freigeschaltet.
            </p>
            {pricing.promoActive ? (
              <p className="mt-2 text-sm text-charcoal-600">
                Einführungspreis nur bis {pricing.promoDeadlineLabel}. Danach kostet myWed wieder {pricing.standardPriceLabel}.
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-gold-300 bg-white px-5 py-3 text-sm font-semibold text-charcoal-800 transition hover:border-gold-500"
                href="/admin/registrieren?role=couple"
              >
                Brautpaar registrieren
              </Link>
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-cream-300 bg-cream-50 px-5 py-3 text-sm font-semibold text-charcoal-700 transition hover:bg-white"
                href="/admin/login"
              >
                Bestehenden Zugang öffnen
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {trustPoints.map((point) => (
              <div key={point} className="rounded-3xl border border-cream-200 bg-white/80 px-4 py-4 text-body-md text-charcoal-700 shadow-elegant">
                {point}
              </div>
            ))}
          </div>

          <Divider />
        </div>

        <div className="relative">
          <div className="mx-auto grid w-full max-w-xl gap-4 sm:gap-5 lg:absolute lg:-left-6 lg:top-8 lg:w-[520px] lg:max-w-none">
            <article className="surface-card w-full px-5 py-5 sm:px-6 sm:py-6 lg:rotate-[-2deg]">
              <div className="flex items-center justify-between">
                <p className="font-display text-2xl leading-tight text-charcoal-900">Gastansicht</p>
                <MessageCircleHeart className="h-5 w-5 text-dusty-rose-500" />
              </div>
              <div className="mt-5 space-y-4">
                <div className="rounded-3xl bg-cream-100 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-charcoal-500">RSVP in unter 2 Minuten</p>
                  <p className="mt-2 text-body-md text-charcoal-700">
                    Zusage, Begleitperson, Menüwahl, Allergien und persönliche Nachricht in einem ruhigen, verständlichen Ablauf.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <PreviewPill icon={CalendarHeart} label="Programm" />
                  <PreviewPill icon={MapPinned} label="Anfahrt" />
                  <PreviewPill icon={Camera} label="Galerie" />
                </div>
              </div>
            </article>

            <article className="surface-card w-full px-5 py-5 sm:px-6 sm:py-6 lg:ml-auto lg:max-w-md lg:rotate-[2deg]">
              <div className="flex items-center justify-between">
                <p className="font-display text-2xl leading-tight text-charcoal-900">Brautpaar-Dashboard</p>
                <LayoutDashboard className="h-5 w-5 text-gold-500" />
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <StatCard label="Antworten" value="128" />
                <StatCard label="Zusagen" value="94" />
                <StatCard label="Gäste" value="156" />
              </div>
              <div className="mt-4 rounded-3xl border border-cream-200 bg-white px-4 py-4 text-body-md text-charcoal-600">
                Rückmeldungen, Gästecode, Fotografen-Zugang, Galerie-Link und die wichtigsten Inhalte an einem Ort.
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  )
}

function PreviewPill({
  icon: Icon,
  label,
}: {
  icon: typeof CalendarHeart
  label: string
}) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-charcoal-700 shadow-elegant">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-gold-500" />
        <span>{label}</span>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-cream-100 px-4 py-4 text-center">
      <div className="font-display text-metric text-charcoal-900">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-charcoal-500">{label}</div>
    </div>
  )
}
