# Expenses Table Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the expenses table to use server-side filtering, URL-based filter state, efficient React Query patterns, snappy animations, and a richer filter UI (search, platform, payment method, source, pagination).

**Architecture:** Filters live in URL search params → read in `ExpensesDataTable` → passed to `useExpensesQuery(filters)` → new query key triggers `GET /api/expenses` with all params server-side. The component is self-contained; the page becomes a thin shell.

**Tech Stack:** Next.js 14+ `useSearchParams`/`useRouter`, TanStack Query v5 `keepPreviousData`, Supabase `select('*', { count: 'exact' })` + `.or()`, `motion/react` (already installed as `motion`), shadcn/ui new-york style, Tailwind CSS.

**Design doc:** `docs/plans/2026-02-22-expenses-table-redesign.md`

---

## Agent & Skill Strategy

This plan uses specialised agents and skills to keep each task focused and high-quality. Use the **executing-plans** skill to drive execution sequentially, but dispatch parallel subagents wherever tasks are independent.

### Skill / Agent → Task mapping

| Task | Skill / Agent | Why |
|------|--------------|-----|
| 1 — Mock store + tests | `test-suite` skill | Writes Vitest tests matching project patterns and mock store |
| 2 — Types | *(inline, no agent)* | Pure interface additions — straightforward |
| 3 — Repository | `api-route` skill | Knows the layered architecture: repo → service boundary |
| 4 — Service | `api-route` skill | Same layer; call together with Task 3 |
| 5 — API route | `api-route` skill | Thin route handler — exactly what this skill is for |
| 6 — Facets route | `api-route` skill | New endpoint; same skill, same pattern |
| 7 — API client + queryKeys | *(inline)* | Simple type and client updates |
| 8 — React Query hooks | `react-query-hook` skill | Knows `keepPreviousData`, stale times, optimistic updates |
| 9 — ExpensesDataTable UI | `tailwind-shadcn-styler` agent | Knows shadcn new-york style, CSS vars, `cn()`, motion animations |
| 10 — page.tsx refactor | *(inline)* | Trivial shell; no agent needed |
| 11 — E2E tests | `test-suite` skill or `test-writer` agent | Knows Playwright patterns, `navigateToExpenses` helpers |
| 12 — Regression sweep | `test-all` skill + `architecture-guardian` agent | Full suite + layer violation check |

### Parallelisation opportunities

After **Task 2** (types) is committed, **Tasks 3–6** are independent of each other (different files, same interface contract). Use `superpowers:dispatching-parallel-agents` to run them simultaneously — one agent per task — then merge results.

Similarly, **Task 9** (UI component) and **Task 11** (E2E tests) can run in parallel after Tasks 1–8 are complete.

```
Task 1 → Task 2 → [Tasks 3, 4, 5, 6 in parallel]
                       ↓
                   Task 7 → Task 8 → [Task 9, Task 11 in parallel]
                                           ↓
                                       Task 10 → Task 12
```

### Execution mode

Run this plan with:
- **`superpowers:executing-plans`** — for sequential, task-by-task execution with review checkpoints
- **`superpowers:subagent-driven-development`** — for dispatching fresh subagents per task in the current session
- **`superpowers:dispatching-parallel-agents`** — for the parallel groups identified above

After all tasks pass: run `superpowers:requesting-code-review` then `pr-review-toolkit:review-pr`.

---

## Task 1: Extend mock store to support `or()`, `ilike`, and `count`

> **Skill:** `test-suite` — invoke with `"Extend the Vitest mock store in tests/setup.ts to support or(), ilike pattern matching, and count mode for pagination; then write integration tests for expense search and pagination at tests/integration/api/expenses-search.test.ts"`

The test mock in `tests/setup.ts` does not support `or()` filters or returning row counts. We need these for the search and pagination tests to work.

**Files:**
- Modify: `tests/setup.ts`

**Step 1: Write the failing test** (search test will fail because `or` throws)

Create `tests/integration/api/expenses-search.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/expenses/route'
import { clearMockStore, createExpensePayload } from '../../setup'

beforeEach(() => { clearMockStore() })

function jsonBody(body: object) {
  return new NextRequest('http://localhost/api/expenses', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('GET /api/expenses - search and pagination', () => {
  it('returns total count in response', async () => {
    const req = new NextRequest('http://localhost/api/expenses')
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(typeof body.data.total).toBe('number')
  })

  it('filters by search term matching category', async () => {
    await POST(jsonBody({ ...createExpensePayload, expense: { ...createExpensePayload.expense, category: 'Groceries' } }))
    await POST(jsonBody({ ...createExpensePayload, expense: { ...createExpensePayload.expense, category: 'Transport' } }))
    const req = new NextRequest('http://localhost/api/expenses?search=grocer')
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.expenses.length).toBe(1)
    expect(body.data.expenses[0].category).toBe('Groceries')
  })

  it('returns paginated results with correct total', async () => {
    for (let i = 0; i < 5; i++) {
      await POST(jsonBody({ ...createExpensePayload, expense: { ...createExpensePayload.expense, amount: i + 1 } }))
    }
    const req = new NextRequest('http://localhost/api/expenses?page=1&limit=2')
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.expenses.length).toBe(2)
    expect(body.data.total).toBe(5)
  })

  it('sorts by amount ascending', async () => {
    await POST(jsonBody({ ...createExpensePayload, expense: { ...createExpensePayload.expense, amount: 300 } }))
    await POST(jsonBody({ ...createExpensePayload, expense: { ...createExpensePayload.expense, amount: 100 } }))
    const req = new NextRequest('http://localhost/api/expenses?sort_by=amount&sort_order=asc')
    const res = await GET(req)
    const body = await res.json()
    expect(body.data.expenses[0].amount).toBe(100)
    expect(body.data.expenses[1].amount).toBe(300)
  })
})
```

**Step 2: Run to confirm failure**

```bash
npx vitest run tests/integration/api/expenses-search.test.ts
```

Expected: FAIL — `or is not a function` or `total` missing.

**Step 3: Update mock store** to add `or()`, `ilike` matching, count support, and sort_by

In `tests/setup.ts`, update `createQueryBuilder`:

```ts
// Add to state vars at top of createQueryBuilder:
let countMode = false
let orFilters: { col: string; pattern: string }[] = []

// Update select() to accept options:
select(cols = '*', opts: { count?: 'exact' } = {}) {
  if (opts.count === 'exact') countMode = true
  return chain
},

// Add or() method to chain:
or(filterStr: string) {
  // Parse "col.ilike.%pattern%,col2.ilike.%pattern2%" format
  for (const part of filterStr.split(',')) {
    const [col, , rawPattern] = part.split('.')
    if (col && rawPattern) {
      orFilters.push({ col, pattern: rawPattern.replace(/%/g, '').toLowerCase() })
    }
  }
  return chain
},
```

