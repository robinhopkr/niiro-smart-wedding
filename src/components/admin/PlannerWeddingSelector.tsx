'use client'

import { CalendarDays, KeyRound, MapPin } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { startTransition, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { formatGermanDate } from '@/lib/utils/date'
import type { ApiResponse } from '@/types/api'
import type { PlannerWeddingSummary } from '@/types/wedding'

import { Button } from '../ui/Button'

interface PlannerWeddingSelectorProps {
  customerNumber: string
  weddings: PlannerWeddingSummary[]
}

interface SelectionResponse {
  nextUrl: string
  selected: true
}

export function PlannerWeddingSelector({
  customerNumber,
  weddings,
}: PlannerWeddingSelectorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pendingWeddingId, setPendingWeddingId] = useState<string | null>(null)

  const registrationCustomerNumber = searchParams.get('customerNumber')
  const effectiveCustomerNumber = registrationCustomerNumber || customerNumber

  const unlockedWeddings = useMemo(
    () => weddings.filter((entry) => entry.billingUnlocked),
    [weddings],
  )

  async function handleSelectWedding(entry: PlannerWeddingSummary) {
    setPendingWeddingId(entry.weddingSourceId)

    try {
      const response = await fetch('/api/admin/select-wedding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          weddingSource: entry.weddingSource,
          weddingSourceId: entry.weddingSourceId,
        }),
      })

      const result = (await response.json()) as ApiResponse<SelectionResponse>

      if (!response.ok || !result.success) {
        toast.error(result.success ? 'Die Hochzeit konnte nicht geöffnet werden.' : result.error)
        return
      }

      startTransition(() => {
        router.replace(result.data.nextUrl)
        router.refresh()
      })
    } catch {
      toast.error('Die Hochzeit konnte gerade nicht geöffnet werden.')
    } finally {
      setPendingWeddingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="surface-card px-6 py-6">
        <p className="text-sm uppercase tracking-[0.18em] text-sage-700">Kundennummer</p>
        <h2 className="mt-3 font-display text-card text-charcoal-900">Diese Nummer gebt ihr an Brautpaare weiter</h2>
        <div className="mt-5 inline-flex items-center gap-3 rounded-full bg-cream-50 px-5 py-3 text-base font-semibold text-charcoal-900">
          <KeyRound className="h-4 w-4 text-gold-700" />
          {effectiveCustomerNumber}
        </div>
        <p className="mt-4 max-w-3xl text-charcoal-600">
          Das Brautpaar trägt diese Kundennummer in seinem Paarbereich ein. Danach erscheint die Hochzeit hier in eurer Auswahl.
        </p>
        <p className="mt-3 max-w-3xl text-charcoal-600">
          Wenn ihr eine Hochzeit öffnet, landet ihr im selben Paarbereich wie das Brautpaar. Nur
          private Fotos bleiben für euch ausgeblendet.
        </p>
      </div>

      {weddings.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {weddings.map((entry) => (
            <article key={`${entry.weddingSource}-${entry.weddingSourceId}`} className="surface-card px-6 py-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-gold-700">Brautpaar</p>
                  <h3 className="mt-3 font-display text-card text-charcoal-900">{entry.coupleLabel}</h3>
                </div>
                <span
                  className={`inline-flex rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${
                    entry.billingUnlocked
                      ? 'bg-sage-100 text-sage-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {entry.billingUnlocked ? 'Freigeschaltet' : 'Wartet auf Kauf'}
                </span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.35rem] bg-cream-50 px-4 py-4 text-sm text-charcoal-700">
                  <div className="flex items-start gap-3">
                    <CalendarDays className="mt-0.5 h-4 w-4 text-gold-700" />
                    <span>{formatGermanDate(entry.weddingDate)}</span>
                  </div>
                </div>
                <div className="rounded-[1.35rem] bg-cream-50 px-4 py-4 text-sm text-charcoal-700">
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 text-gold-700" />
                    <span>{entry.venueName}</span>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-sm text-charcoal-600">
                Beim Öffnen seht ihr denselben Paarbereich wie das Brautpaar, außer private Fotos.
              </p>
              <div className="mt-5">
                <Button
                  className="w-full sm:w-auto"
                  disabled={!entry.billingUnlocked}
                  loading={pendingWeddingId === entry.weddingSourceId}
                  type="button"
                  onClick={() => void handleSelectWedding(entry)}
                >
                  Paarbereich öffnen
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="surface-card px-6 py-8 text-charcoal-600">
          Noch kein Brautpaar ist mit eurem Planner-Konto verknüpft. Sobald euch ein Paar eure
          Kundennummer in seinem Paarbereich freigibt, erscheint die Hochzeit hier.
        </div>
      )}

      {weddings.length && !unlockedWeddings.length ? (
        <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          Eure verknüpften Hochzeiten sind sichtbar, aber noch nicht freigeschaltet. Das Brautpaar muss
          seinen Kauf zuerst abschließen.
        </div>
      ) : null}
    </div>
  )
}
