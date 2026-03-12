'use client'

import { buildWeddingThemeStyle, getWeddingFontPreset, getWeddingTemplate, WEDDING_FONT_OPTIONS, WEDDING_TEMPLATE_OPTIONS, type WeddingFontPresetId, type WeddingTemplateId } from '@/lib/wedding-design'
import { cn } from '@/lib/utils/cn'

interface WeddingDesignSectionProps {
  selectedTemplateId: WeddingTemplateId
  selectedFontPresetId: WeddingFontPresetId
  onSelectTemplate: (value: WeddingTemplateId) => void
  onSelectFontPreset: (value: WeddingFontPresetId) => void
}

function TemplateCard({
  isActive,
  selectedFontPresetId,
  templateId,
  onSelect,
}: {
  isActive: boolean
  selectedFontPresetId: WeddingFontPresetId
  templateId: WeddingTemplateId
  onSelect: (value: WeddingTemplateId) => void
}) {
  const template = getWeddingTemplate(templateId)

  return (
    <button
      className={cn(
        'wedding-theme wedding-theme-picker overflow-hidden rounded-[1.75rem] p-0 text-left transition hover:-translate-y-0.5',
        isActive ? 'ring-1 ring-gold-500' : '',
      )}
      data-active={isActive}
      style={buildWeddingThemeStyle({ templateId, fontPresetId: selectedFontPresetId })}
      type="button"
      onClick={() => onSelect(templateId)}
    >
      <div className="relative overflow-hidden rounded-[1.75rem]">
        <div className="wedding-hero-backdrop relative px-5 py-5">
          <div className="wedding-hero-orb-left absolute left-[-2.5rem] top-2 h-20 w-20 rounded-full blur-2xl" />
          <div className="wedding-hero-orb-right absolute right-[-2rem] top-10 h-16 w-16 rounded-full blur-2xl" />
          <div className="relative space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-charcoal-700">
                {template.vibe}
              </span>
              {isActive ? (
                <span className="rounded-full bg-gold-500 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-charcoal-900">
                  Aktiv
                </span>
              ) : null}
            </div>
            <div>
              <p className="font-display text-2xl text-charcoal-900">Mila & Jonas</p>
              <p className="mt-2 max-w-[18rem] text-sm leading-6 text-charcoal-700">
                {template.description}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: 'rgb(var(--color-gold-500))' }} />
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: 'rgb(var(--color-sage-500))' }} />
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: 'rgb(var(--color-dusty-rose-500))' }} />
              <span className="h-3 w-3 rounded-full border border-charcoal-900/10 bg-white/80" />
            </div>
          </div>
        </div>
      </div>
      <div className="px-5 py-4">
        <p className="font-display text-xl text-charcoal-900">{template.label}</p>
        <p className="mt-1 text-sm leading-6 text-charcoal-600">{template.vibe}</p>
      </div>
    </button>
  )
}

function FontCard({
  fontPresetId,
  isActive,
  selectedTemplateId,
  onSelect,
}: {
  fontPresetId: WeddingFontPresetId
  isActive: boolean
  selectedTemplateId: WeddingTemplateId
  onSelect: (value: WeddingFontPresetId) => void
}) {
  const fontPreset = getWeddingFontPreset(fontPresetId)

  return (
    <button
      className={cn(
        'wedding-theme wedding-theme-picker rounded-[1.5rem] px-5 py-5 text-left transition hover:-translate-y-0.5',
        isActive ? 'ring-1 ring-gold-500' : '',
      )}
      data-active={isActive}
      style={buildWeddingThemeStyle({ templateId: selectedTemplateId, fontPresetId })}
      type="button"
      onClick={() => onSelect(fontPresetId)}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-sage-600">
            Schriftstil
          </span>
          {isActive ? (
            <span className="rounded-full bg-gold-500 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-charcoal-900">
              Aktiv
            </span>
          ) : null}
        </div>
        <div>
          <p className="font-display text-2xl leading-tight text-charcoal-900">Mila & Jonas</p>
          <p className="mt-3 font-body text-sm leading-6 text-charcoal-700">{fontPreset.previewLine}</p>
        </div>
        <div>
          <p className="font-display text-xl text-charcoal-900">{fontPreset.label}</p>
          <p className="mt-1 text-sm leading-6 text-charcoal-600">{fontPreset.description}</p>
        </div>
      </div>
    </button>
  )
}

export function WeddingDesignSection({
  selectedTemplateId,
  selectedFontPresetId,
  onSelectTemplate,
  onSelectFontPreset,
}: WeddingDesignSectionProps) {
  const selectedTemplate = getWeddingTemplate(selectedTemplateId)
  const selectedFontPreset = getWeddingFontPreset(selectedFontPresetId)

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h3 className="font-display text-card text-charcoal-900">Design für eure Gäste</h3>
        <p className="max-w-3xl text-body-md text-charcoal-600">
          Wählt ein Template und einen Schriftstil, damit Einladung, RSVP und Galerie euren Charakter treffen.
          Alle Optionen sind bewusst auf Hochzeiten abgestimmt.
        </p>
      </div>

      <div
        className="wedding-theme wedding-theme-picker rounded-[1.9rem] p-6"
        data-active="true"
        style={buildWeddingThemeStyle({
          templateId: selectedTemplateId,
          fontPresetId: selectedFontPresetId,
        })}
      >
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sage-600">Aktuelle Auswahl</p>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="font-display text-section text-charcoal-900">Mila & Jonas</p>
              <p className="mt-3 max-w-2xl font-body text-body-md text-charcoal-700">
                {selectedTemplate.description} Kombiniert mit {selectedFontPreset.label} ergibt das einen
                stimmigen, hochzeitsgeeigneten Look für euren Gästebereich.
              </p>
            </div>
            <div className="rounded-[1.4rem] bg-white/80 px-4 py-4 text-sm leading-6 text-charcoal-700">
              <p className="font-semibold text-charcoal-900">{selectedTemplate.label}</p>
              <p className="mt-1">{selectedFontPreset.label}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="font-display text-card text-charcoal-900">10 NiiRo-Smart-Wedding-Templates</h4>
            <p className="text-body-md text-charcoal-600">
              Von klassisch-elegant bis editorial-modern, immer passend für Hochzeiten.
            </p>
          </div>
          <p className="text-sm font-semibold text-charcoal-700">{WEDDING_TEMPLATE_OPTIONS.length} Optionen</p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {WEDDING_TEMPLATE_OPTIONS.map((template) => (
            <TemplateCard
              key={template.id}
              isActive={selectedTemplateId === template.id}
              selectedFontPresetId={selectedFontPresetId}
              templateId={template.id}
              onSelect={onSelectTemplate}
            />
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="font-display text-card text-charcoal-900">15 Schriftstile</h4>
            <p className="text-body-md text-charcoal-600">
              Kuratierte Kombinationen für elegante Überschriften und gut lesbaren Fließtext.
            </p>
          </div>
          <p className="text-sm font-semibold text-charcoal-700">{WEDDING_FONT_OPTIONS.length} Optionen</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {WEDDING_FONT_OPTIONS.map((fontPreset) => (
            <FontCard
              key={fontPreset.id}
              fontPresetId={fontPreset.id}
              isActive={selectedFontPresetId === fontPreset.id}
              selectedTemplateId={selectedTemplateId}
              onSelect={onSelectFontPreset}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
