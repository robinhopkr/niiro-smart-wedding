'use client'

import { Copy, Download, ExternalLink, QrCode } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { toast } from 'sonner'

import { Button } from '@/components/ui/Button'

interface GuestAccessCardProps {
  inviteHref: string
  inviteUrl: string
  guestCode?: string | null
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, content] = dataUrl.split(',')

  if (!meta || !content) {
    throw new Error('Ungültiges QR-Bild.')
  }

  const mimeMatch = meta.match(/data:(.*?);base64/u)
  const mimeType = mimeMatch?.[1] ?? 'image/png'
  const binary = atob(content)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return new Blob([bytes], { type: mimeType })
}

export function GuestAccessCard({ inviteHref, inviteUrl, guestCode }: GuestAccessCardProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('')
  const [qrCodeObjectUrl, setQrCodeObjectUrl] = useState('')
  const [qrCodeBlob, setQrCodeBlob] = useState<Blob | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isDownloadingInvitationPdf, setIsDownloadingInvitationPdf] = useState(false)

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
        const blob = dataUrlToBlob(dataUrl)
        const objectUrl = URL.createObjectURL(blob)

        if (!cancelled) {
          setQrCodeDataUrl(dataUrl)
          setQrCodeBlob(blob)
          setQrCodeObjectUrl(objectUrl)
        } else {
          URL.revokeObjectURL(objectUrl)
        }
      } catch {
        if (!cancelled) {
          setQrCodeDataUrl('')
          setQrCodeBlob(null)
          setQrCodeObjectUrl('')
        }
      }
    }

    void generateQrCode()

    return () => {
      cancelled = true
    }
  }, [inviteUrl])

  useEffect(() => {
    return () => {
      if (qrCodeObjectUrl) {
        URL.revokeObjectURL(qrCodeObjectUrl)
      }
    }
  }, [qrCodeObjectUrl])

  async function copyInviteUrl() {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      toast.success('Einladungslink kopiert.')
    } catch {
      toast.error('Der Link konnte nicht kopiert werden.')
    }
  }

  async function downloadQrCode() {
    if (!qrCodeBlob || !qrCodeObjectUrl) {
      toast.error('Der QR-Code ist noch nicht bereit.')
      return
    }

    setIsDownloading(true)

    try {
      const file = new File([qrCodeBlob], 'niiro-smart-wedding-gaesteseite-qr.png', { type: qrCodeBlob.type })

      if (
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          title: 'NiiRo Smart Wedding QR-Code',
          text: 'QR-Code für die Gästeseite',
          files: [file],
        })
        toast.success('QR-Code bereit zum Teilen.')
        return
      }

      const link = document.createElement('a')
      link.href = qrCodeObjectUrl
      link.download = 'niiro-smart-wedding-gaesteseite-qr.png'
      link.rel = 'noopener'
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('QR-Code wird heruntergeladen.')
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }

      window.open(qrCodeObjectUrl, '_blank', 'noopener,noreferrer')
      toast.success('QR-Code in neuem Tab geöffnet.')
    } finally {
      setIsDownloading(false)
    }
  }

  function extractFilename(contentDisposition: string | null): string {
    if (!contentDisposition) {
      return 'niiro-smart-wedding-einladung.pdf'
    }

    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/iu)
    if (utf8Match?.[1]) {
      return decodeURIComponent(utf8Match[1])
    }

    const basicMatch = contentDisposition.match(/filename="([^"]+)"/iu)
    if (basicMatch?.[1]) {
      return basicMatch[1]
    }

    return 'niiro-smart-wedding-einladung.pdf'
  }

  async function downloadInvitationPdf() {
    setIsDownloadingInvitationPdf(true)

    try {
      const response = await fetch('/api/admin/invitation-pdf', {
        method: 'GET',
        credentials: 'same-origin',
      })

      if (!response.ok) {
        let message = 'Die Einladung konnte gerade nicht erstellt werden.'

        try {
          const result = await response.json()

          if (
            result &&
            typeof result === 'object' &&
            'success' in result &&
            result.success === false &&
            'error' in result &&
            typeof result.error === 'string'
          ) {
            message = result.error
          }
        } catch {
          // Keep fallback message if the response is not JSON.
        }

        toast.error(message)
        return
      }

      const blob = await response.blob()
      const fileName = extractFilename(response.headers.get('content-disposition'))
      const objectUrl = URL.createObjectURL(blob)
      const supportsDownload = typeof document !== 'undefined' && 'download' in document.createElement('a')

      if (supportsDownload) {
        const link = document.createElement('a')
        link.href = objectUrl
        link.download = fileName
        link.rel = 'noopener'
        link.style.display = 'none'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success('Die Einladung wird als PDF heruntergeladen.')
      } else {
        window.open(objectUrl, '_blank', 'noopener,noreferrer')
        toast.success('Die Einladung wurde in einem neuen Tab geöffnet.')
      }

      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2_000)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }

      toast.error('Die Einladung konnte gerade nicht als PDF geladen werden.')
    } finally {
      setIsDownloadingInvitationPdf(false)
    }
  }

  return (
    <article
      id="gaeste-qr"
      className="surface-card relative overflow-hidden px-6 py-6 sm:px-8"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(212,154,29,0.18),_transparent_32%),radial-gradient(circle_at_78%_18%,_rgba(143,168,154,0.18),_transparent_30%),linear-gradient(180deg,rgba(255,250,241,0.9),rgba(255,255,255,0.96))]" />
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.45fr)_22rem] lg:items-center">
        <div>
          <p className="text-eyebrow text-gold-700">Für eure Gäste teilen</p>
          <div className="mt-4 flex items-start gap-3">
            <div className="rounded-2xl bg-white/80 p-3 text-gold-700 shadow-sm ring-1 ring-gold-200">
              <QrCode className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-display text-card text-charcoal-900 sm:text-section">
                QR-Code und PDF für eure Gästeseite
              </h2>
              <p className="mt-3 max-w-2xl text-body-md text-charcoal-700">
                Hier findet ihr alles zum Teilen: den direkten Gästelink, den QR-Code und eine
                fertige PDF-Einladung zum Download und Versand per Mail.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-[1.75rem] bg-white/85 px-5 py-4 shadow-sm ring-1 ring-cream-200">
              <p className="text-eyebrow text-charcoal-500">Einladungslink</p>
              <p className="mt-2 break-all text-body-md font-medium text-charcoal-900">{inviteUrl}</p>
            </div>
            <div className="rounded-[1.75rem] bg-white/85 px-5 py-4 shadow-sm ring-1 ring-cream-200">
              <p className="text-eyebrow text-charcoal-500">Gastcode</p>
              <p className="mt-2 text-card font-semibold text-charcoal-900">
                {guestCode || 'Nicht gesetzt'}
              </p>
            </div>
            <div className="rounded-[1.75rem] bg-white/85 px-5 py-4 shadow-sm ring-1 ring-cream-200">
              <p className="text-eyebrow text-charcoal-500">Empfehlung</p>
              <p className="mt-2 text-body-md text-charcoal-700">
                Nutzt QR-Code und PDF für Karte, Menü, Mailversand, Sitzplan oder Willkommensschild.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gold-500 px-5 py-3 text-sm font-semibold text-charcoal-900 shadow-gold transition hover:bg-gold-400"
              href={inviteHref}
            >
              <ExternalLink className="h-4 w-4" />
              Gästeseite öffnen
            </Link>
            <Button type="button" variant="secondary" onClick={copyInviteUrl}>
              <Copy className="h-4 w-4" />
              Link kopieren
            </Button>
            <Button
              loading={isDownloadingInvitationPdf}
              type="button"
              variant="secondary"
              onClick={() => void downloadInvitationPdf()}
            >
              <Download className="h-4 w-4" />
              Einladung als PDF
            </Button>
            <Button loading={isDownloading} type="button" variant="secondary" onClick={() => void downloadQrCode()}>
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
            <p className="text-eyebrow text-charcoal-500">Sofort bereit zum Teilen</p>
            <p className="mt-2 text-body-md text-charcoal-700">
              Ideal zum Ausdrucken, als PDF-Anhang oder direkt zum Versenden an eure Gäste.
            </p>
          </div>
        </div>
      </div>
    </article>
  )
}