In `applyFilters`, after the main filters loop, add OR filter logic:

```ts
// After existing filters loop:
if (orFilters.length > 0) {
  result = result.filter((r) =>
    orFilters.some(({ col, pattern }) => {
      const val = r[col]
      if (Array.isArray(val)) return val.some((v) => String(v).toLowerCase().includes(pattern))
      return String(val ?? '').toLowerCase().includes(pattern)
    })
  )
}
```

In the `then` callback, after computing `filtered`, return count:

```ts
const total = countMode ? tableData.filter(/* same filters */).length : undefined
// Replace resolve line:
resolve({ data: singleMode ? filtered[0] ?? null : filtered, error: null, count: countMode ? filtered.length : null })
```

> **Note:** The simplest approach is to track the pre-limit filtered length for count. Track it as a variable `const prePageFiltered = applyFilters(tableData)` before applying pagination in applyFilters, or compute count separately.

Actually, simpler: compute count before applying range/limit. Update `applyFilters` to return separately, or add a `countFiltered` step in `then`:

```ts
// In then(), before existing filtered logic:
// compute total WITHOUT range/limit for count
let countTotal: number | null = null
if (countMode) {
  // temporarily disable range/limit for count
  const savedRangeStart = rangeStart; const savedRangeEnd = rangeEnd; const savedLimit = limitVal
  rangeStart = null; rangeEnd = null; limitVal = null
  countTotal = applyFilters(tableData).length
  rangeStart = savedRangeStart; rangeEnd = savedRangeEnd; limitVal = savedLimit
}
const filtered = applyFilters(tableData)
// ...
resolve({ data: singleMode ? filtered[0] ?? null : filtered, error: null, count: countTotal })
```

Also add `sort_by`/`sort_order` flexibility — the mock store currently only supports `.order(col, opts)` which is already handled.

**Step 4: Run test to verify pass**

```bash
npx vitest run tests/integration/api/expenses-search.test.ts
```

