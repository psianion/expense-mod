import { z } from 'zod'
import { BillType, BillFrequency } from '../../types'

const billTypes: [BillType, ...BillType[]] = ['BILL', 'EMI', 'CREDITCARD', 'SUBSCRIPTION', 'SALARY', 'INCOME']
const billFrequencies: [BillFrequency, ...BillFrequency[]] = ['MONTHLY', 'WEEKLY', 'YEARLY']

const baseBillSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  type: z.enum(billTypes),
  frequency: z.enum(billFrequencies),
  day_of_month: z.number().int().min(1).max(28).nullable().optional(),
  day_of_week: z.number().int().min(0).max(6).nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  amount: z.number().nonnegative().nullable().optional(),
  auto_post: z.boolean().default(false),
  notes: z.string().nullable().optional(),
})

export const billSchema = baseBillSchema
  .refine((value) => value.frequency !== 'MONTHLY' || (value.day_of_month !== undefined && value.day_of_month !== null), {
    message: 'day_of_month is required for monthly frequency',
    path: ['day_of_month'],
  })
  .refine((value) => value.frequency !== 'WEEKLY' || (value.day_of_week !== undefined && value.day_of_week !== null), {
    message: 'day_of_week is required for weekly frequency',
    path: ['day_of_week'],
  })

export const createBillSchema = baseBillSchema.omit({ id: true })
export const updateBillSchema = billSchema

export type CreateBillInput = z.infer<typeof createBillSchema>
export type UpdateBillInput = z.infer<typeof updateBillSchema>
