import type { SeatingTableKind, SeatingTableShape } from '@/types/wedding'

export type SeatingViewMode = '2d' | '3d'

export const SEATING_TABLE_KIND_LABELS: Record<SeatingTableKind, string> = {
  guest: 'Gästetisch',
  child: 'Kindertisch',
  service: 'Dienstleistertisch',
  couple: 'Brautpaartisch',
}

export const SEATING_TABLE_SHAPE_LABELS: Record<SeatingTableShape, string> = {
  round: 'Rund',
  oval: 'Oval',
  long: 'Tafel',
  square: 'Quadratisch',
}

export const SEATING_TABLE_SHAPE_OPTIONS: Array<{
  value: SeatingTableShape
  label: string
  description: string
}> = [
  {
    value: 'round',
    label: 'Rund',
    description: 'Klassischer Hochzeitstisch für lockere Gruppen.',
  },
  {
    value: 'oval',
    label: 'Oval',
    description: 'Elegant für Brautpaar oder Familieninseln.',
  },
  {
    value: 'long',
    label: 'Tafel',
    description: 'Ideal für lange Reihen oder Dienstleister.',
  },
  {
    value: 'square',
    label: 'Quadratisch',
    description: 'Kompakt für kleinere Gruppen oder Kinder.',
  },
]

export function isSeatingTableShape(value: string | null | undefined): value is SeatingTableShape {
  return value === 'round' || value === 'oval' || value === 'long' || value === 'square'
}

export function getDefaultSeatCountForKind(kind: SeatingTableKind): number {
  if (kind === 'couple') {
    return 2
  }

  if (kind === 'child') {
    return 8
  }

  return kind === 'service' ? 6 : 8
}

export function getDefaultTableShapeForKind(kind: SeatingTableKind): SeatingTableShape {
  if (kind === 'couple') {
    return 'oval'
  }

  if (kind === 'child') {
    return 'square'
  }

  return kind === 'service' ? 'long' : 'round'
}

export function getDefaultTableName(kind: SeatingTableKind, index: number): string {
  if (kind === 'guest') {
    return `Tisch ${index}`
  }

  if (kind === 'child') {
    return index > 1 ? `Kindertisch ${index}` : 'Kindertisch'
  }

  const baseLabel = SEATING_TABLE_KIND_LABELS[kind]
  return index > 1 ? `${baseLabel} ${index}` : baseLabel
}

export function getTableBadgeVariant(kind: SeatingTableKind): 'attending' | 'declined' | 'neutral' {
  if (kind === 'service') {
    return 'attending'
  }

  if (kind === 'child') {
    return 'neutral'
  }

  return kind === 'couple' ? 'declined' : 'neutral'
}
