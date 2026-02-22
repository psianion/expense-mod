// server/validators/import.schema.ts
import { z } from 'zod'

export const confirmRowSchema = z.object({
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

export const confirmAllSchema = z.object({
  scope: z.enum(['AUTO', 'ALL']),
})

export type ConfirmRowInput = z.infer<typeof confirmRowSchema>
export type ConfirmAllInput = z.infer<typeof confirmAllSchema>
