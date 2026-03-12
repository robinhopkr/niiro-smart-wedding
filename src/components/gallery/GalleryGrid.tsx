import Image from 'next/image'

import { ExternalLink } from '@/components/ui/ExternalLink'
import { formatGermanDateTime } from '@/lib/utils/date'
import type { GalleryPhoto } from '@/types/wedding'

interface GalleryGridProps {
  photos: GalleryPhoto[]
  emptyTitle?: string
  emptyCopy?: string
}

export function GalleryGrid({
  photos,
  emptyTitle = 'Die Galerie ist noch leer.',
  emptyCopy = 'Nach der Hochzeit oder nach dem ersten Upload erscheinen hier die Fotos des Tages.',
}: GalleryGridProps) {
  if (!photos.length) {
    return (
      <div className="surface-card px-6 py-8 text-center">
        <h3 className="font-display text-card text-charcoal-900">{emptyTitle}</h3>
        <p className="mt-3 text-charcoal-600">{emptyCopy}</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {photos.map((photo) => (
        <article key={photo.path} className="overflow-hidden rounded-[1.75rem] bg-white shadow-elegant">
          <ExternalLink className="block" href={photo.publicUrl}>
            <div className="relative aspect-[4/3] w-full overflow-hidden">
              <Image
                fill
                alt={photo.name}
                className="object-cover transition duration-300 hover:scale-[1.02]"
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                src={photo.previewUrl ?? photo.publicUrl}
                unoptimized
              />
            </div>
          </ExternalLink>
          <div className="min-w-0 space-y-2 px-5 py-4">
            <p className="text-safe-wrap text-sm font-semibold leading-6 text-charcoal-800">{photo.name}</p>
            <p className="text-xs uppercase tracking-[0.18em] text-charcoal-500">
              {formatGermanDateTime(photo.createdAt)}
            </p>
          </div>
        </article>
      ))}
    </div>
  )
}
