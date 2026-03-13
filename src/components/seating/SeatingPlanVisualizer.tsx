import { Baby, Music4, Users } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import {
  SEATING_TABLE_KIND_LABELS,
  SEATING_TABLE_SHAPE_LABELS,
  getTableBadgeVariant,
  type SeatingViewMode,
} from '@/lib/seating-plan'
import { cn } from '@/lib/utils/cn'
import type { PlanningGuest, SeatingTable, SeatingTableShape } from '@/types/wedding'

export interface SeatingPlanVisualSeat {
  key: string
  label: string | null
  kind: PlanningGuest['kind']
  requiresHighChair: boolean
}

export interface SeatingPlanVisualTable extends Omit<SeatingTable, 'seatAssignments'> {
  buffetSongLabel?: string | null
  seats: SeatingPlanVisualSeat[]
}

const TABLE_DIMENSIONS: Record<
  SeatingTableShape,
  { width: number; height: number; shapeClass: string; surfaceClass: string }
> = {
  round: {
    width: 132,
    height: 132,
    shapeClass: 'rounded-full',
    surfaceClass: 'bg-[radial-gradient(circle_at_top,_rgba(212,175,55,0.16),_rgba(255,255,255,0.98)_58%)]',
  },
  oval: {
    width: 176,
    height: 116,
    shapeClass: 'rounded-[999px]',
    surfaceClass: 'bg-[radial-gradient(circle_at_top,_rgba(212,175,55,0.15),_rgba(255,255,255,0.98)_55%)]',
  },
  long: {
    width: 208,
    height: 96,
    shapeClass: 'rounded-[2rem]',
    surfaceClass: 'bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,243,234,0.96))]',
  },
  square: {
    width: 146,
    height: 146,
    shapeClass: 'rounded-[1.85rem]',
    surfaceClass: 'bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,243,234,0.96))]',
  },
}

const SEAT_DIAMETER = 42
const FRAME_PADDING = 64

interface SeatNode extends SeatingPlanVisualSeat {
  index: number
}

function buildEllipseSeatPositions(
  count: number,
  width: number,
  height: number,
  totalWidth: number,
  totalHeight: number,
): Array<{ left: number; top: number }> {
  const centerX = totalWidth / 2
  const centerY = totalHeight / 2
  const radiusX = width / 2 + 34
  const radiusY = height / 2 + 34

  return Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(count, 1)

    return {
      left: centerX + Math.cos(angle) * radiusX - SEAT_DIAMETER / 2,
      top: centerY + Math.sin(angle) * radiusY - SEAT_DIAMETER / 2,
    }
  })
}

function buildPerimeterSeatPositions(
  count: number,
  width: number,
  height: number,
  totalWidth: number,
  totalHeight: number,
): Array<{ left: number; top: number }> {
  const outerWidth = width + 70
  const outerHeight = height + 58
  const startX = (totalWidth - outerWidth) / 2
  const startY = (totalHeight - outerHeight) / 2
  const perimeter = 2 * (outerWidth + outerHeight)

  return Array.from({ length: count }, (_, index) => {
    let distance = (perimeter * index) / Math.max(count, 1)
    let x = startX
    let y = startY

    if (distance <= outerWidth) {
      x += distance
    } else if (distance <= outerWidth + outerHeight) {
      x += outerWidth
      y += distance - outerWidth
    } else if (distance <= 2 * outerWidth + outerHeight) {
      distance -= outerWidth + outerHeight
      x += outerWidth - distance
      y += outerHeight
    } else {
      distance -= 2 * outerWidth + outerHeight
      y += outerHeight - distance
    }

    return {
      left: x - SEAT_DIAMETER / 2,
      top: y - SEAT_DIAMETER / 2,
    }
  })
}

function getSeatPositions(
  shape: SeatingTableShape,
  count: number,
  width: number,
  height: number,
  totalWidth: number,
  totalHeight: number,
): Array<{ left: number; top: number }> {
  if (shape === 'round' || shape === 'oval') {
    return buildEllipseSeatPositions(count, width, height, totalWidth, totalHeight)
  }

  return buildPerimeterSeatPositions(count, width, height, totalWidth, totalHeight)
}

function getSeatDisplayLabel(seat: SeatingPlanVisualSeat, seatIndex: number): string {
  if (!seat.label) {
    return `${seatIndex + 1}`
  }

  if (seat.kind === 'child') {
    return 'Kind'
  }

  const [firstWord = seat.label.trim()] = seat.label.trim().split(/\s+/)
  return firstWord.slice(0, 8)
}

function getSeatNodes(seats: SeatingPlanVisualSeat[], showEmptySeats: boolean): SeatNode[] {
  return seats
    .map((seat, index) => ({ ...seat, index }))
    .filter((seat) => showEmptySeats || Boolean(seat.label))
}

