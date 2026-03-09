'use client'

import { MapPinned } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'

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
        <div className="flex min-h-[280px] flex-col justify-between bg-[linear-gradient(180deg,rgba(255,252,247,0.98)_0%,rgba(250,243,232,0.92)_100%)] px-6 py-8">
          <div className="space-y-4">
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
          <div className="rounded-[1.25rem] border border-cream-200 bg-white/80 px-4 py-4 text-sm text-charcoal-500">
            Diese Fläche wechselt automatisch zur interaktiven Karte, sobald eine echte Adresse
            gespeichert ist.
          </div>
        </div>
      ) : !isMapLoaded ? (
        <div className="flex min-h-[280px] flex-col justify-between bg-[radial-gradient(circle_at_top_left,rgba(212,154,29,0.12),transparent_32%),linear-gradient(180deg,rgba(255,252,247,0.98)_0%,rgba(250,243,232,0.92)_100%)] px-6 py-8">
          <div className="space-y-4">
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
        <div className="flex min-h-[320px] flex-col justify-between bg-[linear-gradient(180deg,rgba(255,252,247,0.98)_0%,rgba(250,243,232,0.92)_100%)] px-6 py-8">
          <div className="space-y-4">
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
            <a
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-gold-300 bg-white px-5 py-3 text-sm font-semibold text-charcoal-800 transition hover:border-gold-500 hover:text-charcoal-900"
              href={googleMapsUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              In Google Maps öffnen
            </a>
            <a
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-gold-300 bg-white px-5 py-3 text-sm font-semibold text-charcoal-800 transition hover:border-gold-500 hover:text-charcoal-900"
              href={openStreetMapUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              In OpenStreetMap öffnen
            </a>
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
