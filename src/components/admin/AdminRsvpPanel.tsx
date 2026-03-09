'use client'

import { RefreshCcw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { RsvpStats } from '@/components/admin/RsvpStats'
import { RsvpTable } from '@/components/admin/RsvpTable'
import { Button } from '@/components/ui/Button'
import { formatGermanDateTime } from '@/lib/utils/date'
import type { ApiResponse } from '@/types/api'
import type { AdminSummary, RsvpRecord } from '@/types/wedding'

interface AdminRsvpPanelProps {
  initialRsvps: RsvpRecord[]
}

function buildSummary(rsvps: RsvpRecord[]): AdminSummary {
  return rsvps.reduce<AdminSummary>(
    (summary, entry) => {
      summary.total += 1

      if (entry.isAttending) {
        summary.attending += 1
        summary.guestCount += entry.totalGuests
      } else {
        summary.declined += 1
      }

      return summary
    },
    {
      total: 0,
      attending: 0,
      declined: 0,
      guestCount: 0,
    },
  )
}

export function AdminRsvpPanel({ initialRsvps }: AdminRsvpPanelProps) {
  const [rsvps, setRsvps] = useState(initialRsvps)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(() => new Date())

  const summary = useMemo(() => buildSummary(rsvps), [rsvps])

  async function refreshRsvps(silent = false) {
    if (!silent) {
      setIsRefreshing(true)
    }

    try {
      const response = await fetch('/api/admin/rsvps', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-store',
        },
      })

      const result = (await response.json()) as ApiResponse<RsvpRecord[]>
      if (!response.ok || !result.success) {
        return
      }

      setRsvps(result.data)
      setLastUpdated(new Date())
    } finally {
      if (!silent) {
        setIsRefreshing(false)
      }
    }
  }

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshRsvps(true)
    }, 20_000)

    const handleFocus = () => {
      void refreshRsvps(true)
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshRsvps(true)
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-charcoal-600">
          Neue Rückmeldungen erscheinen hier automatisch.
          <span className="ml-2 text-charcoal-500">
            Letzte Aktualisierung: {formatGermanDateTime(lastUpdated)}
          </span>
        </p>
        <Button loading={isRefreshing} type="button" variant="secondary" onClick={() => void refreshRsvps()}>
          {!isRefreshing ? <RefreshCcw className="h-4 w-4" /> : null}
          Jetzt aktualisieren
        </Button>
      </div>

      <RsvpStats summary={summary} />
      <RsvpTable rsvps={rsvps} />
    </div>
  )
}
