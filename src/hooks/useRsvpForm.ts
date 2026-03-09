'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useState } from 'react'

import { rsvpSchema, type RsvpSchema } from '@/lib/validations/rsvp.schema'
import type { ApiResponse, RsvpSubmitResponse } from '@/types/api'

type Step = 1 | 2 | 3
type SubmissionState = 'idle' | 'submitting' | 'success' | 'error'

export function useRsvpForm(mode: 'demo' | 'live' = 'live') {
  const form = useForm<RsvpSchema>({
    resolver: zodResolver(rsvpSchema),
    defaultValues: {
      guestName: '',
      guestEmail: '',
      isAttending: 'yes',
      plusOne: false,
      plusOneName: '',
      totalGuests: 1,
      menuChoices: [],
      dietaryNotes: '',
      message: '',
      honeypot: '',
    },
  })

  const [step, setStep] = useState<Step>(1)
  const [submissionState, setSubmissionState] = useState<SubmissionState>('idle')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submittedName, setSubmittedName] = useState<string>('')

  const isAttending = form.watch('isAttending')
  const plusOne = form.watch('plusOne')

  async function nextStep() {
    if (step === 1) {
      const valid = await form.trigger(['guestName', 'guestEmail', 'isAttending'])
      if (!valid) {
        return
      }

      if (form.getValues('isAttending') === 'no') {
        setStep(3)
        return
      }

      setStep(2)
      return
    }

    if (step === 2) {
      const valid = await form.trigger(['plusOne', 'plusOneName', 'totalGuests', 'menuChoices'])
      if (!valid) {
        return
      }

      setStep(3)
    }
  }

  function previousStep() {
    setStep((current) => {
      if (current === 3 && isAttending === 'no') {
        return 1
      }

      return Math.max(1, current - 1) as Step
    })
  }

  const submit = form.handleSubmit(async (values) => {
    setSubmissionState('submitting')
    setSubmitError(null)

    if (mode === 'demo') {
      window.setTimeout(() => {
        setSubmittedName(values.guestName)
        setSubmissionState('success')
      }, 450)
      return
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 10_000)

    try {
      const response = await fetch('/api/rsvp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
        signal: controller.signal,
      })

      const result = (await response.json()) as ApiResponse<RsvpSubmitResponse>

      if (!response.ok || !result.success) {
        setSubmissionState('error')
        setSubmitError(
          result.success ? 'Deine Antwort konnte gerade nicht gesendet werden.' : result.error,
        )
        return
      }

      setSubmittedName(values.guestName)
      setSubmissionState('success')
    } catch (error) {
      setSubmissionState('error')
      setSubmitError(
        error instanceof Error && error.name === 'AbortError'
          ? 'Das Senden hat zu lange gedauert. Bitte versuche es noch einmal.'
          : 'Es gab ein Netzwerkproblem. Bitte versuche es noch einmal.',
      )
    } finally {
      window.clearTimeout(timeout)
    }
  })

  return {
    form,
    step,
    isAttending,
    plusOne,
    submissionState,
    submitError,
    submittedName,
    nextStep,
    previousStep,
    submit,
  }
}
