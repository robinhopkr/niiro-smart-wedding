'use client'

import { Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { formatGermanDateTime } from '@/lib/utils/date'
import type { RsvpRecord } from '@/types/wedding'

export function RsvpTable({
  rsvps,
  deletingId,
  onDelete,
}: {
  rsvps: RsvpRecord[]
  deletingId?: string | null
  onDelete?: (rsvp: RsvpRecord) => void
}) {
  if (!rsvps.length) {
    return (
      <div className="surface-card px-6 py-6 text-charcoal-600">
        Noch keine RSVP-Antworten vorhanden.
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
              <th className="px-5 py-4 font-semibold">Kinder / Hochstühle</th>
              <th className="px-5 py-4 font-semibold">Essensvarianten</th>
              <th className="px-5 py-4 font-semibold">Allergien & Unverträglichkeiten</th>
              <th className="px-5 py-4 font-semibold">Nachricht</th>
              <th className="px-5 py-4 font-semibold">Zeitpunkt</th>
              <th className="px-5 py-4 font-semibold">Aktion</th>
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
                <td className="px-5 py-4 text-charcoal-700">
                  {rsvp.smallChildrenCount > 0
                    ? `${rsvp.smallChildrenCount} / ${rsvp.highChairCount}`
                    : '0 / 0'}
                </td>
                <td className="px-5 py-4 text-charcoal-700">{rsvp.menuChoice ?? '–'}</td>
                <td className="px-5 py-4 text-charcoal-700">{rsvp.dietaryNotes ?? '–'}</td>
                <td className="px-5 py-4 text-charcoal-700">{rsvp.message ?? '–'}</td>
                <td className="px-5 py-4 text-charcoal-500">{formatGermanDateTime(rsvp.createdAt)}</td>
                <td className="px-5 py-4">
                  {onDelete ? (
                    <button
                      className="inline-flex min-h-10 items-center gap-2 rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={deletingId === rsvp.id}
                      type="button"
                      onClick={() => onDelete(rsvp)}
                    >
                      <Trash2 className="h-4 w-4" />
                      {deletingId === rsvp.id ? 'Löscht...' : 'Löschen'}
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
