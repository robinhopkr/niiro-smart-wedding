import Link from 'next/link'

import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Section } from '@/components/ui/Section'
import { APP_BRAND_NAME } from '@/lib/constants'
import { LEGAL_IS_INCOMPLETE, LEGAL_MISSING_FIELDS } from '@/lib/legal'

interface LegalPageLayoutProps {
  title: string
  intro: string
  children: React.ReactNode
}

export function LegalPageLayout({ title, intro, children }: LegalPageLayoutProps) {
  return (
    <main className="min-h-screen bg-cream-50">
      <Header
        brandHref="/"
        brandLabel={APP_BRAND_NAME}
        navItems={[]}
        actionLinks={[
          { href: '/admin/login?role=planner', label: 'Login Wedding Planner', variant: 'secondary' },
          { href: '/admin/login?role=couple', label: 'Login Brautpaare', variant: 'primary' },
        ]}
        showBrandMark
      />
      <Section className="space-y-8">
        <div className="mx-auto max-w-4xl space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-700">Rechtliches</p>
          <h1 className="font-display text-hero text-charcoal-900">{title}</h1>
          <p className="max-w-3xl text-lg leading-8 text-charcoal-600">{intro}</p>
        </div>

        {LEGAL_IS_INCOMPLETE ? (
          <div className="mx-auto max-w-4xl rounded-[1.75rem] border border-amber-200 bg-amber-50 px-6 py-5 text-sm text-amber-900">
            <p className="font-semibold">Bitte vor dem produktiven Einsatz ergänzen</p>
            <p className="mt-2">
              In diesem Rechtstext fehlen noch Pflichtangaben zu: {LEGAL_MISSING_FIELDS.join(', ')}.
            </p>
            <p className="mt-2">
              Die Struktur ist eingebaut, die individuellen Rechtsangaben und eine juristische Prüfung solltet ihr noch ergänzen.
            </p>
          </div>
        ) : null}

        <div className="mx-auto max-w-4xl rounded-[2rem] border border-cream-200 bg-white px-6 py-8 shadow-elegant sm:px-8">
          <div className="prose prose-neutral max-w-none prose-headings:font-display prose-headings:text-charcoal-900 prose-p:text-charcoal-700 prose-li:text-charcoal-700">
            {children}
          </div>
          <div className="mt-10 flex flex-wrap gap-4 border-t border-cream-200 pt-6 text-sm">
            <Link className="font-semibold text-gold-700 hover:text-gold-800" href="/impressum">
              Impressum
            </Link>
            <Link className="font-semibold text-gold-700 hover:text-gold-800" href="/datenschutz">
              Datenschutz
            </Link>
            <Link className="font-semibold text-gold-700 hover:text-gold-800" href="/agb">
              AGB
            </Link>
          </div>
        </div>
      </Section>
      <Footer coupleLabel={APP_BRAND_NAME} />
    </main>
  )
}
