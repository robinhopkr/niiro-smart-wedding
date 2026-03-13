'use client'

import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { CreditCard } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { startTransition, useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import {
  getBillingPricing,
  GOOGLE_PLAY_COUPLE_ACCESS_PRODUCT_ID,
} from '@/lib/billing/constants'
import {
  GooglePlayBilling,
  isNativeAndroidPlayBillingAvailable,
} from '@/lib/mobile/google-play-billing'
import type { ApiResponse } from '@/types/api'

import { Button } from '../ui/Button'

interface BillingStatusResponse {
  access: {
    provider: 'stripe' | 'google_play' | 'legacy' | null
    requiresPayment: boolean
  }
}

export function BillingCheckoutButton() {
  const pricing = getBillingPricing()
  const router = useRouter()
  const [isStartingCheckout, setIsStartingCheckout] = useState(false)
  const [isAwaitingConfirmation, setIsAwaitingConfirmation] = useState(false)
  const [isAndroidPlayBilling, setIsAndroidPlayBilling] = useState(false)

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
        toast.success('Zahlung bestätigt. Der Login ist jetzt freigeschaltet.')
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
    setIsAndroidPlayBilling(isNativeAndroidPlayBillingAvailable())
  }, [])

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

  useEffect(() => {
    if (!isAndroidPlayBilling) {
      return
    }

    const restoreExistingPurchase = async () => {
      try {
        const result = await GooglePlayBilling.queryExistingPurchases({
          productId: GOOGLE_PLAY_COUPLE_ACCESS_PRODUCT_ID,
        })

        const purchasedEntry = result.purchases.find((purchase) => purchase.purchaseState === 'purchased')

        if (!purchasedEntry) {
          return
        }

        const syncResponse = await fetch('/api/billing/google-play', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            purchaseToken: purchasedEntry.purchaseToken,
          }),
        })

        if (!syncResponse.ok) {
          return
        }

        const syncResult = (await syncResponse.json()) as ApiResponse<{
          requiresPayment: boolean
        }>

        if (syncResult.success && !syncResult.data.requiresPayment) {
          startTransition(() => {
            router.refresh()
          })
        }
      } catch {
        // Ignore restore errors and let the user start the checkout manually.
      }
    }

    void restoreExistingPurchase()
  }, [isAndroidPlayBilling, router])

  const handleCheckout = async () => {
    setIsStartingCheckout(true)

    try {
      if (isAndroidPlayBilling) {
        const purchase = await GooglePlayBilling.purchaseCoupleAccess({
          productId: GOOGLE_PLAY_COUPLE_ACCESS_PRODUCT_ID,
        })

        if (purchase.purchaseState === 'pending') {
          toast.message('Google Play verarbeitet den Kauf noch. Wir prüfen die Freischaltung gleich erneut.')
          setIsAwaitingConfirmation(true)
          return
        }

        const syncResponse = await fetch('/api/billing/google-play', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            purchaseToken: purchase.purchaseToken,
          }),
        })

        const syncResult = (await syncResponse.json()) as ApiResponse<{
          acknowledgedAt: string | null
          provider: 'google_play'
          requiresPayment: boolean
        }>

        if (!syncResponse.ok || !syncResult.success) {
          toast.error(syncResult.success ? 'Der Google-Play-Kauf konnte nicht freigeschaltet werden.' : syncResult.error)
          return
        }

        if (syncResult.data.requiresPayment) {
          setIsAwaitingConfirmation(true)
          toast.message('Der Kauf ist erfasst. Wir prüfen die Freischaltung jetzt automatisch.')
          return
        }

        toast.success('Zahlung bestätigt. Der Paarbereich ist jetzt freigeschaltet.')
        startTransition(() => {
          router.refresh()
        })
        return
      }

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
        {isAndroidPlayBilling
          ? `Über Google Play für ${pricing.activePriceLabel} freischalten`
          : `Jetzt für ${pricing.activePriceLabel} freischalten`}
      </Button>
      {isAwaitingConfirmation ? (
        <p className="text-sm text-charcoal-600">
          Wenn die Zahlung abgeschlossen ist, wird der Zugang automatisch freigeschaltet.
        </p>
      ) : null}
      {isAndroidPlayBilling ? (
        <p className="text-sm text-charcoal-600">
          In der Android-App läuft die Freischaltung über Google Play.
        </p>
      ) : null}
    </div>
  )
}
