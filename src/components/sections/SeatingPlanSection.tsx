'use client'

import { Baby, Music4 } from 'lucide-react'
import { useMemo, useState } from 'react'

import { SeatingPlanVisualizer, type SeatingPlanVisualTable } from '@/components/seating/SeatingPlanVisualizer'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import type { SeatingViewMode } from '@/lib/seating-plan'
import type { BuffetSong, PlanningGuest, SeatingPlanData } from '@/types/wedding'

function getVisibleTables(plan: SeatingPlanData, guestById: Map<string, PlanningGuest>): SeatingPlanVisualTable[] {
  if (!plan.isPublished) {
    return []
  }

  const buffetSongsById = new Map(plan.buffetMode.songs.map((song) => [song.id, song.title]))

  return plan.tables
    .filter((table) => table.kind !== 'service')
    .map((table) => ({
      ...table,
      buffetSongLabel: table.buffetSongId ? buffetSongsById.get(table.buffetSongId) ?? null : null,
      seats: table.seatAssignments.map((guestId, seatIndex) => {
        const guest = guestId ? guestById.get(guestId) ?? null : null

        return {
          key: `${table.id}-seat-${seatIndex + 1}`,
          label: guest?.name ?? null,
          kind: guest?.kind ?? 'adult',
          requiresHighChair: guest?.requiresHighChair ?? false,
        }
      }),
    }))
    .filter((table) => table.seats.some((seat) => Boolean(seat.label)))
}

function buildBuffetSummary(plan: SeatingPlanData): Array<BuffetSong & { tableNames: string[] }> {
  if (!plan.isPublished || !plan.buffetMode.enabled) {
    return []
  }

  return plan.buffetMode.songs.map((song) => ({
    ...song,
    tableNames: plan.tables
      .filter((table) => table.kind !== 'service' && table.buffetSongId === song.id)
      .map((table) => table.name),
  }))
}

export function SeatingPlanSection({
  guestNamesById,
  plan,
}: {
  guestNamesById: Map<string, string>
  plan: SeatingPlanData
}) {
  const [viewMode, setViewMode] = useState<SeatingViewMode>('2d')
  const guestById = useMemo(
    () =>
      new Map(
        plan.guests.map((guest) => [
          guest.id,
          {
            ...guest,
            name: guestNamesById.get(guest.id) ?? guest.name,
          },
        ]),
      ),
    [guestNamesById, plan.guests],
  )
  const visibleTables = useMemo(() => getVisibleTables(plan, guestById), [guestById, plan])
  const buffetSummary = useMemo(() => buildBuffetSummary(plan), [plan])

  if (!visibleTables.length) {
    return null
  }

  return (
    <Section density="compact" id="sitzplan" className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <SectionHeading>Sitzplan</SectionHeading>
          <p className="max-w-3xl text-charcoal-600">
            Hier findet ihr eure Tischverteilung für den Tag. Je nach Geschmack könnt ihr euch den Plan
            als ruhige 2D-Ansicht oder als räumlichere 3D-Variante ansehen.
          </p>
        </div>
        <div className="inline-flex flex-wrap gap-2 rounded-full border border-cream-200 bg-white p-1 shadow-sm">
          {(['2d', '3d'] as const).map((mode) => (
            <Button
              key={mode}
              type="button"
              size="sm"
              variant={viewMode === mode ? 'primary' : 'ghost'}
              onClick={() => setViewMode(mode)}
            >
              {mode === '2d' ? '2D Ansicht' : '3D Ansicht'}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Badge variant="neutral">{visibleTables.length} sichtbare Tische</Badge>
        {plan.guests.some((guest) => guest.kind === 'child') ? (
          <Badge variant="neutral">
            <Baby className="mr-1 h-3.5 w-3.5" />
            Kinderplätze markiert
          </Badge>
        ) : null}
        {plan.buffetMode.enabled ? (
          <Badge variant="attending">
            <Music4 className="mr-1 h-3.5 w-3.5" />
            Buffet-Aufrufe aktiv
          </Badge>
        ) : null}
      </div>

      <SeatingPlanVisualizer mode={viewMode} tables={visibleTables} />

      {buffetSummary.length ? (
        <div className="surface-card space-y-4 px-5 py-5 sm:px-6">
          <div className="space-y-2">
            <h3 className="font-display text-card text-charcoal-900">Buffet-Aufruf nach Songs</h3>
            <p className="max-w-3xl text-body-md text-charcoal-600">
              Wenn der jeweilige Song gespielt wird, ist das der Aufruf für den ersten Gang ans Buffet.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {buffetSummary.map((song) => (
              <article key={song.id} className="rounded-[1.4rem] border border-cream-200 bg-cream-50 px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gold-100 text-sm font-semibold text-charcoal-900">
                    {song.sortOrder}
                  </div>
                  <div className="min-w-0">
                    <p className="text-safe-wrap font-semibold text-charcoal-900">{song.title}</p>
                    <p className="text-sm text-charcoal-500">{song.artist ?? 'Interpret offen'}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-charcoal-600">
                  {song.tableNames.length
                    ? `Aufruf für: ${song.tableNames.join(', ')}`
                    : 'Derzeit noch keinem Tisch zugeordnet.'}
                </p>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </Section>
  )
}
