import Link from 'next/link'
import { redirect } from 'next/navigation'

import { ExportButton } from '@/components/admin/ExportButton'
import { LogoutButton } from '@/components/admin/LogoutButton'
import { RsvpStats } from '@/components/admin/RsvpStats'
import { RsvpTable } from '@/components/admin/RsvpTable'
import { WeddingEditorForm } from '@/components/admin/WeddingEditorForm'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { CountdownSection } from '@/components/sections/CountdownSection'
import { DresscodeSection } from '@/components/sections/DresscodeSection'
import { FaqSection } from '@/components/sections/FaqSection'
import { GallerySection } from '@/components/sections/GallerySection'
import { HeroSection } from '@/components/sections/HeroSection'
import { LocationSection } from '@/components/sections/LocationSection'
import { ProgramSection } from '@/components/sections/ProgramSection'
import { RsvpSection } from '@/components/sections/RsvpSection'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { getServerSession } from '@/lib/auth/get-session'
import { getBillingAccessState } from '@/lib/billing/access'
import { ADMIN_NAV_ITEMS } from '@/lib/constants'
import { createClient } from '@/lib/supabase/server'
import {
  buildAdminSummary,
  getAdminWeddingConfig,
  getFaqItems,
  getProgramItems,
  getWeddingEditorValues,
  listGalleryPhotos,
  listRsvps,
} from '@/lib/supabase/repository'