Expected: still FAIL (repo/route not updated yet — that's Task 3/5).

**Step 5: Commit mock store changes only**

```bash
git add tests/setup.ts tests/integration/api/expenses-search.test.ts
git commit -m "test: extend mock store with or/ilike/count support; add expense search+pagination tests"
```

---

## Task 2: Extend ExpenseFilters types

> **No agent needed** — pure interface additions in two files. Handle inline.

Add `search`, `page`, `sort_by`, `sort_order` to both the client types and the repo interface. No logic changes yet.

**Files:**
- Modify: `lib/api/types.ts`
- Modify: `server/db/repositories/expense.repo.ts` (interface only)

**Step 1: Update `lib/api/types.ts`**

Change `ExpenseFilters`:

```ts
export interface ExpenseFilters {
  type?: 'EXPENSE' | 'INFLOW'
  category?: string
  platform?: string
  payment_method?: string
  date_from?: string
  date_to?: string
  source?: 'MANUAL' | 'AI' | 'RECURRING'
  bill_instance_id?: string
  search?: string        // full-text: ilike across category, platform, tags
  sort_by?: 'datetime' | 'amount' | 'category'
  sort_order?: 'asc' | 'desc'
  page?: number          // 1-based page number
  limit?: number         // rows per page (default 25)
  // Keep offset for backward compat (recent expenses uses limit only)
  offset?: number
}
```

`ExpensesResponse` already has `total: number` — no change needed.

**Step 2: Update `server/db/repositories/expense.repo.ts` interface**

Replace the `ExpenseFilters` interface in the repo file (the server-side one mirrors the client):

```ts
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
```

**Step 3: Run existing tests to ensure no regressions**

```bash
npx vitest run tests/integration/api/expenses.test.ts tests/unit/services/expense.service.test.ts
```

Expected: all PASS (interface additions are backward-compatible).

**Step 4: Commit**

```bash
git add lib/api/types.ts server/db/repositories/expense.repo.ts
git commit -m "feat: extend ExpenseFilters with search, sort_by, sort_order, page params"
```

---

## Task 3: Update expense repository (search, sort, pagination, count, facets)

> **Skill:** `api-route` — invoke with `"Update getExpenses in server/db/repositories/expense.repo.ts to support search (or/ilike across category, platform, payment_method, tags::text, raw_text — NOTE: no 'notes' column exists), sort_by/sort_order, page-based pagination using range(), and count: exact. Add getFacets() method returning distinct categories/platforms/payment_methods. Return {expenses, total} instead of Expense[]."`

**Files:**
- Modify: `server/db/repositories/expense.repo.ts`

**Step 1: Tests already written** in Task 1. Run them to confirm still failing:

```bash
npx vitest run tests/integration/api/expenses-search.test.ts
```

**Step 2: Update `getExpenses` in the repo**

Replace the `getExpenses` method to:
1. Use `select('*', { count: 'exact' })`
2. Add `or()` for search across category, platform, tags (cast array to text), notes
3. Respect `sort_by` / `sort_order` instead of hardcoded datetime desc
4. Compute `offset` from `page` when `page` is provided
5. Return `{ expenses: Expense[], total: number }`

```ts
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
    const s = filters.search.replace(/[%_]/g, '\\$&') // escape special chars
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
```

**Step 3: Add `getFacets` method to `ExpenseRepository`**

```ts
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

  const unique = (arr: any[], key: string): string[] =>
    [...new Set(arr?.map((r) => r[key]).filter(Boolean))].sort()

  return {
    categories: unique(catRes.data ?? [], 'category'),
    platforms: unique(platRes.data ?? [], 'platform'),
    payment_methods: unique(pmRes.data ?? [], 'payment_method'),
  }
}
```

**Step 4: Run tests**

```bash
npx vitest run tests/integration/api/expenses-search.test.ts tests/integration/api/expenses.test.ts
```

Expected: `expenses-search.test.ts` — still some failures (route not updated yet). `expenses.test.ts` — FAIL because `body.data.expenses` now exists but `body.data.total` is missing from the old test format.

**Step 5: Fix existing expenses integration tests**

In `tests/integration/api/expenses.test.ts`, the tests check `body.data.expenses` which should still work since the response shape changes route-level (Task 5). Leave existing tests — they'll be fixed in Task 5.

**Step 6: Commit**

```bash
git add server/db/repositories/expense.repo.ts
git commit -m "feat: repo getExpenses returns {expenses, total}, adds search/sort/pagination/facets"
```

---

## Task 4: Update expense service

> **Skill:** `api-route` — invoke with `"Update ExpenseService.getExpenses in server/services/expense.service.ts to return {expenses, total} by passing through to the updated repo. Add getFacets(user) method delegating to expenseRepository.getFacets(auth)."`

**Files:**
- Modify: `server/services/expense.service.ts`

**Step 1: Tests already cover this via integration tests. Run to confirm current failure:**

```bash
npx vitest run tests/unit/services/expense.service.test.ts
```

**Step 2: Update `getExpenses` in service**

```ts
async getExpenses(
  filters?: ExpenseFilters,
  user?: UserContext
): Promise<{ expenses: Expense[]; total: number }> {
  const auth = user ? toRepoAuth(user) : undefined
  return expenseRepository.getExpenses(filters, auth)
}
```

**Step 3: Add `getFacets` to service**

```ts
async getFacets(user: UserContext): Promise<{
  categories: string[]
  platforms: string[]
  payment_methods: string[]
}> {
  const auth = toRepoAuth(user)
  return expenseRepository.getFacets(auth)
}
```

**Step 4: Update service test** to expect new return shape in `tests/unit/services/expense.service.test.ts`.

Find any test that calls `expenseService.getExpenses()` and checks the result — update to destructure `{ expenses }`:

```ts
// Before:
const result = await expenseService.getExpenses(...)
expect(result[0].amount).toBe(...)

// After:
const { expenses } = await expenseService.getExpenses(...)
expect(expenses[0].amount).toBe(...)
```

Check the file carefully — if no test calls `getExpenses` directly, nothing to change.

**Step 5: Run tests**

```bash
npx vitest run tests/unit/services/expense.service.test.ts
```

Expected: PASS

**Step 6: Commit**

```bash
git add server/services/expense.service.ts tests/unit/services/expense.service.test.ts
git commit -m "feat: expense service getExpenses returns {expenses, total}, adds getFacets"
```

---

## Task 5: Update GET /api/expenses route + fix existing integration tests

> **Skill:** `api-route` — invoke with `"Update GET /api/expenses in app/api/expenses/route.ts to parse search, sort_by, sort_order, page, limit params and return {expenses, total}. Also update tests/integration/api/expenses.test.ts to expect total in response body."`

**Files:**
- Modify: `app/api/expenses/route.ts`
- Modify: `tests/integration/api/expenses.test.ts`

**Step 1: Update the GET handler in `app/api/expenses/route.ts`**

```ts
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const sp = request.nextUrl.searchParams

    const filters = {
      type: (sp.get('type') as 'EXPENSE' | 'INFLOW') || undefined,
      category: sp.get('category') || undefined,
      platform: sp.get('platform') || undefined,
      payment_method: sp.get('payment_method') || undefined,
      date_from: sp.get('date_from') || undefined,
      date_to: sp.get('date_to') || undefined,
      source: (sp.get('source') as 'MANUAL' | 'AI' | 'RECURRING') || undefined,
      bill_instance_id: sp.get('bill_instance_id') || undefined,
      search: sp.get('search') || undefined,
      sort_by: (sp.get('sort_by') as 'datetime' | 'amount' | 'category') || undefined,
      sort_order: (sp.get('sort_order') as 'asc' | 'desc') || undefined,
      page: sp.get('page') ? parseInt(sp.get('page')!) : undefined,
      limit: sp.get('limit') ? parseInt(sp.get('limit')!) : undefined,
      offset: sp.get('offset') ? parseInt(sp.get('offset')!) : undefined,
    }

    const { expenses, total } = await expenseService.getExpenses(filters, user)
    return successResponse({ expenses, total })
  } catch (error) {
    return handleApiError(error)
  }
}
```

**Step 2: Fix existing expenses integration tests** in `tests/integration/api/expenses.test.ts`

The response now returns `{ expenses, total }`. Tests that check `body.data.expenses` still work. The "accepts pagination params" test may now return total. Update it:

```ts
it('accepts pagination params', async () => {
  const req = new NextRequest('http://localhost/api/expenses?limit=10&offset=0')
  const res = await GET(req)
  const body = await res.json()
  expect(res.status).toBe(200)
  expect(Array.isArray(body.data.expenses)).toBe(true)
  expect(typeof body.data.total).toBe('number')
})
```

**Step 3: Run all expense API tests**

```bash
npx vitest run tests/integration/api/expenses.test.ts tests/integration/api/expenses-search.test.ts
```

Expected: all PASS

**Step 4: Commit**

```bash
git add app/api/expenses/route.ts tests/integration/api/expenses.test.ts
git commit -m "feat: GET /api/expenses returns {expenses, total}, adds search/sort/page params"
```

---

## Task 6: Add GET /api/expenses/facets route

> **Skill:** `api-route` — invoke with `"Create GET /api/expenses/facets route at app/api/expenses/facets/route.ts that calls expenseService.getFacets(user) and returns {categories, platforms, payment_methods}. Follow the successResponse/handleApiError pattern. Also write integration tests at tests/integration/api/expenses-facets.test.ts."`

**Files:**
- Create: `app/api/expenses/facets/route.ts`
- Create: `tests/integration/api/expenses-facets.test.ts`

**Step 1: Write the test**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as FACETS_GET } from '@/app/api/expenses/facets/route'
import { POST } from '@/app/api/expenses/route'
import { clearMockStore, createExpensePayload } from '../../setup'

beforeEach(() => { clearMockStore() })

