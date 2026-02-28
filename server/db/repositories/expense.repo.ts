import { supabase, getServiceRoleClient, DB_UNAVAILABLE_MESSAGE } from '../supabase'
import { Expense, ExpenseSource } from '@/types'
import { createServiceLogger } from '@/server/lib/logger'
import { AppError } from '@/server/lib/errors'
const log = createServiceLogger('ExpenseRepo')

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
      log.error({ method: 'createExpense', err: error }, 'Database operation failed')
      throw new AppError('DB_ERROR', error.message, { code: error.code, hint: error.hint })
    }

    return expense as Expense
  }

  async getExpenses(
    filters?: ExpenseFilters,
    auth?: RepoAuthContext | null
  ): Promise<{ expenses: Expense[]; total: number }> {
    const client = getClient(auth)

    // All filtering (including tags substring search) is handled inside the SQL function.
    // PostgREST chains .order() and .range() on the SETOF result.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (client as any)
      .rpc(
        'get_expenses',
        {
          p_user_id: auth?.userId ?? null,
          p_use_master_access: auth?.useMasterAccess ?? false,
          p_type: filters?.type ?? null,
          p_category: filters?.category ?? null,
          p_platform: filters?.platform ?? null,
          p_payment_method: filters?.payment_method ?? null,
          p_date_from: filters?.date_from ?? null,
          p_date_to: filters?.date_to ?? null,
          p_source: filters?.source ?? null,
          p_bill_instance_id: filters?.bill_instance_id ?? null,
          p_search: filters?.search ?? null,
        },
        { count: 'exact' }
      )

    // Sort
    const sortCol = filters?.sort_by ?? 'datetime'
    const ascending = filters?.sort_order === 'asc'
    query = query.order(sortCol, { ascending })

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
        log.error({ method: 'getExpenses', err: error }, 'Database unavailable')
        throw new AppError('DB_ERROR', DB_UNAVAILABLE_MESSAGE, { code: 'NETWORK_ERROR' })
      }
      log.error({ method: 'getExpenses', err: error }, 'Database operation failed')
      throw new AppError('DB_ERROR', error.message, { code: error.code, hint: error.hint })
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

    const unique = (arr: unknown[], key: string): string[] =>
      Array.from(new Set((arr as Record<string, unknown>[])?.map((r) => r[key]).filter(Boolean))).sort() as string[]

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
      log.error({ method: 'getExpenseById', err: error }, 'Database operation failed')
      throw new AppError('DB_ERROR', error.message, { code: error.code, hint: error.hint })
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
      log.error({ method: 'updateExpense', err: error }, 'Database operation failed')
      throw new AppError('DB_ERROR', error.message, { code: error.code, hint: error.hint })
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
      log.error({ method: 'deleteExpense', err: error }, 'Database operation failed')
      throw new AppError('DB_ERROR', error.message, { code: error.code, hint: error.hint })
    }
  }
}

export const expenseRepository = new ExpenseRepository()
