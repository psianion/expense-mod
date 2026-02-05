import { z } from 'zod'
import { ExpenseSource } from '@/types'

export const expenseSchema = z.object({
  amount: z.number().positive(),
  datetime: z.string(), // Required
  category: z.string().default('Other'),
  platform: z.string().default('Other'),
  payment_method: z.string().default('Other'),
  type: z.enum(['EXPENSE', 'INFLOW']).default('EXPENSE'),
  tags: z.array(z.string()).default([]),
})

export const createExpenseSchema = z.object({
  expense: expenseSchema,
  source: z.enum(['AI', 'MANUAL', 'RECURRING']).default('AI'),
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
