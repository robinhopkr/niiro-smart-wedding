'use client'

import { ArrowLeft, ArrowRight, CheckCircle2, ImagePlus, Plus, Save, Sparkles, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import {
  CONTENT_IMAGE_SECTION_OPTIONS,
  DEFAULT_FAQ_ITEMS,
  DEFAULT_PROGRAM_ITEMS,
  DRESSCODE_COLOR_HINT_OPTIONS,
  DRESSCODE_COLOR_OPTIONS,
} from '@/lib/constants'
import {
  createQuestionnaireCouplePhoto,
  createQuestionnaireFaqItem,
  createQuestionnaireProgramItem,
  createQuestionnaireSectionImage,
  createQuestionnaireVendorProfile,
  SETUP_QUESTIONNAIRE_STEPS,
  type SetupQuestionnaireStepId,
} from '@/lib/admin/setup-questionnaire'
import { PROGRAM_ICON_COMPONENTS, PROGRAM_ICON_OPTIONS } from '@/lib/program-icons'
import { normalizeProgramTimeLabel, sortProgramItemsChronologically } from '@/lib/utils/time'
import { cn } from '@/lib/utils/cn'
import { weddingEditorSchema, type WeddingEditorSchema } from '@/lib/validations/wedding-editor.schema'
import type { AdminSessionRole } from '@/lib/auth/admin-session'
import type { ApiResponse } from '@/types/api'
import type { WeddingConfig, WeddingEditorValues } from '@/types/wedding'

import { WeddingDesignSection } from './WeddingDesignSection'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Textarea } from '../ui/Textarea'

const STORAGE_KEY_PREFIX = 'niiro-smart-wedding-setup-questionnaire'
const MAX_IMAGE_DIMENSIONS: Record<'cover' | 'couple' | 'section' | 'vendor', number> = {
  cover: 2400,
  couple: 1800,
  section: 1800,
  vendor: 1400,
}
const OPTIMIZED_IMAGE_QUALITY = 0.84

interface SetupQuestionnaireProps {
  initialValues: WeddingEditorValues
  sessionRole: AdminSessionRole
}

type UploadFieldPath =
  | 'coverImageUrl'
  | `couplePhotos.${number}.imageUrl`
  | `sectionImages.${number}.imageUrl`
  | `vendorProfiles.${number}.imageUrl`

function toDateTimeLocalValue(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hours = `${date.getHours()}`.padStart(2, '0')
  const minutes = `${date.getMinutes()}`.padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function toPersistedDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toISOString()
}

function buildQuestionnaireValues(values: WeddingEditorValues): WeddingEditorSchema {
  return {
    ...values,
    weddingDate: toDateTimeLocalValue(values.weddingDate),
    rsvpDeadline: toDateTimeLocalValue(values.rsvpDeadline),
    couplePhotos: values.couplePhotos,
    programItems: values.programItems.length
      ? values.programItems
      : DEFAULT_PROGRAM_ITEMS.map((item) => ({
          id: item.id,
          timeLabel: item.timeLabel,
          title: item.title,
          description: item.description ?? '',
          icon: item.icon ?? '',
        })),
    faqItems: values.faqItems.length
      ? values.faqItems
      : DEFAULT_FAQ_ITEMS.map((item) => ({
          id: item.id,
          question: item.question,
          answer: item.answer,
        })),
  }
}

function sanitizeQuestionnaireValues(values: WeddingEditorSchema): WeddingEditorSchema {
  return {
    ...values,
    couplePhotos: values.couplePhotos.filter(
      (item) => item.imageUrl.trim() || item.altText.trim() || item.caption.trim(),
    ),
    sectionImages: values.sectionImages.filter(
      (item) =>
        item.imageUrl.trim() || item.title.trim() || item.altText.trim(),
    ),
    vendorProfiles: values.vendorProfiles.filter(
      (item) =>
        item.name.trim() ||
        item.role.trim() ||
        item.websiteUrl.trim() ||
        item.instagramUrl.trim() ||
        item.imageUrl.trim(),
    ),
    programItems: values.programItems.filter(
      (item) =>
        item.timeLabel.trim() || item.title.trim() || item.description.trim() || item.icon.trim(),
    ),
    faqItems: values.faqItems.filter((item) => item.question.trim() || item.answer.trim()),
  }
}

