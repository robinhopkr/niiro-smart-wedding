import { AdminPageHero } from '@/components/admin/AdminPageHero'
import { AdminHelpAssistant } from '@/components/admin/AdminHelpAssistant'
import { ADMIN_HELP_KNOWLEDGE_SECTIONS } from '@/lib/admin-help/knowledge'

export default function AdminHelpPage() {
  return (
    <div className="space-y-6">
      <AdminPageHero
        title="Hilfe und Assistent"
        description="Hier findet ihr die wichtigsten Erklärungen zum Paarbereich und könnt den Assistenten direkt zu Funktionen, Abläufen und Zuständigkeiten befragen."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        {ADMIN_HELP_KNOWLEDGE_SECTIONS.map((section) => (
          <article key={section.id} className="surface-card px-6 py-6">
            <p className="text-sm uppercase tracking-[0.18em] text-gold-700">{section.href}</p>
            <h2 className="mt-3 font-display text-card text-charcoal-900">{section.title}</h2>
            <p className="mt-3 text-charcoal-600">{section.summary}</p>
            <div className="mt-4 space-y-2 text-sm text-charcoal-700">
              {section.bullets.slice(0, 3).map((bullet) => (
                <p key={bullet}>- {bullet}</p>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="space-y-4">
        <div className="surface-card px-6 py-6">
          <h2 className="font-display text-card text-charcoal-900">Assistent</h2>
          <p className="mt-3 text-charcoal-600">
            Der Assistent verweist auf die passenden Unterseiten und beantwortet Fragen zur aktuellen
            App-Struktur. Wenn `OPENAI_API_KEY` gesetzt ist, nutzt er OpenAI mit dem konfigurierbaren
            Modell, sonst antwortet er aus der eingebauten Wissensbasis.
          </p>
        </div>
        <AdminHelpAssistant />
      </div>
    </div>
  )
}
