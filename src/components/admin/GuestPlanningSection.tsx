'use client'

import {
  Baby,
  Building2,
  FileDown,
  Heart,
  Minus,
  Music4,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Users,
  WandSparkles,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { startTransition, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { SeatingPlanVisualizer, type SeatingPlanVisualTable } from '@/components/seating/SeatingPlanVisualizer'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { GUEST_CATEGORY_LABELS, GUEST_CATEGORY_OPTIONS } from '@/lib/constants'
import {
  SEATING_TABLE_KIND_LABELS,
  SEATING_TABLE_SHAPE_LABELS,
  SEATING_TABLE_SHAPE_OPTIONS,
  getDefaultSeatCountForKind,
  getDefaultTableName,
  getDefaultTableShapeForKind,
  getTableBadgeVariant,
  type SeatingViewMode,
} from '@/lib/seating-plan'
import type { ApiResponse } from '@/types/api'
import type { BuffetSong, GuestCategory, PlanningGuest, RsvpRecord, SeatingPlanData, SeatingTable } from '@/types/wedding'

const COUPLE_GROUP_LABEL = 'Brautpaar'
const selectClassName =
  'min-h-11 rounded-2xl border border-cream-300 bg-white px-4 py-3 text-base text-charcoal-900 outline-none transition focus:border-gold-500'
const CATEGORY_PRIORITY: Record<GuestCategory, number> = {
  vendors: 7,
  bridal_party: 6,
  family: 5,
  close_friends: 4,
  friends: 3,
  work: 2,
  children: 2,
  single: 1,
  other: 0,
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeSeatAssignments(seatAssignments: Array<string | null>, seatCount: number) {
  const next = seatAssignments.slice(0, seatCount).map((entry) => entry || null)
  while (next.length < seatCount) next.push(null)
  return next
}

function buildCoupleGuests(coupleNames: string[]): PlanningGuest[] {
  return coupleNames
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name, index) => ({
      id: `couple-${index + 1}`,
      name,
      kind: 'adult' as const,
      category: 'bridal_party' as const,
      householdId: null,
      groupLabel: COUPLE_GROUP_LABEL,
      requiresHighChair: false,
      notes: null,
    }))
}

function ensureCoupleGuests(guests: PlanningGuest[], coupleNames: string[]) {
  const coupleGuests = buildCoupleGuests(coupleNames)
  const coupleIds = new Set(coupleGuests.map((guest) => guest.id))
  const guestById = new Map(guests.map((guest) => [guest.id, guest]))
  return [
    ...coupleGuests.map((guest) => ({ ...guest, notes: guestById.get(guest.id)?.notes ?? null })),
    ...guests.filter((guest) => !coupleIds.has(guest.id)),
  ]
}

function createTable(index: number, kind: SeatingTable['kind'] = 'guest', seatCount = getDefaultSeatCountForKind(kind)): SeatingTable {
  return {
    id: createId('table'),
    name: getDefaultTableName(kind, index),
    kind,
    shape: getDefaultTableShapeForKind(kind),
    buffetSongId: null,
    seatCount,
    seatAssignments: Array.from({ length: seatCount }, () => null),
  }
}

function buildRsvpGuests(rsvp: RsvpRecord, guestById: Map<string, PlanningGuest>): PlanningGuest[] {
  if (!rsvp.isAttending) return []
  const label = `${rsvp.guestName.trim()} Haushalt`
  const leadName = rsvp.guestName.trim() || 'Hauptgast'
  const namedAdults = [rsvp.guestName, rsvp.plusOneName]
    .filter((entry): entry is string => Boolean(entry?.trim()))
    .map((entry) => entry.trim())
  const adultCount = Math.max(1, rsvp.totalGuests - rsvp.smallChildrenCount)

  const adults = Array.from({ length: adultCount }, (_, index) => {
    const id = `rsvp-${rsvp.id}-adult-${index + 1}`
    const existing = guestById.get(id)
    return {
      id,
      name: namedAdults[index] ?? `Begleitung von ${leadName} ${index - namedAdults.length + 1}`,
      kind: 'adult' as const,
      category: existing?.category ?? (adultCount === 1 && rsvp.smallChildrenCount === 0 ? 'single' : 'other'),
      householdId: rsvp.id,
      groupLabel: existing?.groupLabel ?? label,
      requiresHighChair: false,
      notes: existing?.notes ?? null,
    }
  })

  const children = Array.from({ length: rsvp.smallChildrenCount }, (_, index) => {
    const id = `rsvp-${rsvp.id}-child-${index + 1}`
    const existing = guestById.get(id)
    return {
      id,
      name: `Kind ${index + 1} von ${leadName}`,
      kind: 'child' as const,
      category: 'children' as const,
      householdId: rsvp.id,
      groupLabel: label,
      requiresHighChair: index < rsvp.highChairCount,
      notes: existing?.notes ?? null,
    }
  })

  return [...adults, ...children]
}

function syncGuestsFromRsvps(rsvps: RsvpRecord[], existingGuests: PlanningGuest[], coupleNames: string[]) {
  const guestById = new Map(existingGuests.map((guest) => [guest.id, guest]))
  const coupleIds = new Set(buildCoupleGuests(coupleNames).map((guest) => guest.id))
  const manualGuests = existingGuests.filter((guest) => !coupleIds.has(guest.id) && !guest.householdId)
  return ensureCoupleGuests([...manualGuests, ...rsvps.flatMap((rsvp) => buildRsvpGuests(rsvp, guestById))], coupleNames)
}

function buildGroups(guests: PlanningGuest[]) {
  const grouped = new Map<string, PlanningGuest[]>()
  guests.forEach((guest) => {
    const key = guest.householdId ? `household:${guest.householdId}` : guest.groupLabel ? `group:${guest.groupLabel}` : `guest:${guest.id}`
    grouped.set(key, [...(grouped.get(key) ?? []), guest])
  })
  return Array.from(grouped.values()).map((groupGuests) => ({
    guestIds: groupGuests.map((guest) => guest.id),
    category: groupGuests.sort((left, right) => CATEGORY_PRIORITY[right.category] - CATEGORY_PRIORITY[left.category])[0]?.category ?? 'other',
  }))
}

function scoreTable(table: SeatingTable, guestIds: string[], category: GuestCategory, guestById: Map<string, PlanningGuest>) {
  if (table.kind === 'couple') return Number.NEGATIVE_INFINITY
  const remainingSeats = table.seatAssignments.filter((entry) => !entry).length
  if (remainingSeats < guestIds.length) return Number.NEGATIVE_INFINITY
  const seatedGuests = table.seatAssignments
    .map((guestId) => (guestId ? guestById.get(guestId) ?? null : null))
    .filter((guest): guest is PlanningGuest => Boolean(guest))
  const sameCategoryCount = seatedGuests.filter((guest) => guest.category === category).length
  let score = sameCategoryCount * 14 - (remainingSeats - guestIds.length)
  if (category === 'vendors') {
    score += table.kind === 'service' ? 80 : table.kind === 'child' ? -24 : -18
  } else if (category === 'children') {
    score += table.kind === 'child' ? 60 : table.kind === 'service' ? -20 : 8
  } else {
    score += table.kind === 'service' ? -14 : table.kind === 'child' ? -6 : 4
  }
  score += category === 'single' ? (seatedGuests.length > 0 ? 12 : 0) + (table.kind === 'guest' ? 6 : -10) : seatedGuests.length === 0 ? 6 : 0
  return score
}

function createAutomaticAssignments(guests: PlanningGuest[], tables: SeatingTable[]) {
  const guestById = new Map(guests.map((guest) => [guest.id, guest]))
  const preservedAssignments = new Set(
    tables
      .filter((table) => table.kind === 'couple')
      .flatMap((table) => normalizeSeatAssignments(table.seatAssignments, table.seatCount).filter((guestId): guestId is string => Boolean(guestId && guestById.has(guestId)))),
  )
  const guestsToAssign = guests.filter((guest) => !preservedAssignments.has(guest.id))
  const totalSeats = tables.filter((table) => table.kind !== 'couple').reduce((count, table) => count + table.seatCount, 0)
  if (totalSeats < guestsToAssign.length) throw new Error('Es gibt zu wenig Sitzplätze für alle Gäste.')

  const nextTables = tables.map((table) =>
    table.kind === 'couple'
      ? { ...table, seatAssignments: normalizeSeatAssignments(table.seatAssignments, table.seatCount).map((guestId) => (guestId && guestById.has(guestId) ? guestId : null)) }
      : { ...table, seatAssignments: Array.from({ length: table.seatCount }, () => null) },
  )

  const groups = buildGroups(guestsToAssign)
  const orderedGroups = [
    ...groups.filter((group) => group.category === 'vendors'),
    ...groups.filter((group) => group.category !== 'vendors' && group.category !== 'single').sort((left, right) => CATEGORY_PRIORITY[right.category] - CATEGORY_PRIORITY[left.category] || right.guestIds.length - left.guestIds.length),
    ...groups.filter((group) => group.category === 'single'),
  ]

  orderedGroups.forEach((group) => {
    const target = nextTables
      .map((table, index) => ({ index, score: scoreTable(table, group.guestIds, group.category, guestById) }))
      .sort((left, right) => right.score - left.score)
      .find((entry) => Number.isFinite(entry.score))
    if (!target) throw new Error('Nicht alle Gäste konnten automatisch an die vorhandenen Tische verteilt werden.')
    const nextAssignments = [...nextTables[target.index]!.seatAssignments]
    let pointer = 0
    for (let seatIndex = 0; seatIndex < nextAssignments.length && pointer < group.guestIds.length; seatIndex += 1) {
      if (!nextAssignments[seatIndex]) nextAssignments[seatIndex] = group.guestIds[pointer++] ?? null
    }
    nextTables[target.index] = { ...nextTables[target.index]!, seatAssignments: nextAssignments }
  })

  return nextTables
}

function buildHouseholds(guests: PlanningGuest[]) {
  const households = new Map<string, { id: string; label: string; adults: number; children: number; highChairs: number; names: string[] }>()
  guests.forEach((guest) => {
    if (!guest.householdId) return
    const current = households.get(guest.householdId) ?? { id: guest.householdId, label: guest.groupLabel?.trim() || guest.name, adults: 0, children: 0, highChairs: 0, names: [] }
    if (guest.kind === 'child') {
      current.children += 1
      if (guest.requiresHighChair) current.highChairs += 1
    } else {
      current.adults += 1
      current.names.push(guest.name)
      if (!current.label || current.label === COUPLE_GROUP_LABEL) current.label = guest.name
    }
    households.set(guest.householdId, current)
  })
  return Array.from(households.values()).filter((household) => household.adults > 0).sort((left, right) => left.label.localeCompare(right.label, 'de'))
}

function normalizePlanningData(plan: SeatingPlanData): SeatingPlanData {
  const songs = plan.buffetMode.songs
    .map((song, index) => ({ ...song, title: song.title.trim(), artist: song.artist?.trim() || null, sortOrder: Number.isFinite(song.sortOrder) ? Math.max(0, Math.round(song.sortOrder)) : index + 1 }))
    .filter((song) => song.title)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.title.localeCompare(right.title, 'de'))
  const validSongIds = new Set(songs.map((song) => song.id))
  const guests: PlanningGuest[] = plan.guests
    .map((guest): PlanningGuest => ({ ...guest, name: guest.name.trim(), kind: guest.kind === 'child' ? 'child' : 'adult', category: guest.kind === 'child' ? 'children' : guest.category, householdId: guest.householdId?.trim() || null, groupLabel: guest.groupLabel?.trim() || null, requiresHighChair: guest.kind === 'child' && guest.requiresHighChair, notes: guest.notes?.trim() || null }))
    .filter((guest) => guest.name)
  const validGuestIds = new Set(guests.map((guest) => guest.id))
  const tables = plan.tables
    .map((table) => ({ ...table, name: table.name.trim(), buffetSongId: table.buffetSongId && validSongIds.has(table.buffetSongId) ? table.buffetSongId : null, seatCount: Math.min(24, Math.max(1, Math.round(table.seatCount))), seatAssignments: normalizeSeatAssignments(table.seatAssignments, Math.min(24, Math.max(1, Math.round(table.seatCount)))).map((guestId) => (guestId && validGuestIds.has(guestId) ? guestId : null)) }))
    .filter((table) => table.name)
  return { isPublished: plan.isPublished === true, buffetMode: { enabled: plan.buffetMode.enabled === true, songs }, guests, tables }
}

