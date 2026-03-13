'use client'

import { MapPinned } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { ExternalLink } from '@/components/ui/ExternalLink'

function buildGoogleEmbedUrl(address: string): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(address)}&z=15&output=embed`
}

function buildGoogleMapsUrl(address: string): string {
  return `https://maps.google.com/?q=${encodeURIComponent(address)}`
}

function buildOpenStreetMapUrl(address: string): string {
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(address)}`
}

function resolveEmbedUrl(address: string, embedUrl: string | null): string {
  const normalizedEmbedUrl = embedUrl?.trim()

  if (!normalizedEmbedUrl) {
    return buildGoogleEmbedUrl(address)
  }

  if (normalizedEmbedUrl.includes('output=embed')) {
    return normalizedEmbedUrl
  }

  if (
    normalizedEmbedUrl.includes('google.com/maps') ||
    normalizedEmbedUrl.includes('maps.google.') ||
    normalizedEmbedUrl.includes('google.de/maps')
  ) {
    return buildGoogleEmbedUrl(address)
  }

  return normalizedEmbedUrl
}

export function LocationMap({ address, embedUrl }: { address: string; embedUrl: string | null }) {
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [hasMapError, setHasMapError] = useState(false)
  const normalizedAddress = address.trim().toLowerCase()
  const hasUsableAddress =
    normalizedAddress.length >= 10 && !normalizedAddress.includes('adresse folgt in kürze')
  const resolvedEmbedUrl = resolveEmbedUrl(address, embedUrl)
  const googleMapsUrl = buildGoogleMapsUrl(address)
  const openStreetMapUrl = buildOpenStreetMapUrl(address)

  return (
    <div className="surface-card h-full overflow-hidden">
      {!hasUsableAddress ? (
        <div className="relative flex min-h-[280px] flex-col justify-between overflow-hidden bg-gradient-to-b from-cream-50/95 to-cream-100/85 px-6 py-8">
          <div className="absolute -left-10 top-0 h-36 w-36 rounded-full bg-gold-100/60 blur-3xl" />
          <div className="relative space-y-4">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-gold-600 shadow-elegant">
              <MapPinned className="h-5 w-5" />
            </span>
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.18em] text-sage-600">Kartenansicht</p>
              <h3 className="font-display text-card text-charcoal-900">Die genaue Karte folgt noch</h3>
            </div>
            <p className="max-w-md text-sm leading-7 text-charcoal-600">
              Sobald die vollständige Adresse hinterlegt ist, könnt ihr die Karte hier direkt öffnen.
              Bis dahin nutzt gern die Kartenlinks auf der linken Seite.
            </p>
          </div>
          <div className="relative rounded-[1.25rem] border border-cream-200 bg-white/80 px-4 py-4 text-sm text-charcoal-500">
            Diese Fläche wechselt automatisch zur interaktiven Karte, sobald eine echte Adresse
            gespeichert ist.
          </div>
        </div>
      ) : !isMapLoaded ? (
        <div className="relative flex min-h-[280px] flex-col justify-between overflow-hidden bg-gradient-to-b from-cream-50/95 to-cream-100/85 px-6 py-8">
          <div className="absolute -left-10 top-0 h-36 w-36 rounded-full bg-gold-100/70 blur-3xl" />
          <div className="absolute -right-8 bottom-0 h-32 w-32 rounded-full bg-sage-100/60 blur-3xl" />
          <div className="relative space-y-4">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-gold-600 shadow-elegant">
              <MapPinned className="h-5 w-5" />
            </span>
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.18em] text-sage-600">Kartenansicht</p>
              <h3 className="font-display text-card text-charcoal-900">Interaktive Karte laden</h3>
            </div>
            <p className="max-w-md text-sm leading-7 text-charcoal-600">
              Für die Karte wird erst nach eurem Klick ein externer Kartendienst geladen.
              Personenbezogene Daten werden also nicht schon beim Seitenaufruf übertragen.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setHasMapError(false)
                setIsMapLoaded(true)
              }}
            >
              Karte laden
            </Button>
          </div>
        </div>
      ) : hasMapError ? (
        <div className="relative flex min-h-[320px] flex-col justify-between overflow-hidden bg-gradient-to-b from-cream-50/95 to-cream-100/85 px-6 py-8">
          <div className="absolute -left-10 top-0 h-36 w-36 rounded-full bg-gold-100/60 blur-3xl" />
          <div className="relative space-y-4">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-gold-600 shadow-elegant">
              <MapPinned className="h-5 w-5" />
            </span>
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.18em] text-sage-600">Kartenansicht</p>
              <h3 className="font-display text-card text-charcoal-900">Die Karte konnte nicht eingebettet werden</h3>
            </div>
            <p className="max-w-md text-sm leading-7 text-charcoal-600">
              Manche Geräte oder Browser blocken eingebettete Karten. Ihr könnt die Route trotzdem
              direkt in eurer Karten-App öffnen.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ExternalLink
              className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full border border-gold-300 bg-white px-5 py-3 text-sm font-semibold text-charcoal-800 transition hover:border-gold-500 hover:text-charcoal-900"
              href={googleMapsUrl}
            >
              In Google Maps öffnen
            </ExternalLink>
            <ExternalLink
              className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full border border-gold-300 bg-white px-5 py-3 text-sm font-semibold text-charcoal-800 transition hover:border-gold-500 hover:text-charcoal-900"
              href={openStreetMapUrl}
            >
              In OpenStreetMap öffnen
            </ExternalLink>
          </div>
        </div>
      ) : (
        <iframe
          allowFullScreen
          className="h-[320px] w-full lg:h-full"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          src={resolvedEmbedUrl}
          title="Karte des Veranstaltungsorts"
          onError={() => setHasMapError(true)}
        />
      )}
    </div>
  )
}
