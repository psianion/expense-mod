// Feature-specific types for expenses
export interface ExpenseFilters {
  category?: string
  platform?: string
  paymentMethod?: string
  dateRange?: {
    start: string
    end: string
  }
}

export interface ExpenseFormData {
  amount: string
  currency: string
  datetime: string
  category: string
  platform: string
  paymentMethod: string
  type: 'EXPENSE' | 'INFLOW'
  event: string
  notes: string
}


