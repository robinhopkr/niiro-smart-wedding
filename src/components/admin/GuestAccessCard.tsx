'use client'

import { Copy, Download, ExternalLink, QrCode } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { toast } from 'sonner'

import { Button } from '@/components/ui/Button'

interface GuestAccessCardProps {
  inviteUrl: string
  guestCode?: string | null
}

export function GuestAccessCard({ inviteUrl, guestCode }: GuestAccessCardProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('')

  useEffect(() => {
    let cancelled = false

    async function generateQrCode() {
      try {
        const dataUrl = await QRCode.toDataURL(inviteUrl, {
          width: 420,
          margin: 1,
          errorCorrectionLevel: 'H',
          color: {
            dark: '#2b2520',
            light: '#0000',
          },
        })

        if (!cancelled) {
          setQrCodeDataUrl(dataUrl)
        }
      } catch {
        if (!cancelled) {
          setQrCodeDataUrl('')
        }
      }
    }

    void generateQrCode()

    return () => {
      cancelled = true
    }
  }, [inviteUrl])

  async function copyInviteUrl() {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      toast.success('Einladungslink kopiert.')
    } catch {
      toast.error('Der Link konnte nicht kopiert werden.')
    }
  }

  function downloadQrCode() {
    if (!qrCodeDataUrl) {
      toast.error('Der QR-Code ist noch nicht bereit.')
      return
    }

    const link = document.createElement('a')
    link.href = qrCodeDataUrl
    link.download = 'mywed-gaesteseite-qr.png'
    link.click()
  }

  return (
    <article
      id="gaeste-qr"
      className="surface-card relative overflow-hidden px-6 py-6 sm:px-8"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(212,154,29,0.18),_transparent_32%),radial-gradient(circle_at_78%_18%,_rgba(143,168,154,0.18),_transparent_30%),linear-gradient(180deg,rgba(255,250,241,0.9),rgba(255,255,255,0.96))]" />
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.45fr)_22rem] lg:items-center">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-gold-700">Für eure Gäste teilen</p>
          <div className="mt-4 flex items-start gap-3">
            <div className="rounded-2xl bg-white/80 p-3 text-gold-700 shadow-sm ring-1 ring-gold-200">
              <QrCode className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-display text-2xl text-charcoal-900 sm:text-3xl">
                QR-Code für die Gästeseite
              </h2>
              <p className="mt-3 max-w-2xl text-body-md text-charcoal-700">
                Dieser QR-Code ist euer schnellster Weg für Save-the-Date, Einladungskarte und
                Hochzeitspapeterie. Gäste scannen ihn und landen direkt auf eurer Einladung.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-[1.75rem] bg-white/85 px-5 py-4 shadow-sm ring-1 ring-cream-200">
              <p className="text-xs uppercase tracking-[0.18em] text-charcoal-500">Einladungslink</p>
              <p className="mt-2 break-all text-sm font-medium leading-6 text-charcoal-900">{inviteUrl}</p>
            </div>
            <div className="rounded-[1.75rem] bg-white/85 px-5 py-4 shadow-sm ring-1 ring-cream-200">
              <p className="text-xs uppercase tracking-[0.18em] text-charcoal-500">Gastcode</p>
              <p className="mt-2 text-lg font-semibold text-charcoal-900">
                {guestCode || 'Nicht gesetzt'}
              </p>
            </div>
            <div className="rounded-[1.75rem] bg-white/85 px-5 py-4 shadow-sm ring-1 ring-cream-200">
              <p className="text-xs uppercase tracking-[0.18em] text-charcoal-500">Empfehlung</p>
              <p className="mt-2 text-sm leading-6 text-charcoal-700">
                Platziert den QR-Code auf Karte, Menü, Sitzplan oder Willkommensschild.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gold-500 px-5 py-3 text-sm font-semibold text-charcoal-900 shadow-gold transition hover:bg-gold-400"
              href="/einladung"
            >
              <ExternalLink className="h-4 w-4" />
              Gästeseite öffnen
            </Link>
            <Button type="button" variant="secondary" onClick={copyInviteUrl}>
              <Copy className="h-4 w-4" />
              Link kopieren
            </Button>
            <Button type="button" variant="secondary" onClick={downloadQrCode}>
              <Download className="h-4 w-4" />
              QR herunterladen
            </Button>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[22rem] rounded-[2rem] bg-white/90 p-5 shadow-[0_18px_40px_rgba(43,37,32,0.12)] ring-1 ring-gold-200">
          <div className="rounded-[1.5rem] bg-[linear-gradient(180deg,#fffdf9_0%,#fff7ea_100%)] p-4">
            {qrCodeDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt="QR-Code zur Gästeseite"
                className="mx-auto aspect-square w-full max-w-[18rem] rounded-[1.25rem]"
                src={qrCodeDataUrl}
              />
            ) : (
              <div className="mx-auto aspect-square w-full max-w-[18rem] animate-pulse rounded-[1.25rem] bg-cream-100" />
            )}
          </div>
          <div className="mt-4 rounded-[1.5rem] bg-cream-50 px-4 py-4 text-center">
            <p className="text-xs uppercase tracking-[0.18em] text-charcoal-500">Sofort bereit zum Teilen</p>
            <p className="mt-2 text-sm leading-6 text-charcoal-700">
              Ideal zum Ausdrucken oder direkt zum Versenden an eure Gäste.
            </p>
          </div>
        </div>
      </div>
    </article>
  )
}