function jsonBody(body: object) {
  return new NextRequest('http://localhost/api/expenses', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('GET /api/expenses/facets', () => {
  it('returns empty arrays when no expenses', async () => {
    const req = new NextRequest('http://localhost/api/expenses/facets')
    const res = await FACETS_GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.categories).toEqual([])
    expect(body.data.platforms).toEqual([])
    expect(body.data.payment_methods).toEqual([])
  })

  it('returns distinct categories from expenses', async () => {
    await POST(jsonBody({ ...createExpensePayload, expense: { ...createExpensePayload.expense, category: 'Food' } }))
    await POST(jsonBody({ ...createExpensePayload, expense: { ...createExpensePayload.expense, category: 'Food' } }))
    await POST(jsonBody({ ...createExpensePayload, expense: { ...createExpensePayload.expense, category: 'Transport' } }))
    const req = new NextRequest('http://localhost/api/expenses/facets')
    const res = await FACETS_GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.categories).toEqual(['Food', 'Transport'])
  })
})
```

**Step 2: Run to confirm failure**

```bash
npx vitest run tests/integration/api/expenses-facets.test.ts
```

Expected: FAIL — module not found.

**Step 3: Create the route** at `app/api/expenses/facets/route.ts`

```ts
import { NextRequest } from 'next/server'
import { expenseService } from '@server/services/expense.service'
import { requireAuth } from '@server/auth/context'
import { successResponse, handleApiError } from '../../middleware'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const facets = await expenseService.getFacets(user)
    return successResponse(facets)
  } catch (error) {
    return handleApiError(error)
  }
}
```

**Step 4: Run tests**

```bash
npx vitest run tests/integration/api/expenses-facets.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add app/api/expenses/facets/route.ts tests/integration/api/expenses-facets.test.ts
git commit -m "feat: add GET /api/expenses/facets endpoint for distinct filter values"
```

---

## Task 7: Update API client (`lib/api/expenses.ts`) and queryKeys

> **No agent needed** — straightforward client-side updates following existing patterns. Handle inline.

**Files:**
- Modify: `lib/api/expenses.ts`
- Modify: `lib/query/queryKeys.ts`

**Step 1: Update `lib/api/expenses.ts`**

Update `getExpenses` return type and add `getExpenseFacets`:

```ts
async getExpenses(filters?: ExpenseFilters): Promise<{ expenses: Expense[]; total: number }> {
  const params = new URLSearchParams()
  if (filters?.type) params.append('type', filters.type)
  if (filters?.category) params.append('category', filters.category)
  if (filters?.platform) params.append('platform', filters.platform)
  if (filters?.payment_method) params.append('payment_method', filters.payment_method)
  if (filters?.date_from) params.append('date_from', filters.date_from)
  if (filters?.date_to) params.append('date_to', filters.date_to)
  if (filters?.source) params.append('source', filters.source)
  if (filters?.bill_instance_id) params.append('bill_instance_id', filters.bill_instance_id)
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

async getRecentExpenses(limit = 5): Promise<Expense[]> {
  const { expenses } = await this.getExpenses({ limit })
  return expenses
},

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
```

**Step 2: Update `lib/query/queryKeys.ts`** — add `facets` key

```ts
expenses: {
  all: ['expenses'] as const,
  lists: () => [...queryKeys.expenses.all, 'list'] as const,
  list: (filters?: ExpenseFilters) => [...queryKeys.expenses.lists(), filters] as const,
  recent: (limit: number) => [...queryKeys.expenses.all, 'recent', limit] as const,
  detail: (id: string) => [...queryKeys.expenses.all, 'detail', id] as const,
  facets: () => [...queryKeys.expenses.all, 'facets'] as const,
},
```

**Step 3: Run queryKeys test**

```bash
npx vitest run tests/unit/query/queryKeys.test.ts
```

Expected: PASS (additive change).

**Step 4: Commit**

```bash
git add lib/api/expenses.ts lib/query/queryKeys.ts
git commit -m "feat: update expenses API client to return {expenses, total}, add getExpenseFacets"
```

---

## Task 8: Update React Query hooks

> **Skill:** `react-query-hook` — invoke with `"Update useExpensesQuery in lib/query/hooks/useExpensesQuery.ts: change return type to {expenses, total}, add placeholderData: keepPreviousData, staleTime: 60_000. Add useExpenseFacetsQuery with staleTime: 5*60_000. Update useCreateExpenseMutation optimistic update to handle the new {expenses, total} cache shape. Export useExpenseFacetsQuery from the hooks barrel."`

**Files:**
- Modify: `lib/query/hooks/useExpensesQuery.ts`

**Step 1: Update `useExpensesQuery` hook**

Replace entire file contents:

```ts
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { expensesApi } from '@/lib/api'
import { queryKeys } from '../queryKeys'
import { fromUTC } from '@/lib/datetime'
import type { ExpenseFilters, CreateExpenseRequest } from '@/lib/api/types'
import type { Expense, ExpenseType, ExpenseSource } from '@/types'

const normalizeExpense = (expense: Expense): Expense => ({
  ...expense,
  datetime: fromUTC(expense.datetime),
  type: (expense.type?.toUpperCase?.() as ExpenseType) || 'EXPENSE',
  source: (expense.source?.toUpperCase?.() as ExpenseSource) || 'MANUAL',
  bill_instance_id: expense.bill_instance_id ?? null,
})

export function useExpensesQuery(filters?: ExpenseFilters) {
  return useQuery({
    queryKey: queryKeys.expenses.list(filters),
    queryFn: async () => {
      const { expenses, total } = await expensesApi.getExpenses(filters)
      return { expenses: expenses.map(normalizeExpense), total }
    },
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  })
}

export function useExpenseFacetsQuery() {
  return useQuery({
    queryKey: queryKeys.expenses.facets(),
    queryFn: expensesApi.getExpenseFacets,
    staleTime: 5 * 60_000,
  })
}

export function useRecentExpensesQuery(limit = 5) {
  return useQuery({
    queryKey: queryKeys.expenses.recent(limit),
    queryFn: async () => {
      const data = await expensesApi.getRecentExpenses(limit)
      return data.map(normalizeExpense)
    },
  })
}

export function useCreateExpenseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: expensesApi.createExpense,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.expenses.all })

      const previousQueriesData = queryClient.getQueriesData<{ expenses: Expense[]; total: number }>({
        queryKey: queryKeys.expenses.lists(),
      })

      if (variables.expense) {
        const optimisticExpense: Expense = {
          ...variables.expense,
          id: `temp-${Date.now()}`,
          user_id: null,
          bill_id: null,
          created_at: new Date().toISOString(),
          parsed_by_ai: variables.source === 'AI',
          raw_text: variables.raw_text || null,
          source: variables.source,
          bill_instance_id: variables.billMatch?.bill_id ? `temp-${Date.now()}` : null,
        }

        queryClient.setQueriesData<{ expenses: Expense[]; total: number }>(
          { queryKey: queryKeys.expenses.lists() },
          (old) => {
            if (!old) return { expenses: [optimisticExpense], total: 1 }
            return { expenses: [optimisticExpense, ...old.expenses], total: old.total + 1 }
          }
        )
      }

      return { previousQueriesData }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousQueriesData) {
        for (const [queryKey, data] of context.previousQueriesData) {
          queryClient.setQueryData(queryKey, data)
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.billInstances.all })
    },
  })
}

export function useUpdateExpenseMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CreateExpenseRequest> }) =>
      expensesApi.updateExpense(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })
    },
  })
}

