import { z } from 'zod'

export const loginSchema = z.object({
  role: z.enum(['couple', 'planner']),
  email: z.string().trim().email('Bitte gib eine gültige E-Mail-Adresse ein.'),
  password: z.string().min(8, 'Das Passwort muss mindestens 8 Zeichen lang sein.'),
})

export type LoginSchema = z.infer<typeof loginSchema>
