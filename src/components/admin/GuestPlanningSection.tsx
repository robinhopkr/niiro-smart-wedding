'use client'

import { Building2, Heart, Minus, Plus, Save, Sparkles, Trash2, Users, WandSparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { startTransition, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { GUEST_CATEGORY_LABELS, GUEST_CATEGORY_OPTIONS } from '@/lib/constants'
import type { ApiResponse } from '@/types/api'
import type { GuestCategory, PlanningGuest, RsvpRecord, SeatingPlanData, SeatingTable } from '@/types/wedding'

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

const TABLE_KIND_LABELS: Record<SeatingTable['kind'], string> = {
  guest: 'Gästetisch',
  service: 'Dienstleistertisch',
  couple: 'Brautpaartisch',
}

function getDefaultSeatCountForKind(kind: SeatingTable['kind']): number {
  if (kind === 'couple') {
    return 2
  }

  return kind === 'service' ? 6 : 8
}

function getDefaultTableName(kind: SeatingTable['kind'], index: number): string {
  if (kind === 'guest') {
    return `Tisch ${index}`
  }

  const baseLabel = TABLE_KIND_LABELS[kind]
  return index > 1 ? `${baseLabel} ${index}` : baseLabel
}

function getTableBadgeVariant(kind: SeatingTable['kind']): 'attending' | 'declined' | 'neutral' {
  if (kind === 'service') {
    return 'attending'
  }

  return kind === 'couple' ? 'declined' : 'neutral'
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function createGuest(overrides: Partial<PlanningGuest> = {}): PlanningGuest {
  return {
    id: createId('guest'),
    name: '',
    category: 'other',
    groupLabel: null,
    notes: null,
    ...overrides,
  }
}

function normalizeSeatAssignments(seatAssignments: Array<string | null>, seatCount: number): Array<string | null> {
  const nextAssignments = seatAssignments.slice(0, seatCount).map((entry) => entry || null)

  while (nextAssignments.length < seatCount) {
    nextAssignments.push(null)
  }

  return nextAssignments
}

function createTable(
  index: number,
  kind: SeatingTable['kind'] = 'guest',
  seatCount = getDefaultSeatCountForKind(kind),
): SeatingTable {
  return {
    id: createId('table'),
    name: getDefaultTableName(kind, index),
    kind,
    seatCount,
    seatAssignments: Array.from({ length: seatCount }, () => null),
  }
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function buildImportedGuests(rsvps: RsvpRecord[], existingGuests: PlanningGuest[]): PlanningGuest[] {
  const knownNames = new Set(existingGuests.map((guest) => normalizeName(guest.name)))
  const importedGuests: PlanningGuest[] = []

  rsvps.forEach((rsvp) => {
    if (!rsvp.isAttending) {
      return
    }

    const groupLabel = rsvp.totalGuests > 1 ? rsvp.guestName.trim() : null
    const names = [rsvp.guestName, rsvp.plusOneName].filter((entry): entry is string => Boolean(entry?.trim()))

    names.forEach((name, index) => {
      const normalizedName = normalizeName(name)
      if (knownNames.has(normalizedName)) {
        return
      }

      knownNames.add(normalizedName)
      importedGuests.push(
        createGuest({
          name: name.trim(),
          category: rsvp.totalGuests === 1 ? 'single' : 'other',
          groupLabel: groupLabel && index < rsvp.totalGuests ? groupLabel : null,
        }),
      )
    })

    const unnamedGuests = Math.max(0, rsvp.totalGuests - names.length)
    for (let index = 0; index < unnamedGuests; index += 1) {
      const placeholderName = `Begleitung von ${rsvp.guestName.trim()} ${index + 1}`
      const normalizedName = normalizeName(placeholderName)

      if (knownNames.has(normalizedName)) {
        continue
      }

      knownNames.add(normalizedName)
      importedGuests.push(
        createGuest({
          name: placeholderName,
          category: 'other',
          groupLabel: groupLabel ?? rsvp.guestName.trim(),
        }),
      )
    }
  })

  return importedGuests
}

interface SeatingGroup {
  guestIds: string[]
  category: GuestCategory
}

function buildSeatingGroups(guests: PlanningGuest[]): SeatingGroup[] {
  const groupedGuests = new Map<string, PlanningGuest[]>()

  guests.forEach((guest) => {
    const key = guest.groupLabel?.trim().toLowerCase() ? `group:${guest.groupLabel.trim().toLowerCase()}` : `guest:${guest.id}`
    const currentGuests = groupedGuests.get(key) ?? []
    currentGuests.push(guest)
    groupedGuests.set(key, currentGuests)
  })

  return Array.from(groupedGuests.values()).map((groupGuests) => ({
    guestIds: groupGuests.map((guest) => guest.id),
    category: groupGuests
      .slice()
      .sort((left, right) => CATEGORY_PRIORITY[right.category] - CATEGORY_PRIORITY[left.category])[0]?.category ?? 'other',
  }))
}

function getAssignedGuests(table: SeatingTable, guestById: Map<string, PlanningGuest>): PlanningGuest[] {
  return table.seatAssignments
    .map((guestId) => (guestId ? guestById.get(guestId) ?? null : null))
    .filter((guest): guest is PlanningGuest => Boolean(guest))
}

function assignGroupToTable(table: SeatingTable, guestIds: string[]): SeatingTable {
  const nextAssignments = [...table.seatAssignments]
  let pointer = 0

  for (let seatIndex = 0; seatIndex < nextAssignments.length && pointer < guestIds.length; seatIndex += 1) {
    if (!nextAssignments[seatIndex]) {
      nextAssignments[seatIndex] = guestIds[pointer] ?? null
      pointer += 1
    }
  }

  return {
    ...table,
    seatAssignments: nextAssignments,
  }
}

function scoreTable(table: SeatingTable, group: SeatingGroup, guestById: Map<string, PlanningGuest>): number {
  if (table.kind === 'couple') {
    return Number.NEGATIVE_INFINITY
  }

  const assignedGuests = getAssignedGuests(table, guestById)
  const remainingSeats = table.seatAssignments.filter((entry) => !entry).length

  if (remainingSeats < group.guestIds.length) {
    return Number.NEGATIVE_INFINITY
  }

  const sameCategoryCount = assignedGuests.filter((guest) => guest.category === group.category).length
  const remainingAfter = remainingSeats - group.guestIds.length
  const occupiedCount = assignedGuests.length

  let score = sameCategoryCount * 14 - remainingAfter

  if (group.category === 'vendors') {
    score += table.kind === 'service' ? 80 : -18
  } else {
    score += table.kind === 'service' ? -14 : 4
  }

  if (group.category === 'single') {
    score += occupiedCount > 0 ? 12 : 0
    score += table.kind === 'guest' ? 6 : -10
  } else if (occupiedCount === 0) {
    score += 6
  }

  return score
}

function createAutomaticAssignments(
  guests: PlanningGuest[],
  tables: SeatingTable[],
): SeatingTable[] {
  const guestById = new Map(guests.map((guest) => [guest.id, guest]))
  const preservedAssignments = new Set(
    tables
      .filter((table) => table.kind === 'couple')
      .flatMap((table) =>
        normalizeSeatAssignments(table.seatAssignments, table.seatCount).filter(
          (guestId): guestId is string => {
            if (!guestId) {
              return false
            }

            return guestById.has(guestId)
          },
        ),
      ),
  )
  const guestsToAssign = guests.filter((guest) => !preservedAssignments.has(guest.id))
  const totalSeats = tables
    .filter((table) => table.kind !== 'couple')
    .reduce((count, table) => count + table.seatCount, 0)

  if (totalSeats < guestsToAssign.length) {
    throw new Error('Es gibt zu wenig Sitzplätze für alle Gäste.')
  }

  const emptyTables: SeatingTable[] = tables.map((table) => {
    if (table.kind === 'couple') {
      return {
        ...table,
        seatAssignments: normalizeSeatAssignments(table.seatAssignments, table.seatCount).map((guestId) =>
          guestId && guestById.has(guestId) ? guestId : null,
        ),
      }
    }

    return {
      ...table,
      seatAssignments: Array.from({ length: table.seatCount }, () => null),
    }
  })

  const groups = buildSeatingGroups(guestsToAssign)
  const serviceGroups = groups.filter((group) => group.category === 'vendors')
  const singleGroups = groups.filter((group) => group.category === 'single')
  const coreGroups = groups
    .filter((group) => group.category !== 'vendors' && group.category !== 'single')
    .sort((left, right) => {
      const categoryDelta = CATEGORY_PRIORITY[right.category] - CATEGORY_PRIORITY[left.category]
      if (categoryDelta !== 0) {
        return categoryDelta
      }

      return right.guestIds.length - left.guestIds.length
    })

  const orderedGroups = [...serviceGroups, ...coreGroups, ...singleGroups]

  orderedGroups.forEach((group) => {
    const rankedTables = emptyTables
      .map((table, index) => ({
        index,
        score: scoreTable(table, group, guestById),
      }))
      .sort((left, right) => right.score - left.score)

    const bestTable = rankedTables.find((table) => Number.isFinite(table.score))

    if (!bestTable) {
      throw new Error('Nicht alle Gäste konnten automatisch an die vorhandenen Tische verteilt werden.')
    }

    emptyTables[bestTable.index] = assignGroupToTable(emptyTables[bestTable.index]!, group.guestIds)
  })

  return emptyTables
}

function getAssignedGuestIds(tables: SeatingTable[]): Set<string> {
  return new Set(
    tables.flatMap((table) => table.seatAssignments.filter((guestId): guestId is string => Boolean(guestId))),
  )
}

function normalizePlanningData(values: SeatingPlanData): SeatingPlanData {
  const guests = values.guests
    .map((guest) => ({
      ...guest,
      name: guest.name.trim(),
      groupLabel: guest.groupLabel?.trim() || null,
      notes: guest.notes?.trim() || null,
    }))
    .filter((guest) => guest.name)

  const validGuestIds = new Set(guests.map((guest) => guest.id))

  const tables = values.tables
    .map((table) => {
      const seatCount = Math.min(24, Math.max(1, Math.round(table.seatCount)))
      const seatAssignments = normalizeSeatAssignments(table.seatAssignments, seatCount).map((guestId) =>
        guestId && validGuestIds.has(guestId) ? guestId : null,
      )

      return {
        ...table,
        name: table.name.trim(),
        seatCount,
        seatAssignments,
      }
    })
    .filter((table) => table.name)

  return {
    isPublished: values.isPublished === true,
    guests,
    tables,
  }
}

function SeatingPreview({
  tables,
  guestNamesById,
}: {
  tables: SeatingTable[]
  guestNamesById: Map<string, string>
}) {
  if (!tables.length) {
    return (
      <div className="rounded-[1.75rem] border border-dashed border-cream-300 bg-cream-50 px-5 py-6 text-sm text-charcoal-600">
        Sobald ihr Tische anlegt, erscheint hier eine visuelle Vorschau eures Tischplans.
      </div>
    )
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {tables.map((table) => {
        const occupiedSeats = table.seatAssignments.filter(Boolean).length

      return (
          <article key={table.id} className="surface-card px-5 py-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="font-display text-card text-charcoal-900">{table.name}</h4>
                <p className="mt-1 text-sm text-charcoal-500">
                  {TABLE_KIND_LABELS[table.kind]}
                </p>
              </div>
              <Badge variant={getTableBadgeVariant(table.kind)}>
                {occupiedSeats}/{table.seatCount} belegt
              </Badge>
            </div>

            <div className="mt-5 flex items-center justify-center">
              <div className="flex h-40 w-40 items-center justify-center rounded-full border border-gold-200 bg-[radial-gradient(circle_at_top,_rgba(212,175,55,0.18),_rgba(255,255,255,0.96)_58%)] text-center shadow-sm">
                <div className="space-y-1 px-6">
                  <p className="font-display text-xl text-charcoal-900">{table.name}</p>
                  <p className="text-sm text-charcoal-600">
                    {table.seatCount} Plätze
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {table.seatAssignments.map((guestId, seatIndex) => (
                <div
                  key={`${table.id}-preview-seat-${seatIndex}`}
                  className="rounded-full border border-cream-200 bg-cream-50 px-3 py-2 text-sm text-charcoal-700"
                >
                  <span className="font-semibold text-charcoal-900">Platz {seatIndex + 1}:</span>{' '}
                  {guestId ? guestNamesById.get(guestId) ?? 'Zugewiesen' : 'Frei'}
                </div>
              ))}
            </div>
          </article>
        )
      })}
    </div>
  )
}

export function GuestPlanningSection({
  initialData,
  rsvps,
}: {
  initialData: SeatingPlanData
  rsvps: RsvpRecord[]
}) {
  const router = useRouter()
  const [plan, setPlan] = useState<SeatingPlanData>(initialData)
  const [isSaving, setIsSaving] = useState(false)
  const [guestTableCountDraft, setGuestTableCountDraft] = useState(0)
  const [guestSeatCountDraft, setGuestSeatCountDraft] = useState(8)

  const assignedGuestIds = useMemo(() => getAssignedGuestIds(plan.tables), [plan.tables])
  const unassignedGuests = useMemo(
    () => plan.guests.filter((guest) => !assignedGuestIds.has(guest.id)),
    [assignedGuestIds, plan.guests],
  )
  const guestNamesById = useMemo(
    () => new Map(plan.guests.map((guest) => [guest.id, guest.name])),
    [plan.guests],
  )

  useEffect(() => {
    const guestTables = plan.tables.filter((table) => table.kind === 'guest')
    setGuestTableCountDraft(guestTables.length)
    setGuestSeatCountDraft(guestTables[0]?.seatCount ?? 8)
  }, [plan.tables])

  function updateGuest(guestId: string, patch: Partial<PlanningGuest>) {
    setPlan((current) => ({
      ...current,
      guests: current.guests.map((guest) => (guest.id === guestId ? { ...guest, ...patch } : guest)),
    }))
  }

  function removeGuest(guestId: string) {
    setPlan((current) => ({
      ...current,
      guests: current.guests.filter((guest) => guest.id !== guestId),
      tables: current.tables.map((table) => ({
        ...table,
        seatAssignments: table.seatAssignments.map((entry) => (entry === guestId ? null : entry)),
      })),
    }))
  }

  function updateTable(tableId: string, patch: Partial<SeatingTable>) {
    setPlan((current) => ({
      ...current,
      tables: current.tables.map((table) => {
        if (table.id !== tableId) {
          return table
        }

        const nextSeatCount = patch.seatCount ?? table.seatCount
        return {
          ...table,
          ...patch,
          seatAssignments: normalizeSeatAssignments(
            patch.seatAssignments ?? table.seatAssignments,
            nextSeatCount,
          ),
        }
      }),
    }))
  }

  function removeTable(tableId: string) {
    setPlan((current) => ({
      ...current,
      tables: current.tables.filter((table) => table.id !== tableId),
    }))
  }

  function importGuestsFromRsvps() {
    const importedGuests = buildImportedGuests(rsvps, plan.guests)

    if (!importedGuests.length) {
      toast.message('Es konnten keine neuen Teilnehmenden aus den RSVP-Antworten übernommen werden.')
      return
    }

    setPlan((current) => ({
      ...current,
      guests: [...current.guests, ...importedGuests],
    }))
    toast.success(`${importedGuests.length} Teilnehmende aus den RSVP-Antworten übernommen.`)
  }

  function addGuest() {
    setPlan((current) => ({
      ...current,
      guests: [...current.guests, createGuest()],
    }))
  }

  function addTable(kind: SeatingTable['kind']) {
    setPlan((current) => ({
      ...current,
      tables: [
        ...current.tables,
        createTable(
          current.tables.filter((table) => table.kind === kind).length + 1,
          kind,
        ),
      ],
    }))
  }

  function adjustTableSeatCount(tableId: string, delta: number) {
    setPlan((current) => ({
      ...current,
      tables: current.tables.map((table) => {
        if (table.id !== tableId) {
          return table
        }

        const nextSeatCount = Math.min(24, Math.max(1, table.seatCount + delta))

        if (nextSeatCount === table.seatCount) {
          return table
        }

        return {
          ...table,
          seatCount: nextSeatCount,
          seatAssignments: normalizeSeatAssignments(table.seatAssignments, nextSeatCount),
        }
      }),
    }))
  }

  function applyGuestTableLayout() {
    const nextGuestTableCount = Math.max(0, Math.min(24, Math.round(guestTableCountDraft || 0)))
    const nextSeatCount = Math.max(1, Math.min(24, Math.round(guestSeatCountDraft || 1)))

    setPlan((current) => {
      const guestTables = current.tables.filter((table) => table.kind === 'guest')
      const nonGuestTables = current.tables.filter((table) => table.kind !== 'guest')
      const nextGuestTables = guestTables.slice(0, nextGuestTableCount).map((table) => ({
        ...table,
        seatCount: nextSeatCount,
        seatAssignments: normalizeSeatAssignments(table.seatAssignments, nextSeatCount),
      }))

      while (nextGuestTables.length < nextGuestTableCount) {
        nextGuestTables.push(createTable(nextGuestTables.length + 1, 'guest', nextSeatCount))
      }

      return {
        ...current,
        tables: [...nextGuestTables, ...nonGuestTables],
      }
    })

    toast.success('Das Tischlayout wurde aktualisiert.')
  }

  function runAutomaticSeating() {
    try {
      const normalizedPlan = normalizePlanningData(plan)
      const nextTables = createAutomaticAssignments(normalizedPlan.guests, normalizedPlan.tables)

      setPlan((current) => ({
        ...current,
        guests: normalizedPlan.guests,
        tables: nextTables,
      }))
      toast.success('Der smarte Sitzvorschlag wurde erstellt.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Der Sitzvorschlag konnte nicht erstellt werden.')
    }
  }

  async function savePlanning() {
    setIsSaving(true)

    try {
      const payload = normalizePlanningData(plan)
      const response = await fetch('/api/admin/seating-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = (await response.json()) as ApiResponse<SeatingPlanData>

      if (!response.ok || !result.success) {
        toast.error(result.success ? 'Speichern fehlgeschlagen.' : result.error)
        return
      }

      setPlan(result.data)
      toast.success(result.message ?? 'Teilnehmerliste und Tischplan wurden gespeichert.')
      startTransition(() => {
        router.refresh()
      })
    } catch {
      toast.error('Teilnehmerliste und Tischplan konnten gerade nicht gespeichert werden.')
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
            <Badge variant="neutral">{plan.tables.length} Tische</Badge>
            <Badge variant="neutral">{unassignedGuests.length} unzugeordnet</Badge>
          </div>
          <p className="max-w-3xl text-body-md text-charcoal-600">
            Diese Teilnehmerliste ist eure interne Planungsansicht für Sitzplan und Gruppen.
            Die eingegangenen Gästeantworten findet ihr separat im Bereich RSVP.
            Die smarte Sitzverteilung setzt ähnliche Gruppen zusammen und berücksichtigt Dienstleister
            bevorzugt am Dienstleistertisch.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="secondary" onClick={importGuestsFromRsvps}>
            <Users className="h-4 w-4" />
            Aus RSVP übernehmen
          </Button>
          <Button type="button" variant="secondary" onClick={runAutomaticSeating}>
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
            <h3 className="font-display text-card text-charcoal-900">Sitzplan fuer Gaeste veroeffentlichen</h3>
            <p className="max-w-3xl text-body-md text-charcoal-600">
              Standardmaessig bleibt der Sitzplan privat und nur im Paarbereich sichtbar. Erst wenn ihr
              diese Option aktiviert und speichert, erscheint er auf der Gaesteseite.
            </p>
            <p className="text-sm text-charcoal-500">
              Dienstleistertische bleiben weiterhin nur intern fuer euch sichtbar.
            </p>
          </div>
          <label className="flex min-h-11 items-center gap-3 rounded-full border border-gold-300 bg-white px-4 py-3 text-sm font-semibold text-charcoal-900">
            <input
              checked={plan.isPublished}
              className="h-4 w-4 accent-gold-500"
              type="checkbox"
              onChange={(event) =>
                setPlan((current) => ({
                  ...current,
                  isPublished: event.target.checked,
                }))
              }
            />
            {plan.isPublished ? 'Fuer Gaeste sichtbar' : 'Privat'}
          </label>
        </div>
      </div>

      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-display text-card text-charcoal-900">Teilnehmerliste</h3>
            <p className="mt-2 text-[0.96rem] leading-7 text-charcoal-600">
              Kategorien und Gruppen helfen bei der automatischen Verteilung. Nutzt das Feld
              `Gruppe/Haushalt`, wenn Personen zusammen sitzen sollen.
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={addGuest}>
            <Plus className="h-4 w-4" />
            Teilnehmer hinzufügen
          </Button>
        </div>

        {plan.guests.length ? (
          <div className="space-y-4">
            {plan.guests.map((guest) => (
              <article key={guest.id} className="rounded-[1.6rem] border border-cream-200 bg-white px-5 py-5 shadow-sm">
                <div className="grid gap-4 xl:grid-cols-[1.15fr_0.95fr_0.9fr_auto]">
                  <Input
                    label="Name"
                    value={guest.name}
                    onChange={(event) => updateGuest(guest.id, { name: event.target.value })}
                  />
                  <label className="flex flex-col gap-2 text-sm font-medium text-charcoal-700">
                    <span>Kategorie</span>
                    <select
                      className="min-h-11 rounded-2xl border border-cream-300 bg-white px-4 py-3 text-base text-charcoal-900 outline-none transition focus:border-gold-500"
                      value={guest.category}
                      onChange={(event) =>
                        updateGuest(guest.id, { category: event.target.value as GuestCategory })
                      }
                    >
                      {GUEST_CATEGORY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Input
                    label="Gruppe / Haushalt"
                    helperText="Optional, z. B. Familie Müller oder Paar Anna & Tim."
                    value={guest.groupLabel ?? ''}
                    onChange={(event) =>
                      updateGuest(guest.id, { groupLabel: event.target.value || null })
                    }
                  />
                  <div className="flex items-end">
                    <Button type="button" variant="ghost" onClick={() => removeGuest(guest.id)}>
                      <Trash2 className="h-4 w-4" />
                      Entfernen
                    </Button>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto]">
                  <Input
                    label="Notiz"
                    helperText="Optional, z. B. spricht vor allem mit Tisch 3 oder braucht ruhige Ecke."
                    value={guest.notes ?? ''}
                    onChange={(event) => updateGuest(guest.id, { notes: event.target.value || null })}
                  />
                  <div className="flex items-end justify-start lg:justify-end">
                    <Badge variant={assignedGuestIds.has(guest.id) ? 'attending' : 'neutral'}>
                      {assignedGuestIds.has(guest.id) ? 'zugewiesen' : 'offen'}
                    </Badge>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[1.75rem] border border-dashed border-cream-300 bg-cream-50 px-5 py-6 text-sm text-charcoal-600">
            Noch keine Teilnehmenden angelegt. Ihr könnt sie manuell erfassen oder direkt aus den RSVP-Antworten übernehmen.
          </div>
        )}
      </div>

      <div id="sitzplan" className="space-y-5 border-t border-cream-200 pt-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="font-display text-card text-charcoal-900">Sitzplan</h3>
            <p className="mt-2 text-[0.96rem] leading-7 text-charcoal-600">
              Legt beliebig viele Tische mit individueller Sitzplatzanzahl an. Teilnehmende lassen sich
              manuell zuordnen oder per smarter Verteilung automatisch setzen.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="secondary" onClick={() => addTable('guest')}>
              <Plus className="h-4 w-4" />
              Tisch hinzufügen
            </Button>
            <Button type="button" variant="secondary" onClick={() => addTable('couple')}>
              <Heart className="h-4 w-4" />
              Brautpaartisch
            </Button>
            <Button type="button" variant="secondary" onClick={() => addTable('service')}>
              <Building2 className="h-4 w-4" />
              Dienstleistertisch
            </Button>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-cream-200 bg-cream-50/70 px-5 py-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
            <Input
              label="Anzahl Gästetische"
              helperText="Erstellt oder reduziert die Anzahl eurer normalen Gästetische."
              inputMode="numeric"
              max={24}
              min={0}
              type="number"
              value={guestTableCountDraft}
              onChange={(event) => setGuestTableCountDraft(Number(event.target.value) || 0)}
            />
            <Input
              label="Sitzplätze pro Gästetisch"
              helperText="Diese Einstellung wirkt auf alle normalen Gästetische. Einzelne Tische könnt ihr darunter zusätzlich anpassen."
              inputMode="numeric"
              max={24}
              min={1}
              type="number"
              value={guestSeatCountDraft}
              onChange={(event) => setGuestSeatCountDraft(Number(event.target.value) || 1)}
            />
            <Button type="button" variant="secondary" onClick={applyGuestTableLayout}>
              Layout anwenden
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-display text-card text-charcoal-900">Visuelle Vorschau</h4>
            <p className="mt-2 text-[0.96rem] leading-7 text-charcoal-600">
              So wirkt euer Tischplan aktuell im Paarbereich. Freie Plätze und bereits gesetzte Personen
              sind direkt sichtbar.
            </p>
          </div>
          <SeatingPreview guestNamesById={guestNamesById} tables={plan.tables} />
        </div>

        {plan.tables.length ? (
          <div className="grid gap-5 xl:grid-cols-2">
            {plan.tables.map((table) => {
              const assignedElsewhere = new Set(
                plan.tables.flatMap((entry) =>
                  entry.id === table.id
                    ? []
                    : entry.seatAssignments.filter((guestId): guestId is string => Boolean(guestId)),
                ),
              )

              return (
                <article key={table.id} className="surface-card px-5 py-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="grid flex-1 gap-4 sm:grid-cols-2">
                      <Input
                        label="Tischname"
                        value={table.name}
                        onChange={(event) => updateTable(table.id, { name: event.target.value })}
                      />
                      <label className="flex flex-col gap-2 text-sm font-medium text-charcoal-700">
                        <span>Tischtyp</span>
                        <select
                          className="min-h-11 rounded-2xl border border-cream-300 bg-white px-4 py-3 text-base text-charcoal-900 outline-none transition focus:border-gold-500"
                          value={table.kind}
                          onChange={(event) =>
                            updateTable(table.id, { kind: event.target.value as SeatingTable['kind'] })
                          }
                        >
                          <option value="guest">Gästetisch</option>
                          <option value="couple">Brautpaartisch</option>
                          <option value="service">Dienstleistertisch</option>
                        </select>
                      </label>
                      <Input
                        label="Sitzplätze"
                        inputMode="numeric"
                        max={24}
                        min={1}
                        type="number"
                        value={table.seatCount}
                        onChange={(event) =>
                          updateTable(table.id, {
                            seatCount: Number(event.target.value) || 1,
                          })
                        }
                      />
                      <div className="flex flex-wrap items-end gap-2 sm:col-span-2">
                        <Button
                          disabled={table.seatCount <= 1}
                          type="button"
                          variant="secondary"
                          onClick={() => adjustTableSeatCount(table.id, -1)}
                        >
                          <Minus className="h-4 w-4" />
                          Platz entfernen
                        </Button>
                        <Button
                          disabled={table.seatCount >= 24}
                          type="button"
                          variant="secondary"
                          onClick={() => adjustTableSeatCount(table.id, 1)}
                        >
                          <Plus className="h-4 w-4" />
                          Platz hinzufügen
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge variant={getTableBadgeVariant(table.kind)}>
                        {TABLE_KIND_LABELS[table.kind]}
                      </Badge>
                      <Button type="button" variant="ghost" onClick={() => removeTable(table.id)}>
                        <Trash2 className="h-4 w-4" />
                        Entfernen
                      </Button>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {table.seatAssignments.map((guestId, seatIndex) => (
                      <label key={`${table.id}-seat-${seatIndex}`} className="flex flex-col gap-2 text-sm font-medium text-charcoal-700">
                        <span>Platz {seatIndex + 1}</span>
                        <select
                          className="min-h-11 rounded-2xl border border-cream-300 bg-white px-4 py-3 text-base text-charcoal-900 outline-none transition focus:border-gold-500"
                          value={guestId ?? ''}
                          onChange={(event) =>
                            updateTable(table.id, {
                              seatAssignments: table.seatAssignments.map((entry, index) =>
                                index === seatIndex ? event.target.value || null : entry,
                              ),
                            })
                          }
                        >
                          <option value="">Nicht besetzt</option>
                          {plan.guests.map((guest) => {
                            const isDisabled =
                              assignedElsewhere.has(guest.id) && guest.id !== guestId

                            return (
                              <option key={guest.id} disabled={isDisabled} value={guest.id}>
                                {guest.name} · {GUEST_CATEGORY_LABELS[guest.category]}
                              </option>
                            )
                          })}
                        </select>
                      </label>
                    ))}
                  </div>

                  <div className="mt-5 rounded-[1.4rem] bg-cream-50 px-4 py-4 text-sm text-charcoal-600">
                    {table.kind === 'service'
                      ? 'Dieser Tisch ist ideal für Fotografen, DJ, Band, Videografen oder weitere Dienstleister.'
                      : table.kind === 'couple'
                        ? 'Der Brautpaartisch wird von der smarten Sitzverteilung bewusst nicht automatisch belegt. Ihr könnt ihn bei Bedarf manuell bestücken.'
                        : `Dieser Gästetisch hat ${table.seatAssignments.filter(Boolean).length} von ${table.seatCount} Plätzen belegt. Einzelne Plätze könnt ihr hier direkt hinzufügen oder entfernen.`}
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="rounded-[1.75rem] border border-dashed border-cream-300 bg-cream-50 px-5 py-6 text-sm text-charcoal-600">
            Noch keine Tische angelegt. Ihr könnt normale Gästetische, einen Brautpaartisch und zusätzlich einen Dienstleistertisch erstellen.
          </div>
        )}

        {unassignedGuests.length ? (
          <div className="rounded-[1.75rem] border border-cream-200 bg-white px-5 py-5 shadow-sm">
            <div className="flex items-center gap-3">
              <Sparkles className="h-4 w-4 text-gold-600" />
              <p className="font-semibold text-charcoal-900">Noch nicht zugeordnet</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {unassignedGuests.map((guest) => (
                <span
                  key={guest.id}
                  className="inline-flex items-center rounded-full bg-cream-100 px-3 py-2 text-sm text-charcoal-700"
                >
                  {guest.name} · {GUEST_CATEGORY_LABELS[guest.category]}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
