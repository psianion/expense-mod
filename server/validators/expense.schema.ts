import { z } from 'zod'
import { ExpenseSource } from '@/types'

export const expenseSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().min(1),
  datetime: z.string().optional(),
  category: z.string().nullable().optional(),
  platform: z.string().nullable().optional(),
  payment_method: z.string().nullable().optional(),
  type: z.enum(['EXPENSE', 'INFLOW']).default('EXPENSE'),
  event: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export const createExpenseSchema = z.object({
  expense: expenseSchema,
  source: z.enum(['AI', 'MANUAL']).default('AI'),
  billMatch: z
    .object({
      bill_id: z.string().uuid().optional(),
      bill_name: z.string().optional(),
      bill_type: z.enum(['BILL', 'EMI', 'CREDITCARD', 'SUBSCRIPTION', 'SALARY', 'INCOME']).optional(),
    })
    .optional(),
  raw_text: z.string().nullable().optional(),
})

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>
