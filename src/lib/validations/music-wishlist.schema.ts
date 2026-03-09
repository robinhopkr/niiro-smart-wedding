import { z } from 'zod'

export const musicRequestSchema = z.object({
  title: z.string().trim().min(2, 'Bitte gib einen Songtitel ein.').max(140),
  artist: z.string().trim().max(140).optional().default(''),
  requestedBy: z.string().trim().max(100).optional().default(''),
})

export const musicVoteSchema = z.object({
  requestId: z.string().trim().min(1, 'Bitte waehle einen Musikwunsch aus.').max(160),
})
