'use client'

import { Camera, Download, ImagePlus, Trash2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { startTransition, useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/Badge'
import { formatGermanDateTime } from '@/lib/utils/date'
import type { ApiResponse } from '@/types/api'
import type { GalleryCollections, GalleryPhoto, GalleryVisibility } from '@/types/wedding'

import { Button } from '../ui/Button'
import { ExternalLink } from '../ui/ExternalLink'

interface PhotographerPanelProps {
  guestCode: string
  coupleLabel: string
  publicGalleryHref: string
  galleryCollections: GalleryCollections
  sharePrivateWithGuests: boolean
}

export function PhotographerPanel({
  guestCode,
  coupleLabel,
  publicGalleryHref,
  galleryCollections,
  sharePrivateWithGuests,
}: PhotographerPanelProps) {
  const router = useRouter()
  const [uploadingVisibility, setUploadingVisibility] = useState<GalleryVisibility | null>(null)
  const [deletingPath, setDeletingPath] = useState<string | null>(null)
  const allPhotos = [...galleryCollections.publicPhotos, ...galleryCollections.privatePhotos]

  async function handleUpload(
    event: React.ChangeEvent<HTMLInputElement>,
    visibility: GalleryVisibility,
  ) {
    const files = event.target.files
    if (!files?.length) {
      return
    }

    setUploadingVisibility(visibility)

    try {
      const formData = new FormData()
      formData.append('guestCode', guestCode)
      formData.append('visibility', visibility)
      Array.from(files).forEach((file) => {
        formData.append('photos', file)
      })

      const response = await fetch('/api/photographer/photos', {
        method: 'POST',
        body: formData,
      })

      const result = (await response.json()) as ApiResponse<{ uploaded: true }>

      if (!response.ok || !result.success) {
        toast.error(result.success ? 'Upload fehlgeschlagen.' : result.error)
        return
      }

      toast.success(
        visibility === 'private'
          ? 'Die Fotos wurden in den privaten Bereich geladen.'
          : 'Die Fotos wurden in die öffentliche Galerie geladen.',
      )
      startTransition(() => {
        router.refresh()
      })
    } finally {
      event.target.value = ''
      setUploadingVisibility(null)
    }
  }

  async function handleDelete(path: string) {
    setDeletingPath(path)

    try {
      const response = await fetch('/api/photographer/photos', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          guestCode,
          path,
        }),
      })

      const result = (await response.json()) as ApiResponse<{ deleted: true }>

      if (!response.ok || !result.success) {
        toast.error(result.success ? 'Löschen fehlgeschlagen.' : result.error)
        return
      }

      toast.success('Das Foto wurde gelöscht.')
      startTransition(() => {
        router.refresh()
      })
    } finally {
      setDeletingPath(null)
    }
  }

  async function handleLogout() {
    await fetch('/api/photographer/logout', {
      method: 'POST',
    })

    startTransition(() => {
      router.refresh()
    })
  }

  function renderPhotoSection(
    title: string,
    description: string,
    photos: GalleryPhoto[],
    emptyTitle: string,
    emptyCopy: string,
  ) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-card text-charcoal-900">{title}</h3>
            <p className="mt-2 text-charcoal-600">{description}</p>
          </div>
          <Badge variant="neutral">{photos.length} Fotos</Badge>
        </div>

        {photos.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {photos.map((photo) => (
              <article key={photo.path} className="overflow-hidden rounded-[1.75rem] bg-white shadow-elegant">
                <ExternalLink href={photo.publicUrl}>
                  <div className="relative aspect-[4/3] w-full">
                    <Image
                      fill
                      alt={photo.name}
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      src={photo.publicUrl}
                      unoptimized
                    />
                  </div>
                </ExternalLink>
                <div className="space-y-3 px-5 py-4">
                  <div>
                    <p className="truncate text-sm font-semibold text-charcoal-800">{photo.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-charcoal-500">
                      {formatGermanDateTime(photo.createdAt)}
                    </p>
                  </div>
                  <button
                    className="inline-flex min-h-10 items-center gap-2 rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                    disabled={deletingPath === photo.path}
                    type="button"
                    onClick={() => handleDelete(photo.path)}
                  >
                    <Trash2 className="h-4 w-4" />
                    {deletingPath === photo.path ? 'Löscht...' : 'Foto löschen'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="surface-card px-6 py-8 text-center">
            <h4 className="font-display text-card text-charcoal-900">{emptyTitle}</h4>
            <p className="mt-3 text-charcoal-600">{emptyCopy}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <article className="surface-card px-6 py-6">
          <p className="text-sm uppercase tracking-[0.18em] text-gold-600">Fotografen-Bereich</p>
          <h2 className="mt-4 font-display text-card text-charcoal-900">{coupleLabel}</h2>
          <p className="mt-3 text-charcoal-600">
            Fotos hochladen, einzelne Bilder wieder entfernen und zwischen öffentlicher Galerie und
            privatem Paarbereich unterscheiden.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-gold-500 px-5 py-3 text-sm font-semibold text-charcoal-900 shadow-gold transition hover:bg-gold-400">
              <ImagePlus className="h-4 w-4" />
              <span>
                {uploadingVisibility === 'public' ? 'Lädt hoch...' : 'In öffentlichen Bereich laden'}
              </span>
              <input
                accept="image/*"
                className="hidden"
                multiple
                type="file"
                onChange={(event) => handleUpload(event, 'public')}
              />
            </label>
            <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-gold-300 bg-white px-5 py-3 text-sm font-semibold text-charcoal-800 transition hover:border-gold-500 hover:text-charcoal-900">
              <ImagePlus className="h-4 w-4" />
              <span>
                {uploadingVisibility === 'private' ? 'Lädt hoch...' : 'In privaten Bereich laden'}
              </span>
              <input
                accept="image/*"
                className="hidden"
                multiple
                type="file"
                onChange={(event) => handleUpload(event, 'private')}
              />
            </label>
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-gold-300 bg-white px-5 py-3 text-sm font-semibold text-charcoal-800 transition hover:border-gold-500 hover:text-charcoal-900"
              href={publicGalleryHref}
            >
              <Download className="h-4 w-4" />
              Öffentliche Galerie
            </Link>
            <Button type="button" variant="ghost" onClick={handleLogout}>
              Abmelden
            </Button>
          </div>
          <p className="mt-4 text-sm text-charcoal-500">
            Unterstützt werden Bilddateien bis 50 MB. Öffentliche Uploads sehen alle Gäste sofort in der
            Galerie. Private Uploads landen nur im Paarbereich, außer das Brautpaar gibt sie explizit frei.
          </p>
        </article>

        <article className="surface-card px-6 py-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-cream-100 text-gold-600">
              <Camera className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-sage-600">Status</p>
              <h3 className="font-display text-card text-charcoal-900">
                {allPhotos.length} {allPhotos.length === 1 ? 'Foto' : 'Fotos'}
              </h3>
            </div>
          </div>
          <p className="mt-4 text-charcoal-600">
            Öffentliche Fotos sind immer für Gäste sichtbar. Private Fotos sieht standardmäßig nur das
            Brautpaar. Aktuell ist die private Freigabe für Gäste{' '}
            <span className="font-semibold text-charcoal-900">
              {sharePrivateWithGuests ? 'aktiv' : 'deaktiviert'}
            </span>.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Badge variant="neutral">{galleryCollections.publicPhotos.length} öffentlich</Badge>
            <Badge variant="neutral">{galleryCollections.privatePhotos.length} privat</Badge>
          </div>
        </article>
      </div>

      {renderPhotoSection(
        'Öffentliche Galerie',
        'Diese Bilder sehen alle Gäste in der öffentlichen Galerie.',
        galleryCollections.publicPhotos,
        'Noch keine öffentlichen Fotos hochgeladen',
        'Sobald die ersten öffentlichen Bilder hochgeladen sind, erscheinen sie hier und in der Gästegalerie.',
      )}

      {renderPhotoSection(
        'Privater Bereich',
        sharePrivateWithGuests
          ? 'Diese Bilder sind aktuell zusätzlich für Gäste freigegeben.'
          : 'Diese Bilder bleiben zunächst nur im Paarbereich sichtbar.',
        galleryCollections.privatePhotos,
        'Noch keine privaten Fotos hochgeladen',
        'Private Fotos werden hier gesammelt und standardmäßig nur dem Brautpaar gezeigt.',
      )}
    </div>
  )
}
