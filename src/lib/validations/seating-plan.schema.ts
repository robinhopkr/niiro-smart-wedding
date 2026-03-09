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
  category: guestCategorySchema,
  groupLabel: z.string().trim().max(120).nullable(),
  notes: z.string().trim().max(400).nullable(),
})

const seatingTableSchema = z.object({
  id: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1, 'Bitte gib einen Tischnamen ein.').max(120),
  kind: z.enum(['guest', 'service', 'couple']),
  seatCount: z.number().int().min(1).max(24),
  seatAssignments: z.array(z.string().trim().min(1).nullable()).max(24),
})

export const seatingPlanSchema = z
  .object({
    isPublished: z.boolean().default(false),
    guests: z.array(planningGuestSchema).max(300),
    tables: z.array(seatingTableSchema).max(80),
  })
  .superRefine((data, context) => {
    const guestIds = new Set(data.guests.map((guest) => guest.id))
    const assignedGuestIds = new Set<string>()

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
      })
    })
  })

export type SeatingPlanSchema = z.infer<typeof seatingPlanSchema>
