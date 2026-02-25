// server/validators/import.schema.ts
import { z } from 'zod'
import type { ConfirmRowInput, ConfirmAllInput } from '@/types/import'

// File upload — validates presence and basic metadata at the route boundary
export const fileUploadSchema = z.object({
  file: z.unknown().refine((f): f is File => f instanceof File, { message: 'No file provided' }),
})

export const confirmRowSchema: z.ZodType<ConfirmRowInput> = z.object({
  action: z.enum(['CONFIRM', 'SKIP']),
  fields: z.object({
    amount: z.number().positive().optional(),
    datetime: z.string().optional(),
    type: z.enum(['EXPENSE', 'INFLOW']).optional(),
    category: z.string().optional(),
    platform: z.string().optional(),
    payment_method: z.string().optional(),
    notes: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),
})

export const confirmAllSchema: z.ZodType<ConfirmAllInput> = z.object({
  scope: z.enum(['AUTO', 'ALL']),
})
