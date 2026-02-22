import type { Expense, Bill, BillInstance, ParseExpenseRequest, ParseExpenseResponse } from '@/types'
import type { ApiError } from './client'

// Common API response wrapper
export interface ApiResponse<T = any> {
  data?: T
  error?: string
  message?: string
}

// Pagination parameters
export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

// Query parameters for filtering
export interface QueryParams extends PaginationParams {
  [key: string]: any
}

// Expense API types (currency not stored in DB; use display symbol in UI)
export interface CreateExpenseRequest {
  amount: number
  datetime: string
  category?: string
  platform?: string
  payment_method?: string
  type: 'EXPENSE' | 'INFLOW'
  event?: string
  notes?: string
  tags?: string[]
  raw_text?: string
  source?: 'MANUAL' | 'AI' | 'RECURRING'
  bill_instance_id?: string
}

export interface UpdateExpenseRequest extends Partial<CreateExpenseRequest> {
  id: string
}

export interface ExpenseFilters {
  type?: 'EXPENSE' | 'INFLOW'
  category?: string
  platform?: string
  payment_method?: string
  date_from?: string
  date_to?: string
  source?: 'MANUAL' | 'AI' | 'RECURRING'
  bill_instance_id?: string
  search?: string
  sort_by?: 'datetime' | 'amount' | 'category'
  sort_order?: 'asc' | 'desc'
  page?: number
  limit?: number
  offset?: number
}

export interface ExpensesResponse {
  expenses: Expense[]
  total: number
  page?: number
  limit?: number
}

// Bill API types
export interface CreateBillRequest {
  name: string
  type: 'BILL' | 'EMI' | 'CREDITCARD' | 'SUBSCRIPTION' | 'SALARY' | 'INCOME'
  frequency: 'MONTHLY' | 'WEEKLY' | 'YEARLY'
  day_of_month?: number
  day_of_week?: number
  start_date?: string
  end_date?: string
  amount?: number
  auto_post: boolean
  notes?: string
}

export interface UpdateBillRequest extends Partial<CreateBillRequest> {
  id: string
}

export interface BillFilters {
  type?: ('BILL' | 'EMI' | 'CREDITCARD' | 'SUBSCRIPTION' | 'SALARY' | 'INCOME')[]
}

export interface BillsResponse {
  bills: Bill[]
  total?: number
}

// Bill Instance API types
export interface CreateBillInstanceRequest {
  bill_id: string
  due_date: string
  amount: number
  status?: 'DUE' | 'PAID' | 'SKIPPED'
}

export interface UpdateBillInstanceRequest extends Partial<CreateBillInstanceRequest> {
  id: string
}

export interface BillInstancesResponse {
  billInstances: BillInstance[]
  total?: number
}

// Analytics API types - reusing existing analytics types
export type AnalyticsData = any // Will be defined based on analytics service response

// AI API types
export type AiParseExpenseRequest = ParseExpenseRequest
export type AiParseExpenseResponse = ParseExpenseResponse

// Generic CRUD API interface
export interface CrudApi<T, CreateReq, UpdateReq, Filters = any> {
  getAll: (filters?: Filters) => Promise<T[]>
  getById: (id: string) => Promise<T>
  create: (data: CreateReq) => Promise<T>
  update: (data: UpdateReq) => Promise<T>
  delete: (id: string) => Promise<void>
}
