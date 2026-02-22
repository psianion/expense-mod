# Tags Substring Search via Postgres RPC Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable substring search across the `tags` array column by replacing the direct `expenses` table query in `getExpenses` with a Postgres RPC function that uses `array_to_string(tags, ' ') ILIKE` internally.

**Architecture:** A `get_expenses` Postgres function (RETURNS SETOF expenses) handles all filter params including tag search. The repo calls `.rpc('get_expenses', params, { count: 'exact' })` and chains `.order()` and `.range()` for sort/pagination. The mock store gains a `rpc()` method that translates params to the existing query builder operations — using plain `tags` column name (not `tags::text`) so the mock's existing array-element substring handler covers it.

**Tech Stack:** Supabase JS v2 `.rpc()`, Postgres `RETURNS SETOF`, Vitest mock store, Next.js API route (unchanged)

---

### Task 1: Add `rpc()` to the mock Supabase client

**Files:**
- Modify: `tests/setup.ts` — add `rpc()` method to `mockSupabaseClient`

**Context:**
The mock client only has `from()`. Supabase's `.rpc(fnName, params, opts)` must be added. It translates RPC params into the existing query builder operations. For `p_search`, include `tags` as a plain column in the `or()` string — the mock's existing array handler (`Array.isArray(val)`) already does substring matching on array elements, so `tags.ilike.%s%` in the mock is equivalent to `array_to_string(tags, ' ') ILIKE` in Postgres. Note: `count: 'exact'` is passed as `opts` (third arg) to `.rpc()` in Supabase v2, NOT as `.select('*', { count: 'exact' })`.

**Step 1: Add the `rpc()` method to `mockSupabaseClient` in `tests/setup.ts`**

Locate the closing `}` of `mockSupabaseClient` (currently just has `from()`). Add `rpc()` alongside `from()`:

```ts
const mockSupabaseClient = {
  from(table: TableName) {
    return createQueryBuilder(table)
  },
  rpc(fnName: string, params: Record<string, unknown>, opts: { count?: 'exact' } = {}) {
    if (fnName !== 'get_expenses') throw new Error(`Mock rpc(): unknown function "${fnName}"`)
    const chain = createQueryBuilder('expenses')
    if (opts.count === 'exact') chain.select('*', { count: 'exact' })
    const p = params as {
      p_user_id?: string | null
      p_use_master_access?: boolean
      p_type?: string | null
      p_category?: string | null
      p_platform?: string | null
      p_payment_method?: string | null
      p_date_from?: string | null
      p_date_to?: string | null
      p_source?: string | null
      p_bill_instance_id?: string | null
      p_search?: string | null
    }
    if (!p.p_use_master_access && p.p_user_id) chain.eq('user_id', p.p_user_id)
    if (p.p_type) chain.eq('type', p.p_type)
    if (p.p_category) chain.eq('category', p.p_category)
    if (p.p_platform) chain.eq('platform', p.p_platform)
    if (p.p_payment_method) chain.eq('payment_method', p.p_payment_method)
    if (p.p_date_from) chain.gte('datetime', p.p_date_from)
    if (p.p_date_to) chain.lte('datetime', p.p_date_to)
    if (p.p_source) chain.eq('source', p.p_source)
    if (p.p_bill_instance_id) chain.eq('bill_instance_id', p.p_bill_instance_id)
    if (p.p_search) {
      const s = p.p_search.replace(/[%_]/g, '\\$&')
      // 'tags' (plain array column) — mock's orFilters handler checks Array.isArray(val)
      // and does substring matching on each element, equivalent to array_to_string ILIKE in SQL.
      chain.or(
        `category.ilike.%${s}%,platform.ilike.%${s}%,payment_method.ilike.%${s}%,raw_text.ilike.%${s}%,tags.ilike.%${s}%`
      )
    }
    return chain
  },
}
```

**Step 2: Run existing repo tests to confirm mock change doesn't break anything**

```bash
npx vitest run tests/unit/repositories/expense.repo.test.ts
```

