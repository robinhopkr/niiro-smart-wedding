import { randomUUID } from 'node:crypto'
import { extname } from 'node:path'

import sharp from 'sharp'

import type { GalleryVisibility, WeddingConfig } from '@/types/wedding'

const GALLERY_VARIANT_FORMAT = 'webp'
const PREVIEW_WIDTH = 960
const LIGHTBOX_WIDTH = 1800

function sanitizeFileSegment(value: string): string {
  return (
    value
      .normalize('NFKD')
      .replace(/[^\w.\- ]+/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'foto'
  )
}

function getOriginalExtension(fileName: string, contentType: string): string {
  const extension = extname(fileName).replace('.', '').toLowerCase()

  if (extension) {
    return extension
  }

  if (contentType === 'image/png') {
    return 'png'
  }

  if (contentType === 'image/webp') {
    return 'webp'
  }

  if (contentType === 'image/heic' || contentType === 'image/heif') {
    return 'heic'
  }

  return 'jpg'
}

function buildBaseKey(config: WeddingConfig, visibility: GalleryVisibility, fileName: string): string {
  return `gallery/${config.source}/${config.sourceId}/${visibility}/${randomUUID()}-${sanitizeFileSegment(fileName)}`
}

export async function buildGalleryUploadAssets(input: {
  config: WeddingConfig
  visibility: GalleryVisibility
  fileName: string
  contentType: string
  body: Uint8Array
}) {
  if (!input.config.sourceId || input.config.source === 'fallback') {
    throw new Error('Die Galerie ist aktuell nicht verfügbar.')
  }

  const bodyBuffer = Buffer.from(input.body)
  const image = sharp(bodyBuffer, {
    failOn: 'warning',
  }).rotate()
  const metadata = await image.metadata()

  if (!metadata.width || !metadata.height) {
    throw new Error(`Die Bilddatei ${input.fileName} konnte nicht verarbeitet werden.`)
  }

  const previewBuffer = await sharp(bodyBuffer)
    .rotate()
    .resize({
      width: PREVIEW_WIDTH,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({
      quality: 82,
    })
    .toBuffer()

  const lightboxBuffer = await sharp(bodyBuffer)
    .rotate()
    .resize({
      width: LIGHTBOX_WIDTH,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({
      quality: 88,
    })
    .toBuffer()

  const baseKey = buildBaseKey(input.config, input.visibility, input.fileName)
  const originalExtension = getOriginalExtension(input.fileName, input.contentType)

  return {
    fileName: input.fileName,
    width: metadata.width,
    height: metadata.height,
    original: {
      key: `${baseKey}/original.${originalExtension}`,
      body: bodyBuffer,
      contentType: input.contentType,
      sizeBytes: bodyBuffer.byteLength,
    },
    preview: {
      key: `${baseKey}/preview.${GALLERY_VARIANT_FORMAT}`,
      body: previewBuffer,
      contentType: 'image/webp',
      sizeBytes: previewBuffer.byteLength,
    },
    lightbox: {
      key: `${baseKey}/lightbox.${GALLERY_VARIANT_FORMAT}`,
      body: lightboxBuffer,
      contentType: 'image/webp',
      sizeBytes: lightboxBuffer.byteLength,
    },
  }
}
