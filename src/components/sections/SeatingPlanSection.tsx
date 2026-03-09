import { Users } from 'lucide-react'

import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import type { SeatingPlanData } from '@/types/wedding'

const PUBLIC_TABLE_KIND_LABELS = {
  couple: 'Brautpaartisch',
  guest: 'Tisch',
  service: 'Dienstleistertisch',
} as const

function getVisibleTables(plan: SeatingPlanData) {
  if (!plan.isPublished) {
    return []
  }

  return plan.tables
    .filter((table) => table.kind !== 'service')
    .map((table) => ({
      ...table,
      guests: table.seatAssignments.filter((guestName): guestName is string => Boolean(guestName)),
    }))
    .filter((table) => table.guests.length > 0)
}

export function SeatingPlanSection({
  guestNamesById,
  plan,
}: {
  guestNamesById: Map<string, string>
  plan: SeatingPlanData
}) {
  const visibleTables = getVisibleTables({
    ...plan,
    tables: plan.tables.map((table) => ({
      ...table,
      seatAssignments: table.seatAssignments.map((guestId) => (guestId ? guestNamesById.get(guestId) ?? null : null)),
    })),
  })

  if (!visibleTables.length) {
    return null
  }

  return (
    <Section density="compact" id="sitzplan" className="space-y-6">
      <SectionHeading>Sitzplan</SectionHeading>
      <p className="max-w-3xl text-charcoal-600">
        Hier findet ihr eure Tischverteilung für den Tag. Falls sich noch etwas ändert, aktualisieren
        wir diesen Bereich rechtzeitig.
      </p>
      <div className="grid gap-5 lg:grid-cols-2">
        {visibleTables.map((table) => (
          <article key={table.id} className="surface-card px-6 py-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-gold-600">
                  {PUBLIC_TABLE_KIND_LABELS[table.kind]}
                </p>
                <h3 className="mt-3 font-display text-card text-charcoal-900">{table.name}</h3>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-cream-100 px-3 py-2 text-sm font-medium text-charcoal-700">
                <Users className="h-4 w-4 text-gold-600" />
                {table.guests.length} / {table.seatCount}
              </div>
            </div>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {table.guests.map((guestName, index) => (
                <li
                  key={`${table.id}-${guestName}-${index}`}
                  className="rounded-[1.3rem] border border-cream-200 bg-cream-50 px-4 py-3 text-sm text-charcoal-700"
                >
                  {guestName}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </Section>
  )
}
