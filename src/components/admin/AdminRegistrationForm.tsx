'use client'

import { useRouter } from 'next/navigation'
import { startTransition, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { getBillingPricing } from '@/lib/billing/constants'
import type { ApiResponse } from '@/types/api'

import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

type RegistrationRole = 'couple' | 'planner'

interface AdminRegistrationFormProps {
  role: RegistrationRole
}

interface RegistrationResponse {
  nextUrl: string
  customerNumber?: string
  registered: true
}

export function AdminRegistrationForm({ role }: AdminRegistrationFormProps) {
  const pricing = getBillingPricing()
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isPlanner = role === 'planner'
  const labels = useMemo(
    () =>
      isPlanner
        ? {
            endpoint: '/api/admin/register-planner',
            helper:
              'Die Registrierung für Wedding Planner ist kostenlos. Nach der Registrierung bekommt ihr eure Kundennummer. Diese Nummer gibt euch das Brautpaar später in seinem Paarbereich frei. Sichtbar und bearbeitbar sind für euch nur Hochzeiten, die vom Brautpaar freigegeben und bezahlt wurden.',
            nameLabel: 'Name oder Firmenname',
            submitLabel: 'Wedding-Planer-Konto anlegen',
          }
        : {
            endpoint: '/api/admin/register-couple',
            helper:
              `Nach der Registrierung landet ihr direkt bei der Freischaltung eurer eigenen Hochzeit per Stripe. Erst danach ist der Paarbereich vollständig nutzbar. Aktuell ${pricing.activePriceLabel}${pricing.promoActive ? ` statt ${pricing.standardPriceLabel} bis ${pricing.promoDeadlineLabel}` : ''}.`,
            nameLabel: 'Name des Brautpaares',
            submitLabel: 'Brautpaar registrieren',
          },
    [isPlanner, pricing.activePriceLabel, pricing.promoActive, pricing.promoDeadlineLabel, pricing.standardPriceLabel],
  )

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      const response = await fetch(labels.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          isPlanner
            ? {
                displayName: name,
                email,
                password,
              }
            : {
                coupleLabel: name,
                email,
                password,
              },
        ),
      })

      const result = (await response.json()) as ApiResponse<RegistrationResponse>

      if (!response.ok || !result.success) {
        setErrorMessage(result.success ? 'Die Registrierung ist fehlgeschlagen.' : result.error)
        return
      }

      if (isPlanner && result.data.customerNumber) {
        toast.success(`Konto angelegt. Eure Kundennummer ist ${result.data.customerNumber}.`)
      } else {
        toast.success(result.message ?? 'Euer Konto wurde angelegt.')
      }

      const nextUrl =
        isPlanner && result.data.customerNumber
          ? `${result.data.nextUrl}?customerNumber=${encodeURIComponent(result.data.customerNumber)}`
          : result.data.nextUrl

      startTransition(() => {
        router.replace(nextUrl)
        router.refresh()
      })
    } catch {
      setErrorMessage('Die Registrierung ist gerade nicht erreichbar.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form
      className="rounded-[1.5rem] border border-cream-200 bg-cream-50/70 px-5 py-6 sm:px-6"
      noValidate
      onSubmit={handleSubmit}
    >
      <div className="space-y-4">
        <Input
          label={labels.nameLabel}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Input
          label="E-Mail"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Input
          label="Passwort"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <p className="text-sm leading-6 text-charcoal-600">{labels.helper}</p>
        {errorMessage ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}
        <Button className="w-full" loading={isSubmitting} size="lg" type="submit">
          {labels.submitLabel}
        </Button>
      </div>
    </form>
  )
}
