'use client'

import { Badge } from '@/components/ui/Badge'
import { formatGermanDateTime } from '@/lib/utils/date'
import type { RsvpRecord } from '@/types/wedding'

export function RsvpTable({ rsvps }: { rsvps: RsvpRecord[] }) {
  if (!rsvps.length) {
    return (
      <div className="surface-card px-6 py-6 text-charcoal-600">
        Noch keine Antworten vorhanden.
      </div>
    )
  }

  return (
    <div className="surface-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-cream-100 text-left text-charcoal-600">
            <tr>
              <th className="px-5 py-4 font-semibold">Gast</th>
              <th className="px-5 py-4 font-semibold">Status</th>
              <th className="px-5 py-4 font-semibold">Personen</th>
              <th className="px-5 py-4 font-semibold">Essensvarianten</th>
              <th className="px-5 py-4 font-semibold">Nachricht</th>
              <th className="px-5 py-4 font-semibold">Zeitpunkt</th>
            </tr>
          </thead>
          <tbody>
            {rsvps.map((rsvp) => (
              <tr key={rsvp.id} className="border-t border-cream-200 align-top">
                <td className="px-5 py-4">
                  <div className="font-semibold text-charcoal-900">{rsvp.guestName}</div>
                  {rsvp.guestEmail ? <div className="text-charcoal-500">{rsvp.guestEmail}</div> : null}
                </td>
                <td className="px-5 py-4">
                  <Badge variant={rsvp.isAttending ? 'attending' : 'declined'}>
                    {rsvp.isAttending ? 'Zusage' : 'Absage'}
                  </Badge>
                </td>
                <td className="px-5 py-4 text-charcoal-700">{rsvp.totalGuests}</td>
                <td className="px-5 py-4 text-charcoal-700">{rsvp.menuChoice ?? '–'}</td>
                <td className="px-5 py-4 text-charcoal-700">{rsvp.message ?? rsvp.dietaryNotes ?? '–'}</td>
                <td className="px-5 py-4 text-charcoal-500">{formatGermanDateTime(rsvp.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
