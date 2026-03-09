'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { LifeBuoy, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { AdminHelpAssistant } from './AdminHelpAssistant'

export function AdminHelpWidget() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  return (
    <>
      <button
        aria-controls="admin-help-widget"
        aria-expanded={isOpen}
        aria-label="Hilfe-Assistent öffnen"
        className="fixed bottom-[max(1.25rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))] right-5 z-[60] inline-flex min-h-12 items-center gap-2 rounded-full bg-gold-500 px-5 py-3 text-sm font-semibold text-charcoal-900 shadow-gold transition hover:bg-gold-400"
        type="button"
        onClick={() => setIsOpen(true)}
      >
        <LifeBuoy className="h-4 w-4" />
        Assistent
      </button>

      <AnimatePresence>
        {isOpen ? (
          <>
            <motion.button
              aria-label="Hilfe-Assistent schließen"
              className="fixed inset-0 z-[69] bg-charcoal-900/35 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              type="button"
              onClick={() => setIsOpen(false)}
            />
            <motion.aside
              id="admin-help-widget"
              aria-label="Hilfe-Assistent"
              className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))] top-[max(1rem,calc(env(safe-area-inset-top,0px)+4.5rem))] z-[70] flex flex-col overflow-hidden rounded-[2rem] border border-cream-200 bg-white shadow-elegant md:inset-x-auto md:top-auto md:bottom-6 md:right-6 md:max-h-[82vh] md:w-[min(34rem,calc(100vw-3rem))]"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-cream-200 px-5 py-5">
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-gold-700">Hilfe im Paarbereich</p>
                  <h2 className="mt-2 font-display text-card text-charcoal-900">Assistent</h2>
                  <p className="mt-2 text-sm leading-6 text-charcoal-600">
                    Hier könnt ihr direkt Fragen zu Inhalten, Tischplan, RSVP, Galerie oder Zugängen stellen.
                  </p>
                  <Link
                    className="mt-3 inline-flex text-sm font-semibold text-gold-700 hover:text-gold-800"
                    href="/admin/hilfe"
                    onClick={() => setIsOpen(false)}
                  >
                    Ganze Hilfeseite öffnen
                  </Link>
                </div>
                <button
                  aria-label="Schließen"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-cream-200 bg-cream-50 text-charcoal-800 transition hover:bg-cream-100"
                  type="button"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] md:pb-5">
                <AdminHelpAssistant />
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  )
}
