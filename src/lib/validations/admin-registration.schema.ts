import { z } from 'zod'

export const coupleRegistrationSchema = z.object({
  coupleLabel: z.string().trim().min(2, 'Bitte gebt den Namen des Brautpaares ein.').max(200),
  email: z.string().trim().email('Bitte gib eine gültige E-Mail-Adresse ein.'),
  password: z.string().min(8, 'Das Passwort muss mindestens 8 Zeichen lang sein.'),
})

export const plannerRegistrationSchema = z.object({
  displayName: z.string().trim().min(2, 'Bitte gib einen Namen ein.').max(160),
  email: z.string().trim().email('Bitte gib eine gültige E-Mail-Adresse ein.'),
  password: z.string().min(8, 'Das Passwort muss mindestens 8 Zeichen lang sein.'),
})

export const plannerWeddingSelectionSchema = z.object({
  weddingSource: z.enum(['modern', 'legacy']),
  weddingSourceId: z.string().trim().min(1, 'Bitte wähle eine Hochzeit aus.'),
})

export const plannerCustomerNumberSchema = z
  .object({
    customerNumber: z.string().trim().max(80),
    privacyConsentConfirmed: z.boolean().optional().default(false),
  })
  .superRefine((value, context) => {
    if (value.customerNumber && !value.privacyConsentConfirmed) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Bitte bestätigt zuerst den Datenschutzhinweis zur Wedding-Planer-Verknüpfung.',
        path: ['privacyConsentConfirmed'],
      })
    }
  })

export type CoupleRegistrationSchema = z.infer<typeof coupleRegistrationSchema>
export type PlannerRegistrationSchema = z.infer<typeof plannerRegistrationSchema>
export type PlannerWeddingSelectionSchema = z.infer<typeof plannerWeddingSelectionSchema>
export type PlannerCustomerNumberSchema = z.infer<typeof plannerCustomerNumberSchema>
