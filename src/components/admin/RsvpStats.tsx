'use client'

import type { AdminSummary } from '@/types/wedding'

export function RsvpStats({ summary }: { summary: AdminSummary }) {
  const cards = [
    { label: 'RSVP', value: summary.total },
    { label: 'Zusagen', value: summary.attending },
    { label: 'Absagen', value: summary.declined },
    { label: 'Personen', value: summary.guestCount },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article key={card.label} className="surface-card px-5 py-5">
          <p className="text-sm uppercase tracking-[0.18em] text-charcoal-500">{card.label}</p>
          <p className="mt-3 font-display text-metric text-charcoal-900">{card.value}</p>
        </article>
      ))}
    </div>
  )
}
