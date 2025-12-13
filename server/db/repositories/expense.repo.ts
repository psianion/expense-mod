import { supabase } from '../supabase'
import { Expense, ExpenseSource } from '@types'

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

  async getExpenses(): Promise<Expense[]> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*, bill_instance:bill_instances(*)')
      .order('datetime', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return data as Expense[]
  }

  async getExpenseById(id: string): Promise<Expense | null> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*, bill_instance:bill_instances(*)')
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
