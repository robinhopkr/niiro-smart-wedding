'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { startTransition, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

import { loginSchema, type LoginSchema } from '@/lib/validations/admin.schema'
import { cn } from '@/lib/utils/cn'
import type { ApiResponse } from '@/types/api'

import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

const DEFAULT_RETURN_URL = '/admin/uebersicht'

function normalizeReturnUrl(value: string | null | undefined): string {
  if (!value) {
    return DEFAULT_RETURN_URL
  }

  try {
    const url = new URL(value, 'https://mywed.local')
    if (url.origin !== 'https://mywed.local' || !url.pathname.startsWith('/')) {
      return DEFAULT_RETURN_URL
    }
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return DEFAULT_RETURN_URL
  }
}

interface LoginFormProps {
  role?: 'couple' | 'planner'
  submitLabel?: string
  secondarySubmitLabel?: string
  secondaryReturnUrl?: string
  className?: string
  embedded?: boolean
}

export function LoginForm({
  role = 'couple',
  submitLabel = 'Anmelden',
  secondarySubmitLabel,
  secondaryReturnUrl,
  className,
  embedded = false,
}: LoginFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      role,
      email: '',
      password: '',
    },
  })

  useEffect(() => {
    setValue('role', role, { shouldDirty: false, shouldValidate: false })
  }, [role, setValue])

  async function login(values: LoginSchema, returnUrlOverride?: string) {
    setErrorMessage(null)

    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...values,
        role,
      }),
    })

    const result = (await response.json()) as ApiResponse<{ authenticated: true }>

    if (!response.ok || !result.success) {
      setErrorMessage(result.success ? 'Der Login ist fehlgeschlagen.' : result.error)
      return
    }

    const returnUrl = normalizeReturnUrl(returnUrlOverride || searchParams.get('returnUrl'))
    startTransition(() => {
      router.replace(returnUrl)
      router.refresh()
    })
  }

  const onSubmit = handleSubmit(async (values) => {
    await login(values)
  })

  function handleSecondarySubmit() {
    if (!secondaryReturnUrl) {
      return
    }

    void handleSubmit(async (values) => {
      await login(values, secondaryReturnUrl)
    })()
  }

  return (
    <form
      className={cn(
        'mx-auto w-full max-w-lg space-y-5 px-6 py-8 sm:px-10',
        embedded ? 'rounded-[1.5rem] border border-cream-200 bg-cream-50/70 px-5 py-6 sm:px-6' : 'surface-card',
        className,
      )}
      noValidate
      onSubmit={onSubmit}
    >
      <input type="hidden" {...register('role')} />
      <Input label="E-Mail" error={errors.email?.message} type="email" {...register('email')} />
      <Input label="Passwort" error={errors.password?.message} type="password" {...register('password')} />
      {errorMessage ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}
      {secondarySubmitLabel && secondaryReturnUrl ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Button className="w-full" loading={isSubmitting} size="lg" type="submit">
            {submitLabel}
          </Button>
          <Button
            className="w-full"
            disabled={isSubmitting}
            size="lg"
            type="button"
            variant="secondary"
            onClick={handleSecondarySubmit}
          >
            {secondarySubmitLabel}
          </Button>
        </div>
      ) : (
        <Button className="w-full" loading={isSubmitting} size="lg" type="submit">
          {submitLabel}
        </Button>
      )}
    </form>
  )
}