Expected: all 31 tests PASS (no regressions — the mock still works for all existing `.from()` paths since we haven't changed the repo yet).

---

### Task 2: Write failing test for tags substring search

**Files:**
- Modify: `tests/unit/repositories/expense.repo.test.ts` — add one test in the `search (or / ilike)` describe block

**Context:**
The test seeds an expense with `tags: ['Urban', 'Transport']` and a non-matching category/platform/raw_text. Searching for `'urb'` should find it via the tags array. This test FAILS now (tags not searched). It will pass after Task 4.

**Step 1: Add the failing test after the last test in the `search (or / ilike)` describe block**

Find the test `'returns no results when search term does not match any column'` (around line 166) and add after it (still inside the `describe('search (or / ilike)')` block):

```ts
it('matches by tag substring (case-insensitive)', async () => {
  seedExpense({ tags: ['Urban', 'Transport'], category: 'Misc', platform: 'Other', raw_text: null })
  seedExpense({ tags: ['Board', 'Games'], category: 'Entertainment', platform: 'Other', raw_text: null })
  seedExpense({ tags: [], category: 'Food', platform: 'Other', raw_text: null })
  const { expenses } = await expenseRepository.getExpenses(
    { search: 'urb' },
    auth
  )
  expect(expenses).toHaveLength(1)
  expect((expenses[0] as Record<string, unknown>).tags).toContain('Urban')
})

it('matches tags substring and is case-insensitive for mixed-case query', async () => {
  seedExpense({ tags: ['Urban', 'Food'], category: 'Misc', platform: 'Other', raw_text: null })
  const { expenses } = await expenseRepository.getExpenses(
    { search: 'URBAN' },
    auth
  )
  expect(expenses).toHaveLength(1)
})
```

**Step 2: Run to confirm tests FAIL now**

```bash
npx vitest run tests/unit/repositories/expense.repo.test.ts
```

Expected: the 2 new tests FAIL (tags not included in search). All 31 existing tests still pass.

---

### Task 3: Create SQL migration for `get_expenses` function

**Files:**
- Create: `sql/migrations/002_get_expenses_rpc.sql`

**Context:**
This function is called via `.rpc('get_expenses', params, { count: 'exact' })` from the repo. It returns `SETOF expenses` so PostgREST can chain `.order()` and `.range()` on top. The `STABLE` volatility marker tells Postgres this function is safe to inline and cache within a transaction. Parameters use `DEFAULT NULL` so callers only send what they need.

**Step 1: Create the migration file**

```sql
-- Migration: add get_expenses RPC function for server-side filtering
-- Enables substring search on the tags array via array_to_string ILIKE.
-- Called from the repo via: client.rpc('get_expenses', params, { count: 'exact' })
-- PostgREST chains .order() and .range() on the SETOF result.

CREATE OR REPLACE FUNCTION get_expenses(
  p_user_id         uuid      DEFAULT NULL,
  p_use_master_access boolean DEFAULT false,
  p_type            text      DEFAULT NULL,
  p_category        text      DEFAULT NULL,
  p_platform        text      DEFAULT NULL,
  p_payment_method  text      DEFAULT NULL,
  p_date_from       timestamptz DEFAULT NULL,
  p_date_to         timestamptz DEFAULT NULL,
  p_source          text      DEFAULT NULL,
  p_bill_instance_id uuid     DEFAULT NULL,
  p_search          text      DEFAULT NULL
)
RETURNS SETOF expenses
LANGUAGE sql
STABLE
AS $$
  SELECT * FROM expenses e
  WHERE
    -- User scoping: either master access, no user context, or matching user
    (p_use_master_access OR p_user_id IS NULL OR e.user_id = p_user_id)
    -- Exact filters (NULL = no filter applied)
    AND (p_type IS NULL           OR e.type = p_type)
    AND (p_category IS NULL       OR e.category = p_category)
    AND (p_platform IS NULL       OR e.platform = p_platform)
    AND (p_payment_method IS NULL OR e.payment_method = p_payment_method)
    AND (p_date_from IS NULL      OR e.datetime >= p_date_from)
    AND (p_date_to IS NULL        OR e.datetime <= p_date_to)
    AND (p_source IS NULL         OR e.source = p_source)
    AND (p_bill_instance_id IS NULL OR e.bill_instance_id = p_bill_instance_id)
    -- Full-text substring search including tags array
    AND (
      p_search IS NULL OR
      e.category       ILIKE '%' || p_search || '%' OR
      e.platform       ILIKE '%' || p_search || '%' OR
      e.payment_method ILIKE '%' || p_search || '%' OR
      e.raw_text       ILIKE '%' || p_search || '%' OR
      array_to_string(e.tags, ' ') ILIKE '%' || p_search || '%'
    );
$$;

-- Grant execute to the anon and authenticated roles used by PostgREST
GRANT EXECUTE ON FUNCTION get_expenses TO anon, authenticated;
```

> **Note for developer:** Run this migration in the Supabase SQL editor (Dashboard → SQL Editor). It is idempotent (`CREATE OR REPLACE`).

---

### Task 4: Update `getExpenses` in the repo to use RPC

**Files:**
- Modify: `server/db/repositories/expense.repo.ts`

**Context:**
Replace the `.from('expenses')` query builder chain in `getExpenses` with `.rpc('get_expenses', params, { count: 'exact' })`. All filter logic (type, category, user scoping, search) moves to the RPC params. Only sort (`.order()`) and pagination (`.range()` / `.limit()`) remain as PostgREST chains on the RPC result. `getFacets`, `getExpenseById`, `updateExpense`, and `deleteExpense` are unchanged.

**Step 1: Replace the `getExpenses` method body**

Old code (lines 66–128) — the entire method from `async getExpenses(` through the closing `}`. Replace with:

```ts
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
        throw new Error(DB_UNAVAILABLE_MESSAGE)
      }
      throw new Error(error.message)
    }

    return { expenses: data as Expense[], total: count ?? 0 }
  }
```

> **Note on `(client as any).rpc(...)`:** The Supabase client type is inferred from the `supabase.ts` setup. If the project uses a typed Database schema, swap `(client as any)` for the properly typed client. The `as any` avoids needing a generated `Database` type for this function.

**Step 2: Run the full repo test file to verify failing tests now pass**

```bash
npx vitest run tests/unit/repositories/expense.repo.test.ts
```

Expected: all 33 tests PASS (31 existing + 2 new tags tests).

**Step 3: Run the full unit + integration test suite**

```bash
npm run test:run
```

Expected: all tests pass. If any integration tests fail, check that the `rpc()` mock in `tests/setup.ts` correctly translates all the params.

---

### Task 5: Commit

**Step 1: Verify tests one final time**

```bash
npm run test:run
```

Expected: green.

**Step 2: Commit all changes**

```bash
git add \
  sql/migrations/002_get_expenses_rpc.sql \
  server/db/repositories/expense.repo.ts \
  tests/setup.ts \
  tests/unit/repositories/expense.repo.test.ts
git commit -m "feat: enable tags substring search via get_expenses Postgres RPC

Replace direct .from('expenses') query in getExpenses with
.rpc('get_expenses') which uses array_to_string(tags,' ') ILIKE
internally, enabling substring search on the tags array column.

Mock store gains rpc() method that translates params to existing
query builder operations (uses plain 'tags' column name — mock's
array handler covers substring matching without ::text cast).

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```
