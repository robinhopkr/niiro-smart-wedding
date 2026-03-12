import { GetObjectCommand, PutObjectCommand, DeleteObjectsCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import { ENV } from '@/lib/constants'

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24

let cachedClient: S3Client | null | undefined

function encodeStoragePath(path: string): string {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

export function isR2Configured(): boolean {
  return Boolean(
    ENV.r2AccountId &&
      ENV.r2AccessKeyId &&
      ENV.r2SecretAccessKey &&
      ENV.r2Bucket,
  )
}

export function getR2BucketName(): string {
  if (!ENV.r2Bucket) {
    throw new Error('R2_BUCKET fehlt. Siehe .env.example')
  }

  return ENV.r2Bucket
}

export function getR2Client(): S3Client | null {
  if (!isR2Configured()) {
    return null
  }

  if (cachedClient !== undefined) {
    return cachedClient
  }

  cachedClient = new S3Client({
    region: 'auto',
    endpoint: `https://${ENV.r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: ENV.r2AccessKeyId!,
      secretAccessKey: ENV.r2SecretAccessKey!,
    },
  })

  return cachedClient
}

export async function uploadR2Object(input: {
  key: string
  body: Buffer | Uint8Array
  contentType: string
  cacheControl?: string
}): Promise<void> {
  const client = getR2Client()

  if (!client) {
    throw new Error('Cloudflare R2 ist aktuell nicht konfiguriert.')
  }

  await client.send(
    new PutObjectCommand({
      Bucket: getR2BucketName(),
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
      CacheControl: input.cacheControl,
    }),
  )
}

export async function deleteR2Objects(keys: string[]): Promise<void> {
  if (!keys.length) {
    return
  }

  const client = getR2Client()

  if (!client) {
    throw new Error('Cloudflare R2 ist aktuell nicht konfiguriert.')
  }

  await client.send(
    new DeleteObjectsCommand({
      Bucket: getR2BucketName(),
      Delete: {
        Objects: keys.map((key) => ({ Key: key })),
        Quiet: true,
      },
    }),
  )
}

export async function downloadR2ObjectBytes(key: string): Promise<Uint8Array> {
  const client = getR2Client()

  if (!client) {
    throw new Error('Cloudflare R2 ist aktuell nicht konfiguriert.')
  }

  const response = await client.send(
    new GetObjectCommand({
      Bucket: getR2BucketName(),
      Key: key,
    }),
  )

  if (!response.Body) {
    throw new Error('Das Bild konnte aus R2 nicht geladen werden.')
  }

  return new Uint8Array(await response.Body.transformToByteArray())
}

export async function resolveR2ObjectUrl(
  key: string,
  options?: {
    usePublicUrl?: boolean
  },
): Promise<string> {
  if (options?.usePublicUrl && ENV.r2PublicBaseUrl) {
    return `${ENV.r2PublicBaseUrl.replace(/\/+$/, '')}/${encodeStoragePath(key)}`
  }

  const client = getR2Client()

  if (!client) {
    throw new Error('Cloudflare R2 ist aktuell nicht konfiguriert.')
  }

  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: getR2BucketName(),
      Key: key,
    }),
    { expiresIn: SIGNED_URL_TTL_SECONDS },
  )
}
