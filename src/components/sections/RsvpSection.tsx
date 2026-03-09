import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import type { SectionImage, WeddingConfig } from '@/types/wedding'

import { RsvpForm } from '../forms/RsvpForm'
import { SectionImageGallery } from './SectionImageGallery'

export function RsvpSection({
  config,
  images = [],
  mode = 'live',
}: {
  config: WeddingConfig
  images?: SectionImage[]
  mode?: 'demo' | 'live'
}) {
  return (
    <Section density="compact" id="rsvp" className="max-w-5xl space-y-6">
      <SectionHeading>{config.formTitle ?? 'Wir freuen uns auf eure Rückmeldung'}</SectionHeading>
      <p className="max-w-2xl text-charcoal-600">
        {config.formDescription ??
          'Bitte gebt uns bis zum Anmeldeschluss Bescheid, ob ihr dabei sein könnt. So können wir entspannt und verlässlich planen.'}
      </p>
      <SectionImageGallery images={images} className="xl:grid-cols-2" />
      <RsvpForm config={config} mode={mode} />
    </Section>
  )
}
