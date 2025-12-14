import { supabase } from '../supabase'
import { Bill, BillType } from '@/types'

export interface CreateBillData {
  name: string
  type: BillType
  frequency: 'MONTHLY' | 'WEEKLY' | 'YEARLY'
  day_of_month: number | null
  day_of_week: number | null
  start_date: string | null
  end_date: string | null
  amount: number | null
  auto_post: boolean
  notes: string | null
}

export interface UpdateBillData extends Partial<CreateBillData> {
  id: string
}

export class BillRepository {
  async getBills(typeFilter?: BillType[]): Promise<Bill[]> {
    let query = supabase.from('bills').select('*').order('created_at', { ascending: false })

    if (typeFilter && typeFilter.length > 0) {
      query = query.in('type', typeFilter)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    return (data || []).map(this.normalizeBill) as Bill[]
  }

  async createBill(data: CreateBillData): Promise<Bill> {
    const { data: bill, error } = await supabase
      .from('bills')
      .insert([
        {
          ...data,
          user_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return this.normalizeBill(bill) as Bill
  }

  async updateBill(data: UpdateBillData): Promise<Bill> {
    const { id, ...updates } = data

    const { data: bill, error } = await supabase
      .from('bills')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return this.normalizeBill(bill) as Bill
  }

  async deleteBill(id: string): Promise<void> {
    const { error } = await supabase.from('bills').delete().eq('id', id)

    if (error) {
      throw new Error(error.message)
    }
  }

  async getBillById(id: string): Promise<Bill | null> {
    const { data, error } = await supabase
      .from('bills')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw new Error(error.message)
    }

    return this.normalizeBill(data) as Bill
  }

  private normalizeBill(bill: any): Bill {
    return {
      ...bill,
      type: (bill?.type?.toUpperCase?.() as Bill['type']) ?? bill?.type,
      frequency: (bill?.frequency?.toUpperCase?.() as Bill['frequency']) ?? bill?.frequency,
    }
  }
}

export const billRepository = new BillRepository()
