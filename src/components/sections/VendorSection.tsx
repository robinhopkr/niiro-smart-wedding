import { Globe, Instagram } from 'lucide-react'

import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { cn } from '@/lib/utils/cn'
import type { VendorProfile } from '@/types/wedding'

interface VendorSectionProps {
  vendors: VendorProfile[]
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function actionClassName(): string {
  return 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-gold-300 bg-white px-4 py-3 text-sm font-semibold text-charcoal-800 transition hover:border-gold-500 hover:text-charcoal-900'
}

export function VendorSection({ vendors }: VendorSectionProps) {
  if (!vendors.length) {
    return null
  }

  return (
    <Section id="dienstleister" className="space-y-6" density="compact">
      <div className="max-w-3xl">
        <SectionHeading>Dienstleister</SectionHeading>
        <p className="mt-4 text-charcoal-600">
          Diese Menschen begleiten unseren Tag mit Herz, Kreativität und viel Erfahrung. Wenn ihr
          neugierig seid, findet ihr hier ihre Seiten und Profile.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {vendors.map((vendor) => (
          <article key={vendor.id} className="surface-card overflow-hidden">
            <div className="aspect-[4/3] bg-cream-100">
              {vendor.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={`${vendor.name} Profilbild`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  src={vendor.imageUrl}
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(212,175,55,0.24),_transparent_55%),linear-gradient(180deg,_rgba(255,255,255,0.95),_rgba(244,238,229,0.92))]">
                  <span className="font-display text-5xl text-gold-600">{getInitials(vendor.name)}</span>
                </div>
              )}
            </div>

            <div className="space-y-5 px-6 py-6">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.22em] text-gold-700">{vendor.role}</p>
                <h3 className="font-display text-card text-charcoal-900">{vendor.name}</h3>
              </div>

              <div className={cn('flex flex-wrap gap-3', !vendor.websiteUrl && !vendor.instagramUrl && 'pt-1')}>
                {vendor.websiteUrl ? (
                  <a className={actionClassName()} href={vendor.websiteUrl} rel="noopener noreferrer" target="_blank">
                    <Globe className="h-4 w-4" />
                    Website
                  </a>
                ) : null}
                {vendor.instagramUrl ? (
                  <a
                    className={actionClassName()}
                    href={vendor.instagramUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <Instagram className="h-4 w-4" />
                    Instagram
                  </a>
                ) : null}
                {!vendor.websiteUrl && !vendor.instagramUrl ? (
                  <p className="text-sm text-charcoal-500">
                    Für diesen Dienstleister wurden noch keine öffentlichen Links hinterlegt.
                  </p>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </Section>
  )
}