function TableScene({
  mode,
  seats,
  shape,
  seatCount,
  tableName,
}: {
  mode: SeatingViewMode
  seats: SeatingPlanVisualSeat[]
  shape: SeatingTableShape
  seatCount: number
  tableName: string
}) {
  const dimensions = TABLE_DIMENSIONS[shape]
  const frameWidth = dimensions.width + FRAME_PADDING * 2
  const frameHeight = dimensions.height + FRAME_PADDING * 2
  const visibleSeatNodes = getSeatNodes(seats, seats.some((seat) => Boolean(seat.label)))
  const renderedSeats = visibleSeatNodes.length
    ? visibleSeatNodes
    : getSeatNodes(
        Array.from({ length: seatCount }, (_, index) => ({
          key: `empty-seat-${index + 1}`,
          label: null,
          kind: 'adult',
          requiresHighChair: false,
        })),
        true,
      )
  const positions = getSeatPositions(
    shape,
    renderedSeats.length,
    dimensions.width,
    dimensions.height,
    frameWidth,
    frameHeight,
  )

  return (
    <div
      className={cn(
        'relative mx-auto min-h-[19rem] w-full overflow-hidden rounded-[2rem] border px-4 py-5',
        mode === '3d'
          ? 'border-gold-200 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),_rgba(248,243,234,0.86)_72%)]'
          : 'border-cream-200 bg-cream-50/70',
      )}
    >
      <div className="mx-auto flex h-full items-center justify-center">
        <div className="relative" style={{ width: `${frameWidth}px`, height: `${frameHeight}px` }}>
          {renderedSeats.map((seat, index) => {
            const position = positions[index]

            if (!position) {
              return null
            }

            return (
              <div
                key={seat.key}
                className={cn(
                  'absolute flex h-[42px] w-[42px] items-center justify-center rounded-full border text-center text-[10px] font-semibold uppercase tracking-[0.05em] transition',
                  seat.label
                    ? seat.kind === 'child'
                      ? mode === '3d'
                        ? 'border-rose-300 bg-rose-50 text-rose-900 shadow-[0_16px_28px_-22px_rgba(59,47,39,0.6)]'
                        : 'border-rose-300 bg-rose-50 text-rose-900 shadow-sm'
                      : mode === '3d'
                        ? 'border-gold-300 bg-white text-charcoal-800 shadow-[0_16px_28px_-22px_rgba(59,47,39,0.6)]'
                        : 'border-gold-300 bg-white text-charcoal-800 shadow-sm'
                    : 'border-dashed border-cream-300 bg-white/80 text-charcoal-400',
                )}
                style={{
                  left: `${position.left}px`,
                  top: `${position.top}px`,
                  transform: mode === '3d' ? 'translateZ(18px)' : undefined,
                }}
                title={
                  seat.label
                    ? `${seat.label}${seat.kind === 'child' ? ' · Kind' : ''}${seat.requiresHighChair ? ' · Hochstuhl' : ''}`
                    : `Platz ${seat.index + 1} frei`
                }
              >
                <span className="px-1 leading-[1.05]">{getSeatDisplayLabel(seat, seat.index)}</span>
                {seat.kind === 'child' ? (
                  <span className="absolute -left-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                    <Baby className="h-2.5 w-2.5" />
                  </span>
                ) : null}
                {seat.requiresHighChair ? (
                  <span className="absolute -bottom-1 -right-1 rounded-full bg-gold-500 px-1.5 py-0.5 text-[8px] font-bold text-charcoal-900">
                    HS
                  </span>
                ) : null}
              </div>
            )
          })}

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 [perspective:900px]">
            {mode === '3d' ? (
              <div
                className={cn(
                  'absolute inset-0 translate-y-4 opacity-35 blur-xl',
                  dimensions.shapeClass,
                  'bg-charcoal-900/40',
                )}
                style={{ width: `${dimensions.width}px`, height: `${dimensions.height}px` }}
              />
            ) : null}
            <div
              className={cn(
                'relative border border-gold-200 shadow-sm',
                dimensions.shapeClass,
                dimensions.surfaceClass,
                mode === '3d' ? 'shadow-[0_26px_48px_-30px_rgba(59,47,39,0.72)]' : null,
              )}
              style={{
                width: `${dimensions.width}px`,
                height: `${dimensions.height}px`,
                transform: mode === '3d' ? 'rotateX(58deg)' : undefined,
                transformStyle: 'preserve-3d',
              }}
            />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-5 text-center">
              <p className="font-display text-[1.05rem] text-charcoal-900">{tableName}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-charcoal-500">
                {seatCount} Plätze
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function SeatingPlanVisualizer({
  tables,
  mode,
  showEmptySeats = false,
}: {
  tables: SeatingPlanVisualTable[]
  mode: SeatingViewMode
  showEmptySeats?: boolean
}) {
  if (!tables.length) {
    return null
  }

  return (
    <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr))]">
      {tables.map((table) => {
        const occupiedSeats = table.seats.filter((seat) => Boolean(seat.label)).length
        const childCount = table.seats.filter((seat) => seat.kind === 'child' && seat.label).length

        return (
          <article key={table.id} className="surface-card flex h-full min-w-0 flex-col px-5 py-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h4 className="text-safe-wrap font-display text-card text-charcoal-900">{table.name}</h4>
                  <Badge variant={getTableBadgeVariant(table.kind)}>
                    {SEATING_TABLE_KIND_LABELS[table.kind]}
                  </Badge>
                </div>
                <p className="text-sm text-charcoal-500">
                  {SEATING_TABLE_SHAPE_LABELS[table.shape]} · {mode === '3d' ? '3D Ansicht' : '2D Ansicht'}
                </p>
                {table.buffetSongLabel ? (
                  <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-gold-50 px-3 py-2 text-sm text-charcoal-700">
                    <Music4 className="h-4 w-4 text-gold-700" />
                    <span className="truncate">Buffet-Song: {table.buffetSongLabel}</span>
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-cream-100 px-3 py-2 text-sm font-medium text-charcoal-700">
                  <Users className="h-4 w-4 text-gold-600" />
                  {occupiedSeats} / {table.seatCount}
                </div>
                {childCount ? (
                  <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-2 text-sm font-medium text-rose-900">
                    <Baby className="h-4 w-4" />
                    {childCount} Kinder
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-5">
              <TableScene
                mode={mode}
                seats={showEmptySeats ? table.seats : table.seats.filter((seat) => Boolean(seat.label))}
                shape={table.shape}
                seatCount={table.seatCount}
                tableName={table.name}
              />
            </div>
          </article>
        )
      })}
    </div>
  )
}
