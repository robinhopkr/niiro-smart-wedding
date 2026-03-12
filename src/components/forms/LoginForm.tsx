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
    const url = new URL(value, 'https://smartwedding.local')
    if (url.origin !== 'https://smartwedding.local' || !url.pathname.startsWith('/')) {
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
  className?: string
  embedded?: boolean
}

export function LoginForm({
  role = 'couple',
  submitLabel = 'Anmelden',
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

  async function login(values: LoginSchema) {
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

    const result = (await response.json()) as ApiResponse<{ authenticated: true; nextUrl: string }>

    if (!response.ok || !result.success) {
      setErrorMessage(result.success ? 'Der Login ist fehlgeschlagen.' : result.error)
      return
    }

    const serverNextUrl = normalizeReturnUrl(result.data.nextUrl)
    const returnUrl = normalizeReturnUrl(serverNextUrl || searchParams.get('returnUrl'))
    startTransition(() => {
      router.replace(returnUrl)
      router.refresh()
    })
  }

  const onSubmit = handleSubmit(async (values) => {
    await login(values)
  })

  return (
    <form
      className={cn(
        'mx-auto w-full max-w-lg space-y-5',
        embedded ? 'px-0 py-1' : 'surface-card px-6 py-8 sm:px-10',
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
      <Button className="w-full sm:w-auto" loading={isSubmitting} size="lg" type="submit">
        {submitLabel}
      </Button>
    </form>
  )
}
