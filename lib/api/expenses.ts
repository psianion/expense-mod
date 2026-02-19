import apiClient from './client'
import type { Expense } from '@/types'
import type {
  CreateExpenseRequest,
  ExpensesResponse,
  ExpenseFilters
} from './types'

// Expenses API module
export const expensesApi = {
  // Get all expenses with optional filters
  async getExpenses(filters?: ExpenseFilters): Promise<Expense[]> {
    const params = new URLSearchParams()

    if (filters?.type) params.append('type', filters.type)
    if (filters?.category) params.append('category', filters.category)
    if (filters?.platform) params.append('platform', filters.platform)
    if (filters?.payment_method) params.append('payment_method', filters.payment_method)
    if (filters?.date_from) params.append('date_from', filters.date_from!)
    if (filters?.date_to) params.append('date_to', filters.date_to!)
    if (filters?.source) params.append('source', filters.source)
    if (filters?.bill_instance_id) params.append('bill_instance_id', filters.bill_instance_id!)
    if (filters?.limit) params.append('limit', filters.limit.toString())
    if (filters?.offset) params.append('offset', filters.offset.toString())

    const response = await apiClient.get<ExpensesResponse>(
      `/expenses${params.toString() ? `?${params.toString()}` : ''}`
    )

    return response.data.expenses
  },

  // Get recent expenses (for preview cards)
  async getRecentExpenses(limit = 5): Promise<Expense[]> {
    return this.getExpenses({ limit })
  },

  // Get expense by ID
  async getExpenseById(id: string): Promise<Expense> {
    const response = await apiClient.get<{ expense: Expense }>(`/expenses/${id}`)
    return response.data.expense
  },

  // Create a new expense
  async createExpense(data: {
    expense: CreateExpenseRequest
    source: 'MANUAL' | 'AI' | 'RECURRING'
    billMatch?: any
    raw_text?: string
  }): Promise<{ expense: Expense; matchedBillId: string | null; creditCardId: string | null }> {
    const response = await apiClient.post<{
      expense: Expense
      matchedBillId: string | null
      creditCardId: string | null
    }>('/expenses', data)
    return response.data
  },

  // Update an expense
  async updateExpense(id: string, updates: Partial<CreateExpenseRequest>): Promise<Expense> {
    const response = await apiClient.patch<{ expense: Expense }>(`/expenses/${id}`, updates)
    return response.data.expense
  },

  // Delete an expense
  async deleteExpense(id: string): Promise<void> {
    await apiClient.delete(`/expenses/${id}`)
  },
}
