'use client'

import { Controller } from 'react-hook-form'

import { MENU_CHOICES } from '@/lib/constants'
import { useRsvpForm } from '@/hooks/useRsvpForm'
import type { WeddingConfig } from '@/types/wedding'

import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { RadioGroup } from '../ui/RadioGroup'
import { Textarea } from '../ui/Textarea'
import { MenuSelect } from './MenuSelect'
import { RsvpSuccess } from './RsvpSuccess'

export function RsvpForm({
  config,
  mode = 'live',
}: {
  config: WeddingConfig
  mode?: 'demo' | 'live'
}) {
  const { form, step, isAttending, plusOne, submissionState, submitError, submittedName, nextStep, previousStep, submit } =
    useRsvpForm(mode)
  const {
    register,
    control,
    formState: { errors },
  } = form

  if (submissionState === 'success') {
    return (
      <RsvpSuccess
        config={config}
        guestName={submittedName}
        isAttending={form.getValues('isAttending') === 'yes'}
      />
    )
  }

  return (
    <form className="surface-card space-y-8 px-6 py-8 sm:px-10" noValidate onSubmit={submit}>
      <input type="text" tabIndex={-1} aria-hidden="true" className="hidden" {...register('honeypot')} />

      {step === 1 ? (
        <div className="space-y-5">
          <Input label="Vollständiger Name" error={errors.guestName?.message} {...register('guestName')} />
          <Input
            label="E-Mail-Adresse (optional)"
            error={errors.guestEmail?.message}
            inputMode="email"
            placeholder="name@example.com"
            type="email"
            {...register('guestEmail')}
          />
          <Controller
            control={control}
            name="isAttending"
            render={({ field }) => (
              <RadioGroup
                label="Kannst du teilnehmen?"
                name={field.name}
                options={[
                  { value: 'yes', label: 'Ja, ich bin dabei' },
                  { value: 'no', label: 'Leider nein' },
                ]}
                value={field.value}
                error={errors.isAttending?.message}
                onChange={field.onChange}
              />
            )}
          />
        </div>
      ) : null}

      {step === 2 && isAttending === 'yes' ? (
        <div className="space-y-5">
          <label className="flex items-center gap-3 rounded-3xl border border-cream-300 bg-white px-4 py-4 text-sm font-medium text-charcoal-700">
            <input type="checkbox" {...register('plusOne')} />
            Ich bringe eine Begleitperson mit
          </label>
          {plusOne ? (
            <Input label="Name der Begleitperson" error={errors.plusOneName?.message} {...register('plusOneName')} />
          ) : null}
          <Input
            label="Mit wie vielen Personen kommst du insgesamt?"
            error={errors.totalGuests?.message}
            inputMode="numeric"
            min={1}
            max={10}
            type="number"
            {...register('totalGuests', { valueAsNumber: true })}
          />
          <Controller
            control={control}
            name="menuChoices"
            render={({ field }) => (
              <MenuSelect
                label="Welche Essensvarianten sollen für eure Gruppe eingeplant werden?"
                options={MENU_CHOICES}
                value={field.value}
                error={errors.menuChoices?.message}
                helperText="Bei Buffet dient diese Auswahl nur der Planung. Bitte markiert einfach alle Varianten, die in eurer Gruppe gebraucht werden."
                onChange={field.onChange}
              />
            )}
          />
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-5">
          <Textarea
            label="Ernährungswünsche oder Allergien"
            error={errors.dietaryNotes?.message}
            {...register('dietaryNotes')}
          />
          <Textarea
            label="Nachricht an das Brautpaar"
            error={errors.message?.message}
            {...register('message')}
          />
          {submitError ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
              {submitError}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {step > 1 ? (
          <Button type="button" variant="ghost" onClick={previousStep}>
            Zurück
          </Button>
        ) : null}
        {step < 3 ? (
          <Button type="button" onClick={nextStep}>
            Weiter
          </Button>
        ) : (
          <Button loading={submissionState === 'submitting'} type="submit">
            {submissionState === 'submitting'
              ? 'Wird gesendet...'
              : mode === 'demo'
                ? 'Demo-Rueckmeldung testen'
                : 'Antwort absenden'}
          </Button>
        )}
      </div>
    </form>
  )
}
