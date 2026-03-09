import { MapPin } from 'lucide-react'

import { Section } from '@/components/ui/Section'
import { ExternalLink } from '@/components/ui/ExternalLink'
import { SectionHeading } from '@/components/ui/SectionHeading'
import type { SectionImage, WeddingConfig } from '@/types/wedding'

import { LocationMap } from './LocationMap'
import { SectionImageGallery } from './SectionImageGallery'

function createMapsLink(baseUrl: string, address: string): string {
  return `${baseUrl}${encodeURIComponent(address)}`
}

function linkClassName(): string {
  return 'inline-flex min-h-11 items-center justify-center rounded-full border border-gold-300 bg-white px-5 py-3 text-sm font-semibold text-charcoal-800 transition hover:border-gold-500 hover:text-charcoal-900'
}

export function LocationSection({
  config,
  images = [],
}: {
  config: WeddingConfig
  images?: SectionImage[]
}) {
  const googleUrl = createMapsLink('https://maps.google.com/?q=', config.venueAddress)
  const appleUrl = createMapsLink('https://maps.apple.com/?q=', config.venueAddress)
  const osmUrl = createMapsLink('https://www.openstreetmap.org/search?query=', config.venueAddress)

  return (
    <Section density="compact" id="anfahrt" className="space-y-6">
      <SectionHeading>Anfahrt & Veranstaltungsort</SectionHeading>
      <SectionImageGallery images={images} />
      <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch">
        <div className="surface-card h-full space-y-6 px-6 py-6">
          <div className="flex items-start gap-3">
            <MapPin className="mt-1 h-5 w-5 shrink-0 text-gold-500" />
            <address className="not-italic text-charcoal-700">
              <strong className="font-semibold text-charcoal-900">{config.venueName}</strong>
              <br />
              <span className="break-words">{config.venueAddress}</span>
            </address>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <ExternalLink className={linkClassName()} href={googleUrl}>
              Google Maps
            </ExternalLink>
            <ExternalLink className={linkClassName()} href={appleUrl}>
              Apple Maps
            </ExternalLink>
            <ExternalLink className={linkClassName()} href={osmUrl}>
              OpenStreetMap
            </ExternalLink>
          </div>
          <p className="text-sm text-charcoal-500">
            Falls ihr Fragen zur Anreise habt, meldet euch bitte direkt bei uns.
          </p>
        </div>
        <LocationMap address={config.venueAddress} embedUrl={config.venueMapsUrl} />
      </div>
    </Section>
  )
}
