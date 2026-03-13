'use client'

import { useRouter } from 'next/navigation'
import { startTransition, useState } from 'react'
import { toast } from 'sonner'

import type { ApiResponse } from '@/types/api'

import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

interface PlannerAccessCardProps {
  currentCustomerNumber: string
  linkedPlannerName: string | null
}

interface PlannerAccessResponse {
  customerNumber: string | null
  linkedPlannerName: string | null
}

export function PlannerAccessCard({
  currentCustomerNumber,
  linkedPlannerName,
}: PlannerAccessCardProps) {
  const router = useRouter()
  const normalizedCurrentCustomerNumber = currentCustomerNumber.trim().toUpperCase()
  const [customerNumber, setCustomerNumber] = useState(currentCustomerNumber)
  const [privacyConsentConfirmed, setPrivacyConsentConfirmed] = useState(Boolean(currentCustomerNumber))
  const [pending, setPending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  function handleCustomerNumberChange(value: string) {
    const nextCustomerNumber = value.toUpperCase()
    const normalizedNextCustomerNumber = nextCustomerNumber.trim()

    setCustomerNumber(nextCustomerNumber)
    setPrivacyConsentConfirmed(
      Boolean(normalizedNextCustomerNumber) &&
        normalizedNextCustomerNumber === normalizedCurrentCustomerNumber,
    )
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setPending(true)

    try {
      const response = await fetch('/api/admin/planner-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerNumber,
          privacyConsentConfirmed,
        }),
      })

      const result = (await response.json()) as ApiResponse<PlannerAccessResponse>

      if (!response.ok || !result.success) {
        setErrorMessage(result.success ? 'Die Verknüpfung konnte nicht gespeichert werden.' : result.error)
        return
      }

      toast.success(result.message ?? 'Der Wedding Planner wurde aktualisiert.')
      startTransition(() => {
        router.refresh()
      })
    } catch {
      setErrorMessage('Die Wedding-Planer-Verknüpfung ist gerade nicht erreichbar.')
    } finally {
      setPending(false)
    }
  }

  return (
    <article className="surface-card px-6 py-6">
      <p className="text-sm uppercase tracking-[0.18em] text-sage-700">Wedding Planner</p>
      <h2 className="mt-3 font-display text-card text-charcoal-900">Wedding Planner verknüpfen</h2>
      <p className="mt-3 text-charcoal-600">
        Gebt hier die Kundennummer eures Wedding Planners ein. Danach sieht der Planner diese Hochzeit
        in seiner Auswahl und erhält Zugriff auf alle Bereiche außer auf private Fotos.
      </p>
      <div className="mt-4 rounded-[1.35rem] border border-gold-200 bg-gold-50/80 px-4 py-4 text-sm leading-7 text-charcoal-700">
        <p className="font-semibold text-charcoal-900">Wichtiger Datenschutzhinweis</p>
        <p className="mt-2">
          Wenn ihr einen Wedding Planner per Kundennummer verknüpft, erhält dieser Zugriff auf die in
          NiiRo Smart Wedding gespeicherten personenbezogenen Daten und Planungsinhalte eurer Hochzeit.
          Dazu können insbesondere Angaben des Brautpaars, Gästelisten, RSVP-Antworten,
          Ernährungsangaben, Tischplanung sowie organisatorische Hinweise gehören. Ausgenommen bleibt
          nur der private Fotobereich.
        </p>
        <p className="mt-2">
          Mit der Verknüpfung bestätigt ihr, dass ihr zur Freigabe des Wedding Planners berechtigt seid
          und dass die betroffenen Gäste über diese Einbindung informiert wurden bzw. die hierfür
          erforderlichen Einwilligungen oder sonstigen datenschutzrechtlichen Voraussetzungen vorliegen,
          soweit dies im Einzelfall notwendig ist.
        </p>
      </div>
      {linkedPlannerName ? (
        <div className="mt-4 rounded-[1.35rem] bg-cream-50 px-4 py-4 text-sm text-charcoal-700">
          Aktuell verknüpft mit <span className="font-semibold text-charcoal-900">{linkedPlannerName}</span>
          {currentCustomerNumber ? ` (${currentCustomerNumber})` : ''}.
        </div>
      ) : null}
      <form className="mt-5 space-y-4" noValidate onSubmit={handleSubmit}>
        <Input
          label="Kundennummer des Wedding Planners"
          helperText="Leer lassen, wenn kein Planner verknüpft werden soll."
          value={customerNumber}
          onChange={(event) => handleCustomerNumberChange(event.target.value)}
        />
        {customerNumber ? (
          <label className="flex items-start gap-3 rounded-[1.35rem] border border-cream-200 bg-white/80 px-4 py-4 text-sm leading-7 text-charcoal-700">
            <input
              checked={privacyConsentConfirmed}
              className="mt-1 h-4 w-4 shrink-0 rounded border-cream-300 text-gold-500 focus:ring-gold-400"
              type="checkbox"
              onChange={(event) => setPrivacyConsentConfirmed(event.target.checked)}
            />
            <span>
              Ich bestätige, dass wir die Freigabe für den Wedding Planner datenschutzrechtlich
              verantworten dürfen und dass die hierfür erforderlichen Informationen oder Einwilligungen
              der betroffenen Gäste vorliegen, soweit dies notwendig ist.
            </span>
          </label>
        ) : null}
        {errorMessage ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}
        <Button loading={pending} type="submit">
          Wedding Planner speichern
        </Button>
      </form>
    </article>
  )
}
