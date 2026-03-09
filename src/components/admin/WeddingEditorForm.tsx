'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ImagePlus, Plus, Save, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { startTransition, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { CONTENT_IMAGE_SECTION_OPTIONS, DRESSCODE_COLOR_OPTIONS } from '@/lib/constants'
import { PROGRAM_ICON_COMPONENTS, PROGRAM_ICON_OPTIONS, resolveProgramIconName } from '@/lib/program-icons'
import { normalizeProgramTimeLabel, sortProgramItemsChronologically } from '@/lib/utils/time'
import type { WeddingFontPresetId, WeddingTemplateId } from '@/lib/wedding-design'
import { cn } from '@/lib/utils/cn'
import { weddingEditorSchema, type WeddingEditorSchema } from '@/lib/validations/wedding-editor.schema'
import type { ApiResponse } from '@/types/api'
import type { WeddingConfig, WeddingEditorValues } from '@/types/wedding'

import { WeddingDesignSection } from './WeddingDesignSection'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Textarea } from '../ui/Textarea'

interface WeddingEditorFormProps {
  values: WeddingEditorValues
}

type UploadFieldPath =
  | 'coverImageUrl'
  | `couplePhotos.${number}.imageUrl`
  | `sectionImages.${number}.imageUrl`
  | `vendorProfiles.${number}.imageUrl`

const MAX_IMAGE_DIMENSIONS: Record<'cover' | 'couple' | 'section' | 'vendor', number> = {
  cover: 2400,
  couple: 1800,
  section: 1800,
  vendor: 1400,
}

const OPTIMIZED_IMAGE_QUALITY = 0.84

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

function buildFormValues(values: WeddingEditorValues): WeddingEditorSchema {
  return {
    ...values,
    weddingDate: toDateTimeLocalValue(values.weddingDate),
    rsvpDeadline: toDateTimeLocalValue(values.rsvpDeadline),
  }
}

