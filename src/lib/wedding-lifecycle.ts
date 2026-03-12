import { normaliseDateInput } from '@/lib/utils/date'

const BERLIN_TIMEZONE = 'Europe/Berlin'

function getDatePartsInBerlin(value: string | Date): { year: number; month: number; day: number } | null {
  const parsed =
    value instanceof Date ? value : new Date(normaliseDateInput(value) ?? value)

  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BERLIN_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  const parts = formatter.formatToParts(parsed)
  const year = Number(parts.find((part) => part.type === 'year')?.value)
  const month = Number(parts.find((part) => part.type === 'month')?.value)
  const day = Number(parts.find((part) => part.type === 'day')?.value)

  if (!year || !month || !day) {
    return null
  }

  return { year, month, day }
}

function toDateKey(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function getBerlinTodayKey(now: Date = new Date()): string {
  const parts = getDatePartsInBerlin(now)

  if (!parts) {
    return ''
  }

  return toDateKey(parts.year, parts.month, parts.day)
}

export function getWeddingRetentionDeadlineKey(weddingDate: string | Date): string | null {
  const parts = getDatePartsInBerlin(weddingDate)

  if (!parts) {
    return null
  }

  const anniversary = new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
  anniversary.setUTCFullYear(anniversary.getUTCFullYear() + 1)

  return toDateKey(
    anniversary.getUTCFullYear(),
    anniversary.getUTCMonth() + 1,
    anniversary.getUTCDate(),
  )
}

export function isWeddingRetentionExpired(weddingDate: string | Date, now: Date = new Date()): boolean {
  const deadlineKey = getWeddingRetentionDeadlineKey(weddingDate)

  if (!deadlineKey) {
    return false
  }

  return getBerlinTodayKey(now) >= deadlineKey
}

export function getWeddingRetentionExpiredMessage(): string {
  return 'Der Brautpaar-Zugang ist 12 Monate nach dem Hochzeitstag abgelaufen.'
}

export function getWeddingGalleryExpiredMessage(): string {
  return 'Die Galerie ist 12 Monate nach dem Hochzeitstag abgelaufen und wurde archiviert.'
}