export default async function AdminPage() {
  const user = await getServerSession()
  const supabase = await createClient()
  const billingAccess = await getBillingAccessState(supabase)

  if (!user || billingAccess.requiresPayment) {
    redirect('/admin/login')
  }

  const config = await getAdminWeddingConfig(supabase, undefined)
  const [rsvps, programItems, faqItems, galleryPhotos, editorValues] = await Promise.all([
    listRsvps(supabase, config),
    getProgramItems(supabase, config),
    getFaqItems(supabase, config),
    listGalleryPhotos(supabase, config),
    getWeddingEditorValues(supabase, config),
  ])

  const summary = buildAdminSummary(rsvps)
  const galleryHref = config.guestCode ? `/galerie/${config.guestCode}` : null
  const photographerHref = config.guestCode ? `/fotograf/${config.guestCode}` : null

  return (
    <main className="min-h-screen bg-cream-50">
      <Header
        brandHref="/admin"
        brandLabel={`${config.coupleLabel} · Paarbereich`}
        ctaHref="/einladung"
        ctaLabel="Einladung öffnen"
        navItems={ADMIN_NAV_ITEMS}
      />

      <Section id="uebersicht" className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <SectionHeading as="h1">Paarbereich</SectionHeading>
            <p className="mt-4 max-w-3xl text-charcoal-600">
              Hier pflegt ihr eure Inhalte, behaltet alle Rückmeldungen im Blick und prüft die
              Einladung so, wie eure Gäste sie erleben.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ExportButton rsvps={rsvps} />
            <LogoutButton />
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <article className="surface-card px-6 py-6">
            <p className="text-sm uppercase tracking-[0.18em] text-gold-600">Rückmeldungen</p>
            <h2 className="mt-4 font-display text-card text-charcoal-900">Alles auf einen Blick</h2>
            <dl className="mt-5 grid gap-3 text-sm text-charcoal-600 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-3xl bg-cream-100 px-4 py-4">
                <dt>Antworten</dt>
                <dd className="mt-2 font-display text-3xl text-charcoal-900">{summary.total}</dd>
              </div>
              <div className="rounded-3xl bg-cream-100 px-4 py-4">
                <dt>Zusagen</dt>
                <dd className="mt-2 font-display text-3xl text-charcoal-900">{summary.attending}</dd>
              </div>
              <div className="rounded-3xl bg-cream-100 px-4 py-4">
                <dt>Gäste gesamt</dt>
                <dd className="mt-2 font-display text-3xl text-charcoal-900">{summary.guestCount}</dd>
              </div>
            </dl>
          </article>

          <article className="surface-card px-6 py-6">
            <p className="text-sm uppercase tracking-[0.18em] text-sage-600">Schnellzugriff</p>
            <h2 className="mt-4 font-display text-card text-charcoal-900">Wichtige Links</h2>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-gold-500 px-5 py-3 text-sm font-semibold text-charcoal-900 shadow-gold transition hover:bg-gold-400"
                href="/einladung"
              >
                Gästeseite öffnen
              </Link>
              {galleryHref ? (
                <Link
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-gold-300 bg-white px-5 py-3 text-sm font-semibold text-charcoal-800 transition hover:border-gold-500 hover:text-charcoal-900"
                  href={galleryHref}
                >
                  Galerie öffnen
                </Link>
              ) : null}
              {photographerHref ? (
                <Link
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-gold-300 bg-white px-5 py-3 text-sm font-semibold text-charcoal-800 transition hover:border-gold-500 hover:text-charcoal-900"
                  href={photographerHref}
                >
                  Fotografen-Zugang
                </Link>
              ) : null}
            </div>
          </article>

          <article className="surface-card px-6 py-6">
            <p className="text-sm uppercase tracking-[0.18em] text-dusty-rose-600">Aktueller Status</p>
            <h2 className="mt-4 font-display text-card text-charcoal-900">Konfiguration</h2>
            <dl className="mt-5 space-y-4 text-sm text-charcoal-600">
              <div className="flex items-center justify-between gap-4 border-b border-cream-200 pb-3">
                <dt>Hochzeit</dt>
                <dd className="text-right font-semibold text-charcoal-900">{config.coupleLabel}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-cream-200 pb-3">
                <dt>Gästecode</dt>
                <dd className="font-semibold text-charcoal-900">{config.guestCode ?? 'Noch nicht gesetzt'}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt>Galerie</dt>
                <dd className="font-semibold text-charcoal-900">
                  {galleryPhotos.length} {galleryPhotos.length === 1 ? 'Foto' : 'Fotos'}
                </dd>
              </div>
            </dl>
          </article>
        </div>
      </Section>

      <Section id="inhalte" className="space-y-8 pt-0">
        <div className="max-w-3xl">
          <SectionHeading>Inhalte und variable Daten</SectionHeading>
          <p className="mt-4 text-charcoal-600">
            Hier pflegt ihr Namen, Zeiten, Texte, Fotos, FAQ, Galerie-Texte und den Fotografen-Zugang.
            So bleibt die Einladung für eure Gäste klar, persönlich und vollständig.
          </p>
        </div>
        {editorValues ? (
          <div className="surface-card px-6 py-6 sm:px-8">
            <WeddingEditorForm values={editorValues} />
          </div>
        ) : (
          <div className="surface-card px-6 py-8 text-charcoal-600">
            Für diese Hochzeit konnten noch keine editierbaren Daten geladen werden.
          </div>
        )}
      </Section>

      <Section id="zugaenge" className="space-y-8 pt-0">
        <div className="max-w-3xl">
          <SectionHeading>Zugänge und Galerie</SectionHeading>
          <p className="mt-4 text-charcoal-600">
            Diese Links braucht ihr, um die Gästeseite zu teilen, die öffentliche Galerie zu
            prüfen oder dem Fotografen einen separaten Zugang zu geben.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <article className="surface-card px-6 py-6">
            <p className="text-sm uppercase tracking-[0.18em] text-gold-600">Für Gäste</p>
            <h3 className="mt-4 font-display text-card text-charcoal-900">Einladung und Galerie</h3>
            <p className="mt-3 text-charcoal-600">
              Teilt die Einladung oder öffnet direkt die öffentliche Galerie.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-gold-500 px-5 py-3 text-sm font-semibold text-charcoal-900 shadow-gold transition hover:bg-gold-400"
                href="/einladung"
              >
                Einladung öffnen
              </Link>
              {galleryHref ? (
                <Link
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-gold-300 bg-white px-5 py-3 text-sm font-semibold text-charcoal-800 transition hover:border-gold-500 hover:text-charcoal-900"
                  href={galleryHref}
                >
                  Galerie-Link
                </Link>
              ) : null}
            </div>
          </article>

          <article className="surface-card px-6 py-6">
            <p className="text-sm uppercase tracking-[0.18em] text-sage-600">Für das Brautpaar</p>
            <h3 className="mt-4 font-display text-card text-charcoal-900">Paar-Login</h3>
            <p className="mt-3 text-charcoal-600">
              Der geschützte Login für Brautpaare liegt weiterhin unter derselben Adresse und
              führt direkt in diesen Bereich.
            </p>
            <div className="mt-5">
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-gold-300 bg-white px-5 py-3 text-sm font-semibold text-charcoal-800 transition hover:border-gold-500 hover:text-charcoal-900"
                href="/admin/login"
              >
                Login für Brautpaare
              </Link>
            </div>
          </article>

          <article className="surface-card px-6 py-6">
            <p className="text-sm uppercase tracking-[0.18em] text-dusty-rose-600">Für Fotograf*innen</p>
            <h3 className="mt-4 font-display text-card text-charcoal-900">Separater Zugang</h3>
            <p className="mt-3 text-charcoal-600">
              Der Fotografen-Bereich ist vom Paarbereich getrennt und nur für Upload und Pflege der Galerie gedacht.
            </p>
            <div className="mt-5 space-y-3 text-sm text-charcoal-600">
              <p>
                Passwort:{' '}
                <span className="font-semibold text-charcoal-900">
                  {config.photoPassword ? 'hinterlegt' : 'noch nicht gesetzt'}
                </span>
              </p>
              {photographerHref ? (
                <Link
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-gold-300 bg-white px-5 py-3 text-sm font-semibold text-charcoal-800 transition hover:border-gold-500 hover:text-charcoal-900"
                  href={photographerHref}
                >
                  Fotografen-Login
                </Link>
              ) : null}
            </div>
          </article>
        </div>
      </Section>

      <Section id="rsvps" className="space-y-8 pt-0">
        <SectionHeading>Rückmeldungen</SectionHeading>
        <p className="max-w-3xl text-charcoal-600">
          Hier seht ihr alle eingegangenen Antworten inklusive Zusagen, Gästezahl und Menüwünschen.
        </p>
        <RsvpStats summary={summary} />
        <RsvpTable rsvps={rsvps} />
      </Section>

      <Section id="vorschau" className="space-y-8 pt-0">
        <SectionHeading>Gästevorschau</SectionHeading>
        <p className="max-w-3xl text-charcoal-600">
          Dieser Abschnitt zeigt die Einladung im selben Aufbau wie für eure Gäste. So könnt ihr
          Inhalte, Reihenfolge und Tonalität direkt im Paarbereich prüfen.
        </p>
      </Section>

      <div className="border-y border-cream-200 bg-white/40">
        <HeroSection config={config} />
        <CountdownSection config={config} />
        <ProgramSection
          items={programItems}
          images={config.sectionImages.filter((image) => image.section === 'programm')}
        />
        <LocationSection
          config={config}
          images={config.sectionImages.filter((image) => image.section === 'anfahrt')}
        />
        <DresscodeSection
          config={config}
          images={config.sectionImages.filter((image) => image.section === 'dresscode')}
        />
        <GallerySection
          config={config}
          photos={galleryPhotos}
          images={config.sectionImages.filter((image) => image.section === 'galerie')}
        />
        <RsvpSection
          config={config}
          images={config.sectionImages.filter((image) => image.section === 'rsvp')}
        />
        <FaqSection
          items={faqItems}
          images={config.sectionImages.filter((image) => image.section === 'faq')}
        />
      </div>

      <Footer coupleLabel={config.coupleLabel} />
    </main>
  )
}
