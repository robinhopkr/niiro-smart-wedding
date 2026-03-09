'use client'

import { motion } from 'framer-motion'
import { CalendarDays, Camera, MapPin } from 'lucide-react'

import { Button } from '@/components/ui/Button'
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
  const photos: CouplePhoto[] = []
  const usedUrls = new Set<string>()

  if (config.heroImageUrl) {
    photos.push({
      id: 'hero-cover',
      imageUrl: config.heroImageUrl,
      altText: `${config.coupleLabel} auf dem Titelbild`,
      caption: 'Titelbild',
    })
    usedUrls.add(config.heroImageUrl)
  }

  config.couplePhotos.forEach((photo) => {
    if (!usedUrls.has(photo.imageUrl)) {
      photos.push(photo)
      usedUrls.add(photo.imageUrl)
    }
  })

  return photos
}

export function HeroSection({ config }: { config: WeddingConfig }) {
  const heroHighlights = buildHeroHighlights(config)
  const visibleCouplePhotos = buildVisibleCouplePhotos(config)

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(212,154,29,0.18),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(100,141,92,0.2),_transparent_30%),linear-gradient(180deg,#faf3e8_0%,#fffcf7_48%,#ffffff_100%)]" />
      <div className="absolute left-[-5rem] top-12 h-56 w-56 rounded-full bg-gold-100 blur-3xl" />
      <div className="absolute right-[-4rem] top-40 h-64 w-64 rounded-full bg-sage-100 blur-3xl" />

      <div className="relative mx-auto grid min-h-[60vh] max-w-6xl gap-6 px-6 py-[clamp(3.25rem,7vw,5.5rem)] sm:px-10 lg:min-h-[68vh] lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-center">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={heroVariants}
          className="max-w-3xl space-y-8"
        >
          <motion.p variants={itemVariants} className="text-sm uppercase tracking-[0.34em] text-sage-600">
            Unsere Hochzeit
          </motion.p>

          <motion.h1 variants={itemVariants} className="font-display text-hero text-charcoal-900">
            {config.partner1Name}{' '}
            {config.partner2Name ? <span className="text-gold-500">&</span> : null}{' '}
            {config.partner2Name}
          </motion.h1>

          <motion.div variants={itemVariants} className="space-y-4">
            <p className="text-xl text-charcoal-700">{formatGermanDate(config.weddingDate)}</p>
            <p className="text-lg text-sage-600">{config.venueName}</p>
            <p className="max-w-2xl text-lg leading-8 text-charcoal-600">{config.welcomeMessage}</p>
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
              {visibleCouplePhotos.slice(0, 3).map((photo) => (
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
                      <p className="text-sm font-medium text-charcoal-700">{photo.caption}</p>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : null}

          <div className="surface-card overflow-hidden px-6 py-6">
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-sm uppercase tracking-[0.24em] text-sage-600">Auf einen Blick</p>
                <h2 className="font-display text-card text-charcoal-900">
                  Alles Wichtige für euren Tag mit uns
                </h2>
              </div>
              <p className="text-sm leading-7 text-charcoal-600">
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
                      <p className="text-xs uppercase tracking-[0.18em] text-charcoal-500">{item.title}</p>
                      <p className="text-sm font-medium leading-6 text-charcoal-800">{item.copy}</p>
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
