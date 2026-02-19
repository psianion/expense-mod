import { vi } from 'vitest'

// Ensure env vars exist so getSupabase() and other server code don't throw in tests
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'test-anon-key'

// Auth: tests run in DEMO mode with fixed demo user
process.env.NEXT_PUBLIC_APP_MODE = process.env.NEXT_PUBLIC_APP_MODE ?? 'DEMO'
process.env.DEMO_USER_ID = process.env.DEMO_USER_ID ?? '00000000-0000-0000-0000-000000000001'
process.env.DEMO_USER_EMAIL = process.env.DEMO_USER_EMAIL ?? 'demo@expense-tracker.app'

// Inline mock for @server/db/supabase (vi.mock is hoisted and require() cannot resolve .ts)
type TableName = 'expenses' | 'bills' | 'bill_instances'
const store: Record<TableName, Record<string, unknown>[]> = {
  expenses: [],
  bills: [],
  bill_instances: [],
}
function generateId(): string {
  return crypto.randomUUID?.() ?? `mock-${Date.now()}-${Math.random().toString(36).slice(2)}`
}
function createQueryBuilder(table: TableName) {
  type Row = Record<string, unknown>
  let filters: { op: string; col: string; value: unknown }[] = []
  let orderBy: { col: string; ascending: boolean } | null = null
  let limitVal: number | null = null
  let rangeStart: number | null = null
  let rangeEnd: number | null = null
  let insertRows: Row[] | null = null
  let updatePayload: Row | null = null
  let deleteMode = false
  let singleMode = false
  function applyFilters(rows: Row[]): Row[] {
    let result = [...rows]
    for (const f of filters) {
      if (f.op === 'eq') result = result.filter((r) => r[f.col] === f.value)
      else if (f.op === 'gte') result = result.filter((r) => (r[f.col] as string) >= (f.value as string))
      else if (f.op === 'lte') result = result.filter((r) => (r[f.col] as string) <= (f.value as string))
      else if (f.op === 'in') result = result.filter((r) => (f.value as unknown[]).includes(r[f.col] as never))
    }
    if (orderBy) {
      result.sort((a, b) => {
        const aVal = a[orderBy!.col] as string | number
        const bVal = b[orderBy!.col] as string | number
        const mult = orderBy!.ascending ? 1 : -1
        return aVal < bVal ? -1 * mult : aVal > bVal ? 1 * mult : 0
      })
    }
    if (rangeStart !== null && rangeEnd !== null) result = result.slice(rangeStart, rangeEnd + 1)
    else if (limitVal !== null) result = result.slice(0, limitVal)
    return result
  }
  const chain = {
    insert(rows: Row[] | Row) {
      insertRows = Array.isArray(rows) ? rows : [rows]
      return chain
    },
    select() {
      return chain
    },
    single() {
      singleMode = true
      return chain
    },
    order(col: string, opts: { ascending?: boolean } = {}) {
      orderBy = { col, ascending: opts.ascending !== false }
      return chain
    },
    eq(col: string, value: unknown) {
      filters.push({ op: 'eq', col, value })
      return chain
    },
    gte(col: string, value: unknown) {
      filters.push({ op: 'gte', col, value })
      return chain
    },
    lte(col: string, value: unknown) {
      filters.push({ op: 'lte', col, value })
      return chain
    },
    in(col: string, value: unknown[]) {
      filters.push({ op: 'in', col, value })
      return chain
    },
    limit(n: number) {
      limitVal = n
      return chain
    },
    range(start: number, end: number) {
      rangeStart = start
      rangeEnd = end
      return chain
    },
    update(payload: Row) {
      updatePayload = payload
      return chain
    },
    delete() {
      deleteMode = true
      return chain
    },
    then(resolve: (value: { data: unknown; error: unknown }) => void) {
      const tableData = store[table] as Row[]
      try {
        if (insertRows) {
          const toInsert = insertRows.map((row) => ({
            ...row,
            id: (row as { id?: string }).id ?? generateId(),
            created_at: (row as { created_at?: string }).created_at ?? new Date().toISOString(),
            updated_at: (row as { updated_at?: string }).updated_at ?? new Date().toISOString(),
          }))
          tableData.push(...toInsert)
          resolve({ data: singleMode ? toInsert[0] : toInsert, error: null })
          return Promise.resolve(undefined as never)
        }
        if (updatePayload) {
          const idVal = filters.find((f) => f.col === 'id')?.value as string
          const idx = tableData.findIndex((r) => r.id === idVal)
          if (idx === -1) {
            resolve({ data: null, error: { code: 'PGRST116', message: 'Not found' } })
            return Promise.resolve(undefined as never)
          }
          tableData[idx] = { ...tableData[idx], ...updatePayload, updated_at: new Date().toISOString() }
          resolve({ data: singleMode ? tableData[idx] : [tableData[idx]], error: null })
          return Promise.resolve(undefined as never)
        }
        if (deleteMode) {
          const idFilter = filters.find((f) => f.col === 'id')
          if (idFilter) {
            const idx = tableData.findIndex((r) => r.id === idFilter.value)
            if (idx !== -1) tableData.splice(idx, 1)
          }
          resolve({ data: null, error: null })
          return Promise.resolve(undefined as never)
        }
        const filtered = applyFilters(tableData)
        if (table === 'bill_instances' && filtered.length > 0) {
          const bills = store.bills as Row[]
          for (let i = 0; i < filtered.length; i++) {
            const row = filtered[i] as Row & { bill_id?: string }
            if (row.bill_id) {
              (filtered[i] as Row & { bill?: Row }).bill = bills.find((b) => b.id === row.bill_id) ?? undefined
            }
          }
        }
        const data = singleMode ? filtered[0] ?? null : filtered
        if (singleMode && !filtered[0]) {
          resolve({ data: null, error: { code: 'PGRST116', message: 'Not found' } })
          return Promise.resolve(undefined as never)
        }
        resolve({ data, error: null })
      } catch (err) {
        resolve({ data: null, error: { message: err instanceof Error ? err.message : String(err) } })
      }
      return Promise.resolve(undefined as never)
    },
  }
  return chain
}

const mockSupabaseClient = {
  from(table: TableName) {
    return createQueryBuilder(table)
  },
}

vi.mock('@server/db/supabase', () => ({
  supabase: mockSupabaseClient,
  getServiceRoleClient: () => mockSupabaseClient,
  getServiceRoleClientIfAvailable: () => null,
  DB_UNAVAILABLE_MESSAGE: 'Database unavailable.',
}))

// Re-export for tests (same store as mock)
export function clearMockStore() {
  store.expenses.length = 0
  store.bills.length = 0
  store.bill_instances.length = 0
}
export function getMockStore() {
  return store
}

/** Demo user context for unit/integration tests (matches DEMO_USER_ID from env). */
export function getDemoUserContext() {
  return {
    userId: process.env.DEMO_USER_ID ?? '00000000-0000-0000-0000-000000000001',
    email: process.env.DEMO_USER_EMAIL ?? 'demo@expense-tracker.app',
    isMaster: false,
    isDemo: true,
    roles: ['user'],
  } as const
}

export * from './helpers/testData'
