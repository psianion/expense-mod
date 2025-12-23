import { supabase } from '../supabase'
import { Expense, ExpenseSource } from '@/types'

export interface CreateExpenseData {
  user_id: string | null
  amount: number
  currency: string
  datetime: string
  category: string | null
  platform: string | null
  payment_method: string | null
  type: 'EXPENSE' | 'INFLOW'
  event: string | null
  notes: string | null
  parsed_by_ai: boolean
  raw_text: string | null
  source: ExpenseSource
  bill_instance_id: string | null
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
  limit?: number
  offset?: number
}

export class ExpenseRepository {
  async createExpense(data: CreateExpenseData): Promise<Expense> {
    const { data: expense, error } = await supabase
      .from('expenses')
      .insert([data])
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return expense as Expense
  }

  async getExpenses(filters?: ExpenseFilters): Promise<Expense[]> {
    let query = supabase
      .from('expenses')
      .select('*')
      .order('datetime', { ascending: false })

    // Apply filters
    if (filters?.type) {
      query = query.eq('type', filters.type)
    }
    if (filters?.category) {
      query = query.eq('category', filters.category)
    }
    if (filters?.platform) {
      query = query.eq('platform', filters.platform)
    }
    if (filters?.payment_method) {
      query = query.eq('payment_method', filters.payment_method)
    }
    if (filters?.date_from) {
      query = query.gte('datetime', filters.date_from)
    }
    if (filters?.date_to) {
      query = query.lte('datetime', filters.date_to)
    }
    if (filters?.source) {
      query = query.eq('source', filters.source)
    }
    if (filters?.bill_instance_id) {
      query = query.eq('bill_instance_id', filters.bill_instance_id)
    }
    if (filters?.limit) {
      query = query.limit(filters.limit)
    }
    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    return data as Expense[]
  }

  async getExpenseById(id: string): Promise<Expense | null> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw new Error(error.message)
    }

    return data as Expense
  }

  async updateExpense(id: string, updates: Partial<CreateExpenseData>): Promise<Expense> {
    const { data, error } = await supabase
      .from('expenses')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as Expense
  }

  async deleteExpense(id: string): Promise<void> {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(error.message)
    }
  }
}

export const expenseRepository = new ExpenseRepository()
