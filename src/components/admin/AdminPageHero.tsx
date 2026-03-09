import { SectionHeading } from '@/components/ui/SectionHeading'

interface AdminPageHeroProps {
  title: string
  description: string
  actions?: React.ReactNode
}

export function AdminPageHero({ title, description, actions }: AdminPageHeroProps) {
  return (
    <div className="surface-card flex flex-col gap-4 px-6 py-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        <SectionHeading as="h1">{title}</SectionHeading>
        <p className="mt-4 text-charcoal-600">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  )
}
