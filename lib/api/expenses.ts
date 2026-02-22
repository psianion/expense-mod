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
  async getExpenses(filters?: ExpenseFilters): Promise<{ expenses: Expense[]; total: number }> {
    const params = new URLSearchParams()

    if (filters?.type) params.append('type', filters.type)
    if (filters?.category) params.append('category', filters.category)
    if (filters?.platform) params.append('platform', filters.platform)
    if (filters?.payment_method) params.append('payment_method', filters.payment_method)
    if (filters?.date_from) params.append('date_from', filters.date_from!)
    if (filters?.date_to) params.append('date_to', filters.date_to!)
    if (filters?.source) params.append('source', filters.source)
    if (filters?.bill_instance_id) params.append('bill_instance_id', filters.bill_instance_id!)
    if (filters?.search) params.append('search', filters.search)
    if (filters?.sort_by) params.append('sort_by', filters.sort_by)
    if (filters?.sort_order) params.append('sort_order', filters.sort_order)
    if (filters?.page) params.append('page', filters.page.toString())
    if (filters?.limit) params.append('limit', filters.limit.toString())
    if (filters?.offset !== undefined) params.append('offset', filters.offset.toString())

    const response = await apiClient.get<ExpensesResponse>(
      `/expenses${params.toString() ? `?${params.toString()}` : ''}`
    )

    return { expenses: response.data.expenses, total: response.data.total ?? 0 }
  },

  // Get recent expenses (for preview cards)
  async getRecentExpenses(limit = 5): Promise<Expense[]> {
    const { expenses } = await this.getExpenses({ limit })
    return expenses
  },

  // Get distinct filter values (categories, platforms, payment methods)
  async getExpenseFacets(): Promise<{
    categories: string[]
    platforms: string[]
    payment_methods: string[]
  }> {
    const response = await apiClient.get<{
      categories: string[]
      platforms: string[]
      payment_methods: string[]
    }>('/expenses/facets')
    return response.data
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
