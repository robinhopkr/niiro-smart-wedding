import { z } from 'zod'

const guestCategorySchema = z.enum([
  'family',
  'close_friends',
  'friends',
  'work',
  'single',
  'bridal_party',
  'children',
  'vendors',
  'other',
])

const planningGuestSchema = z.object({
  id: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1, 'Bitte gib einen Namen ein.').max(200),
  kind: z.enum(['adult', 'child']).default('adult'),
  category: guestCategorySchema,
  householdId: z.string().trim().max(160).nullable(),
  groupLabel: z.string().trim().max(120).nullable(),
  requiresHighChair: z.boolean().default(false),
  notes: z.string().trim().max(400).nullable(),
})

const buffetSongSchema = z.object({
  id: z.string().trim().min(1).max(160),
  title: z.string().trim().min(1, 'Bitte gib einen Songtitel ein.').max(200),
  artist: z.string().trim().max(200).nullable(),
  sortOrder: z.number().int().min(0).max(999),
})

const seatingTableSchema = z.object({
  id: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1, 'Bitte gib einen Tischnamen ein.').max(120),
  kind: z.enum(['guest', 'child', 'service', 'couple']),
  shape: z.enum(['round', 'oval', 'long', 'square']).default('round'),
  buffetSongId: z.string().trim().min(1).max(160).nullable().default(null),
  seatCount: z.number().int().min(1).max(24),
  seatAssignments: z.array(z.string().trim().min(1).nullable()).max(24),
})

export const seatingPlanSchema = z
  .object({
    isPublished: z.boolean().default(false),
    buffetMode: z
      .object({
        enabled: z.boolean().default(false),
        songs: z.array(buffetSongSchema).max(120).default([]),
      })
      .default({
        enabled: false,
        songs: [],
      }),
    guests: z.array(planningGuestSchema).max(300),
    tables: z.array(seatingTableSchema).max(80),
  })
  .superRefine((data, context) => {
    const guestIds = new Set(data.guests.map((guest) => guest.id))
    const assignedGuestIds = new Set<string>()
    const buffetSongIds = new Set(data.buffetMode.songs.map((song) => song.id))
    const guestTableAssignments = new Map<string, string>()

    data.tables.forEach((table, tableIndex) => {
      if (table.seatAssignments.length !== table.seatCount) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['tables', tableIndex, 'seatAssignments'],
          message: 'Die Anzahl der Sitzplätze passt nicht zur Tischgröße.',
        })
      }

      table.seatAssignments.forEach((guestId, seatIndex) => {
        if (!guestId) {
          return
        }

        if (!guestIds.has(guestId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['tables', tableIndex, 'seatAssignments', seatIndex],
            message: 'Dieser Gast ist nicht in der Gästeliste vorhanden.',
          })
        }

        if (assignedGuestIds.has(guestId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['tables', tableIndex, 'seatAssignments', seatIndex],
            message: 'Ein Gast darf nur einmal im Sitzplan vorkommen.',
          })
        }

        assignedGuestIds.add(guestId)
        guestTableAssignments.set(guestId, table.id)
      })

      if (table.buffetSongId && !buffetSongIds.has(table.buffetSongId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['tables', tableIndex, 'buffetSongId'],
          message: 'Dieser Buffet-Song ist nicht mehr in der Songliste vorhanden.',
        })
      }
    })

    data.guests.forEach((guest, guestIndex) => {
      if (guest.kind !== 'child' || !guest.householdId) {
        return
      }

      const householdAdults = data.guests.filter(
        (candidate) => candidate.householdId === guest.householdId && candidate.kind === 'adult',
      )

      if (!householdAdults.length) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['guests', guestIndex, 'householdId'],
          message: 'Jedes Kind braucht mindestens eine zugehörige erwachsene Person im selben Haushalt.',
        })
        return
      }

    })

    data.guests.forEach((guest, guestIndex) => {
      if (!guest.requiresHighChair || guest.kind === 'child') {
        return
      }

      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['guests', guestIndex, 'requiresHighChair'],
        message: 'Hochstuehle koennen nur fuer als Kind markierte Gaeste gesetzt werden.',
      })
    })
  })

export type SeatingPlanSchema = z.infer<typeof seatingPlanSchema>
