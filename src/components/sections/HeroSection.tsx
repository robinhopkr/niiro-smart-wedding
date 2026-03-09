'use client'

import { motion } from 'framer-motion'
import { CalendarDays, Camera, MapPin } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'
import { formatGermanDate } from '@/lib/utils/date'
import type { CouplePhoto, WeddingConfig } from '@/types/wedding'

import { WeddingInfoBadges } from './WeddingInfoBadges'

const heroVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
} as const

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
} as const

function buildHeroHighlights(config: WeddingConfig) {
  return [
    {
      title: 'Veranstaltungsort',
      copy: config.venueAddress,
      icon: MapPin,
    },
    {
      title: 'Rückmeldung',
      copy: `Bitte bis ${formatGermanDate(config.rsvpDeadline)}`,
      icon: CalendarDays,
    },
    {
      title: 'Fotogalerie',
      copy: config.guestCode
        ? 'Nach der Hochzeit findet ihr eure Erinnerungen gesammelt in der Galerie.'
        : 'Nach der Hochzeit teilen wir hier die schönsten Erinnerungen an unseren Tag.',
      icon: Camera,
    },
  ]
}

function buildVisibleCouplePhotos(config: WeddingConfig): CouplePhoto[] {
  const heroImageUrl = config.heroImageUrl?.trim()

  return config.couplePhotos.filter((photo) => photo.imageUrl !== heroImageUrl)
}

export function HeroSection({ config }: { config: WeddingConfig }) {
  const heroHighlights = buildHeroHighlights(config)
  const heroCoverImage = config.heroImageUrl?.trim() || null
  const visibleCouplePhotos = buildVisibleCouplePhotos(config)

  return (
    <section className="relative overflow-hidden">
      <div className="wedding-hero-backdrop absolute inset-0" />
      <div className="wedding-hero-orb-left absolute left-[-5rem] top-12 h-56 w-56 rounded-full blur-3xl" />
      <div className="wedding-hero-orb-right absolute right-[-4rem] top-40 h-64 w-64 rounded-full blur-3xl" />

      {heroCoverImage ? (
        <div className="relative mx-auto max-w-[120rem] px-3 pt-3 sm:px-6 sm:pt-5 lg:px-8">
          <div className="overflow-hidden rounded-[2.3rem] border border-white/65 bg-white/45 shadow-elegant">
            <div className="relative h-[clamp(16rem,34vw,33rem)] w-full bg-white/45 px-4 py-4 sm:px-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full scale-105 object-cover object-center opacity-20 blur-2xl"
                loading="eager"
                src={heroCoverImage}
              />
              <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/55 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent via-cream-50/60 to-cream-50" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={`${config.coupleLabel} Titelmotiv`}
                className="relative h-full w-full object-cover object-center"
                decoding="async"
                fetchPriority="high"
                loading="eager"
                src={heroCoverImage}
              />
            </div>
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          'relative mx-auto grid max-w-6xl gap-6 px-6 sm:px-10 lg:grid-cols-[minmax(0,1fr)_22rem]',
          heroCoverImage
            ? 'pt-6 pb-[clamp(3.25rem,6vw,5.5rem)] sm:pt-8 lg:-mt-16 lg:pt-0 lg:items-start'
            : 'min-h-[60vh] py-[clamp(3.25rem,7vw,5.5rem)] lg:min-h-[68vh] lg:items-center',
        )}
      >
        <motion.div
          initial="hidden"
          animate="visible"
          variants={heroVariants}
          className="max-w-3xl space-y-8"
        >
          <motion.p variants={itemVariants} className="text-eyebrow uppercase text-sage-600">
            Unsere Hochzeit
          </motion.p>

          <motion.h1 variants={itemVariants} className="font-display text-hero text-charcoal-900">
            {config.partner1Name}{' '}
            {config.partner2Name ? <span className="text-gold-500">&</span> : null}{' '}
            {config.partner2Name}
          </motion.h1>

          <motion.div variants={itemVariants} className="space-y-4">
            <p className="text-body-lg font-medium text-charcoal-700">{formatGermanDate(config.weddingDate)}</p>
            <p className="text-base font-medium text-sage-700 sm:text-lg">{config.venueName}</p>
            <p className="max-w-2xl text-body-lg text-charcoal-600">{config.welcomeMessage}</p>
          </motion.div>

          <motion.div variants={itemVariants} className="flex flex-wrap gap-3">
            <Button
              size="lg"
              onClick={() => document.getElementById('rsvp')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Jetzt Rückmeldung geben
            </Button>
          </motion.div>

          <motion.div variants={itemVariants}>
            <WeddingInfoBadges config={config} />
          </motion.div>
        </motion.div>

        <motion.aside
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="space-y-4"
        >
          {visibleCouplePhotos.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {visibleCouplePhotos.slice(0, heroCoverImage ? 2 : 3).map((photo) => (
                <article key={photo.id} className="surface-card overflow-hidden">
                  <div className="aspect-[4/5] w-full overflow-hidden bg-cream-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={photo.altText ?? `${config.coupleLabel} auf einem Foto`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      src={photo.imageUrl}
                    />
                  </div>
                  {photo.caption ? (
                    <div className="px-5 py-4">
                      <p className="text-sm leading-6 text-charcoal-700">{photo.caption}</p>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : null}

          <div className="surface-card overflow-hidden px-6 py-6">
              <div className="space-y-5">
                <div className="space-y-2">
                  <p className="text-eyebrow uppercase text-sage-600">Auf einen Blick</p>
                  <h2 className="font-display text-card text-charcoal-900">
                    Alles Wichtige für euren Tag mit uns
                  </h2>
                </div>
              <p className="text-body-md text-charcoal-600">
                Hier findet ihr die wichtigsten Informationen direkt gesammelt. Weiter unten könnt ihr
                eure Rückmeldung senden und alle Details noch einmal in Ruhe nachlesen.
              </p>
            </div>

            <div className="mt-6 grid gap-4">
              {heroHighlights.map((item) => (
                <article
                  key={item.title}
                  className="rounded-[1.35rem] border border-cream-200 bg-white/90 px-4 py-4 shadow-elegant"
                >
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream-100 text-gold-700">
                      <item.icon className="h-4 w-4" />
                    </span>
                    <div className="space-y-1">
                      <p className="text-[0.72rem] uppercase tracking-[0.18em] text-charcoal-500">{item.title}</p>
                      <p className="text-[0.97rem] font-medium leading-7 text-charcoal-800">{item.copy}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </motion.aside>
      </div>
    </section>
  )
}
