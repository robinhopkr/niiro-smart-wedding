import { z } from 'zod'

const menuChoiceSchema = z.enum(['meat', 'fish', 'vegetarian', 'vegan'])

export const rsvpSchema = z
  .object({
    guestName: z.string().min(2, 'Bitte gib deinen vollständigen Namen ein.').max(200),
    guestEmail: z
      .string()
      .trim()
      .email('Bitte gib eine gültige E-Mail-Adresse ein.')
      .or(z.literal('')),
    isAttending: z.enum(['yes', 'no'], {
      message: 'Bitte wähle aus, ob du teilnehmen kannst.',
    }),
    plusOne: z.boolean().default(false),
    plusOneName: z.string().trim().max(200).default(''),
    totalGuests: z.coerce
      .number({
        invalid_type_error: 'Bitte gib die Anzahl der Personen an.',
      })
      .min(1, 'Mindestens eine Person muss angegeben werden.')
      .max(10, 'Maximal 10 Personen können angegeben werden.'),
    menuChoices: z.array(menuChoiceSchema).max(4).default([]),
    dietaryNotes: z.string().trim().max(500).default(''),
    message: z.string().trim().max(1000).default(''),
    honeypot: z.literal(''),
  })
  .superRefine((data, context) => {
    if (data.isAttending === 'yes' && data.plusOne && !data.plusOneName.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['plusOneName'],
        message: 'Bitte gib den Namen deiner Begleitperson an.',
      })
    }

    if (data.isAttending === 'yes' && data.totalGuests < 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['totalGuests'],
        message: 'Bitte gib an, mit wie vielen Personen du kommst.',
      })
    }

    if (data.isAttending === 'yes' && data.menuChoices.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['menuChoices'],
        message: 'Bitte wähle mindestens eine Essensvariante aus.',
      })
    }
  })

export type RsvpSchema = z.infer<typeof rsvpSchema>
