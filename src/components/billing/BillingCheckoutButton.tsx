'use client'

import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { CreditCard } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { startTransition, useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { BILLING_PRICE_LABEL } from '@/lib/billing/constants'
import type { ApiResponse } from '@/types/api'

import { Button } from '../ui/Button'

interface BillingStatusResponse {
  access: {
    requiresPayment: boolean
  }
}

export function BillingCheckoutButton() {
  const router = useRouter()
  const [isStartingCheckout, setIsStartingCheckout] = useState(false)
  const [isAwaitingConfirmation, setIsAwaitingConfirmation] = useState(false)

  const checkBillingStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/billing/status', {
        cache: 'no-store',
      })

      if (!response.ok) {
        return
      }

      const result = (await response.json()) as ApiResponse<BillingStatusResponse>

      if (result.success && !result.data.access.requiresPayment) {
        toast.success('Zahlung bestaetigt. Der Login ist jetzt freigeschaltet.')
        setIsAwaitingConfirmation(false)
        startTransition(() => {
          router.refresh()
        })
      }
    } catch {
      // Ignore transient polling failures while Stripe is redirecting back.
    }
  }, [router])

  useEffect(() => {
    if (!isAwaitingConfirmation) {
      return
    }

    const intervalId = window.setInterval(() => {
      void checkBillingStatus()
    }, 5000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [checkBillingStatus, isAwaitingConfirmation])

  useEffect(() => {
    if (!isAwaitingConfirmation) {
      return
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void checkBillingStatus()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [checkBillingStatus, isAwaitingConfirmation])

  useEffect(() => {
    if (!isAwaitingConfirmation || !Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('App')) {
      return
    }

    const listenerPromise = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        void checkBillingStatus()
      }
    })

    return () => {
      void listenerPromise.then((listener) => listener.remove())
    }
  }, [checkBillingStatus, isAwaitingConfirmation])

  const handleCheckout = async () => {
    setIsStartingCheckout(true)

    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
      })

      const result = (await response.json()) as ApiResponse<{ url: string }>

      if (!response.ok || !result.success) {
        toast.error(result.success ? 'Der Checkout konnte nicht gestartet werden.' : result.error)
        return
      }

      setIsAwaitingConfirmation(true)

      if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Browser')) {
        await Browser.open({ url: result.data.url })
        return
      }

      window.location.assign(result.data.url)
    } catch {
      toast.error('Der Stripe-Checkout ist gerade nicht erreichbar.')
    } finally {
      setIsStartingCheckout(false)
    }
  }

  return (
    <div className="space-y-3">
      <Button className="w-full sm:w-auto" loading={isStartingCheckout} size="lg" type="button" onClick={() => void handleCheckout()}>
        <CreditCard className="h-4 w-4" />
        Jetzt fuer {BILLING_PRICE_LABEL} freischalten
      </Button>
      {isAwaitingConfirmation ? (
        <p className="text-sm text-charcoal-600">
          Wenn die Zahlung abgeschlossen ist, wird der Zugang automatisch freigeschaltet.
        </p>
      ) : null}
    </div>
  )
}
