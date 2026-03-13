import { ArrowLeft } from 'lucide-react'

import type { AdminSessionRole } from '@/lib/auth/admin-session'

import { ActionLink } from '../ui/ActionLink'

interface AdminReturnBarProps {
  sessionRole: AdminSessionRole
}

const CONTENT_BY_ROLE: Record<
  AdminSessionRole,
  {
    href: string
    eyebrow: string
    description: string
    label: string
  }
> = {
  couple: {
    href: '/admin/uebersicht',
    eyebrow: 'Brautpaar',
    description: 'Ihr seid eingeloggt und könnt jederzeit zurück in euren Paarbereich wechseln.',
    label: 'Zurück zum Paarbereich',
  },
  planner: {
    href: '/admin/hochzeiten',
    eyebrow: 'Wedding Planner',
    description: 'Ihr seid eingeloggt und könnt jederzeit zurück in eure Hochzeitsübersicht wechseln.',
    label: 'Zurück zum Wedding-Planer-Bereich',
  },
}

export function AdminReturnBar({ sessionRole }: AdminReturnBarProps) {
  const content = CONTENT_BY_ROLE[sessionRole]

  return (
    <div className="border-b border-cream-200 bg-white/88 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-4 sm:px-10 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sage-700">
            {content.eyebrow}
          </p>
          <p className="mt-1 text-sm text-charcoal-700">{content.description}</p>
        </div>
        <ActionLink className="shrink-0 whitespace-nowrap" href={content.href} size="sm" variant="secondary">
          <ArrowLeft className="h-4 w-4" />
          {content.label}
        </ActionLink>
      </div>
    </div>
  )
}