export function useDeleteExpenseMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => expensesApi.deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })
    },
  })
}
```

**Step 2: Export new hook from barrel**

Check `lib/query/hooks/index.ts` (or wherever hooks are re-exported) and add `useExpenseFacetsQuery`:

```ts
export { useExpenseFacetsQuery } from './useExpensesQuery'
```

**Step 3: Run full test suite to catch any regressions**

```bash
npx vitest run tests/unit/ tests/integration/
```

Expected: all PASS

**Step 4: Commit**

```bash
git add lib/query/hooks/useExpensesQuery.ts
git commit -m "feat: update React Query hooks for paginated expenses + add useExpenseFacetsQuery"
```

---

## Task 9: Build `ExpensesDataTable` component

> **Agent:** `tailwind-shadcn-styler` — invoke with: `"Build features/expenses/components/ExpensesDataTable.tsx — a self-contained expenses table that reads/writes Next.js URL search params for all filter state. Includes: debounced search input, date range picker, type/category selects, collapsible advanced panel (platform, payment method, source, sort controls) with motion/react slide animation, active filter chips with spring pop-in/out, skeleton loading rows, animated table rows (0.12s fade+slide, 15ms stagger), pagination controls with page size selector (10/25/50), and a summary bar. Uses shadcn/ui new-york style, cn(), CSS variables. Hooks: useExpensesQuery(filters) and useExpenseFacetsQuery(). The full component spec and code are in docs/plans/2026-02-22-expenses-table-impl-plan.md Task 9."`
>
> Note: `shadcn-component` skill can be used alongside for any specific shadcn primitives that need configuration (e.g. if `Skeleton` is not yet installed: `npx shadcn@latest add skeleton`).

This is the main UI component. It reads/writes URL search params and is fully self-contained.

**Files:**
- Create: `features/expenses/components/ExpensesDataTable.tsx`

**Step 1: Understand URL param handling in Next.js**

`useSearchParams()` requires the component tree to be wrapped in `<Suspense>`. The component reads params with `useSearchParams()` and writes them with `useRouter().push()`. The page must wrap `ExpensesDataTable` in `<Suspense>`.

**Step 2: Create the component**

This is a large component. Build it in sections:

```tsx
"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import dayjs from "dayjs"
import {
  ArrowUpRight, ArrowDownRight, Search, CalendarIcon,
  ChevronDown, X, SortAsc, SortDesc, Filter,
} from "lucide-react"
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { formatPrice } from "@/lib/formatPrice"
import { useExpensesQuery, useExpenseFacetsQuery } from "@/lib/query/hooks"
import type { ExpenseFilters } from "@/lib/api/types"
import type { DateRange } from "react-day-picker"

// ─── Row animation variants ───────────────────────────────────────────────────
const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.12, delay: i * 0.015, ease: "easeOut" },
  }),
  exit: { opacity: 0, transition: { duration: 0.08 } },
}

// ─── Skeleton rows ────────────────────────────────────────────────────────────
function SkeletonRows({ count = 8 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 8 }).map((_, j) => (
            <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function PaginationControls({
  page, total, limit, onPageChange, onLimitChange,
}: {
  page: number; total: number; limit: number
  onPageChange: (p: number) => void
  onLimitChange: (l: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit))
  // Generate page numbers with ellipsis
  const pages: (number | '...')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push('...')
    pages.push(totalPages)
  }
  return (
    <div className="flex items-center justify-between py-3 px-1">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Rows per page:</span>
        <Select value={String(limit)} onValueChange={(v) => onLimitChange(Number(v))}>
          <SelectTrigger className="h-8 w-[70px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[10, 25, 50].map((n) => (
              <SelectItem key={n} value={String(n)}>{n}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="outline" size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >←</Button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">…</span>
          ) : (
            <Button
              key={p}
              variant={p === page ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPageChange(p as number)}
              className="w-9"
            >{p}</Button>
          )
        )}
        <Button
          variant="outline" size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >→</Button>
      </div>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────
interface ExpensesDataTableProps {
  currency?: string
}

