'use client'

import { motion } from 'framer-motion'

import { useCountdown } from '@/hooks/useCountdown'
import { formatGermanDate } from '@/lib/utils/date'

export function CountdownTimer({ targetDate }: { targetDate: string }) {
  const { days, hours, minutes, seconds, isPast } = useCountdown(targetDate)

  if (isPast) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="surface-card flex items-center justify-center px-8 py-10 text-center"
      >
        <div className="space-y-3">
          <p className="text-eyebrow uppercase text-gold-600">Countdown</p>
          <p className="font-display text-2xl text-charcoal-900 sm:text-3xl">Die Hochzeit hat stattgefunden 🎉</p>
          <p className="text-body-md text-charcoal-600">Ein unvergesslicher Tag. Vielen Dank, dass ihr Teil davon seid.</p>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="surface-card px-6 py-8 sm:px-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4" role="timer" aria-label="Countdown bis zur Hochzeit" aria-live="off">
        {[
          { label: 'Tage', value: days },
          { label: 'Stunden', value: hours },
          { label: 'Minuten', value: minutes },
          { label: 'Sekunden', value: seconds },
        ].map((item) => (
          <div key={item.label} className="rounded-3xl bg-white px-4 py-5 text-center shadow-elegant">
            <div className="font-display text-metric text-charcoal-900">{item.value}</div>
            <div className="mt-2 text-xs uppercase tracking-[0.2em] text-charcoal-500">{item.label}</div>
          </div>
        ))}
      </div>
      <noscript>
        <p className="mt-4 text-sm text-charcoal-600">
          Hochzeitsdatum: {formatGermanDate(targetDate)}
        </p>
      </noscript>
    </div>
  )
}
