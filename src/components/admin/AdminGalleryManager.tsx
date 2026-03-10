'use client'

import { Eye, EyeOff, Trash2 } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { startTransition, useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ExternalLink } from '@/components/ui/ExternalLink'
import { formatGermanDateTime } from '@/lib/utils/date'
import type { ApiResponse } from '@/types/api'
import type { GalleryCollections, GalleryPhoto, GalleryVisibility } from '@/types/wedding'

interface AdminGalleryManagerProps {
  galleryCollections: GalleryCollections
  sharePrivateWithGuests: boolean
}

type PhotoActionState = {
  path: string
  type: 'delete' | 'move'
} | null

export function AdminGalleryManager({
  galleryCollections,
  sharePrivateWithGuests,
}: AdminGalleryManagerProps) {
  const router = useRouter()
  const [pendingAction, setPendingAction] = useState<PhotoActionState>(null)

  async function handleDelete(photo: GalleryPhoto) {
    if (!window.confirm(`Soll ${photo.name} wirklich gelöscht werden?`)) {
      return
    }

    setPendingAction({ path: photo.path, type: 'delete' })

    try {
      const response = await fetch('/api/admin/gallery-photos', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: photo.path,
        }),
      })

      const result = (await response.json()) as ApiResponse<{ deleted: true }>

      if (!response.ok || !result.success) {
        toast.error(result.success ? 'Löschen fehlgeschlagen.' : result.error)
        return
      }

      toast.success(result.message ?? 'Das Foto wurde gelöscht.')
      startTransition(() => {
        router.refresh()
      })
    } finally {
      setPendingAction(null)
    }
  }

  async function handleMove(photo: GalleryPhoto, targetVisibility: GalleryVisibility) {
    setPendingAction({ path: photo.path, type: 'move' })

    try {
      const response = await fetch('/api/admin/gallery-photos', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: photo.path,
          targetVisibility,
        }),
      })

      const result = (await response.json()) as ApiResponse<{ moved: true }>

      if (!response.ok || !result.success) {
        toast.error(result.success ? 'Verschieben fehlgeschlagen.' : result.error)
        return
      }

      toast.success(
        result.message ??
          (targetVisibility === 'private'
            ? 'Das Foto wurde in den privaten Bereich verschoben.'
            : 'Das Foto wurde in den öffentlichen Bereich verschoben.'),
      )
      startTransition(() => {
        router.refresh()
      })
    } finally {
      setPendingAction(null)
    }
  }

  function renderSection(
    title: string,
    description: string,
    photos: GalleryPhoto[],
    targetVisibility: GalleryVisibility,
    emptyTitle: string,
    emptyCopy: string,
  ) {
    return (
      <article className="surface-card px-6 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-display text-card text-charcoal-900">{title}</h3>
            <p className="mt-2 text-charcoal-600">{description}</p>
            {title === 'Privater Fotobereich' ? (
              <p className="mt-2 text-sm text-charcoal-500">
                Freigabe für Gäste:{' '}
                <span className="font-semibold text-charcoal-900">
                  {sharePrivateWithGuests ? 'aktiv' : 'deaktiviert'}
                </span>
              </p>
            ) : null}
          </div>
          <Badge variant="neutral">{photos.length} Fotos</Badge>
        </div>

        {photos.length ? (
          <div className="mt-5 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr))]">
            {photos.map((photo) => {
              const isDeleting =
                pendingAction?.path === photo.path && pendingAction.type === 'delete'
              const isMoving = pendingAction?.path === photo.path && pendingAction.type === 'move'

              return (
                <article
                  key={photo.path}
                  className="flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-cream-200 bg-white shadow-elegant"
                >
                  <ExternalLink className="block" href={photo.publicUrl}>
                    <div className="relative aspect-[16/11] w-full overflow-hidden bg-cream-100">
                      <Image
                        fill
                        alt={photo.name}
                        className="object-cover transition duration-300 hover:scale-[1.02]"
                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 24rem"
                        src={photo.publicUrl}
                        unoptimized
                      />
                    </div>
                  </ExternalLink>
                  <div className="flex flex-1 flex-col space-y-4 px-5 py-4">
                    <div className="space-y-2">
                      <p className="truncate text-sm font-semibold text-charcoal-800">
                        {photo.name}
                      </p>
                      <p className="text-xs uppercase tracking-[0.18em] text-charcoal-500">
                        {formatGermanDateTime(photo.createdAt)}
                      </p>
                    </div>
                    <div className="mt-auto grid gap-2">
                      <Button
                        className="w-full justify-center"
                        loading={isMoving}
                        size="sm"
                        type="button"
                        variant="secondary"
                        onClick={() => handleMove(photo, targetVisibility)}
                      >
                        {targetVisibility === 'private' ? (
                          <>
                            <EyeOff className="h-4 w-4" />
                            In privat verschieben
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4" />
                            Öffentlich machen
                          </>
                        )}
                      </Button>
                      <Button
                        className="w-full justify-center border border-red-200 text-red-700 hover:bg-red-50"
                        loading={isDeleting}
                        size="sm"
                        type="button"
                        variant="ghost"
                        onClick={() => handleDelete(photo)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Löschen
                      </Button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="mt-5 rounded-[1.5rem] border border-cream-200 bg-cream-50 px-6 py-8 text-center">
            <h4 className="font-display text-card text-charcoal-900">{emptyTitle}</h4>
            <p className="mt-3 text-charcoal-600">{emptyCopy}</p>
          </div>
        )}
      </article>
    )
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {renderSection(
        'Öffentliche Galerie',
        'Diese Bilder sehen alle Gäste. Ihr könnt sie löschen oder wieder in den privaten Bereich schieben.',
        galleryCollections.publicPhotos,
        'private',
        'Noch keine öffentlichen Fotos',
        'Hier erscheinen alle Bilder, die aktuell für alle Gäste sichtbar sind.',
      )}

      {renderSection(
        'Privater Fotobereich',
        'Diese Bilder bleiben zunächst intern. Bei Bedarf könnt ihr sie direkt in den öffentlichen Bereich verschieben.',
        galleryCollections.privatePhotos,
        'public',
        'Noch keine privaten Fotos',
        'Hier erscheinen Bilder, die nur intern sichtbar sind, bis ihr sie freigebt oder verschiebt.',
      )}
    </div>
  )
}
