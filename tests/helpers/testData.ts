import type { Expense, Bill, BillInstance } from '@/types'

const now = new Date().toISOString()

export const sampleExpense = {
  id: 'e0000000-0000-0000-0000-000000000001',
  user_id: null,
  amount: 100,
  datetime: now,
  category: 'Food',
  platform: 'Other',
  payment_method: 'Other',
  type: 'EXPENSE' as const,
  tags: [],
  parsed_by_ai: false,
  raw_text: null,
  source: 'MANUAL' as const,
  bill_id: null,
  bill_instance_id: null,
  created_at: now,
} satisfies Expense

export const sampleBill = {
  id: 'b0000000-0000-0000-0000-000000000001',
  user_id: null,
  name: 'Rent',
  type: 'BILL' as const,
  frequency: 'MONTHLY' as const,
  day_of_month: 1,
  day_of_week: null,
  start_date: null,
  end_date: null,
  amount: 1200,
  auto_post: false,
  notes: null,
  last_generated_at: null,
  last_bill_created: null,
  created_at: now,
  updated_at: now,
} satisfies Bill

export const sampleBillInstance = {
  id: 'i0000000-0000-0000-0000-000000000001',
  bill_id: 'b0000000-0000-0000-0000-000000000001',
  user_id: null,
  due_date: now.slice(0, 10),
  amount: 1200,
  status: 'DUE' as const,
  posted_expense_id: null,
  created_at: now,
} satisfies BillInstance

export const createExpensePayload = {
  expense: {
    amount: 50,
    datetime: now,
    category: 'Transport',
    platform: 'Other',
    payment_method: 'Other',
    type: 'EXPENSE' as const,
    tags: [],
  },
  source: 'MANUAL' as const,
}

export const createBillPayload = {
  name: 'Netflix',
  type: 'SUBSCRIPTION' as const,
  frequency: 'MONTHLY' as const,
  day_of_month: 15,
  day_of_week: null,
  amount: 15,
  auto_post: false,
  notes: null,
}

export const parseExpenseResponseFixture = {
  parsed: {
    amount: 42.5,
    datetime: now,
    category: 'Food',
    platform: 'Other',
    payment_method: 'Other',
    type: 'EXPENSE' as const,
    tags: ['lunch'],
  },
  raw_model_output: '{}',
  bill_match: null,
}
