import { AdminPageHero } from '@/components/admin/AdminPageHero'
import { WeddingEditorForm } from '@/components/admin/WeddingEditorForm'
import { getProtectedAdminContext } from '@/lib/admin/dashboard'
import { getWeddingEditorValues } from '@/lib/supabase/repository'

export default async function AdminContentPage() {
  const { config, supabase } = await getProtectedAdminContext()
  const editorValues = await getWeddingEditorValues(supabase, config)

  return (
    <div className="space-y-6">
      <AdminPageHero
        title="Inhalte"
        description="Pflegt hier alle Inhalte eurer Einladung: Texte, Bilder, Dresscode, Dienstleister, Galerie-Texte und optionale Gästefunktionen."
      />

      {editorValues ? (
        <div className="surface-card px-6 py-6 sm:px-8">
          <WeddingEditorForm values={editorValues} />
        </div>
      ) : (
        <div className="surface-card px-6 py-8 text-charcoal-600">
          Für diese Hochzeit konnten noch keine editierbaren Daten geladen werden.
        </div>
      )}
    </div>
  )
}
