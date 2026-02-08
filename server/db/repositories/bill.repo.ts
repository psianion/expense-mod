import { supabase, getServiceRoleClient } from '../supabase'
import type { RepoAuthContext } from './expense.repo'
import { Bill, BillType } from '@/types'

function getClient(auth?: RepoAuthContext | null) {
  if (auth && process.env.SUPABASE_SERVICE_ROLE_KEY) return getServiceRoleClient()
  return supabase
}

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
  async getBills(typeFilter?: BillType[], auth?: RepoAuthContext | null): Promise<Bill[]> {
    const client = getClient(auth)
    let query = client.from('bills').select('*').order('created_at', { ascending: false })

    if (auth && !auth.useMasterAccess && auth.userId) {
      query = query.eq('user_id', auth.userId)
    }
    if (typeFilter && typeFilter.length > 0) {
      query = query.in('type', typeFilter)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    return (data || []).map(this.normalizeBill) as Bill[]
  }

  async createBill(data: CreateBillData, auth?: RepoAuthContext | null): Promise<Bill> {
    const client = getClient(auth)
    const userId = auth?.userId ?? null
    const { data: bill, error } = await client
      .from('bills')
      .insert([
        {
          ...data,
          user_id: userId,
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

  async updateBill(data: UpdateBillData, auth?: RepoAuthContext | null): Promise<Bill> {
    const { id, ...updates } = data
    const client = getClient(auth)
    let query = client.from('bills').update({
      ...updates,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    if (auth && !auth.useMasterAccess && auth.userId) {
      query = query.eq('user_id', auth.userId)
    }
    const { data: bill, error } = await query.select().single()

    if (error) {
      throw new Error(error.message)
    }

    return this.normalizeBill(bill) as Bill
  }

  async deleteBill(id: string, auth?: RepoAuthContext | null): Promise<void> {
    const client = getClient(auth)
    let query = client.from('bills').delete().eq('id', id)
    if (auth && !auth.useMasterAccess && auth.userId) {
      query = query.eq('user_id', auth.userId)
    }
    const { error } = await query

    if (error) {
      throw new Error(error.message)
    }
  }

  async getBillById(id: string, auth?: RepoAuthContext | null): Promise<Bill | null> {
    const client = getClient(auth)
    let query = client.from('bills').select('*').eq('id', id)
    if (auth && !auth.useMasterAccess && auth.userId) {
      query = query.eq('user_id', auth.userId)
    }
    const { data, error } = await query.single()

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