function StepImagePreview({ imageUrl, altText }: { imageUrl: string; altText: string }) {
  if (!imageUrl) {
    return (
      <div className="flex min-h-[150px] items-center justify-center rounded-[1.5rem] border border-dashed border-cream-300 bg-cream-50 px-4 py-6 text-center text-sm text-charcoal-500">
        Hier erscheint eure Bildvorschau.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-cream-200 bg-cream-50">
      <div className="aspect-[4/3] w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={altText || 'Bildvorschau'}
          className="h-full w-full object-cover"
          loading="lazy"
          src={imageUrl}
        />
      </div>
    </div>
  )
}

function UploadFileControl({
  isLoading,
  label,
  onChange,
}: {
  isLoading: boolean
  label: string
  onChange: React.ChangeEventHandler<HTMLInputElement>
}) {
  return (
    <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-gold-300 bg-white px-5 py-3 text-sm font-semibold text-charcoal-800 transition hover:border-gold-500 hover:text-charcoal-900">
      <ImagePlus className="h-4 w-4" />
      <span>{isLoading ? 'Lädt hoch...' : label}</span>
      <input accept="image/*" className="hidden" type="file" onChange={onChange} />
    </label>
  )
}

function QuestionnaireInfo({
  title,
  body,
  tone = 'neutral',
}: {
  title: string
  body: string
  tone?: 'neutral' | 'accent'
}) {
  return (
    <div
      className={cn(
        'rounded-[1.5rem] border px-5 py-4 text-sm leading-6',
        tone === 'accent'
          ? 'border-gold-200 bg-gold-50 text-charcoal-700'
          : 'border-cream-200 bg-white text-charcoal-600',
      )}
    >
      <p className="font-semibold text-charcoal-900">{title}</p>
      <p className="mt-2">{body}</p>
    </div>
  )
}

function getFirstValidationMessage(error: ReturnType<typeof weddingEditorSchema.safeParse>) {
  if (error.success) {
    return null
  }

  return error.error.issues[0]?.message ?? 'Bitte prüft eure Eingaben.'
}

export function SetupQuestionnaire({ initialValues, sessionRole }: SetupQuestionnaireProps) {
  const router = useRouter()
  const storageKey = `${STORAGE_KEY_PREFIX}:${initialValues.source}:${initialValues.sourceId}`
  const [values, setValues] = useState<WeddingEditorSchema>(() => buildQuestionnaireValues(initialValues))
  const [currentStep, setCurrentStep] = useState(0)
  const [hasHydratedDraft, setHasHydratedDraft] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [uploadingTargets, setUploadingTargets] = useState<Record<string, boolean>>({})

  const currentStepData =
    SETUP_QUESTIONNAIRE_STEPS[currentStep] ?? SETUP_QUESTIONNAIRE_STEPS[0]!
  const progressPercent = ((currentStep + 1) / SETUP_QUESTIONNAIRE_STEPS.length) * 100
  const sourceId = values.sourceId || initialValues.sourceId

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      const draftRaw = window.localStorage.getItem(storageKey)
      if (!draftRaw) {
        setHasHydratedDraft(true)
        return
      }

      const draft = JSON.parse(draftRaw) as {
        step?: number
        values?: WeddingEditorSchema
      }

      if (draft.values) {
        setValues(draft.values)
      }

      if (typeof draft.step === 'number' && draft.step >= 0) {
        setCurrentStep(Math.min(SETUP_QUESTIONNAIRE_STEPS.length - 1, draft.step))
      }

      toast.message('Euer zuletzt lokaler Fragebogenstand wurde wiederhergestellt.')
    } catch {
      // Ignore broken local drafts and continue with server values.
    } finally {
      setHasHydratedDraft(true)
    }
  }, [storageKey])

  useEffect(() => {
    if (!hasHydratedDraft || typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        step: currentStep,
        values,
      }),
    )
  }, [currentStep, hasHydratedDraft, storageKey, values])

  const summaryBadges = useMemo(
    () => [
      values.coverImageUrl.trim() ? 'Titelbild gesetzt' : 'Titelbild offen',
      `${values.couplePhotos.length} Paarfotos`,
      `${values.programItems.length} Programmpunkte`,
      `${values.faqItems.length} FAQ`,
      `${values.vendorProfiles.length} Dienstleister`,
      `${values.sectionImages.length} Zusatzbilder`,
    ],
    [values],
  )

  const guestAreaReadiness = useMemo(
    () => [
      {
        label: 'Einladung mit Namen, Datum, Ort und Begrüßung',
        ready:
          Boolean(values.coupleLabel.trim()) &&
          Boolean(values.weddingDate.trim()) &&
          Boolean(values.venueName.trim()) &&
          Boolean(values.welcomeMessage.trim()),
      },
      {
        label: 'Look & Feel mit Design und Titelbild',
        ready: Boolean(values.templateId && values.fontPresetId && values.coverImageUrl.trim()),
      },
      {
        label: 'Persönliche Wirkung mit Paarfotos',
        ready: values.couplePhotos.some((photo) => photo.imageUrl.trim()),
      },
      {
        label: 'Tagesablauf für eure Gäste',
        ready: values.programItems.some((item) => item.timeLabel.trim() && item.title.trim()),
      },
      {
        label: 'Dresscode und Farbwelt',
        ready: Boolean(values.dressCodeNote.trim()) || values.dressCodeColors.length > 0,
      },
      {
        label: 'FAQ für typische Rückfragen',
        ready: values.faqItems.some((item) => item.question.trim() && item.answer.trim()),
      },
      {
        label: 'Optionale Bereiche wie Dienstleister oder Musikwünsche',
        ready: values.vendorProfiles.some((vendor) => vendor.name.trim() && vendor.role.trim()) || values.musicWishlistEnabled,
      },
    ],
    [values],
  )

  function updateValues(patch: Partial<WeddingEditorSchema>) {
    setValues((current) => ({
      ...current,
      ...patch,
    }))
  }

  function updateProgramItem(
    index: number,
    patch: Partial<WeddingEditorSchema['programItems'][number]>,
  ) {
    setValues((current) => ({
      ...current,
      programItems: current.programItems.map((item, currentIndex) =>
        currentIndex === index ? { ...item, ...patch } : item,
      ),
    }))
  }

  function normalizeAndSortProgramItems() {
    setValues((current) => ({
      ...current,
      programItems: sortProgramItemsChronologically(
        current.programItems.map((item, index) => ({
          ...item,
          timeLabel: normalizeProgramTimeLabel(item.timeLabel),
          sortOrder: index,
        })),
      ).map(({ sortOrder, ...item }) => item),
    }))
  }

  function updateFaqItem(index: number, patch: Partial<WeddingEditorSchema['faqItems'][number]>) {
    setValues((current) => ({
      ...current,
      faqItems: current.faqItems.map((item, currentIndex) =>
        currentIndex === index ? { ...item, ...patch } : item,
      ),
    }))
  }

  function updateCouplePhoto(
    index: number,
    patch: Partial<WeddingEditorSchema['couplePhotos'][number]>,
  ) {
    setValues((current) => ({
      ...current,
      couplePhotos: current.couplePhotos.map((item, currentIndex) =>
        currentIndex === index ? { ...item, ...patch } : item,
      ),
    }))
  }

  function updateSectionImage(
    index: number,
    patch: Partial<WeddingEditorSchema['sectionImages'][number]>,
  ) {
    setValues((current) => ({
      ...current,
      sectionImages: current.sectionImages.map((item, currentIndex) =>
        currentIndex === index ? { ...item, ...patch } : item,
      ),
    }))
  }

  function updateVendorProfile(
    index: number,
    patch: Partial<WeddingEditorSchema['vendorProfiles'][number]>,
  ) {
    setValues((current) => ({
      ...current,
      vendorProfiles: current.vendorProfiles.map((item, currentIndex) =>
        currentIndex === index ? { ...item, ...patch } : item,
      ),
    }))
  }

  function validateCurrentStep(stepId: SetupQuestionnaireStepId): boolean {
    if (stepId === 'basics') {
      if (!values.coupleLabel.trim()) {
        toast.error('Bitte gebt den Namen des Brautpaares ein.')
        return false
      }

      if (!values.guestCode.trim()) {
        toast.error('Bitte legt einen Gästecode für euren personalisierten Einladungslink fest.')
        return false
      }

      if (!values.weddingDate.trim() || !values.rsvpDeadline.trim()) {
        toast.error('Bitte ergänzt Hochzeitsdatum und RSVP-Frist.')
        return false
      }
    }

    if (stepId === 'venue') {
      if (!values.venueName.trim() || !values.venueAddress.trim()) {
        toast.error('Bitte ergänzt Ort und Adresse eurer Hochzeit.')
        return false
      }

      if (!values.welcomeMessage.trim()) {
        toast.error('Bitte gebt einen kurzen Begrüßungstext ein.')
        return false
      }
    }

    return true
  }

  function setImageValue(targetPath: UploadFieldPath, imageUrl: string) {
    if (targetPath === 'coverImageUrl') {
      updateValues({ coverImageUrl: imageUrl })
      return
    }

    const match = targetPath.match(/^(couplePhotos|sectionImages|vendorProfiles)\.(\d+)\.imageUrl$/)

    if (!match) {
      return
    }

    const [, collection, rawIndex] = match
    if (!collection || !rawIndex) {
      return
    }
    const index = Number.parseInt(rawIndex, 10)

    if (collection === 'couplePhotos') {
      updateCouplePhoto(index, { imageUrl })
      return
    }

    if (collection === 'sectionImages') {
      updateSectionImage(index, { imageUrl })
      return
    }

    updateVendorProfile(index, { imageUrl })
  }

  function resolveOptimizedImageType(file: File): 'image/jpeg' | 'image/webp' {
    return file.type === 'image/png' || file.type === 'image/webp' ? 'image/webp' : 'image/jpeg'
  }

  function replaceFileExtension(fileName: string, nextExtension: 'jpg' | 'webp'): string {
    const sanitized = fileName.replace(/\.[a-z0-9]+$/i, '')
    return `${sanitized || 'bild'}.${nextExtension}`
  }

  async function buildOptimizedImageFile(
    file: File,
    folder: 'cover' | 'couple' | 'section' | 'vendor',
  ): Promise<File> {
    const imageUrl = URL.createObjectURL(file)

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const element = new Image()
        element.onload = () => resolve(element)
        element.onerror = () => reject(new Error('Das Bild konnte nicht verarbeitet werden.'))
        element.src = imageUrl
      })

      const maxDimension = MAX_IMAGE_DIMENSIONS[folder]
      const longestSide = Math.max(image.width, image.height)
      const scale = longestSide > maxDimension ? maxDimension / longestSide : 1
      const width = Math.max(1, Math.round(image.width * scale))
      const height = Math.max(1, Math.round(image.height * scale))
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')

      if (!context) {
        throw new Error('Das Bild konnte nicht verarbeitet werden.')
      }

      canvas.width = width
      canvas.height = height
      context.drawImage(image, 0, 0, width, height)

      const outputType = resolveOptimizedImageType(file)
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, outputType, OPTIMIZED_IMAGE_QUALITY)
      })

      if (!blob) {
        throw new Error('Das Bild konnte nicht verarbeitet werden.')
      }

      return new File(
        [blob],
        replaceFileExtension(file.name, outputType === 'image/webp' ? 'webp' : 'jpg'),
        {
          type: outputType,
          lastModified: file.lastModified,
        },
      )
    } finally {
      URL.revokeObjectURL(imageUrl)
    }
  }

  async function handleImageUpload(
    event: React.ChangeEvent<HTMLInputElement>,
    input: {
      targetKey: string
      targetPath: UploadFieldPath
      folder: 'cover' | 'couple' | 'section' | 'vendor'
    },
  ) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setUploadingTargets((current) => ({
      ...current,
      [input.targetKey]: true,
    }))

    try {
      const optimizedFile = await buildOptimizedImageFile(file, input.folder)
      const formData = new FormData()
      formData.append('sourceId', sourceId)
      formData.append('folder', input.folder)
      formData.append('file', optimizedFile)

      const response = await fetch('/api/admin/content-images', {
        method: 'POST',
        body: formData,
      })

      const result = (await response.json()) as ApiResponse<{ publicUrl: string; path: string }>

      if (!response.ok || !result.success) {
        toast.error(result.success ? 'Upload fehlgeschlagen.' : result.error)
        return
      }

      setImageValue(input.targetPath, result.data.publicUrl)
      toast.success('Das Bild wurde hochgeladen und dem Fragebogen hinzugefügt.')
    } catch {
      toast.error('Das Bild konnte gerade nicht hochgeladen werden.')
    } finally {
      setUploadingTargets((current) => {
        const nextState = { ...current }
        delete nextState[input.targetKey]
        return nextState
      })
      event.target.value = ''
    }
  }

  async function persistQuestionnaire(successMessage: string, clearLocalDraft = false) {
    const sanitizedValues = sanitizeQuestionnaireValues(values)
    const parseResult = weddingEditorSchema.safeParse(sanitizedValues)

    if (!parseResult.success) {
      toast.error(getFirstValidationMessage(parseResult) ?? 'Bitte prüft eure Eingaben.')
      return false
    }

    setIsSaving(true)

    try {
      const response = await fetch('/api/admin/wedding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...parseResult.data,
          weddingDate: toPersistedDate(parseResult.data.weddingDate),
          rsvpDeadline: toPersistedDate(parseResult.data.rsvpDeadline),
        }),
      })

      const result = (await response.json()) as ApiResponse<WeddingConfig>

      if (!response.ok || !result.success) {
        toast.error(result.success ? 'Speichern fehlgeschlagen.' : result.error)
        return false
      }

      if (clearLocalDraft && typeof window !== 'undefined') {
        window.localStorage.removeItem(storageKey)
      }

      toast.success(successMessage)
      router.refresh()
      return true
    } catch {
      toast.error('Der Fragebogen konnte gerade nicht gespeichert werden.')
      return false
    } finally {
      setIsSaving(false)
    }
  }

  async function handleFinish() {
    const didSave = await persistQuestionnaire(
      'Der Fragebogen wurde gespeichert und eure NiiRo-Smart-Wedding-Einladung ist aktualisiert.',
      true,
    )

    if (!didSave) {
      return
    }

    router.push('/admin/uebersicht')
  }

  function goToStep(index: number) {
    setCurrentStep(Math.max(0, Math.min(SETUP_QUESTIONNAIRE_STEPS.length - 1, index)))
  }

  function goToNextStep() {
    if (!validateCurrentStep(currentStepData.id)) {
      return
    }

    setCurrentStep((current) => Math.min(SETUP_QUESTIONNAIRE_STEPS.length - 1, current + 1))
  }

  function renderBasicsStep() {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <Input
          label="Wie soll euer Brautpaar in der App heißen?"
          value={values.coupleLabel}
          onChange={(event) => updateValues({ coupleLabel: event.target.value })}
        />
        <Input
          helperText="Aus diesem Code baut NiiRo Smart Wedding euren personalisierten Einladungslink."
          label="Gastcode / Link-Code"
          value={values.guestCode}
          onChange={(event) => updateValues({ guestCode: event.target.value.toUpperCase() })}
        />
        <Input
          label="Wann findet eure Hochzeit statt?"
          type="datetime-local"
          value={values.weddingDate}
          onChange={(event) => updateValues({ weddingDate: event.target.value })}
        />
        <Input
          label="Bis wann sollen eure Gäste zusagen?"
          type="datetime-local"
          value={values.rsvpDeadline}
          onChange={(event) => updateValues({ rsvpDeadline: event.target.value })}
        />
      </div>
    )
  }

  function renderVenueStep() {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <Input
            label="Wie heißt eure Hochzeitslocation?"
            value={values.venueName}
            onChange={(event) => updateValues({ venueName: event.target.value })}
          />
          <Input
            label="Welche Adresse sollen eure Gäste sehen?"
            value={values.venueAddress}
            onChange={(event) => updateValues({ venueAddress: event.target.value })}
          />
        </div>

        <Textarea
          helperText="Das ist der erste Begrüßungstext direkt im Gästebereich."
          label="Wie möchtet ihr eure Gäste begrüßen?"
          value={values.welcomeMessage}
          onChange={(event) => updateValues({ welcomeMessage: event.target.value })}
        />

        <Textarea
          helperText="Optional: mehr persönliche Worte für die digitale Einladung und die PDF."
          label="Habt ihr eine persönliche Einladungsgeschichte oder Zusatzbotschaft?"
          value={values.invitationStory}
          onChange={(event) => updateValues({ invitationStory: event.target.value })}
        />
      </div>
    )
  }

  function renderMessagesStep() {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <Input
            label="Titel über dem RSVP-Formular"
            value={values.formTitle}
            onChange={(event) => updateValues({ formTitle: event.target.value })}
          />
          <Input
            label="Titel nach erfolgreicher Rückmeldung"
            value={values.successTitle}
            onChange={(event) => updateValues({ successTitle: event.target.value })}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Textarea
            label="Kurze Erklärung über dem RSVP-Formular"
            value={values.formDescription}
            onChange={(event) => updateValues({ formDescription: event.target.value })}
          />
          <Textarea
            label="Text nach erfolgreicher Rückmeldung"
            value={values.successDescription}
            onChange={(event) => updateValues({ successDescription: event.target.value })}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Input
            label="Titel für eure Galerie"
            value={values.galleryTitle}
            onChange={(event) => updateValues({ galleryTitle: event.target.value })}
          />
          <Textarea
            label="Beschreibung für eure Galerie"
            value={values.galleryDescription}
            onChange={(event) => updateValues({ galleryDescription: event.target.value })}
          />
        </div>
      </div>
    )
  }

  function renderDesignStep() {
    return (
      <div className="space-y-6">
        <QuestionnaireInfo
          title="Titelbild und Stil"
          body="Ihr könnt euer Titelbild hier direkt hochladen oder wie bisher per URL einfügen. So ist euer Gästebereich sofort visuell aufgesetzt."
        />
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <Input
              helperText="Optional: großes Titelbild ganz oben im Gästebereich."
              label="Titelbild / Coverbild als URL"
              value={values.coverImageUrl}
              onChange={(event) => updateValues({ coverImageUrl: event.target.value })}
            />
            <UploadFileControl
              isLoading={Boolean(uploadingTargets.cover)}
              label="Titelbild hochladen"
              onChange={(event) =>
                void handleImageUpload(event, {
                  targetKey: 'cover',
                  targetPath: 'coverImageUrl',
                  folder: 'cover',
                })
              }
            />
          </div>
          <StepImagePreview imageUrl={values.coverImageUrl} altText={values.coupleLabel} />
        </div>
        <WeddingDesignSection
          selectedFontPresetId={values.fontPresetId}
          selectedTemplateId={values.templateId}
          onSelectFontPreset={(fontPresetId) => updateValues({ fontPresetId })}
          onSelectTemplate={(templateId) => updateValues({ templateId })}
        />
      </div>
    )
  }

  function renderPhotosStep() {
    return (
      <div className="space-y-5">
        <QuestionnaireInfo
          title="Paarfotos"
          body="Diese Bilder erscheinen in Hero, Galerie und Teasern. Ihr könnt mit einem Bild starten und später weitere ergänzen."
        />
        {values.couplePhotos.length ? (
          values.couplePhotos.map((photo, index) => (
            <article key={photo.id} className="rounded-[1.6rem] border border-cream-200 bg-white px-5 py-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="font-display text-card text-charcoal-900">Paarfoto {index + 1}</h3>
                  <p className="mt-2 text-sm leading-6 text-charcoal-600">
                    Optional mit Bild-URL, Alternativtext und kurzer Bildunterschrift.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    updateValues({
                      couplePhotos: values.couplePhotos.filter((entry) => entry.id !== photo.id),
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                  Entfernen
                </Button>
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-4">
                  <Input
                    label="Bild-URL"
                    value={photo.imageUrl}
                    onChange={(event) => updateCouplePhoto(index, { imageUrl: event.target.value })}
                  />
                  <UploadFileControl
                    isLoading={Boolean(uploadingTargets[`couple-${photo.id}`])}
                    label="Paarfoto hochladen"
                    onChange={(event) =>
                      void handleImageUpload(event, {
                        targetKey: `couple-${photo.id}`,
                        targetPath: `couplePhotos.${index}.imageUrl`,
                        folder: 'couple',
                      })
                    }
                  />
                  <Input
                    label="Alternativtext"
                    value={photo.altText}
                    onChange={(event) => updateCouplePhoto(index, { altText: event.target.value })}
                  />
                  <Input
                    label="Kurze Bildunterschrift"
                    value={photo.caption}
                    onChange={(event) => updateCouplePhoto(index, { caption: event.target.value })}
                  />
                </div>
                <StepImagePreview imageUrl={photo.imageUrl} altText={photo.altText} />
              </div>
            </article>
          ))
        ) : (
          <QuestionnaireInfo
            title="Noch keine Paarfotos"
            body="Ihr könnt den Gästebereich auch ohne Fotos starten und später jederzeit Bilder ergänzen."
          />
        )}

        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            updateValues({
              couplePhotos: [...values.couplePhotos, createQuestionnaireCouplePhoto()],
            })
          }
        >
          <Plus className="h-4 w-4" />
          Weiteres Paarfoto hinzufügen
        </Button>
      </div>
    )
  }

  function renderProgramStep() {
    return (
      <div className="space-y-5">
        <QuestionnaireInfo
          title="Programmpunkte"
          body="Hier fragt euch NiiRo Smart Wedding nach allen Stationen eures Tages. Die Uhrzeiten werden beim Verlassen des Felds automatisch in ein sauberes Format gebracht."
          tone="accent"
        />
        {values.programItems.map((item, index) => {
          const Icon = PROGRAM_ICON_COMPONENTS[item.icon as keyof typeof PROGRAM_ICON_COMPONENTS]

          return (
            <article key={item.id} className="rounded-[1.6rem] border border-cream-200 bg-white px-5 py-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="font-display text-card text-charcoal-900">Programmpunkt {index + 1}</h3>
                  <p className="mt-2 text-sm leading-6 text-charcoal-600">
                    Uhrzeit, Titel, Beschreibung und passendes Hochzeits-Icon.
                  </p>
                </div>
                {values.programItems.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      updateValues({
                        programItems: values.programItems.filter((entry) => entry.id !== item.id),
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                    Entfernen
                  </Button>
                ) : null}
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-[160px_minmax(0,1fr)_240px]">
                <Input
                  label="Uhrzeit"
                  value={item.timeLabel}
                  onBlur={normalizeAndSortProgramItems}
                  onChange={(event) => updateProgramItem(index, { timeLabel: event.target.value })}
                />
                <div className="space-y-4">
                  <Input
                    label="Titel"
                    value={item.title}
                    onChange={(event) => updateProgramItem(index, { title: event.target.value })}
                  />
                  <Textarea
                    label="Beschreibung"
                    value={item.description}
                    onChange={(event) => updateProgramItem(index, { description: event.target.value })}
                  />
                </div>
                <div className="space-y-4">
                  <Select
                    label="Passendes Icon"
                    options={[
                      { value: '', label: 'Automatisch wählen' },
                      ...PROGRAM_ICON_OPTIONS.map((option) => ({
                        value: option.value,
                        label: option.label,
                      })),
                    ]}
                    value={item.icon}
                    onChange={(event) => updateProgramItem(index, { icon: event.target.value })}
                  />
                  <div className="rounded-[1.5rem] border border-cream-200 bg-cream-50 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-charcoal-500">Vorschau</p>
                    <div className="mt-3 flex items-center gap-3">
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-gold-700 shadow-sm">
                        {Icon ? <Icon className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-charcoal-900">{item.title || 'Programmtitel'}</p>
                        <p className="text-sm text-charcoal-600">{normalizeProgramTimeLabel(item.timeLabel) || '00:00'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          )
        })}

        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            updateValues({
              programItems: [...values.programItems, createQuestionnaireProgramItem()],
            })
          }
        >
          <Plus className="h-4 w-4" />
          Weiteren Programmpunkt hinzufügen
        </Button>
      </div>
    )
  }

  function renderDresscodeStep() {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <Textarea
            label="Allgemeiner Dresscode-Hinweis"
            value={values.dressCodeNote}
            onChange={(event) => updateValues({ dressCodeNote: event.target.value })}
          />
          <Select
            label="Wie deutlich soll der Farbhint formuliert sein?"
            options={DRESSCODE_COLOR_HINT_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
            value={values.dressCodeColorHint}
            onChange={(event) =>
              updateValues({
                dressCodeColorHint: event.target.value as WeddingEditorSchema['dressCodeColorHint'],
              })
            }
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Textarea
            label="Hinweis für Frauen"
            value={values.dressCodeWomen}
            onChange={(event) => updateValues({ dressCodeWomen: event.target.value })}
          />
          <Textarea
            label="Hinweis für Männer"
            value={values.dressCodeMen}
            onChange={(event) => updateValues({ dressCodeMen: event.target.value })}
          />
        </div>

        <Textarea
          label="Weitere Dresscode-Hinweise"
          value={values.dressCodeExtras}
          onChange={(event) => updateValues({ dressCodeExtras: event.target.value })}
        />

        <div className="space-y-3">
          <div>
            <h3 className="font-display text-card text-charcoal-900">Farbpalette</h3>
            <p className="mt-2 text-sm leading-6 text-charcoal-600">
              Wählt die Farben, an denen sich eure Gäste orientieren dürfen oder sollen.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {DRESSCODE_COLOR_OPTIONS.map((color) => {
              const isActive = values.dressCodeColors.includes(color.value)

              return (
                <button
                  key={color.value}
                  className={cn(
                    'flex items-center gap-3 rounded-[1.35rem] border px-4 py-3 text-left transition',
                    isActive
                      ? 'border-gold-500 bg-gold-50 shadow-sm'
                      : 'border-cream-200 bg-white hover:border-gold-300',
                  )}
                  type="button"
                  onClick={() =>
                    updateValues({
                      dressCodeColors: isActive
                        ? values.dressCodeColors.filter((entry) => entry !== color.value)
                        : [...values.dressCodeColors, color.value],
                    })
                  }
                >
                  <span className="h-5 w-5 rounded-full border border-charcoal-900/10" style={{ backgroundColor: color.hex }} />
                  <span className="font-semibold text-charcoal-900">{color.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  function renderGalleryStep() {
    return (
      <div className="space-y-5">
        <QuestionnaireInfo
          title="Zusatzbilder"
          body="Diese Bilder werden in einzelnen Bereichen wie Programm, Anfahrt, Dresscode, Galerie, RSVP oder FAQ eingeblendet."
        />
        {values.sectionImages.length ? (
          values.sectionImages.map((image, index) => (
            <article key={image.id} className="rounded-[1.6rem] border border-cream-200 bg-white px-5 py-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="font-display text-card text-charcoal-900">Zusatzbild {index + 1}</h3>
                  <p className="mt-2 text-sm leading-6 text-charcoal-600">
                    Ordnet das Bild einem Bereich zu und ergänzt optional Titel und Alternativtext.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    updateValues({
                      sectionImages: values.sectionImages.filter((entry) => entry.id !== image.id),
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                  Entfernen
                </Button>
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-4">
                  <Select
                    label="Für welchen Bereich ist dieses Bild?"
                    options={CONTENT_IMAGE_SECTION_OPTIONS.map((option) => ({
                      value: option.value,
                      label: option.label,
                    }))}
                    value={image.section}
                    onChange={(event) =>
                      updateSectionImage(index, {
                        section: event.target.value as WeddingEditorSchema['sectionImages'][number]['section'],
                      })
                    }
                  />
                  <Input
                    label="Optionaler Titel"
                    value={image.title}
                    onChange={(event) => updateSectionImage(index, { title: event.target.value })}
                  />
                  <Input
                    label="Bild-URL"
                    value={image.imageUrl}
                    onChange={(event) => updateSectionImage(index, { imageUrl: event.target.value })}
                  />
                  <UploadFileControl
                    isLoading={Boolean(uploadingTargets[`section-${image.id}`])}
                    label="Zusatzbild hochladen"
                    onChange={(event) =>
                      void handleImageUpload(event, {
                        targetKey: `section-${image.id}`,
                        targetPath: `sectionImages.${index}.imageUrl`,
                        folder: 'section',
                      })
                    }
                  />
                  <Input
                    label="Alternativtext"
                    value={image.altText}
                    onChange={(event) => updateSectionImage(index, { altText: event.target.value })}
                  />
                </div>
                <StepImagePreview imageUrl={image.imageUrl} altText={image.altText} />
              </div>
            </article>
          ))
        ) : (
          <QuestionnaireInfo
            title="Noch keine Zusatzbilder"
            body="Das ist völlig in Ordnung. Ihr könnt auch nur mit Titelbild und Paarfotos starten."
          />
        )}

        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            updateValues({
              sectionImages: [...values.sectionImages, createQuestionnaireSectionImage()],
            })
          }
        >
          <ImagePlus className="h-4 w-4" />
          Zusatzbild hinzufügen
        </Button>
      </div>
    )
  }

  function renderVendorsStep() {
    return (
      <div className="space-y-5">
        <QuestionnaireInfo
          title="Optionaler Bereich"
          body="Wenn ihr eure Dienstleister nicht öffentlich zeigen möchtet, könnt ihr diesen Schritt einfach leer lassen."
        />
        {values.vendorProfiles.length ? (
          values.vendorProfiles.map((vendor, index) => (
            <article key={vendor.id} className="rounded-[1.6rem] border border-cream-200 bg-white px-5 py-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="font-display text-card text-charcoal-900">Dienstleister {index + 1}</h3>
                  <p className="mt-2 text-sm leading-6 text-charcoal-600">
                    Name, Funktion, Website, Instagram und ein optionales Profilbild.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    updateValues({
                      vendorProfiles: values.vendorProfiles.filter((entry) => entry.id !== vendor.id),
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                  Entfernen
                </Button>
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="grid gap-4 lg:grid-cols-2">
                  <Input
                    label="Name"
                    value={vendor.name}
                    onChange={(event) => updateVendorProfile(index, { name: event.target.value })}
                  />
                  <Input
                    label="Funktion"
                    value={vendor.role}
                    onChange={(event) => updateVendorProfile(index, { role: event.target.value })}
                  />
                  <Input
                    label="Website"
                    value={vendor.websiteUrl}
                    onChange={(event) => updateVendorProfile(index, { websiteUrl: event.target.value })}
                  />
                  <Input
                    label="Instagram"
                    value={vendor.instagramUrl}
                    onChange={(event) => updateVendorProfile(index, { instagramUrl: event.target.value })}
                  />
                  <div className="lg:col-span-2">
                    <Input
                      label="Profilbild-URL"
                      value={vendor.imageUrl}
                      onChange={(event) => updateVendorProfile(index, { imageUrl: event.target.value })}
                    />
                    <UploadFileControl
                      isLoading={Boolean(uploadingTargets[`vendor-${vendor.id}`])}
                      label="Profilbild hochladen"
                      onChange={(event) =>
                        void handleImageUpload(event, {
                          targetKey: `vendor-${vendor.id}`,
                          targetPath: `vendorProfiles.${index}.imageUrl`,
                          folder: 'vendor',
                        })
                      }
                    />
                  </div>
                </div>
                <StepImagePreview imageUrl={vendor.imageUrl} altText={vendor.name} />
              </div>
            </article>
          ))
        ) : (
          <QuestionnaireInfo
            title="Noch keine Dienstleister eingetragen"
            body="Falls ihr diesen Bereich möchtet, könnt ihr hier jetzt beliebig viele Dienstleister hinzufügen."
          />
        )}

        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            updateValues({
              vendorProfiles: [...values.vendorProfiles, createQuestionnaireVendorProfile()],
            })
          }
        >
          <Plus className="h-4 w-4" />
          Dienstleister hinzufügen
        </Button>
      </div>
    )
  }

  function renderFaqStep() {
    return (
      <div className="space-y-5">
        {values.faqItems.map((faq, index) => (
          <article key={faq.id} className="rounded-[1.6rem] border border-cream-200 bg-white px-5 py-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h3 className="font-display text-card text-charcoal-900">FAQ {index + 1}</h3>
                <p className="mt-2 text-sm leading-6 text-charcoal-600">
                  Häufige Fragen helfen euch, Rückfragen von Gästen früh abzufangen.
                </p>
              </div>
              {values.faqItems.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    updateValues({
                      faqItems: values.faqItems.filter((entry) => entry.id !== faq.id),
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                  Entfernen
                </Button>
              ) : null}
            </div>
            <div className="mt-5 grid gap-4">
              <Input
                label="Frage"
                value={faq.question}
                onChange={(event) => updateFaqItem(index, { question: event.target.value })}
              />
              <Textarea
                label="Antwort"
                value={faq.answer}
                onChange={(event) => updateFaqItem(index, { answer: event.target.value })}
              />
            </div>
          </article>
        ))}

        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            updateValues({
              faqItems: [...values.faqItems, createQuestionnaireFaqItem()],
            })
          }
        >
          <Plus className="h-4 w-4" />
          Weitere FAQ hinzufügen
        </Button>
      </div>
    )
  }

  function renderExtrasStep() {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="rounded-[1.6rem] border border-cream-200 bg-white px-5 py-5 shadow-sm">
            <div className="flex items-start gap-3">
              <input
                checked={values.musicWishlistEnabled}
                className="mt-1 h-4 w-4 accent-gold-500"
                type="checkbox"
                onChange={(event) => updateValues({ musicWishlistEnabled: event.target.checked })}
              />
              <div>
                <p className="font-semibold text-charcoal-900">Musikwünsche aktivieren</p>
                <p className="mt-2 text-sm leading-6 text-charcoal-600">
                  Gäste können Songs eintragen, voten und die Top 10 öffentlich sehen.
                </p>
              </div>
            </div>
          </label>

          {sessionRole === 'couple' ? (
            <label className="rounded-[1.6rem] border border-cream-200 bg-white px-5 py-5 shadow-sm">
              <div className="flex items-start gap-3">
                <input
                  checked={values.sharePrivateGalleryWithGuests}
                  className="mt-1 h-4 w-4 accent-gold-500"
                  type="checkbox"
                  onChange={(event) =>
                    updateValues({ sharePrivateGalleryWithGuests: event.target.checked })
                  }
                />
                <div>
                  <p className="font-semibold text-charcoal-900">Privaten Fotobereich für Gäste freigeben</p>
                  <p className="mt-2 text-sm leading-6 text-charcoal-600">
                    Nur aktivieren, wenn private Fotografenbilder später auch im Gästebereich sichtbar werden sollen.
                  </p>
                </div>
              </div>
            </label>
          ) : (
            <div className="rounded-[1.6rem] border border-cream-200 bg-cream-50 px-5 py-5 text-sm leading-6 text-charcoal-600 shadow-sm">
              Private Fotografenbilder bleiben ausschließlich beim Brautpaar. Als Wedding Planner könnt ihr
              diesen Bereich nicht freigeben.
            </div>
          )}
        </div>

        <Input
          helperText="Optional: Mit diesem Passwort erhalten Fotografen ihren separaten Upload-Zugang."
          label="Fotografen-Passwort"
          type="password"
          value={values.photographerPassword}
          onChange={(event) => updateValues({ photographerPassword: event.target.value })}
        />

        <QuestionnaireInfo
          title="Was danach schon live für Gäste sichtbar ist"
          body="Nach dem Speichern aktualisiert NiiRo Smart Wedding direkt eure Einladung mit Namen, Datum, Begrüßung, Design, Titelbild, Paarfotos, Ablauf, Dresscode, FAQ, optionalen Dienstleistern und optionalen Musikwünschen."
          tone="accent"
        />
        <div className="grid gap-3 lg:grid-cols-2">
          {guestAreaReadiness.map((item) => (
            <div
              key={item.label}
              className={cn(
                'rounded-[1.35rem] border px-4 py-4 text-sm leading-6',
                item.ready
                  ? 'border-sage-200 bg-sage-50 text-charcoal-700'
                  : 'border-cream-200 bg-white text-charcoal-600',
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    'mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                    item.ready ? 'bg-sage-100 text-sage-700' : 'bg-cream-100 text-charcoal-500',
                  )}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="font-semibold text-charcoal-900">{item.label}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em]">
                    {item.ready ? 'Bereit' : 'Noch offen'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <QuestionnaireInfo
          title="Was bewusst danach separat bleibt"
          body="RSVP-Antworten, Gästeliste, Sitzplan, Fotografen-Uploads und die PDF-Einladung greifen erst nach dieser Einrichtung. Diese Bereiche bleiben danach separat im Paarbereich verfügbar."
        />
      </div>
    )
  }

  function renderCurrentStep() {
    switch (currentStepData.id) {
      case 'basics':
        return renderBasicsStep()
      case 'venue':
        return renderVenueStep()
      case 'messages':
        return renderMessagesStep()
      case 'design':
        return renderDesignStep()
      case 'photos':
        return renderPhotosStep()
      case 'program':
        return renderProgramStep()
      case 'dresscode':
        return renderDresscodeStep()
      case 'gallery':
        return renderGalleryStep()
      case 'vendors':
        return renderVendorsStep()
      case 'faq':
        return renderFaqStep()
      case 'extras':
        return renderExtrasStep()
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="surface-card px-6 py-6 sm:px-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="neutral">Schritt {currentStep + 1} von {SETUP_QUESTIONNAIRE_STEPS.length}</Badge>
              {summaryBadges.map((label) => (
                <Badge key={label} variant="neutral">{label}</Badge>
              ))}
            </div>
            <h1 className="font-display text-card text-charcoal-900 sm:text-section">Fragebogen zur Einrichtung von NiiRo Smart Wedding</h1>
            <p className="text-body-md text-charcoal-600">
              Dieser Assistent führt euch logisch durch alle wichtigen Inhalte und Einstellungen für euren Gästebereich.
              Ihr könnt jederzeit vor- und zurückgehen, lokal weitermachen und den Stand zusätzlich in NiiRo Smart Wedding zwischenspeichern.
            </p>
          </div>
          <div className="min-w-[220px] rounded-[1.6rem] border border-gold-200 bg-gold-50 px-5 py-4">
            <p className="text-body-md font-semibold text-charcoal-900">Euer Fortschritt</p>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/80">
              <div className="h-full rounded-full bg-gold-500 transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="mt-3 text-body-md text-charcoal-600">
              Bereits gespeicherte Antworten bleiben beim späteren Fortsetzen erhalten.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <div className="surface-card px-5 py-5">
            <p className="text-eyebrow text-sage-700">Schrittübersicht</p>
            <div className="mt-4 grid gap-3">
              {SETUP_QUESTIONNAIRE_STEPS.map((step, index) => {
                const isActive = index === currentStep
                const isCompleted = index < currentStep

                return (
                  <button
                    key={step.id}
                    className={cn(
                      'rounded-[1.4rem] border px-4 py-4 text-left transition',
                      isActive
                        ? 'border-gold-500 bg-gold-50 shadow-sm'
                        : 'border-cream-200 bg-white hover:border-gold-300 hover:bg-cream-50',
                    )}
                    type="button"
                    onClick={() => goToStep(index)}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                          isActive
                            ? 'bg-gold-500 text-charcoal-900'
                            : isCompleted
                              ? 'bg-sage-100 text-sage-700'
                              : 'bg-cream-100 text-charcoal-700',
                        )}
                      >
                        {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-body-md font-semibold text-charcoal-900">{step.label}</p>
                        <p className="mt-1 text-body-md text-charcoal-600">{step.title}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <QuestionnaireInfo
            title="Wichtig zu Bildern"
            body="Titelbild, Paarfotos, Zusatzbilder und Dienstleisterbilder könnt ihr jetzt direkt im Fragebogen hochladen. Der Bereich Inhalte bleibt später trotzdem für Feinschliff verfügbar."
          />
        </aside>

        <section className="surface-card px-6 py-6 sm:px-8">
          <div className="flex flex-col gap-4 border-b border-cream-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl">
              <p className="text-eyebrow text-gold-700">{currentStepData.label}</p>
              <h2 className="mt-3 font-display text-card text-charcoal-900 sm:text-section">{currentStepData.title}</h2>
              <p className="mt-3 text-body-md text-charcoal-600">{currentStepData.description}</p>
            </div>
            <Badge variant="neutral">{currentStep + 1}/{SETUP_QUESTIONNAIRE_STEPS.length}</Badge>
          </div>

          <div className="mt-6">{renderCurrentStep()}</div>

          <div className="mt-8 flex flex-col gap-3 border-t border-cream-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-3">
              <Button
                disabled={currentStep === 0}
                type="button"
                variant="ghost"
                onClick={() => goToStep(currentStep - 1)}
              >
                <ArrowLeft className="h-4 w-4" />
                Zurück
              </Button>
              <Button
                loading={isSaving}
                type="button"
                variant="secondary"
                onClick={() => void persistQuestionnaire('Der Fragebogenstand wurde in NiiRo Smart Wedding gespeichert.')}
              >
                <Save className="h-4 w-4" />
                Zwischenspeichern
              </Button>
            </div>

            <div className="flex flex-wrap gap-3">
              {currentStep < SETUP_QUESTIONNAIRE_STEPS.length - 1 ? (
                <Button type="button" onClick={goToNextStep}>
                  Weiter
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button loading={isSaving} type="button" onClick={() => void handleFinish()}>
                  <CheckCircle2 className="h-4 w-4" />
                  Einrichtung abschließen
                </Button>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
