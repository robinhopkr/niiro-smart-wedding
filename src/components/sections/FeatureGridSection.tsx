import { CalendarRange, Camera, FileDown, LayoutTemplate, ListChecks, MapPinned, ShieldCheck } from 'lucide-react'

import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'

const features = [
  {
    icon: LayoutTemplate,
    title: 'Elegante Gastseite',
    copy: 'Paarnamen, Begrüßung, Ablauf, FAQ, Anfahrt und RSVP in einer durchgängigen Einladung.',
  },
  {
    icon: ListChecks,
    title: 'Mehrstufiger RSVP-Flow',
    copy: 'Zusage, Absage, Begleitperson, Menüwahl und Allergien werden Schritt für Schritt abgefragt.',
  },
  {
    icon: CalendarRange,
    title: 'Planung mit Kontext',
    copy: 'Countdown, RSVP-Frist und Tagesablauf geben euren Gästen Orientierung.',
  },
  {
    icon: MapPinned,
    title: 'Anfahrt ohne Rückfragen',
    copy: 'Adresse, OpenStreetMap, Google Maps und Apple Maps direkt in der Einladung verlinkt.',
  },
  {
    icon: FileDown,
    title: 'Paarbereich mit Übersicht',
    copy: 'Brautpaare sehen alle Antworten gesammelt, öffnen die Gästeseite zur Kontrolle und exportieren sie bei Bedarf als CSV.',
  },
  {
    icon: Camera,
    title: 'Galerie mit Fotografen-Zugang',
    copy: 'Nach der Hochzeit können Fotos gesammelt veröffentlicht werden. Für Fotograf*innen gibt es einen separaten geschützten Zugang.',
  },
  {
    icon: ShieldCheck,
    title: 'Datenschutzfreundlich',
    copy: 'Geschützter Login, keine Tracking-Cookies und klarer Fokus auf die wirklich nötigen Daten.',
  },
] as const

export function FeatureGridSection() {
  return (
    <Section id="funktionen" className="space-y-8">
      <SectionHeading>Was NiiRo Smart Wedding abdeckt</SectionHeading>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {features.map((feature) => (
          <article key={feature.title} className="surface-card px-6 py-6">
            <feature.icon className="h-5 w-5 text-gold-500" />
            <h3 className="mt-4 font-display text-card text-charcoal-900">{feature.title}</h3>
            <p className="mt-3 text-charcoal-600">{feature.copy}</p>
          </article>
        ))}
      </div>
    </Section>
  )
}