function ImagePreview({
  imageUrl,
  altText,
  emptyLabel,
}: {
  imageUrl: string
  altText: string
  emptyLabel: string
}) {
  if (!imageUrl) {
    return (
      <div className="flex min-h-[180px] items-center justify-center rounded-[1.5rem] border border-dashed border-cream-300 bg-cream-50 px-4 py-6 text-center text-sm text-charcoal-500">
        {emptyLabel}
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

export function WeddingEditorForm({ values }: WeddingEditorFormProps) {
  const router = useRouter()
  const [uploadingTargets, setUploadingTargets] = useState<Record<string, boolean>>({})
  const [pendingEmbeddedImages, setPendingEmbeddedImages] = useState<Record<string, string>>({})
  const form = useForm<WeddingEditorSchema>({
    resolver: zodResolver(weddingEditorSchema),
    defaultValues: buildFormValues(values),
  })

  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    setValue,
    watch,
  } = form

  const selectedDressCodeColors = watch('dressCodeColors') ?? []
  const selectedTemplateId = watch('templateId')
  const selectedFontPresetId = watch('fontPresetId')
  const watchedCoverImage = watch('coverImageUrl')
  const watchedCouplePhotos = watch('couplePhotos') ?? []
  const watchedSectionImages = watch('sectionImages') ?? []
  const watchedVendorProfiles = watch('vendorProfiles') ?? []
  const watchedProgramItems = watch('programItems') ?? []
  const sourceId = watch('sourceId') || values.sourceId

  const couplePhotos = useFieldArray({
    control,
    name: 'couplePhotos',
  })

  const sectionImages = useFieldArray({
    control,
    name: 'sectionImages',
  })

  const vendorProfiles = useFieldArray({
    control,
    name: 'vendorProfiles',
  })

  const programItems = useFieldArray({
    control,
    name: 'programItems',
  })

  const faqItems = useFieldArray({
    control,
    name: 'faqItems',
  })

  const onSubmit = handleSubmit(async (nextValues) => {
    const mergedValues = mergePendingImages(nextValues)
    const response = await fetch('/api/admin/wedding', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...mergedValues,
        weddingDate: toPersistedDate(mergedValues.weddingDate),
        rsvpDeadline: toPersistedDate(mergedValues.rsvpDeadline),
      }),
    })

    const result = (await response.json()) as ApiResponse<WeddingConfig>

    if (!response.ok || !result.success) {
      toast.error(result.success ? 'Speichern fehlgeschlagen.' : result.error)
      return
    }

    toast.success(result.message ?? 'Die Hochzeitsdaten wurden gespeichert.')
    startTransition(() => {
      router.refresh()
    })
  })

  function toggleDressCodeColor(value: string) {
    const nextValues = selectedDressCodeColors.includes(value)
      ? selectedDressCodeColors.filter((entry) => entry !== value)
      : [...selectedDressCodeColors, value]

    setValue('dressCodeColors', nextValues, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  function selectTemplate(value: WeddingTemplateId) {
    setValue('templateId', value, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  function selectFontPreset(value: WeddingFontPresetId) {
    setValue('fontPresetId', value, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  function normalizeProgramItemTime(index: number) {
    const currentValue = watch(`programItems.${index}.timeLabel`)
    const normalizedValue = normalizeProgramTimeLabel(currentValue)

    if (normalizedValue !== currentValue) {
      setValue(`programItems.${index}.timeLabel`, normalizedValue, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })
    }

    const sortedItems = sortProgramItemsChronologically(
      form.getValues('programItems').map((item, currentIndex) => ({
        ...item,
        timeLabel: currentIndex === index ? normalizedValue : normalizeProgramTimeLabel(item.timeLabel),
        sortOrder: currentIndex,
      })),
    ).map(({ sortOrder, ...item }) => item)

    programItems.replace(sortedItems)
  }

  function isEmbeddedImage(value: string | undefined): boolean {
    return Boolean(value?.startsWith('data:image/'))
  }

  function getPreviewValue(targetPath: UploadFieldPath, currentValue: string | undefined): string {
    return pendingEmbeddedImages[targetPath] ?? currentValue ?? ''
  }

  function clearImageValue(targetPath: UploadFieldPath) {
    setPendingEmbeddedImages((current) => {
      const nextState = { ...current }
      delete nextState[targetPath]
      return nextState
    })

    setValue(targetPath, '', {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
  }

  function resolveOptimizedImageType(file: File): 'image/jpeg' | 'image/webp' {
    return file.type === 'image/png' || file.type === 'image/webp' ? 'image/webp' : 'image/jpeg'
  }

  function replaceFileExtension(fileName: string, nextExtension: 'jpg' | 'webp'): string {
    const sanitized = fileName.replace(/\.[a-z0-9]+$/i, '')
    return `${sanitized || 'bild'}.${nextExtension}`
  }

  async function buildOptimizedImageAsset(
    file: File,
    folder: 'cover' | 'couple' | 'section' | 'vendor',
  ): Promise<{ dataUrl: string; file: File }> {
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
      const dataUrl = canvas.toDataURL(outputType, OPTIMIZED_IMAGE_QUALITY)
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, outputType, OPTIMIZED_IMAGE_QUALITY)
      })

      if (!blob) {
        throw new Error('Das Bild konnte nicht verarbeitet werden.')
      }

      const outputFile = new File(
        [blob],
        replaceFileExtension(file.name, outputType === 'image/webp' ? 'webp' : 'jpg'),
        {
          type: outputType,
          lastModified: file.lastModified,
        },
      )

      return {
        dataUrl,
        file: outputFile,
      }
    } finally {
      URL.revokeObjectURL(imageUrl)
    }
  }

  async function createEmbeddedImageDataUrl(
    file: File,
    folder: 'cover' | 'couple' | 'section' | 'vendor',
  ): Promise<string> {
    const asset = await buildOptimizedImageAsset(file, folder)
    return asset.dataUrl
  }

  function mergePendingImages(nextValues: WeddingEditorSchema): WeddingEditorSchema {
    return {
      ...nextValues,
      coverImageUrl: pendingEmbeddedImages.coverImageUrl ?? nextValues.coverImageUrl,
      couplePhotos: nextValues.couplePhotos.map((item, index) => ({
        ...item,
        imageUrl:
          pendingEmbeddedImages[`couplePhotos.${index}.imageUrl` as UploadFieldPath] ?? item.imageUrl,
      })),
      sectionImages: nextValues.sectionImages.map((item, index) => ({
        ...item,
        imageUrl:
          pendingEmbeddedImages[`sectionImages.${index}.imageUrl` as UploadFieldPath] ?? item.imageUrl,
      })),
      vendorProfiles: nextValues.vendorProfiles.map((item, index) => ({
        ...item,
        imageUrl:
          pendingEmbeddedImages[`vendorProfiles.${index}.imageUrl` as UploadFieldPath] ?? item.imageUrl,
      })),
    }
  }

  async function uploadImageFile(input: {
    file: File
    targetKey: string
    targetPath: UploadFieldPath
    folder: 'cover' | 'couple' | 'section' | 'vendor'
  }) {
    setUploadingTargets((current) => ({
      ...current,
      [input.targetKey]: true,
    }))

    try {
      const formData = new FormData()
      formData.append('sourceId', sourceId)
      formData.append('folder', input.folder)
      formData.append('file', input.file)

      const response = await fetch('/api/admin/content-images', {
        method: 'POST',
        body: formData,
      })

      const result = (await response.json()) as ApiResponse<{ publicUrl: string; path: string }>

      if (!response.ok || !result.success) {
        if (!result.success && result.code === 'UPLOAD_FAILED') {
          const embeddedImage = await createEmbeddedImageDataUrl(input.file, input.folder)

          setPendingEmbeddedImages((current) => ({
            ...current,
            [input.targetPath]: embeddedImage,
          }))
          setValue(input.targetPath, 'data:image/pending;base64,embedded', {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
          })
          toast.success('Das Bild wurde eingebettet. Bitte anschließend speichern.')
          return
        }

        toast.error(result.success ? 'Upload fehlgeschlagen.' : result.error)
        return
      }

      setPendingEmbeddedImages((current) => {
        const nextState = { ...current }
        delete nextState[input.targetPath]
        return nextState
      })
      setValue(input.targetPath, result.data.publicUrl, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })
      toast.success('Das Bild wurde hochgeladen. Bitte anschließend speichern.')
    } catch {
      const embeddedImage = await createEmbeddedImageDataUrl(input.file, input.folder)

      setPendingEmbeddedImages((current) => ({
        ...current,
        [input.targetPath]: embeddedImage,
      }))
      setValue(input.targetPath, 'data:image/pending;base64,embedded', {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })
      toast.success('Das Bild wurde eingebettet. Bitte anschließend speichern.')
    } finally {
      setUploadingTargets((current) => {
        const nextState = { ...current }
        delete nextState[input.targetKey]
        return nextState
      })
    }
  }

  async function handleUploadChange(
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

    try {
      const optimizedAsset = await buildOptimizedImageAsset(file, input.folder)

      await uploadImageFile({
        file: optimizedAsset.file,
        targetKey: input.targetKey,
        targetPath: input.targetPath,
        folder: input.folder,
      })
    } finally {
      event.target.value = ''
    }
  }

  return (
    <form className="space-y-8" onSubmit={onSubmit}>
      <div className="grid gap-4 lg:grid-cols-2">
        <Input label="Name des Brautpaares" error={errors.coupleLabel?.message} {...form.register('coupleLabel')} />
        <Input label="Gästecode" error={errors.guestCode?.message} {...form.register('guestCode')} />
        <Input
          label="Hochzeitsdatum"
          error={errors.weddingDate?.message}
          type="datetime-local"
          {...form.register('weddingDate')}
        />
        <Input
          label="RSVP-Frist"
          error={errors.rsvpDeadline?.message}
          type="datetime-local"
          {...form.register('rsvpDeadline')}
        />
        <Input label="Ort" error={errors.venueName?.message} {...form.register('venueName')} />
        <Input
          label="Fotografen-Passwort"
          error={errors.photographerPassword?.message}
          {...form.register('photographerPassword')}
        />
      </div>

      <Input label="Adresse" error={errors.venueAddress?.message} {...form.register('venueAddress')} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Textarea
          label="Begrüßungstext"
          error={errors.welcomeMessage?.message}
          {...form.register('welcomeMessage')}
        />
        <Textarea
          label="Einladungstext"
          error={errors.invitationStory?.message}
          {...form.register('invitationStory')}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Input label="Formular-Titel" error={errors.formTitle?.message} {...form.register('formTitle')} />
        <Input
          label="Bestätigungs-Titel"
          error={errors.successTitle?.message}
          {...form.register('successTitle')}
        />
        <Textarea
          label="Formular-Beschreibung"
          error={errors.formDescription?.message}
          {...form.register('formDescription')}
        />
        <Textarea
          label="Bestätigungs-Text"
          error={errors.successDescription?.message}
          {...form.register('successDescription')}
        />
      </div>

      <div className="space-y-4">
        <h3 className="font-display text-card text-charcoal-900">Optionale Gästefunktionen</h3>
        <label className="flex items-start gap-3 rounded-[1.5rem] border border-cream-300 bg-white px-5 py-4 text-sm text-charcoal-700">
          <input
            className="mt-1 h-4 w-4 accent-gold-500"
            type="checkbox"
            {...form.register('musicWishlistEnabled')}
          />
          <span className="space-y-1">
            <span className="block font-semibold text-charcoal-900">Musikwunschliste aktivieren</span>
            <span className="block">
              Wenn aktiv, sehen Gäste im Gästebereich eine öffentliche Musikwunschliste, können Songs
              hinzufügen, per Daumen hoch voten und die Top 10 werden hervorgehoben.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-[1.5rem] border border-cream-300 bg-white px-5 py-4 text-sm text-charcoal-700">
          <input
            className="mt-1 h-4 w-4 accent-gold-500"
            type="checkbox"
            {...form.register('sharePrivateGalleryWithGuests')}
          />
          <span className="space-y-1">
            <span className="block font-semibold text-charcoal-900">Privaten Fotobereich für Gäste freigeben</span>
            <span className="block">
              Wenn aktiv, sehen Gäste zusätzlich zu den öffentlichen Bildern auch Fotos aus dem privaten Bereich.
              Wenn deaktiviert, bleibt der private Bereich nur für euch im Paarbereich sichtbar.
            </span>
          </span>
        </label>
      </div>

      <WeddingDesignSection
        selectedTemplateId={selectedTemplateId}
        selectedFontPresetId={selectedFontPresetId}
        onSelectTemplate={selectTemplate}
        onSelectFontPreset={selectFontPreset}
      />

      <div className="space-y-4">
        <h3 className="font-display text-card text-charcoal-900">Bilder für eure Gäste</h3>
        <p className="max-w-3xl text-sm text-charcoal-600">
          Hier könnt ihr euch selbst mit Fotos auf der Einladung zeigen und zusätzliche Bilder für
          einzelne Bereiche hinterlegen. Die Bilder erscheinen direkt in der Gästeseite und in eurer Vorschau.
        </p>

        <div className="grid gap-4 lg:grid-cols-2">
          <Input label="Galerie-Titel" error={errors.galleryTitle?.message} {...form.register('galleryTitle')} />
          <div className="space-y-3">
            {isEmbeddedImage(getPreviewValue('coverImageUrl', watchedCoverImage)) ? (
              <div className="space-y-3">
                <input type="hidden" {...form.register('coverImageUrl')} />
                <div className="rounded-[1.5rem] border border-cream-200 bg-cream-50 px-4 py-4 text-sm text-charcoal-600">
                  {pendingEmbeddedImages.coverImageUrl
                    ? 'Das Titelbild wird beim Speichern direkt mit eurer Hochzeit gespeichert.'
                    : 'Für das Titelbild ist bereits eine eingebettete Datei gespeichert.'}
                </div>
                <ImagePreview
                  altText={`${values.coupleLabel} Titelbild`}
                  emptyLabel="Noch kein Titelbild hinterlegt."
                  imageUrl={getPreviewValue('coverImageUrl', watchedCoverImage)}
                />
                <div className="flex flex-wrap gap-3">
                  <Button type="button" variant="ghost" onClick={() => clearImageValue('coverImageUrl')}>
                    Titelbild entfernen
                  </Button>
                </div>
              </div>
            ) : (
              <Input
                label="Titelbild / Hero-Bild-URL"
                error={errors.coverImageUrl?.message}
                helperText="Optional. Dieses Bild erscheint als grosses Titelmotiv oberhalb eurer Begruessung. Querformat oder weiche Illustrationen wirken hier meist am besten."
                {...form.register('coverImageUrl')}
              />
            )}
            <div className="flex flex-wrap gap-3">
              <UploadFileControl
                isLoading={Boolean(uploadingTargets.coverImageUrl)}
                label="Titelbild hochladen"
                onChange={(event) =>
                  handleUploadChange(event, {
                    targetKey: 'coverImageUrl',
                    targetPath: 'coverImageUrl',
                    folder: 'cover',
                  })
                }
              />
            </div>
          </div>
        </div>

        <Textarea
          label="Galerie-Beschreibung"
          error={errors.galleryDescription?.message}
          {...form.register('galleryDescription')}
        />

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h4 className="font-display text-card text-charcoal-900">Brautpaarfotos</h4>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                couplePhotos.append({
                  id: `couple-photo-${Date.now()}`,
                  imageUrl: '',
                  altText: '',
                  caption: '',
                })
              }
            >
              <Plus className="h-4 w-4" />
              Foto hinzufügen
            </Button>
          </div>

          {couplePhotos.fields.length ? (
            <div className="space-y-4">
              {couplePhotos.fields.map((field, index) => (
                <div
                  key={field.id}
                  className="rounded-[1.75rem] border border-cream-200 bg-white px-5 py-5"
                >
                  <div className="mb-4 flex justify-end">
                    <Button type="button" variant="ghost" onClick={() => couplePhotos.remove(index)}>
                      <Trash2 className="h-4 w-4" />
                      Entfernen
                    </Button>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
                    <div className="space-y-4">
                      {isEmbeddedImage(
                        getPreviewValue(
                          `couplePhotos.${index}.imageUrl`,
                          watchedCouplePhotos[index]?.imageUrl,
                        ),
                      ) ? (
                        <div className="space-y-3">
                          <input type="hidden" {...form.register(`couplePhotos.${index}.imageUrl`)} />
                          <div className="rounded-[1.5rem] border border-cream-200 bg-cream-50 px-4 py-4 text-sm text-charcoal-600">
                            {pendingEmbeddedImages[`couplePhotos.${index}.imageUrl`]
                              ? 'Dieses Foto wird beim Speichern direkt mit eurer Hochzeit gespeichert.'
                              : 'Für dieses Brautpaarfoto ist bereits eine eingebettete Datei gespeichert.'}
                          </div>
                          <div className="flex flex-wrap gap-3">
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => clearImageValue(`couplePhotos.${index}.imageUrl`)}
                            >
                              Bild entfernen
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Input
                          label="Bild-URL"
                          error={errors.couplePhotos?.[index]?.imageUrl?.message}
                          helperText="Öffentliche Bild-URL, zum Beispiel aus Supabase Storage."
                          {...form.register(`couplePhotos.${index}.imageUrl`)}
                        />
                      )}
                      <div className="flex flex-wrap gap-3">
                        <UploadFileControl
                          isLoading={Boolean(uploadingTargets[`couple-${index}`])}
                          label="Brautpaarfoto hochladen"
                          onChange={(event) =>
                            handleUploadChange(event, {
                              targetKey: `couple-${index}`,
                              targetPath: `couplePhotos.${index}.imageUrl`,
                              folder: 'couple',
                            })
                          }
                        />
                      </div>
                      <Input
                        label="Alternativtext"
                        error={errors.couplePhotos?.[index]?.altText?.message}
                        helperText="Zum Beispiel: Robin und Anina im Garten."
                        {...form.register(`couplePhotos.${index}.altText`)}
                      />
                      <Input
                        label="Bildunterschrift"
                        error={errors.couplePhotos?.[index]?.caption?.message}
                        helperText="Optional, erscheint unter dem Foto."
                        {...form.register(`couplePhotos.${index}.caption`)}
                      />
                    </div>
                    <ImagePreview
                      altText={watchedCouplePhotos[index]?.altText ?? ''}
                      emptyLabel="Die Vorschau erscheint, sobald eine Bild-URL eingetragen ist."
                      imageUrl={getPreviewValue(
                        `couplePhotos.${index}.imageUrl`,
                        watchedCouplePhotos[index]?.imageUrl,
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[1.75rem] border border-dashed border-cream-300 bg-cream-50 px-5 py-6 text-sm text-charcoal-600">
              Noch keine Brautpaarfotos hinterlegt.
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h4 className="font-display text-card text-charcoal-900">Bereichsbilder</h4>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                sectionImages.append({
                  id: `section-image-${Date.now()}`,
                  section: 'programm',
                  title: '',
                  imageUrl: '',
                  altText: '',
                })
              }
            >
              <Plus className="h-4 w-4" />
              Bild hinzufügen
            </Button>
          </div>

          {sectionImages.fields.length ? (
            <div className="space-y-4">
              {sectionImages.fields.map((field, index) => (
                <div
                  key={field.id}
                  className="rounded-[1.75rem] border border-cream-200 bg-white px-5 py-5"
                >
                  <div className="mb-4 flex justify-end">
                    <Button type="button" variant="ghost" onClick={() => sectionImages.remove(index)}>
                      <Trash2 className="h-4 w-4" />
                      Entfernen
                    </Button>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
                    <div className="space-y-4">
                      <div className="grid gap-4 lg:grid-cols-2">
                        <Select
                          label="Bereich"
                          options={CONTENT_IMAGE_SECTION_OPTIONS.map((option) => ({
                            value: option.value,
                            label: option.label,
                          }))}
                          error={errors.sectionImages?.[index]?.section?.message}
                          {...form.register(`sectionImages.${index}.section`)}
                        />
                        <Input
                          label="Titel"
                          error={errors.sectionImages?.[index]?.title?.message}
                          helperText="Optional, erscheint unter dem Bild."
                          {...form.register(`sectionImages.${index}.title`)}
                        />
                      </div>
                      {isEmbeddedImage(
                        getPreviewValue(
                          `sectionImages.${index}.imageUrl`,
                          watchedSectionImages[index]?.imageUrl,
                        ),
                      ) ? (
                        <div className="space-y-3">
                          <input type="hidden" {...form.register(`sectionImages.${index}.imageUrl`)} />
                          <div className="rounded-[1.5rem] border border-cream-200 bg-cream-50 px-4 py-4 text-sm text-charcoal-600">
                            {pendingEmbeddedImages[`sectionImages.${index}.imageUrl`]
                              ? 'Dieses Bereichsbild wird beim Speichern direkt mit eurer Hochzeit gespeichert.'
                              : 'Für dieses Bereichsbild ist bereits eine eingebettete Datei gespeichert.'}
                          </div>
                          <div className="flex flex-wrap gap-3">
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => clearImageValue(`sectionImages.${index}.imageUrl`)}
                            >
                              Bild entfernen
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Input
                          label="Bild-URL"
                          error={errors.sectionImages?.[index]?.imageUrl?.message}
                          helperText="Öffentliche Bild-URL für den gewählten Gästebereich."
                          {...form.register(`sectionImages.${index}.imageUrl`)}
                        />
                      )}
                      <div className="flex flex-wrap gap-3">
                        <UploadFileControl
                          isLoading={Boolean(uploadingTargets[`section-${index}`])}
                          label="Bereichsbild hochladen"
                          onChange={(event) =>
                            handleUploadChange(event, {
                              targetKey: `section-${index}`,
                              targetPath: `sectionImages.${index}.imageUrl`,
                              folder: 'section',
                            })
                          }
                        />
                      </div>
                      <Input
                        label="Alternativtext"
                        error={errors.sectionImages?.[index]?.altText?.message}
                        helperText="Kurze Bildbeschreibung für Barrierefreiheit."
                        {...form.register(`sectionImages.${index}.altText`)}
                      />
                    </div>
                    <ImagePreview
                      altText={watchedSectionImages[index]?.altText ?? ''}
                      emptyLabel="Die Vorschau erscheint, sobald eine Bild-URL eingetragen ist."
                      imageUrl={getPreviewValue(
                        `sectionImages.${index}.imageUrl`,
                        watchedSectionImages[index]?.imageUrl,
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[1.75rem] border border-dashed border-cream-300 bg-cream-50 px-5 py-6 text-sm text-charcoal-600">
              Noch keine Bereichsbilder hinterlegt.
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-card text-charcoal-900">Dienstleister</h3>
            <p className="mt-2 max-w-3xl text-sm text-charcoal-600">
              Optional. Hier könnt ihr euren Gästen die Menschen hinter Catering, Musik, Trauung,
              Fotos oder Dekoration vorstellen. Wenn keine Einträge hinterlegt sind, erscheint im
              Gästebereich auch kein Navigationspunkt.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              vendorProfiles.append({
                id: `vendor-${Date.now()}`,
                name: '',
                role: '',
                websiteUrl: '',
                instagramUrl: '',
                imageUrl: '',
              })
            }
          >
            <Plus className="h-4 w-4" />
            Dienstleister hinzufügen
          </Button>
        </div>

        {vendorProfiles.fields.length ? (
          <div className="space-y-4">
            {vendorProfiles.fields.map((field, index) => (
              <div key={field.id} className="rounded-[1.75rem] border border-cream-200 bg-white px-5 py-5">
                <div className="mb-4 flex justify-end">
                  <Button type="button" variant="ghost" onClick={() => vendorProfiles.remove(index)}>
                    <Trash2 className="h-4 w-4" />
                    Entfernen
                  </Button>
                </div>
                <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
                  <div className="space-y-4">
                    <div className="grid gap-4 lg:grid-cols-2">
                      <Input
                        label="Name"
                        error={errors.vendorProfiles?.[index]?.name?.message}
                        helperText="Zum Beispiel: Studio Elara oder DJ Nox."
                        {...form.register(`vendorProfiles.${index}.name`)}
                      />
                      <Input
                        label="Funktion"
                        error={errors.vendorProfiles?.[index]?.role?.message}
                        helperText="Zum Beispiel: Caterer, Fotograf, DJ oder Trauredner."
                        {...form.register(`vendorProfiles.${index}.role`)}
                      />
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <Input
                        label="Website"
                        error={errors.vendorProfiles?.[index]?.websiteUrl?.message}
                        helperText="Optional. Bitte als vollständige URL mit https:// angeben."
                        {...form.register(`vendorProfiles.${index}.websiteUrl`)}
                      />
                      <Input
                        label="Instagram"
                        error={errors.vendorProfiles?.[index]?.instagramUrl?.message}
                        helperText="Optional. Bitte als vollständige URL mit https:// angeben."
                        {...form.register(`vendorProfiles.${index}.instagramUrl`)}
                      />
                    </div>
                    {isEmbeddedImage(
                      getPreviewValue(
                        `vendorProfiles.${index}.imageUrl`,
                        watchedVendorProfiles[index]?.imageUrl,
                      ),
                    ) ? (
                      <div className="space-y-3">
                        <input type="hidden" {...form.register(`vendorProfiles.${index}.imageUrl`)} />
                        <div className="rounded-[1.5rem] border border-cream-200 bg-cream-50 px-4 py-4 text-sm text-charcoal-600">
                          {pendingEmbeddedImages[`vendorProfiles.${index}.imageUrl`]
                            ? 'Dieses Profilbild wird beim Speichern direkt mit eurer Hochzeit gespeichert.'
                            : 'Für dieses Profilbild ist bereits eine eingebettete Datei gespeichert.'}
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => clearImageValue(`vendorProfiles.${index}.imageUrl`)}
                          >
                            Bild entfernen
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Input
                        label="Profilbild-URL"
                        error={errors.vendorProfiles?.[index]?.imageUrl?.message}
                        helperText="Optional. Ein Portrait oder Logo macht den Bereich persönlicher."
                        {...form.register(`vendorProfiles.${index}.imageUrl`)}
                      />
                    )}
                    <div className="flex flex-wrap gap-3">
                      <UploadFileControl
                        isLoading={Boolean(uploadingTargets[`vendor-${index}`])}
                        label="Profilbild hochladen"
                        onChange={(event) =>
                          handleUploadChange(event, {
                            targetKey: `vendor-${index}`,
                            targetPath: `vendorProfiles.${index}.imageUrl`,
                            folder: 'vendor',
                          })
                        }
                      />
                    </div>
                  </div>
                  <ImagePreview
                    altText={watchedVendorProfiles[index]?.name ?? ''}
                    emptyLabel="Die Vorschau erscheint, sobald ein Profilbild hinterlegt ist."
                    imageUrl={getPreviewValue(
                      `vendorProfiles.${index}.imageUrl`,
                      watchedVendorProfiles[index]?.imageUrl,
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[1.75rem] border border-dashed border-cream-300 bg-cream-50 px-5 py-6 text-sm text-charcoal-600">
            Noch keine Dienstleister hinterlegt. Wenn ihr diesen Bereich nicht nutzen möchtet, könnt
            ihr ihn einfach leer lassen.
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="font-display text-card text-charcoal-900">Dresscode</h3>
        <Textarea
          label="Hinweis zum Dresscode"
          error={errors.dressCodeNote?.message}
          helperText="Zum Beispiel: Festlich, gerne in unserer Farbwelt und ohne reines Weiß."
          {...form.register('dressCodeNote')}
        />
        <div className="grid gap-4 lg:grid-cols-3">
          <Textarea
            label="Hinweis für Damen"
            error={errors.dressCodeWomen?.message}
            helperText="Zum Beispiel: Midi- oder Maxikleider, elegante Zweiteiler oder Jumpsuits."
            {...form.register('dressCodeWomen')}
          />
          <Textarea
            label="Hinweis für Herren"
            error={errors.dressCodeMen?.message}
            helperText="Zum Beispiel: Anzug, Sakko mit Stoffhose oder sommerlich-elegant."
            {...form.register('dressCodeMen')}
          />
          <Textarea
            label="Zusatzhinweis"
            error={errors.dressCodeExtras?.message}
            helperText="Zum Beispiel: Bitte möglichst auf reinweiß verzichten."
            {...form.register('dressCodeExtras')}
          />
        </div>
        <div className="space-y-3">
          <p className="text-sm font-medium text-charcoal-700">Farbpalette für Gäste</p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {DRESSCODE_COLOR_OPTIONS.map((color) => {
              const isSelected = selectedDressCodeColors.includes(color.value)

              return (
                <button
                  key={color.value}
                  className={cn(
                    'flex min-h-14 items-center gap-3 rounded-[1.25rem] border px-4 py-3 text-left transition',
                    isSelected
                      ? 'border-gold-500 bg-gold-50 shadow-elegant'
                      : 'border-cream-300 bg-white hover:border-gold-300',
                  )}
                  type="button"
                  onClick={() => toggleDressCodeColor(color.value)}
                >
                  <span
                    className="inline-flex h-7 w-7 shrink-0 rounded-full border border-white shadow-sm"
                    style={{ backgroundColor: color.hex }}
                  />
                  <span className="text-sm font-semibold text-charcoal-800">{color.label}</span>
                </button>
              )
            })}
          </div>
          {errors.dressCodeColors?.message ? (
            <p className="text-sm text-red-600">{errors.dressCodeColors.message}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-display text-card text-charcoal-900">Tagesablauf</h3>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              programItems.append({
                id: `program-${Date.now()}`,
                timeLabel: '',
                title: '',
                description: '',
                icon: '',
              })
            }
          >
            <Plus className="h-4 w-4" />
            Programmpunkt
          </Button>
        </div>
        <div className="space-y-4">
          {programItems.fields.map((field, index) => {
            const selectedIcon = watchedProgramItems[index]?.icon ?? ''
            const PreviewIcon = PROGRAM_ICON_COMPONENTS[
              resolveProgramIconName({
                icon: selectedIcon,
                title: watchedProgramItems[index]?.title ?? null,
                description: watchedProgramItems[index]?.description ?? null,
              })
            ]

            return (
              <div key={field.id} className="rounded-[1.75rem] border border-cream-200 bg-white px-5 py-5">
                <input type="hidden" {...form.register(`programItems.${index}.icon`)} />
                <div className="grid gap-4 lg:grid-cols-[140px_1fr_auto]">
                  <Input
                    label="Uhrzeit"
                    error={errors.programItems?.[index]?.timeLabel?.message}
                    helperText="Zum Beispiel 17:00. Eingaben wie 17, 1700 oder 17.00 werden automatisch korrigiert."
                    {...form.register(`programItems.${index}.timeLabel`)}
                    onBlur={() => normalizeProgramItemTime(index)}
                  />
                  <Input
                    label="Titel"
                    error={errors.programItems?.[index]?.title?.message}
                    {...form.register(`programItems.${index}.title`)}
                  />
                  <div className="flex items-end">
                    <Button type="button" variant="ghost" onClick={() => programItems.remove(index)}>
                      <Trash2 className="h-4 w-4" />
                      Entfernen
                    </Button>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-charcoal-700">Passendes Icon</p>
                    <span className="inline-flex items-center gap-2 text-sm text-charcoal-500">
                      <PreviewIcon className="h-4 w-4 text-gold-700" />
                      Vorschau
                    </span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <button
                      className={cn(
                        'flex min-h-14 items-center gap-3 rounded-[1.25rem] border px-4 py-3 text-left transition',
                        !selectedIcon
                          ? 'border-gold-500 bg-gold-50 shadow-elegant'
                          : 'border-cream-300 bg-white hover:border-gold-300',
                      )}
                      type="button"
                      onClick={() =>
                        setValue(`programItems.${index}.icon`, '', {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        })
                      }
                    >
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream-100 text-gold-700">
                        <PreviewIcon className="h-4 w-4" />
                      </span>
                      <span className="space-y-1">
                        <span className="block text-sm font-semibold text-charcoal-800">Automatisch</span>
                        <span className="block text-xs leading-5 text-charcoal-500">
                          Das Icon wird anhand von Titel und Beschreibung gewählt.
                        </span>
                      </span>
                    </button>
                    {PROGRAM_ICON_OPTIONS.map((option) => {
                      const Icon = option.icon
                      const isSelected = selectedIcon === option.value

                      return (
                        <button
                          key={`${field.id}-${option.value}`}
                          className={cn(
                            'flex min-h-14 items-center gap-3 rounded-[1.25rem] border px-4 py-3 text-left transition',
                            isSelected
                              ? 'border-gold-500 bg-gold-50 shadow-elegant'
                              : 'border-cream-300 bg-white hover:border-gold-300',
                          )}
                          type="button"
                          onClick={() =>
                            setValue(`programItems.${index}.icon`, option.value, {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            })
                          }
                        >
                          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream-100 text-gold-700">
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="space-y-1">
                            <span className="block text-sm font-semibold text-charcoal-800">{option.label}</span>
                            <span className="block text-xs leading-5 text-charcoal-500">{option.description}</span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  {errors.programItems?.[index]?.icon?.message ? (
                    <p className="text-sm text-red-600">{errors.programItems?.[index]?.icon?.message}</p>
                  ) : null}
                </div>
                <div className="mt-4">
                  <Textarea
                    label="Beschreibung"
                    error={errors.programItems?.[index]?.description?.message}
                    {...form.register(`programItems.${index}.description`)}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-display text-card text-charcoal-900">Häufige Fragen</h3>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              faqItems.append({
                id: `faq-${Date.now()}`,
                question: '',
                answer: '',
              })
            }
          >
            <Plus className="h-4 w-4" />
            FAQ hinzufügen
          </Button>
        </div>
        <div className="space-y-4">
          {faqItems.fields.map((field, index) => (
            <div key={field.id} className="rounded-[1.75rem] border border-cream-200 bg-white px-5 py-5">
              <div className="flex justify-end">
                <Button type="button" variant="ghost" onClick={() => faqItems.remove(index)}>
                  <Trash2 className="h-4 w-4" />
                  Entfernen
                </Button>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <Input
                  label="Frage"
                  error={errors.faqItems?.[index]?.question?.message}
                  {...form.register(`faqItems.${index}.question`)}
                />
                <Textarea
                  label="Antwort"
                  error={errors.faqItems?.[index]?.answer?.message}
                  {...form.register(`faqItems.${index}.answer`)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <Button loading={isSubmitting} size="lg" type="submit">
        <Save className="h-4 w-4" />
        Änderungen speichern
      </Button>
    </form>
  )
}
