import { supabase, getServiceRoleClient, DB_UNAVAILABLE_MESSAGE } from '../supabase'
import { Expense, ExpenseSource } from '@/types'

export interface RepoAuthContext {
  userId: string
  useMasterAccess: boolean
}

export interface CreateExpenseData {
  user_id: string | null
  amount: number
  datetime: string
  category: string
  platform: string
  payment_method: string
  type: 'EXPENSE' | 'INFLOW'
  tags: string[]
  parsed_by_ai: boolean
  raw_text: string | null
  source: ExpenseSource
  bill_id: string | null
  bill_instance_id?: string | null
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

function getClient(auth?: RepoAuthContext | null) {
  // Use service role when we have auth and key is set (RLS would block anon without user JWT)
  if (auth && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return getServiceRoleClient()
  }
  return supabase
}

export class ExpenseRepository {
  async createExpense(data: CreateExpenseData, auth?: RepoAuthContext | null): Promise<Expense> {
    const client = getClient(auth)
    const { data: expense, error } = await client
      .from('expenses')
      .insert([data])
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return expense as Expense
  }

  async getExpenses(
    filters?: ExpenseFilters,
    auth?: RepoAuthContext | null
  ): Promise<{ expenses: Expense[]; total: number }> {
    const client = getClient(auth)
    let query = client
      .from('expenses')
      .select('*', { count: 'exact' })

    // Sort
    const sortCol = filters?.sort_by ?? 'datetime'
    const ascending = filters?.sort_order === 'asc'
    query = query.order(sortCol, { ascending })

    if (auth && !auth.useMasterAccess && auth.userId) {
      query = query.eq('user_id', auth.userId)
    }

    // Exact filters
    if (filters?.type) query = query.eq('type', filters.type)
    if (filters?.category) query = query.eq('category', filters.category)
    if (filters?.platform) query = query.eq('platform', filters.platform)
    if (filters?.payment_method) query = query.eq('payment_method', filters.payment_method)
    if (filters?.date_from) query = query.gte('datetime', filters.date_from)
    if (filters?.date_to) query = query.lte('datetime', filters.date_to)
    if (filters?.source) query = query.eq('source', filters.source)
    if (filters?.bill_instance_id) query = query.eq('bill_instance_id', filters.bill_instance_id)

    // Full-text search across category, platform, payment_method, tags (cast to text), raw_text
    // NOTE: Expense type has no 'notes' column. Searchable columns: category, platform,
    // payment_method, tags (array cast to text as "{food,lunch}"), raw_text.
    if (filters?.search) {
      const s = filters.search.replace(/[%_]/g, '\\$&')
      query = query.or(
        `category.ilike.%${s}%,platform.ilike.%${s}%,payment_method.ilike.%${s}%,tags::text.ilike.%${s}%,raw_text.ilike.%${s}%`
      )
    }

    // Pagination: prefer page over raw offset
    const limit = filters?.limit ?? 25
    if (filters?.page && filters.page > 0) {
      const offset = (filters.page - 1) * limit
      query = query.range(offset, offset + limit - 1)
    } else if (filters?.offset !== undefined) {
      query = query.range(filters.offset, filters.offset + limit - 1)
    } else if (filters?.limit) {
      query = query.limit(limit)
    }

    const { data, error, count } = await query

    if (error) {
      const msg = error.message ?? ''
      if (msg === 'fetch failed' || (error.name === 'TypeError' && msg.includes('fetch'))) {
        throw new Error(DB_UNAVAILABLE_MESSAGE)
      }
      throw new Error(error.message)
    }

    return { expenses: data as Expense[], total: count ?? 0 }
  }

  async getFacets(auth?: RepoAuthContext | null): Promise<{
    categories: string[]
    platforms: string[]
    payment_methods: string[]
  }> {
    const client = getClient(auth)

    const buildFacetQuery = (col: string) => {
      let q = client.from('expenses').select(col)
      if (auth && !auth.useMasterAccess && auth.userId) {
        q = q.eq('user_id', auth.userId)
      }
      return q
    }

    const [catRes, platRes, pmRes] = await Promise.all([
      buildFacetQuery('category'),
      buildFacetQuery('platform'),
      buildFacetQuery('payment_method'),
    ])

    const unique = (arr: Record<string, unknown>[], key: string): string[] =>
      [...new Set(arr?.map((r) => r[key]).filter(Boolean))].sort() as string[]

    return {
      categories: unique(catRes.data ?? [], 'category'),
      platforms: unique(platRes.data ?? [], 'platform'),
      payment_methods: unique(pmRes.data ?? [], 'payment_method'),
    }
  }

  async getExpenseById(id: string, auth?: RepoAuthContext | null): Promise<Expense | null> {
    const client = getClient(auth)
    let query = client.from('expenses').select('*').eq('id', id)
    if (auth && !auth.useMasterAccess && auth.userId) {
      query = query.eq('user_id', auth.userId)
    }
    const { data, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw new Error(error.message)
    }

    return data as Expense
  }

  async updateExpense(id: string, updates: Partial<CreateExpenseData>, auth?: RepoAuthContext | null): Promise<Expense> {
    const client = getClient(auth)
    let query = client.from('expenses').update(updates).eq('id', id)
    if (auth && !auth.useMasterAccess && auth.userId) {
      query = query.eq('user_id', auth.userId)
    }
    const { data, error } = await query.select().single()

    if (error) {
      throw new Error(error.message)
    }

    return data as Expense
  }

  async deleteExpense(id: string, auth?: RepoAuthContext | null): Promise<void> {
    const client = getClient(auth)
    let query = client.from('expenses').delete().eq('id', id)
    if (auth && !auth.useMasterAccess && auth.userId) {
      query = query.eq('user_id', auth.userId)
    }
    const { error } = await query

    if (error) {
      throw new Error(error.message)
    }
  }
}

export const expenseRepository = new ExpenseRepository()
