'use client'

import { Button } from '@/components/ui/Button'
import type { RsvpRecord } from '@/types/wedding'

function escapeCsvValue(value: string | number | null): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

export function ExportButton({ rsvps }: { rsvps: RsvpRecord[] }) {
  function handleExport() {
    const header = [
      'Gast',
      'Status',
      'Personen',
      'Kleine Kinder',
      'Hochstuehle',
      'Essensvarianten',
      'Allergien und Unverträglichkeiten',
      'Nachricht',
      'Zeitpunkt',
    ]
    const rows = rsvps.map((rsvp) =>
      [
        rsvp.guestName,
        rsvp.isAttending ? 'Zusage' : 'Absage',
        rsvp.totalGuests,
        rsvp.smallChildrenCount,
        rsvp.highChairCount,
        rsvp.menuChoice,
        rsvp.dietaryNotes,
        rsvp.message,
        rsvp.createdAt,
      ]
        .map(escapeCsvValue)
        .join(';'),
    )

    const csv = ['\uFEFF' + header.join(';'), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `rsvps_${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button type="button" variant="secondary" onClick={handleExport}>
      CSV exportieren
    </Button>
  )
}
