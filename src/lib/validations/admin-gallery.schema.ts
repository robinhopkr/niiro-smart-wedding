import { z } from 'zod'

export const adminGalleryDeleteSchema = z.object({
  path: z.string().trim().min(1, 'Bitte wähle ein Foto aus.'),
})

export const adminGalleryMoveSchema = z.object({
  path: z.string().trim().min(1, 'Bitte wähle ein Foto aus.'),
  targetVisibility: z.enum(['public', 'private']),
})