export function ExpensesDataTable({ currency = '₹' }: ExpensesDataTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // ── Read URL params ──────────────────────────────────────────────────────
  const search = searchParams.get('search') ?? ''
  const type = (searchParams.get('type') as 'EXPENSE' | 'INFLOW' | 'ALL') ?? 'ALL'
  const category = searchParams.get('category') ?? 'ALL'
  const platform = searchParams.get('platform') ?? 'ALL'
  const paymentMethod = searchParams.get('payment_method') ?? 'ALL'
  const source = searchParams.get('source') ?? 'ALL'
  const sortBy = (searchParams.get('sort_by') as 'datetime' | 'amount' | 'category') ?? 'datetime'
  const sortOrder = (searchParams.get('sort_order') as 'asc' | 'desc') ?? 'desc'
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const limit = parseInt(searchParams.get('limit') ?? '25', 10)

  // Date range (stored as ISO strings)
  const dateFrom = searchParams.get('date_from') ?? undefined
  const dateTo = searchParams.get('date_to') ?? undefined
  const dateRange: DateRange = {
    from: dateFrom ? new Date(dateFrom) : undefined,
    to: dateTo ? new Date(dateTo) : undefined,
  }

  // ── Local UI state ────────────────────────────────────────────────────────
  const [searchDraft, setSearchDraft] = React.useState(search)
  const [showAdvanced, setShowAdvanced] = React.useState(false)
  const searchDebounceRef = React.useRef<ReturnType<typeof setTimeout>>(undefined)

  // ── Build filters for query ───────────────────────────────────────────────
  const filters: ExpenseFilters = {
    search: search || undefined,
    type: type !== 'ALL' ? (type as 'EXPENSE' | 'INFLOW') : undefined,
    category: category !== 'ALL' ? category : undefined,
    platform: platform !== 'ALL' ? platform : undefined,
    payment_method: paymentMethod !== 'ALL' ? paymentMethod : undefined,
    source: source !== 'ALL' ? (source as 'MANUAL' | 'AI' | 'RECURRING') : undefined,
    date_from: dateFrom,
    date_to: dateTo,
    sort_by: sortBy,
    sort_order: sortOrder,
    page,
    limit,
  }

  const { data, isLoading, isFetching, isPlaceholderData } = useExpensesQuery(filters)
  const { data: facets } = useExpenseFacetsQuery()

  const expenses = data?.expenses ?? []
  const total = data?.total ?? 0

  // ── URL update helper ─────────────────────────────────────────────────────
  const setParam = React.useCallback((updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, val] of Object.entries(updates)) {
      if (val === undefined || val === '' || val === 'ALL') {
        params.delete(key)
      } else {
        params.set(key, val)
      }
    }
    // Reset page on filter change (unless explicitly setting page)
    if (!('page' in updates)) params.delete('page')
    router.push(`?${params.toString()}`, { scroll: false })
  }, [searchParams, router])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSearchChange = (value: string) => {
    setSearchDraft(value)
    clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      setParam({ search: value || undefined })
    }, 300)
  }

  const handleSortToggle = (field: 'datetime' | 'amount' | 'category') => {
    if (sortBy === field) {
      setParam({ sort_by: field, sort_order: sortOrder === 'asc' ? 'desc' : 'asc' })
    } else {
      setParam({ sort_by: field, sort_order: 'desc' })
    }
  }

  const handleDateRange = (range: DateRange | undefined) => {
    setParam({
      date_from: range?.from?.toISOString(),
      date_to: range?.to?.toISOString(),
    })
  }

  const clearAllFilters = () => {
    setSearchDraft('')
    router.push('?', { scroll: false })
  }

  // ── Active filter count (for badge) ───────────────────────────────────────
  const activeFilterCount = [
    search, type !== 'ALL' && type, category !== 'ALL' && category,
    platform !== 'ALL' && platform, paymentMethod !== 'ALL' && paymentMethod,
    source !== 'ALL' && source, dateFrom,
  ].filter(Boolean).length

  const hasAdvancedFilters = [
    platform !== 'ALL', paymentMethod !== 'ALL', source !== 'ALL',
  ].some(Boolean)

  // ── Summary ───────────────────────────────────────────────────────────────
  const totalAmount = expenses.reduce((sum, e) => {
    return e.type === 'EXPENSE' ? sum + e.amount : sum - e.amount
  }, 0)

  // ── Sort indicator ────────────────────────────────────────────────────────
  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return null
    return sortOrder === 'asc'
      ? <SortAsc className="h-3 w-3 inline ml-1" />
      : <SortDesc className="h-3 w-3 inline ml-1" />
  }

  return (
    <Card>
      <CardHeader className="pb-0">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Expenses</CardTitle>
            <CardDescription>
              {isFetching && !isLoading
                ? 'Updating...'
                : `${total} expense${total !== 1 ? 's' : ''} · ${currency}${formatPrice(Math.abs(totalAmount))}`}
            </CardDescription>
          </div>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-muted-foreground">
              <X className="h-3 w-3 mr-1" /> Clear all
            </Button>
          )}
        </div>

        {/* ── Filter bar ──────────────────────────────────────────────── */}
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-2">
            {/* Search */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search expenses..."
                value={searchDraft}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-8 h-9"
              />
            </div>

            {/* Date range */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline" size="sm"
                  className={cn("h-9 gap-1", !dateFrom && "text-muted-foreground")}
                >
                  <CalendarIcon className="h-4 w-4" />
                  {dateFrom
                    ? `${dayjs(dateFrom).format('MMM D')}${dateTo ? ` – ${dayjs(dateTo).format('MMM D')}` : ''}`
                    : 'Date range'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  initialFocus mode="range"
                  defaultMonth={dateFrom ? new Date(dateFrom) : undefined}
                  selected={dateRange}
                  onSelect={handleDateRange}
                  numberOfMonths={1}
                />
                {dateFrom && (
                  <div className="p-3 border-t">
                    <Button variant="outline" size="sm" onClick={() => handleDateRange(undefined)}>
                      Clear
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            {/* Type */}
            <Select value={type} onValueChange={(v) => setParam({ type: v })}>
              <SelectTrigger className="h-9 w-[130px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All types</SelectItem>
                <SelectItem value="EXPENSE">Expenses</SelectItem>
                <SelectItem value="INFLOW">Income</SelectItem>
              </SelectContent>
            </Select>

            {/* Category */}
            <Select value={category} onValueChange={(v) => setParam({ category: v })}>
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All categories</SelectItem>
                {facets?.categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Advanced toggle */}
            <Button
              variant={showAdvanced || hasAdvancedFilters ? 'secondary' : 'outline'}
              size="sm"
              className="h-9 gap-1"
              onClick={() => setShowAdvanced((v) => !v)}
            >
              <Filter className="h-3.5 w-3.5" />
              Filters
              {hasAdvancedFilters > 0 && (
                <Badge className="h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                  {[platform !== 'ALL', paymentMethod !== 'ALL', source !== 'ALL'].filter(Boolean).length}
                </Badge>
              )}
              <ChevronDown className={cn("h-3 w-3 transition-transform", showAdvanced && "rotate-180")} />
            </Button>
          </div>

          {/* Advanced panel */}
          <AnimatePresence initial={false}>
            {showAdvanced && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-2 pt-1 pb-1">
                  {/* Platform */}
                  <Select value={platform} onValueChange={(v) => setParam({ platform: v })}>
                    <SelectTrigger className="h-9 w-[160px]">
                      <SelectValue placeholder="Platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All platforms</SelectItem>
                      {facets?.platforms.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Payment method */}
                  <Select value={paymentMethod} onValueChange={(v) => setParam({ payment_method: v })}>
                    <SelectTrigger className="h-9 w-[175px]">
                      <SelectValue placeholder="Payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All methods</SelectItem>
                      {facets?.payment_methods.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Source */}
                  <Select value={source} onValueChange={(v) => setParam({ source: v })}>
                    <SelectTrigger className="h-9 w-[145px]">
                      <SelectValue placeholder="Source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All sources</SelectItem>
                      <SelectItem value="MANUAL">Manual</SelectItem>
                      <SelectItem value="AI">AI parsed</SelectItem>
                      <SelectItem value="RECURRING">Recurring</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Sort controls */}
                  <div className="flex items-center gap-1 ml-auto">
                    {(['datetime', 'amount', 'category'] as const).map((field) => (
                      <Button
                        key={field}
                        variant={sortBy === field ? 'default' : 'outline'}
                        size="sm"
                        className="h-9"
                        onClick={() => handleSortToggle(field)}
                      >
                        {field === 'datetime' ? 'Date' : field.charAt(0).toUpperCase() + field.slice(1)}
                        <SortIcon field={field} />
                      </Button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active filter chips */}
          <AnimatePresence>
            {activeFilterCount > 0 && (
              <motion.div className="flex flex-wrap gap-1">
                {[
                  { key: 'search', label: `"${search}"`, value: search },
                  { key: 'type', label: type, value: type !== 'ALL' ? type : '' },
                  { key: 'category', label: category, value: category !== 'ALL' ? category : '' },
                  { key: 'platform', label: platform, value: platform !== 'ALL' ? platform : '' },
                  { key: 'payment_method', label: paymentMethod, value: paymentMethod !== 'ALL' ? paymentMethod : '' },
                  { key: 'source', label: source, value: source !== 'ALL' ? source : '' },
                  { key: 'date', label: 'Date range', value: dateFrom ? 'set' : '' },
                ].filter(({ value }) => value).map(({ key, label }) => (
                  <motion.div
                    key={key}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.1 }}
                  >
                    <Badge
                      variant="secondary"
                      className="gap-1 cursor-pointer hover:bg-destructive/10"
                      onClick={() => {
                        if (key === 'date') setParam({ date_from: undefined, date_to: undefined })
                        else setParam({ [key]: undefined })
                      }}
                    >
                      {label}
                      <X className="h-3 w-3" />
                    </Badge>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardHeader>

      <CardContent className="pt-3">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSortToggle('datetime')}
                >
                  Date <SortIcon field="datetime" />
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSortToggle('amount')}
                >
                  Amount <SortIcon field="amount" />
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSortToggle('category')}
                >
                  Category <SortIcon field="category" />
                </TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Tags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <SkeletonRows count={limit} />
              ) : expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    {activeFilterCount > 0
                      ? 'No expenses match your filters.'
                      : 'No expenses yet. Add your first expense!'}
                  </TableCell>
                </TableRow>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.tbody
                    key={`${page}-${search}-${type}-${category}`}
                    className="contents"
                  >
                    {expenses.map((expense, i) => (
                      <motion.tr
                        key={expense.id}
                        custom={i}
                        variants={rowVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className={cn(
                          "border-b transition-colors",
                          isPlaceholderData && "opacity-60"
                        )}
                      >
                        <TableCell className="font-medium text-sm">
                          {dayjs(expense.datetime).format('MMM D, YYYY')}
                          <div className="text-xs text-muted-foreground">
                            {dayjs(expense.datetime).format('HH:mm')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            "flex items-center gap-1 font-semibold",
                            expense.type === 'EXPENSE'
                              ? 'text-destructive'
                              : 'text-emerald-600 dark:text-emerald-400'
                          )}>
                            {expense.type === 'EXPENSE'
                              ? <ArrowDownRight className="h-3.5 w-3.5" />
                              : <ArrowUpRight className="h-3.5 w-3.5" />}
                            {currency}{formatPrice(expense.amount)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {expense.category
                            ? <Badge variant="secondary">{expense.category}</Badge>
                            : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-sm">
                          {expense.platform || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-sm">
                          {expense.payment_method || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant={expense.type === 'EXPENSE' ? 'destructive' : 'default'}>
                            {expense.type === 'EXPENSE' ? 'Expense' : 'Income'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={expense.source === 'RECURRING' ? 'default' : 'outline'} className="text-xs">
                            {expense.source}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[160px] truncate text-sm">
                          {expense.tags?.length
                            ? expense.tags.join(', ')
                            : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                      </motion.tr>
                    ))}
                  </motion.tbody>
                </AnimatePresence>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <PaginationControls
            page={page}
            total={total}
            limit={limit}
            onPageChange={(p) => setParam({ page: String(p) })}
            onLimitChange={(l) => setParam({ limit: String(l), page: '1' })}
          />
        )}
      </CardContent>
    </Card>
  )
}
```

**Step 3: Export from features barrel**

Add to `features/expenses/index.ts` (or create if absent):

```ts
export { ExpensesDataTable } from './components/ExpensesDataTable'
```

**Step 4: Verify it compiles**

```bash
npx tsc --noEmit
```

Fix any TypeScript errors. Common issues:
- `motion.tr` — use `motion(TableRow)` or a native `motion.tr`. Since shadcn TableRow renders a `<tr>`, use `motion.tr` directly with the same className.
- `AnimatePresence mode="wait"` requires the child to have a unique `key` — already handled.

**Step 5: Commit**

```bash
git add features/expenses/components/ExpensesDataTable.tsx
git commit -m "feat: add ExpensesDataTable with server-side filters, URL params, animations, pagination"
```

---

## Task 10: Simplify `app/expenses/page.tsx`

> **No agent needed** — trivial refactor: remove filter state, wrap `ExpensesDataTable` in `<Suspense>`. Handle inline.

**Files:**
- Modify: `app/expenses/page.tsx`

**Step 1: Replace the page contents**

The page no longer manages filter state — `ExpensesDataTable` handles everything. The AI parse flow (QuickAdd → PreviewModal) stays here since it's not table-specific.

```tsx
"use client"

import { Suspense, useState } from 'react'
import { AppLayoutClient } from '@components/layout/AppLayoutClient'
import { PreviewModal } from '@features/expenses/components/PreviewModal'
import { ExpensesDataTable } from '@features/expenses/components/ExpensesDataTable'
import { useCreateExpenseMutation } from '@/lib/query/hooks'
import {
  BillMatchCandidate, ExpenseSource, ExpenseType, ParsedExpense,
} from '@/types'
import { getLocalISO } from '@/lib/datetime'

export default function ExpensesPage() {
  const createExpenseMutation = useCreateExpenseMutation()
  const [previewDrawerOpen, setPreviewDrawerOpen] = useState(false)
  const [parsedExpense, setParsedExpense] = useState<ParsedExpense | null>(null)
  const [billMatch, setBillMatch] = useState<BillMatchCandidate | null>(null)
  const [rawText, setRawText] = useState<string>('')

  const handleSave = async (expense: ParsedExpense) => {
    if (!expense.amount || expense.amount <= 0) {
      alert('Please enter a valid amount.')
      return
    }
    const payload = {
      expense: {
        amount: expense.amount,
        datetime: expense.datetime || getLocalISO(),
        type: (expense.type?.toUpperCase?.() as ExpenseType) || 'EXPENSE',
        category: expense.category || undefined,
        platform: expense.platform || undefined,
        payment_method: expense.payment_method || undefined,
        event: (expense as { event?: string }).event || undefined,
        notes: (expense as { notes?: string }).notes || undefined,
        tags: expense.tags || [],
      },
      source: 'AI' as ExpenseSource,
      billMatch,
      raw_text: rawText,
    }
    createExpenseMutation.mutate(payload, {
      onSuccess: () => {
        setPreviewDrawerOpen(false)
        setParsedExpense(null)
        setBillMatch(null)
        setRawText('')
      },
      onError: (error) => {
        console.error('Unexpected error saving expense:', error)
        alert(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      },
    })
  }

  return (
    <>
      <AppLayoutClient>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Suspense fallback={<div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />}>
            <ExpensesDataTable currency="₹" />
          </Suspense>
        </div>
      </AppLayoutClient>

      <PreviewModal
        open={previewDrawerOpen}
        onOpenChange={setPreviewDrawerOpen}
        parsedExpense={parsedExpense}
        onSave={handleSave}
        isLoading={createExpenseMutation.isPending}
        billMatch={billMatch}
      />
    </>
  )
}
```

**Step 2: Check for TypeScript errors**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add app/expenses/page.tsx
git commit -m "refactor: expenses page is now thin shell; ExpensesDataTable owns filter/pagination state"
```

---

## Task 11: Update E2E tests for new filter UI

> **Skill:** `test-suite` (or **agent:** `test-writer`) — invoke with: `"Update tests/e2e/ui/expenses-flow/view-filter-expenses.e2e.test.ts with Playwright tests for: page load, search input debounce updates URL (?search=), type filter updates URL (?type=EXPENSE), advanced filters panel toggle (platform visible after click), pagination controls visible with data, clear-all button resets URL. Use navigateToExpenses() helper from tests/helpers/testE2E.ts."`
>
> Can run in **parallel** with Task 9 (UI build) since tests reference the UI but don't depend on the code being merged yet.

**Files:**
- Modify: `tests/e2e/ui/expenses-flow/view-filter-expenses.e2e.test.ts`

**Step 1: Update tests to cover new UI elements**

```ts
import { test, expect } from '@playwright/test'
import { navigateToExpenses } from '../../../helpers/testE2E'

test.describe('Expenses Flow - View and Filter', () => {
  test('expenses page loads and shows table or empty state', async ({ page }) => {
    await navigateToExpenses(page)
    await expect(
      page.getByRole('table').or(page.getByText(/no expenses/i))
    ).toBeVisible({ timeout: 10000 })
  })

  test('search input exists and updates URL', async ({ page }) => {
    await navigateToExpenses(page)
    const searchInput = page.getByPlaceholder('Search expenses...')
    await expect(searchInput).toBeVisible()
    await searchInput.fill('food')
    // Wait for debounce
    await page.waitForTimeout(400)
    await expect(page).toHaveURL(/search=food/)
  })

  test('type filter updates URL', async ({ page }) => {
    await navigateToExpenses(page)
    await page.getByRole('combobox').first().click() // type filter
    await page.getByText('Expenses').click()
    await expect(page).toHaveURL(/type=EXPENSE/)
  })

  test('advanced filters panel toggles', async ({ page }) => {
    await navigateToExpenses(page)
    const filtersBtn = page.getByRole('button', { name: /filters/i })
    await expect(filtersBtn).toBeVisible()
    await filtersBtn.click()
    await expect(page.getByText('All platforms')).toBeVisible()
  })

  test('pagination controls appear when there are results', async ({ page }) => {
    await navigateToExpenses(page)
    // If table has rows, pagination should be present
    const table = page.getByRole('table')
    const rows = table.getByRole('row')
    const rowCount = await rows.count()
    if (rowCount > 1) {
      // header + at least 1 data row → pagination shows
      await expect(page.getByText(/rows per page/i)).toBeVisible()
    }
  })

  test('clear all filters button resets URL', async ({ page }) => {
    await navigateToExpenses(page)
    // Apply a filter via URL
    await page.goto((page.url().split('?')[0]) + '?type=EXPENSE')
    await expect(page.getByRole('button', { name: /clear all/i })).toBeVisible()
    await page.getByRole('button', { name: /clear all/i }).click()
    await expect(page).not.toHaveURL(/type=EXPENSE/)
  })
})
```

**Step 2: Run E2E tests** (requires dev server running)

```bash
npx playwright test tests/e2e/ui/expenses-flow/view-filter-expenses.e2e.test.ts
```

**Step 3: Commit**

```bash
git add tests/e2e/ui/expenses-flow/view-filter-expenses.e2e.test.ts
git commit -m "test: update E2E tests for new expenses filter UI"
```

---

## Task 12: Run full test suite and fix any regressions

> **Skill:** `test-all` — runs unit + integration + E2E suites and reports failures.
> **Agent:** `architecture-guardian` — run after all code is written to verify no layer violations (components calling repos directly, routes importing UI, etc).
> **Skill:** `superpowers:verification-before-completion` — REQUIRED before claiming this task done. Must show actual passing test output, not just assert it passed.

**Step 1: Run all unit + integration tests**

```bash
npm run test:run
```

Fix any failures. Common issues:
- Any code that calls `expensesApi.getExpenses()` and expects `Expense[]` (not `{ expenses, total }`) — update to destructure
- Tests that check `body.data.expenses` where `total` is missing — add assertions or ignore total
- TypeScript errors in hooks or components

**Step 2: Run E2E tests** (requires dev server)

```bash
npm run test:ui-e2e
```

**Step 3: Final commit if any fixes were needed**

```bash
git add .
git commit -m "fix: address test regressions after expenses table redesign"
```

---

## Final Verification Checklist

> **Run before opening PR:**
> 1. `superpowers:verification-before-completion` — confirms tests pass with real output
> 2. `superpowers:requesting-code-review` — self-review against the design doc
> 3. `pr-review-toolkit:review-pr` — automated PR review (runs code-reviewer, silent-failure-hunter, type-design-analyzer)
> 4. `architecture-guardian` agent — confirms no layer violations introduced

- [ ] `npm run test:run` → all green (show actual output)
- [ ] `npx tsc --noEmit` → no errors
- [ ] `npm run lint` → no warnings
- [ ] Dev server runs: `npm run dev` → open `/expenses`
  - [ ] Search input debounces and updates URL
  - [ ] Type / category / date range filters work
  - [ ] Advanced panel slides open/closed
  - [ ] Active filter chips appear and are clickable to remove
  - [ ] Pagination controls work (if enough data)
  - [ ] Sort by clicking column headers works
  - [ ] Filters persist on browser refresh
  - [ ] Browser back button restores previous filter state
- [ ] Open PR with `git-pr` skill or `commit-commands:commit-push-pr`

---

## Key Files Reference

| File | Task |
|------|------|
| `tests/setup.ts` | Task 1 — mock store or/ilike/count |
| `lib/api/types.ts` | Task 2 — ExpenseFilters |
| `server/db/repositories/expense.repo.ts` | Task 3 — repo search/sort/pagination/facets |
| `server/services/expense.service.ts` | Task 4 — service passthrough |
| `app/api/expenses/route.ts` | Task 5 — GET handler |
| `app/api/expenses/facets/route.ts` | Task 6 — new facets route |
| `lib/api/expenses.ts` | Task 7 — API client |
| `lib/query/queryKeys.ts` | Task 7 — facets key |
| `lib/query/hooks/useExpensesQuery.ts` | Task 8 — hooks |
| `features/expenses/components/ExpensesDataTable.tsx` | Task 9 — main UI |
| `app/expenses/page.tsx` | Task 10 — thin shell |
| `tests/e2e/ui/expenses-flow/view-filter-expenses.e2e.test.ts` | Task 11 — E2E |
