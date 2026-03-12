import { PassThrough, Readable } from 'node:stream'

import archiver from 'archiver'

import { downloadR2ObjectBytes } from '@/lib/storage/r2'
import { GALLERY_BUCKET } from '@/lib/supabase/repository'
import type { GalleryPhoto, WeddingConfig } from '@/types/wedding'

type GalleryStorageClient = {
  storage?: {
    from: (bucket: string) => {
      download: (path: string) => Promise<{ data: Blob | null; error: Error | null }>
    }
  }
}

export type GalleryDownloadScope = 'public' | 'all'

function sanitizeArchiveSegment(value: string): string {
  return (
    value
      .normalize('NFKD')
      .replace(/[^\w.\- ]+/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'niiro-smart-wedding'
  )
}

function buildArchiveFileName(config: WeddingConfig, scope: GalleryDownloadScope): string {
  const label = sanitizeArchiveSegment(config.coupleLabel || config.guestCode || 'niiro-smart-wedding')
  return `niiro-smart-wedding-galerie-${label}-${scope === 'all' ? 'komplett' : 'oeffentlich'}.zip`
}

function buildArchiveEntryName(photo: GalleryPhoto, index: number, scope: GalleryDownloadScope): string {
  const fileName = sanitizeArchiveSegment(photo.name || `foto-${index + 1}`) || `foto-${index + 1}`
  const prefixedName = `${String(index + 1).padStart(4, '0')}-${fileName}`

  if (scope === 'all') {
    return `${photo.visibility === 'private' ? 'privat' : 'oeffentlich'}/${prefixedName}`
  }

  return `oeffentlich/${prefixedName}`
}

async function downloadGalleryPhotoBytes(
  supabase: GalleryStorageClient,
  config: WeddingConfig,
  photo: GalleryPhoto,
): Promise<Uint8Array> {
  if (photo.storageProvider === 'r2') {
    if (!photo.originalPath) {
      throw new Error('Für dieses Foto ist kein Originalpfad hinterlegt.')
    }

    return downloadR2ObjectBytes(photo.originalPath)
  }

  if (!config.sourceId || !supabase.storage) {
    throw new Error('Die Galerie ist aktuell nicht verfügbar.')
  }

  const path = photo.originalPath ?? photo.path

  if (!path.startsWith(`${config.sourceId}/`)) {
    throw new Error('Ungültiger Dateipfad.')
  }

  const { data, error } = await supabase.storage.from(GALLERY_BUCKET).download(path)

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error('Das Foto konnte nicht geladen werden.')
  }

  return new Uint8Array(await data.arrayBuffer())
}

export async function buildGalleryArchiveResponse(input: {
  supabase: GalleryStorageClient
  config: WeddingConfig
  photos: GalleryPhoto[]
  scope: GalleryDownloadScope
}): Promise<Response> {
  const output = new PassThrough()
  const archive = archiver('zip', {
    store: true,
  })

  archive.on('warning', (error: Error) => {
    output.destroy(error)
  })
  archive.on('error', (error: Error) => {
    output.destroy(error)
  })

  archive.pipe(output)

  for (const [index, photo] of input.photos.entries()) {
    const bytes = await downloadGalleryPhotoBytes(input.supabase, input.config, photo)
    archive.append(Buffer.from(bytes), {
      name: buildArchiveEntryName(photo, index, input.scope),
    })
  }

  void archive.finalize()

  return new Response(Readable.toWeb(output) as ReadableStream<Uint8Array>, {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Disposition': `attachment; filename="${buildArchiveFileName(input.config, input.scope)}"`,
      'Content-Type': 'application/zip',
    },
  })
}
