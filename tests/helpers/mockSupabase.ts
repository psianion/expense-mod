/**
 * In-memory Supabase-like client for tests.
 * Supports chainable API: from(table).insert/select/update/delete + eq/gte/lte/in/limit/range/order + single.
 */

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
      if (f.op === 'eq') {
        result = result.filter((r) => r[f.col] === f.value)
      } else if (f.op === 'gte') {
        result = result.filter((r) => (r[f.col] as string) >= (f.value as string))
      } else if (f.op === 'lte') {
        result = result.filter((r) => (r[f.col] as string) <= (f.value as string))
      } else if (f.op === 'in') {
        const arr = f.value as unknown[]
        result = result.filter((r) => arr.includes(r[f.col] as never))
      }
    }
    if (orderBy) {
      result.sort((a, b) => {
        const aVal = a[orderBy!.col] as string | number
        const bVal = b[orderBy!.col] as string | number
        const mult = orderBy!.ascending ? 1 : -1
        return aVal < bVal ? -1 * mult : aVal > bVal ? 1 * mult : 0
      })
    }
    if (rangeStart !== null && rangeEnd !== null) {
      result = result.slice(rangeStart, rangeEnd + 1)
    } else if (limitVal !== null) {
      result = result.slice(0, limitVal)
    }
    return result
  }

  const chain = {
    insert(rows: Row[] | Row) {
      insertRows = Array.isArray(rows) ? rows : [rows]
      return chain
    },
    select(_columns?: string) {
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
      const run = () => {
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
            const out = singleMode ? toInsert[0] : toInsert
            return resolve({ data: out, error: null })
          }
          if (updatePayload) {
            const idx = tableData.findIndex((r) => r.id === (filters.find((f) => f.col === 'id')?.value as string))
            if (idx === -1) {
              return resolve({
                data: null,
                error: { code: 'PGRST116', message: 'Not found' },
              })
            }
            const updated = { ...tableData[idx], ...updatePayload, updated_at: new Date().toISOString() }
            tableData[idx] = updated
            return resolve({ data: singleMode ? updated : [updated], error: null })
          }
          if (deleteMode) {
            const idFilter = filters.find((f) => f.col === 'id')
            if (idFilter) {
              const idx = tableData.findIndex((r) => r.id === idFilter.value)
              if (idx !== -1) tableData.splice(idx, 1)
            }
            return resolve({ data: null, error: null })
          }
          const filtered = applyFilters(tableData)
          const data = singleMode ? filtered[0] ?? null : filtered
          if (singleMode && !filtered[0]) {
            return resolve({ data: null, error: { code: 'PGRST116', message: 'Not found' } })
          }
          resolve({ data, error: null })
        } catch (err) {
          resolve({
            data: null,
            error: { message: err instanceof Error ? err.message : String(err) },
          })
        }
      }
      run()
      return Promise.resolve(undefined as never)
    },
  }
  return chain
}

export function createMockSupabaseClient() {
  return {
    from(table: TableName) {
      return createQueryBuilder(table)
    },
  }
}

export function getMockStore() {
  return store
}

export function clearMockStore() {
  store.expenses.length = 0
  store.bills.length = 0
  store.bill_instances.length = 0
}

export function createMockSupabaseModule() {
  const client = createMockSupabaseClient()
  return { supabase: client }
}
