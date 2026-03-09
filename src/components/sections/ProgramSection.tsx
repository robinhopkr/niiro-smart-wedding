'use client'

import { motion } from 'framer-motion'

import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { PROGRAM_ICON_COMPONENTS, resolveProgramIconName } from '@/lib/program-icons'
import { Skeleton } from '@/components/ui/Skeleton'
import { normalizeProgramTimeLabel, sortProgramItemsChronologically } from '@/lib/utils/time'
import type { ProgramItem, SectionImage } from '@/types/wedding'

import { SectionImageGallery } from './SectionImageGallery'

export function ProgramSection({
  items,
  images = [],
  loading = false,
}: {
  items: ProgramItem[]
  images?: SectionImage[]
  loading?: boolean
}) {
  const sortedItems = sortProgramItemsChronologically(items)

  if (loading) {
    return (
      <Section density="compact" id="programm" className="space-y-6">
        <SectionHeading>Programm</SectionHeading>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={`program-skeleton-${index}`} className="h-28 w-full" />
          ))}
        </div>
      </Section>
    )
  }

  return (
    <Section density="compact" id="programm" className="space-y-6">
      <SectionHeading>Ablauf des Tages</SectionHeading>
      <SectionImageGallery images={images} />
      {sortedItems.length ? (
        <div className="relative space-y-6 before:absolute before:left-5 before:top-3 before:h-[calc(100%-1.5rem)] before:w-px before:bg-gold-200">
          {sortedItems.map((item) => {
            const Icon = PROGRAM_ICON_COMPONENTS[
              resolveProgramIconName({
                icon: item.icon,
                title: item.title,
                description: item.description,
              })
            ]

            return (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                className="relative ml-0 grid gap-4 rounded-elegant bg-white p-6 shadow-elegant sm:grid-cols-[120px_1fr]"
              >
                <div className="relative flex items-center gap-3">
                  <span className="relative z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-gold-100 text-gold-700">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="font-mono text-sm text-charcoal-600">
                    {normalizeProgramTimeLabel(item.timeLabel) || '00:00'}
                  </span>
                </div>
                <div>
                  <h3 className="font-display text-card text-charcoal-900">{item.title}</h3>
                  {item.description ? <p className="mt-2 text-charcoal-600">{item.description}</p> : null}
                </div>
              </motion.article>
            )
          })}
        </div>
      ) : (
        <p className="surface-card px-6 py-6 text-charcoal-600">
          Den genauen Ablauf teilen wir bald mit euch.
        </p>
      )}
    </Section>
  )
}