function getGuestOptionLabel(guest: PlanningGuest) {
  return `${guest.name} · ${guest.kind === 'child' ? guest.requiresHighChair ? 'Kind · Hochstuhl' : 'Kind' : GUEST_CATEGORY_LABELS[guest.category]}`
}

export function GuestPlanningSection({
  coupleNames,
  initialData,
  rsvps,
}: {
  coupleNames: string[]
  initialData: SeatingPlanData
  rsvps: RsvpRecord[]
}) {
  const router = useRouter()
  const [plan, setPlan] = useState<SeatingPlanData>(() => ({ ...initialData, buffetMode: initialData.buffetMode ?? { enabled: false, songs: [] }, guests: ensureCoupleGuests(initialData.guests, coupleNames) }))
  const [isSaving, setIsSaving] = useState(false)
  const [isDownloadingBuffetPdf, setIsDownloadingBuffetPdf] = useState(false)
  const [guestTableCountDraft, setGuestTableCountDraft] = useState(0)
  const [guestSeatCountDraft, setGuestSeatCountDraft] = useState(8)
  const [previewMode, setPreviewMode] = useState<SeatingViewMode>('2d')
  const coupleGuestIds = useMemo(() => new Set(buildCoupleGuests(coupleNames).map((guest) => guest.id)), [coupleNames])
  const guestById = useMemo(() => new Map(plan.guests.map((guest) => [guest.id, guest])), [plan.guests])
  const buffetSongsById = useMemo(() => new Map(plan.buffetMode.songs.map((song) => [song.id, song])), [plan.buffetMode.songs])
  const assignedGuestIds = useMemo(() => new Set(plan.tables.flatMap((table) => table.seatAssignments.filter((guestId): guestId is string => Boolean(guestId)))), [plan.tables])
  const households = useMemo(() => buildHouseholds(plan.guests), [plan.guests])
  const unassignedGuests = useMemo(() => plan.guests.filter((guest) => !assignedGuestIds.has(guest.id)), [assignedGuestIds, plan.guests])
  const previewTables = useMemo<SeatingPlanVisualTable[]>(
    () => plan.tables.map((table) => ({ ...table, buffetSongLabel: table.buffetSongId ? buffetSongsById.get(table.buffetSongId)?.title ?? null : null, seats: table.seatAssignments.map((guestId, seatIndex) => ({ key: `${table.id}-seat-${seatIndex + 1}`, label: guestId ? guestById.get(guestId)?.name ?? null : null, kind: guestId ? guestById.get(guestId)?.kind ?? 'adult' : 'adult', requiresHighChair: guestId ? guestById.get(guestId)?.requiresHighChair ?? false : false })) })),
    [buffetSongsById, guestById, plan.tables],
  )

  useEffect(() => {
    const guestTables = plan.tables.filter((table) => table.kind === 'guest')
    setGuestTableCountDraft(guestTables.length)
    setGuestSeatCountDraft(guestTables[0]?.seatCount ?? 8)
  }, [plan.tables])

  useEffect(() => {
    setPlan((current) => ({ ...current, guests: ensureCoupleGuests(current.guests, coupleNames) }))
  }, [coupleNames])

  function updateGuest(guestId: string, patch: Partial<PlanningGuest>) {
    setPlan((current) => ({
      ...current,
      guests: current.guests.map((guest) =>
        guest.id === guestId
          ? {
              ...guest,
              ...patch,
              category: guest.kind === 'child' ? 'children' : patch.category ?? guest.category,
              requiresHighChair: guest.kind === 'child' ? patch.requiresHighChair ?? guest.requiresHighChair : false,
            }
          : guest,
      ),
    }))
  }

  function updateTable(tableId: string, patch: Partial<SeatingTable>) {
    setPlan((current) => ({
      ...current,
      tables: current.tables.map((table) =>
        table.id === tableId
          ? { ...table, ...patch, seatAssignments: normalizeSeatAssignments(patch.seatAssignments ?? table.seatAssignments, patch.seatCount ?? table.seatCount) }
          : table,
      ),
    }))
  }

  function syncGuestsToRsvpState() {
    const attending = rsvps.filter((rsvp) => rsvp.isAttending)
    if (!attending.length) {
      toast.message('Es liegen noch keine Zusagen vor, die in den Tischplan übernommen werden können.')
      return
    }

    setPlan((current) => {
      const nextGuests = syncGuestsFromRsvps(attending, current.guests, coupleNames)
      const validGuestIds = new Set(nextGuests.map((guest) => guest.id))
      return {
        ...current,
        guests: nextGuests,
        tables: current.tables.map((table) => ({
          ...table,
          seatAssignments: table.seatAssignments.map((guestId) => (guestId && validGuestIds.has(guestId) ? guestId : null)),
        })),
      }
    })

    toast.success('RSVP-Haushalte inklusive Kinder und Hochstühle wurden synchronisiert.')
  }

  function updateHouseholdCounts(householdId: string, childCount: number, highChairCount: number) {
    setPlan((current) => {
      const adults = current.guests.filter((guest) => guest.householdId === householdId && guest.kind === 'adult')
      const existingChildren = current.guests.filter((guest) => guest.householdId === householdId && guest.kind === 'child')
      if (!adults.length) return current
      const nextChildCount = Math.max(0, Math.min(10, Math.round(childCount || 0)))
      const nextHighChairCount = Math.max(0, Math.min(nextChildCount, Math.round(highChairCount || 0)))
      const removedIds = new Set(existingChildren.slice(nextChildCount).map((guest) => guest.id))
      const leadName = adults[0]?.name ?? 'Hauptgast'
      const label = adults[0]?.groupLabel?.trim() || `${leadName} Haushalt`
      const nextChildren: PlanningGuest[] = Array.from({ length: nextChildCount }, (_, index) => ({
        id: existingChildren[index]?.id ?? `rsvp-${householdId}-child-${index + 1}`,
        name: `Kind ${index + 1} von ${leadName}`,
        kind: 'child',
        category: 'children',
        householdId,
        groupLabel: label,
        requiresHighChair: index < nextHighChairCount,
        notes: existingChildren[index]?.notes ?? null,
      }))
      return {
        ...current,
        guests: current.guests.filter((guest) => !(guest.householdId === householdId && guest.kind === 'child')).concat(nextChildren),
        tables: current.tables.map((table) => ({
          ...table,
          seatAssignments: table.seatAssignments.map((guestId) => (guestId && removedIds.has(guestId) ? null : guestId)),
        })),
      }
    })
  }

  async function downloadBuffetPdf() {
    setIsDownloadingBuffetPdf(true)
    try {
      const response = await fetch('/api/admin/buffet-song-plan-pdf')
      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as ApiResponse<null> | null
        toast.error(result && !result.success ? result.error : 'Der PDF-Download konnte nicht gestartet werden.')
        return
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      const contentDisposition = response.headers.get('content-disposition') ?? ''
      const fileName = contentDisposition.match(/filename=\"?([^\";]+)\"?/)?.[1] ?? 'buffet-songplan.pdf'
      anchor.href = url
      anchor.download = fileName
      anchor.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Der PDF-Download konnte nicht gestartet werden.')
    } finally {
      setIsDownloadingBuffetPdf(false)
    }
  }

  async function savePlanning() {
    setIsSaving(true)
    try {
      const payload = normalizePlanningData({ ...plan, guests: ensureCoupleGuests(plan.guests, coupleNames) })
      const response = await fetch('/api/admin/seating-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = (await response.json()) as ApiResponse<SeatingPlanData>
      if (!response.ok || !result.success) {
        toast.error(result.success ? 'Speichern fehlgeschlagen.' : result.error)
        return
      }
      setPlan({ ...result.data, guests: ensureCoupleGuests(result.data.guests, coupleNames) })
      toast.success(result.message ?? 'RSVP-Gäste und Tischplan wurden gespeichert.')
      startTransition(() => router.refresh())
    } catch {
      toast.error('RSVP-Gäste und Tischplan konnten gerade nicht gespeichert werden.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Badge variant="neutral">{plan.guests.length} Teilnehmende</Badge>
            <Badge variant="neutral">{households.length} RSVP-Haushalte</Badge>
            <Badge variant="neutral">{plan.tables.length} Tische</Badge>
            <Badge variant="neutral">{unassignedGuests.length} unzugeordnet</Badge>
          </div>
          <p className="max-w-3xl text-body-md text-charcoal-600">
            Erwachsene, Kinder und Hochstühle werden pro Haushalt geführt. Die smarte Sitzverteilung setzt Kinder zunächst passend, ihr könnt sie danach aber auch bewusst an Kindertische, zu Großeltern oder an andere Tische umsetzen.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="secondary" onClick={syncGuestsToRsvpState}>
            <Users className="h-4 w-4" />
            Aus RSVP synchronisieren
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              try {
                const normalizedPlan = normalizePlanningData(plan)
                setPlan((current) => ({ ...current, buffetMode: normalizedPlan.buffetMode, guests: normalizedPlan.guests, tables: createAutomaticAssignments(normalizedPlan.guests, normalizedPlan.tables) }))
                toast.success('Der smarte Sitzvorschlag wurde erstellt.')
              } catch (error) {
                toast.error(error instanceof Error ? error.message : 'Der Sitzvorschlag konnte nicht erstellt werden.')
              }
            }}
          >
            <WandSparkles className="h-4 w-4" />
            Smarte Sitzverteilung
          </Button>
          <Button loading={isSaving} type="button" onClick={savePlanning}>
            <Save className="h-4 w-4" />
            Planung speichern
          </Button>
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-gold-200 bg-gold-50/80 px-5 py-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <h3 className="font-display text-card text-charcoal-900">Sitzplan für Gäste veröffentlichen</h3>
            <p className="max-w-3xl text-body-md text-charcoal-600">Standardmäßig bleibt der Sitzplan privat. Erst wenn ihr speichert und diese Option aktiviert, erscheint er im Gästebereich.</p>
            <p className="text-sm text-charcoal-500">Dienstleistertische bleiben weiterhin nur intern sichtbar.</p>
          </div>
          <label className="flex min-h-11 items-center gap-3 rounded-full border border-gold-300 bg-white px-4 py-3 text-sm font-semibold text-charcoal-900">
            <input checked={plan.isPublished} className="h-4 w-4 accent-gold-500" type="checkbox" onChange={(event) => setPlan((current) => ({ ...current, isPublished: event.target.checked }))} />
            {plan.isPublished ? 'Für Gäste sichtbar' : 'Privat'}
          </label>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <h3 className="font-display text-card text-charcoal-900">RSVP-Haushalte</h3>
          <p className="mt-2 text-body-md text-charcoal-600">Hier passt ihr kleine Kinder und Hochstühle pro Haushalt an. Die Kinder-Sitzplätze werden automatisch erzeugt.</p>
        </div>
        {households.length ? (
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr))]">
            {households.map((household) => (
              <article key={household.id} className="rounded-[1.6rem] border border-cream-200 bg-white px-5 py-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="font-display text-card text-charcoal-900">{household.label}</h4>
                  <Badge variant="neutral">{household.adults} Erwachsene</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-charcoal-500">{household.names.join(', ')}</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Input label="Kleine Kinder" inputMode="numeric" max={10} min={0} type="number" value={household.children} onChange={(event) => updateHouseholdCounts(household.id, Number(event.target.value) || 0, household.highChairs)} />
                  <Input label="Benötigte Hochstühle" inputMode="numeric" max={household.children} min={0} type="number" value={household.highChairs} onChange={(event) => updateHouseholdCounts(household.id, household.children, Number(event.target.value) || 0)} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant={household.children ? 'attending' : 'neutral'}>{household.children ? `${household.children} Kinder` : 'Keine Kinder'}</Badge>
                  {household.highChairs ? <Badge variant="declined">{household.highChairs} Hochstühle</Badge> : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[1.75rem] border border-dashed border-cream-300 bg-cream-50 px-5 py-6 text-sm text-charcoal-600">Sobald Zusagen vorliegen und synchronisiert wurden, könnt ihr hier Kinder und Hochstühle pro Haushalt feinjustieren.</div>
        )}
      </div>

      <div className="space-y-5">
        <div>
          <h3 className="font-display text-card text-charcoal-900">Buffet-Aufrufe nach Songs</h3>
          <p className="mt-2 text-body-md text-charcoal-600">Optional könnt ihr Songs bestimmten Tischen zuordnen. Wenn der Song gespielt wird, ist das der Aufruf für den ersten Gang ans Buffet.</p>
        </div>
        <div className="rounded-[1.75rem] border border-cream-200 bg-white px-5 py-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <label className="flex min-h-11 items-center gap-3 rounded-full border border-gold-300 bg-cream-50 px-4 py-3 text-sm font-semibold text-charcoal-900">
              <input checked={plan.buffetMode.enabled} className="h-4 w-4 accent-gold-500" type="checkbox" onChange={(event) => setPlan((current) => ({ ...current, buffetMode: { ...current.buffetMode, enabled: event.target.checked } }))} />
              Buffet-Modus aktiv
            </label>
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="secondary" onClick={() => setPlan((current) => ({ ...current, buffetMode: { ...current.buffetMode, songs: [...current.buffetMode.songs, { id: createId('buffet-song'), title: '', artist: null, sortOrder: current.buffetMode.songs.length + 1 }] } }))}>
                <Music4 className="h-4 w-4" />
                Song hinzufügen
              </Button>
              <Button disabled={!plan.buffetMode.songs.length} loading={isDownloadingBuffetPdf} type="button" variant="secondary" onClick={downloadBuffetPdf}>
                <FileDown className="h-4 w-4" />
                Songliste als PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <h3 className="font-display text-card text-charcoal-900">Teilnehmende</h3>
          <p className="mt-2 text-body-md text-charcoal-600">Hier könnt ihr Kategorien und Notizen für die automatische Sitzverteilung pflegen. Kinderplätze bleiben systemseitig an ihre RSVP-Haushalte gebunden.</p>
        </div>
        <div className="space-y-4">
          {plan.guests.map((guest) => {
            const isCoupleGuest = coupleGuestIds.has(guest.id)
            const isGeneratedChild = guest.kind === 'child' && Boolean(guest.householdId)
            const isLocked = isCoupleGuest || isGeneratedChild

            return (
              <article key={guest.id} className="rounded-[1.6rem] border border-cream-200 bg-white px-5 py-5 shadow-sm">
                <div className="grid gap-4 xl:grid-cols-[1.15fr_0.95fr_auto]">
                  <Input label="Name" disabled={isLocked} helperText={isCoupleGuest ? 'Automatisch aus dem Brautpaarprofil übernommen.' : isGeneratedChild ? 'Wird aus dem RSVP-Haushalt erzeugt.' : undefined} value={guest.name} onChange={(event) => updateGuest(guest.id, { name: event.target.value })} />
                  <label className="flex flex-col gap-2 text-sm font-medium text-charcoal-700">
                    <span>Kategorie</span>
                    <select disabled={isLocked} className={selectClassName} value={guest.category} onChange={(event) => updateGuest(guest.id, { category: event.target.value as GuestCategory })}>
                      {GUEST_CATEGORY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="flex items-end justify-start gap-2">
                    {guest.kind === 'child' ? <Badge variant="attending">Kind</Badge> : null}
                    {guest.requiresHighChair ? <Badge variant="declined">Hochstuhl</Badge> : null}
                    {isCoupleGuest ? <Badge variant="declined">Brautpaar</Badge> : guest.householdId ? <Badge variant="neutral">RSVP-Haushalt</Badge> : <Button type="button" variant="ghost" onClick={() => setPlan((current) => ({ ...current, guests: current.guests.filter((entry) => entry.id !== guest.id), tables: current.tables.map((table) => ({ ...table, seatAssignments: table.seatAssignments.map((entry) => (entry === guest.id ? null : entry)) })) }))}><Trash2 className="h-4 w-4" />Entfernen</Button>}
                  </div>
                </div>
                <div className="mt-4">
                  <Input label="Notiz" helperText={isGeneratedChild ? 'Optional, z. B. Kinderstuhl oder Nähe zur Familie.' : 'Optional, z. B. Sitzwunsch oder besondere Gruppierung.'} value={guest.notes ?? ''} onChange={(event) => updateGuest(guest.id, { notes: event.target.value || null })} />
                </div>
              </article>
            )
          })}
        </div>
      </div>
      {plan.buffetMode.enabled && plan.buffetMode.songs.length ? (
        <div className="space-y-4">
          {plan.buffetMode.songs.map((song, index) => (
            <article key={song.id} className="rounded-[1.45rem] border border-cream-200 bg-cream-50 px-4 py-4">
              <div className="grid gap-4 xl:grid-cols-[0.55fr_1fr_1fr_auto]">
                <Input label="Reihenfolge" inputMode="numeric" min={1} type="number" value={song.sortOrder} onChange={(event) => setPlan((current) => ({ ...current, buffetMode: { ...current.buffetMode, songs: current.buffetMode.songs.map((entry) => (entry.id === song.id ? { ...entry, sortOrder: Number(event.target.value) || index + 1 } : entry)) } }))} />
                <Input label="Songtitel" value={song.title} onChange={(event) => setPlan((current) => ({ ...current, buffetMode: { ...current.buffetMode, songs: current.buffetMode.songs.map((entry) => (entry.id === song.id ? { ...entry, title: event.target.value } : entry)) } }))} />
                <Input label="Interpret" value={song.artist ?? ''} onChange={(event) => setPlan((current) => ({ ...current, buffetMode: { ...current.buffetMode, songs: current.buffetMode.songs.map((entry) => (entry.id === song.id ? { ...entry, artist: event.target.value || null } : entry)) } }))} />
                <div className="flex items-end">
                  <Button type="button" variant="ghost" onClick={() => setPlan((current) => ({ ...current, buffetMode: { ...current.buffetMode, songs: current.buffetMode.songs.filter((entry) => entry.id !== song.id).map((entry, songIndex) => ({ ...entry, sortOrder: songIndex + 1 })) }, tables: current.tables.map((table) => ({ ...table, buffetSongId: table.buffetSongId === song.id ? null : table.buffetSongId })) }))}>
                    <Trash2 className="h-4 w-4" />
                    Entfernen
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h4 className="font-display text-card text-charcoal-900">Visuelle Vorschau in 2D und 3D</h4>
            <p className="mt-2 max-w-3xl text-body-md text-charcoal-600">So wirkt euer Sitzplan aktuell im Paarbereich. Tischformen, Kinderplätze, Hochstühle und Buffet-Songs werden direkt sichtbar.</p>
          </div>
          <div className="inline-flex flex-wrap gap-2 rounded-full border border-cream-200 bg-white p-1 shadow-sm">
            {(['2d', '3d'] as const).map((mode) => (
              <Button key={mode} type="button" size="sm" variant={previewMode === mode ? 'primary' : 'ghost'} onClick={() => setPreviewMode(mode)}>
                {mode === '2d' ? '2D Ansicht' : '3D Ansicht'}
              </Button>
            ))}
          </div>
        </div>
        {previewTables.length ? <SeatingPlanVisualizer mode={previewMode} showEmptySeats tables={previewTables} /> : <div className="rounded-[1.75rem] border border-dashed border-cream-300 bg-cream-50 px-5 py-6 text-sm text-charcoal-600">Sobald ihr Tische anlegt, erscheint hier eine visuelle Vorschau eures Tischplans.</div>}
      </div>

      <div id="sitzplan" className="space-y-5 border-t border-cream-200 pt-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="font-display text-card text-charcoal-900">Sitzplan</h3>
            <p className="mt-2 text-body-md text-charcoal-600">Legt beliebig viele Tische an, konfiguriert Form und Sitzplätze und ordnet danach Personen, Kinder und Buffet-Songs zu.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="secondary" onClick={() => setPlan((current) => ({ ...current, tables: [...current.tables, createTable(current.tables.filter((table) => table.kind === 'guest').length + 1, 'guest')] }))}><Plus className="h-4 w-4" />Tisch hinzufügen</Button>
            <Button type="button" variant="secondary" onClick={() => setPlan((current) => ({ ...current, tables: [...current.tables, createTable(current.tables.filter((table) => table.kind === 'child').length + 1, 'child')] }))}><Baby className="h-4 w-4" />Kindertisch</Button>
            <Button type="button" variant="secondary" onClick={() => setPlan((current) => ({ ...current, tables: [...current.tables, createTable(current.tables.filter((table) => table.kind === 'couple').length + 1, 'couple')] }))}><Heart className="h-4 w-4" />Brautpaartisch</Button>
            <Button type="button" variant="secondary" onClick={() => setPlan((current) => ({ ...current, tables: [...current.tables, createTable(current.tables.filter((table) => table.kind === 'service').length + 1, 'service')] }))}><Building2 className="h-4 w-4" />Dienstleistertisch</Button>
          </div>
        </div>
        <div className="rounded-[1.75rem] border border-cream-200 bg-cream-50/70 px-5 py-5 shadow-sm">
          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            <div className="flex h-full flex-col rounded-[1.5rem] border border-cream-200 bg-white px-4 py-4 shadow-sm">
              <Input label="Anzahl Gästetische" inputMode="numeric" max={24} min={0} type="number" value={guestTableCountDraft} onChange={(event) => setGuestTableCountDraft(Number(event.target.value) || 0)} />
              <p className="mt-3 text-sm leading-6 text-charcoal-500">Erstellt oder reduziert damit die Anzahl eurer normalen Gästetische.</p>
            </div>
            <div className="flex h-full flex-col rounded-[1.5rem] border border-cream-200 bg-white px-4 py-4 shadow-sm">
              <Input label="Sitzplätze pro Gästetisch" inputMode="numeric" max={24} min={1} type="number" value={guestSeatCountDraft} onChange={(event) => setGuestSeatCountDraft(Number(event.target.value) || 1)} />
              <p className="mt-3 text-sm leading-6 text-charcoal-500">Diese Zahl gilt als Standard für alle normalen Gästetische.</p>
            </div>
            <div className="flex h-full flex-col rounded-[1.5rem] border border-gold-200 bg-gold-50 px-4 py-4 shadow-sm">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-charcoal-900">Layout übernehmen</p>
                <p className="text-sm leading-6 text-charcoal-500">Wendet die beiden Werte gesammelt auf alle normalen Gästetische an.</p>
              </div>
              <div className="mt-auto pt-4">
                <Button className="w-full" type="button" variant="secondary" onClick={() => setPlan((current) => {
                  const nextTableCount = Math.max(0, Math.min(24, Math.round(guestTableCountDraft || 0)))
                  const nextSeatCount = Math.max(1, Math.min(24, Math.round(guestSeatCountDraft || 1)))
                  const guestTables = current.tables.filter((table) => table.kind === 'guest')
                  const otherTables = current.tables.filter((table) => table.kind !== 'guest')
                  const nextGuestTables = guestTables.slice(0, nextTableCount).map((table) => ({ ...table, seatCount: nextSeatCount, seatAssignments: normalizeSeatAssignments(table.seatAssignments, nextSeatCount) }))
                  while (nextGuestTables.length < nextTableCount) nextGuestTables.push(createTable(nextGuestTables.length + 1, 'guest', nextSeatCount))
                  return { ...current, tables: [...nextGuestTables, ...otherTables] }
                })}>Layout anwenden</Button>
              </div>
            </div>
          </div>
        </div>

        {plan.tables.length ? (
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,34rem),1fr))]">
            {plan.tables.map((table, tableIndex) => {
              const assignedElsewhere = new Set(plan.tables.flatMap((entry) => (entry.id === table.id ? [] : entry.seatAssignments.filter((guestId): guestId is string => Boolean(guestId)))))
              return (
                <article key={table.id} className="surface-card px-5 py-5 sm:px-6">
                  <div className="flex flex-col gap-4 border-b border-cream-200 pb-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <h4 className="text-safe-wrap font-display text-card text-charcoal-900">{table.name.trim() || `Tisch ${tableIndex + 1}`}</h4>
                          <Badge variant={getTableBadgeVariant(table.kind)}>{SEATING_TABLE_KIND_LABELS[table.kind]}</Badge>
                          <Badge variant="neutral">{SEATING_TABLE_SHAPE_LABELS[table.shape]}</Badge>
                          {table.buffetSongId ? <Badge variant="attending">Buffet: {buffetSongsById.get(table.buffetSongId)?.title ?? 'Song'}</Badge> : null}
                        </div>
                        <p className="max-w-2xl text-sm leading-6 text-charcoal-600">Konfiguriert hier Namen, Tischtyp, Form und Sitzplätze. Danach könnt ihr die Gäste direkt den einzelnen Plätzen zuordnen.</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button disabled={table.seatCount <= 1} type="button" variant="secondary" onClick={() => updateTable(table.id, { seatCount: table.seatCount - 1 })}><Minus className="h-4 w-4" />Platz entfernen</Button>
                        <Button disabled={table.seatCount >= 24} type="button" variant="secondary" onClick={() => updateTable(table.id, { seatCount: table.seatCount + 1 })}><Plus className="h-4 w-4" />Platz hinzufügen</Button>
                        <Button type="button" variant="ghost" onClick={() => setPlan((current) => ({ ...current, tables: current.tables.filter((entry) => entry.id !== table.id) }))}><Trash2 className="h-4 w-4" />Entfernen</Button>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                      <Input label="Tischname" value={table.name} onChange={(event) => updateTable(table.id, { name: event.target.value })} />
                      <label className="flex flex-col gap-2 text-sm font-medium text-charcoal-700"><span>Tischtyp</span><select className={selectClassName} value={table.kind} onChange={(event) => updateTable(table.id, { kind: event.target.value as SeatingTable['kind'], shape: getDefaultTableShapeForKind(event.target.value as SeatingTable['kind']) })}><option value="guest">Gästetisch</option><option value="child">Kindertisch</option><option value="couple">Brautpaartisch</option><option value="service">Dienstleistertisch</option></select></label>
                      <label className="flex flex-col gap-2 text-sm font-medium text-charcoal-700"><span>Tischform</span><select className={selectClassName} value={table.shape} onChange={(event) => updateTable(table.id, { shape: event.target.value as SeatingTable['shape'] })}>{SEATING_TABLE_SHAPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                      <Input label="Sitzplätze" inputMode="numeric" max={24} min={1} type="number" value={table.seatCount} onChange={(event) => updateTable(table.id, { seatCount: Number(event.target.value) || 1 })} />
                      <label className="flex flex-col gap-2 text-sm font-medium text-charcoal-700"><span>Buffet-Song</span><select className={selectClassName} value={table.buffetSongId ?? ''} onChange={(event) => updateTable(table.id, { buffetSongId: event.target.value || null })}><option value="">Noch kein Song</option>{plan.buffetMode.songs.map((song) => <option key={song.id} value={song.id}>{song.sortOrder}. {song.title}{song.artist ? ` · ${song.artist}` : ''}</option>)}</select></label>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {normalizeSeatAssignments(table.seatAssignments, table.seatCount).map((guestId, seatIndex) => (
                      <label key={`${table.id}-seat-${seatIndex}`} className="flex min-w-0 flex-col gap-2 text-sm font-medium text-charcoal-700">
                        <span>Platz {seatIndex + 1}</span>
                        <select className={selectClassName} value={guestId ?? ''} onChange={(event) => updateTable(table.id, { seatAssignments: normalizeSeatAssignments(table.seatAssignments, table.seatCount).map((entry, index) => (index === seatIndex ? event.target.value || null : entry)) })}>
                          <option value="">Nicht besetzt</option>
                          {plan.guests.map((guest) => <option key={guest.id} disabled={assignedElsewhere.has(guest.id) && guest.id !== guestId} value={guest.id}>{getGuestOptionLabel(guest)}</option>)}
                        </select>
                      </label>
                    ))}
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="rounded-[1.75rem] border border-dashed border-cream-300 bg-cream-50 px-5 py-6 text-sm text-charcoal-600">Noch keine Tische angelegt. Ihr könnt normale Gästetische, Kindertische, einen Brautpaartisch und zusätzlich einen Dienstleistertisch erstellen.</div>
        )}

        {unassignedGuests.length ? (
          <div className="rounded-[1.75rem] border border-cream-200 bg-white px-5 py-5 shadow-sm">
            <div className="flex items-center gap-3"><Sparkles className="h-4 w-4 text-gold-600" /><p className="font-semibold text-charcoal-900">Noch nicht zugeordnet</p></div>
            <div className="mt-4 flex flex-wrap gap-2">
              {unassignedGuests.map((guest) => <span key={guest.id} className="inline-flex items-center rounded-full bg-cream-100 px-3 py-2 text-sm text-charcoal-700">{getGuestOptionLabel(guest)}</span>)}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
