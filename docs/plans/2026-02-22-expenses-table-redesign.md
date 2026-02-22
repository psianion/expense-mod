# Expenses Table Redesign — Design Document

**Date:** 2026-02-22
**Branch:** fix/issue-62-mobile-overflow
**Status:** Approved, ready for implementation

---

## Overview

Redesign the expenses table page to use server-side filtering, URL-based filter state, efficient React Query patterns, snappy framer-motion animations, and a richer filter UI — all while following the existing theme and shadcn/ui new-york style.

---

## Problem Statement

The current `DataTable` component:
- Loads **all** expenses in a single query, then filters/sorts client-side in memory
- Has only 3 filters: date range, type, category — all client-side
- Has no pagination (unbounded data load)
- Has no text search
- Lacks animations beyond a basic loading spinner
- Filter state resets on navigation (no URL persistence)

---

## Approved Design

### 1. Filter State Architecture

**Approach:** URL search params (Next.js `useSearchParams` + `useRouter`).

Filter changes call `router.push` with updated params. This changes the React Query key, triggering a new server-side fetch. Filters are shareable, persistent on refresh, and browser back/forward works.

```
URL params → parse → ExpenseFilters object
  → queryKeys.expenses.list(filters)
  → GET /api/expenses?search=food&type=EXPENSE&page=2&limit=25
  → Supabase query → { expenses: Expense[], total: number }
```

### 2. Data Layer Changes

#### Repository (`server/db/repositories/expense.repo.ts`)
- Add `search?: string` filter: `ilike` across `category`, `platform`, `tags` (array cast), and `notes`
- Add `page` support: `offset = (page - 1) * limit`
- Return `{ expenses: Expense[], total: number }` (uses Supabase `count: 'exact'`)

#### Service (`server/services/expense.service.ts`)
- Pass through `search`, `page`, `limit` to repo
- Return `{ expenses, total }` instead of `expenses[]`

#### API Route (`app/api/expenses/route.ts`)
- Parse `search`, `page`, `limit` query params
- Return `{ expenses, total }` in response body
- Add new `GET /api/expenses/facets` route: returns distinct `{ categories, platforms, payment_methods }` for the authenticated user

#### API Client (`lib/api/expenses.ts`)
- Update `getExpenses()` return type to `{ expenses: Expense[], total: number }`
- Add `getExpenseFacets()` function

#### Types (`lib/api/types.ts`)
```ts
// Updated ExpenseFilters
interface ExpenseFilters {
  type?: 'EXPENSE' | 'INFLOW'
  category?: string
  platform?: string
  payment_method?: string
  date_from?: string
  date_to?: string
  source?: 'MANUAL' | 'AI' | 'RECURRING'
  bill_instance_id?: string
  search?: string      // NEW: full-text search
  page?: number        // NEW: current page (1-based)
  limit?: number       // NEW: page size (default 25)
}
```

### 3. React Query Changes

#### `useExpensesQuery` hook
```ts
useExpensesQuery(filters?: ExpenseFilters) {
  queryKey: queryKeys.expenses.list(filters)
  queryFn: async () => {
    const { expenses, total } = await expensesApi.getExpenses(filters)
    return { expenses: expenses.map(normalizeExpense), total }
  }
  placeholderData: keepPreviousData  // smooth page transitions
  staleTime: 60_000                   // 1 min (consistent with app)
}
```

#### New `useExpenseFacetsQuery` hook
```ts
useExpenseFacetsQuery() {
  queryKey: queryKeys.expenses.facets()
  queryFn: expensesApi.getExpenseFacets
  staleTime: 5 * 60_000  // 5 min — facets rarely change
}
```

#### Optimistic create mutation
- Existing pattern preserved; `onSettled` invalidates all expense queries including new facets key

### 4. New Component: `ExpensesDataTable`

Replaces `components/common/DataTable.tsx`. Lives at `features/expenses/components/ExpensesDataTable.tsx`.

**Self-contained:** Reads and writes URL params directly. The page component becomes a thin shell.

```
ExpensesDataTable
├── FilterBar
│   ├── SearchInput (debounced 300ms before URL update)
│   ├── DateRangePicker
│   ├── TypeSelect (All / Expenses / Income)
│   ├── CategorySelect (from facets query)
│   └── AdvancedFiltersToggle ("Filters ▾" + active count badge)
│       └── AdvancedPanel (animated slide-down, 0.15s)
│           ├── PlatformSelect (from facets query)
│           ├── PaymentMethodSelect (from facets query)
│           └── SourceSelect (All / Manual / AI / Recurring)
├── ActiveFilterChips (one chip per active filter, × to clear each)
├── SummaryBar ("247 expenses · ₹42,300 total")
├── TableBody
│   └── AnimatedRows (framer-motion, 0.12s fade+slide, 15ms stagger)
│       or SkeletonRows (during initial load / page transition)
└── PaginationControls
    ├── PageSizeSelect (10 / 25 / 50)
    └── PageButtons (Prev / 1 2 3 … N / Next)
```

### 5. Animations

Using `framer-motion` (already in project). Priority: **snappy**, not showy.

| Element | Animation | Duration |
|---------|-----------|----------|
| Table rows enter | opacity 0→1, y 8→0 | 0.12s, stagger 15ms |
| Table rows exit | opacity 1→0 | 0.08s |
| Advanced filter panel | height 0→auto, opacity 0→1 | 0.15s |
| Filter chips add | scale 0.8→1, opacity 0→1 | 0.10s spring |
| Filter chips remove | scale 1→0, opacity 1→0 | 0.08s |
| Skeleton shimmer | standard CSS animation | — |

**Pagination:** `placeholderData: keepPreviousData` keeps current rows visible during page load. Skeleton overlay only shown on initial load.

### 6. Sorting

Sorting stays server-side via `sort_by` and `sort_order` params (extend `ExpenseFilters`). Default: `datetime DESC`. Supported sort fields: `datetime`, `amount`, `category`. Sort state goes in URL params.

### 7. Page Component

`app/expenses/page.tsx` becomes minimal:

```tsx
export default function ExpensesPage() {
  return (
    <AppLayoutClient>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <ExpensesDataTable currency="₹" />
      </div>
    </AppLayoutClient>
    <PreviewModal ... />
  )
}
```

The AI parsing flow (QuickAdd → PreviewModal) remains on the page component since it's not table-specific.

---

## Files Changed

| File | Change |
|------|--------|
| `server/db/repositories/expense.repo.ts` | Add search, pagination, return total; add getFacets() |
| `server/services/expense.service.ts` | Pass through new params, return { expenses, total } |
| `app/api/expenses/route.ts` | Add search/page/limit params, new response shape |
| `app/api/expenses/facets/route.ts` | New route: GET distinct values |
| `lib/api/expenses.ts` | Update return types, add getExpenseFacets() |
| `lib/api/types.ts` | Extend ExpenseFilters with search, page, limit |
| `lib/query/queryKeys.ts` | Add expenses.facets() key |
| `lib/query/hooks/useExpensesQuery.ts` | Add placeholderData, new useExpenseFacetsQuery |
| `features/expenses/components/ExpensesDataTable.tsx` | New: replaces DataTable, self-contained |
| `app/expenses/page.tsx` | Simplified shell |
| `components/common/DataTable.tsx` | Deprecated (kept for any other consumers) |

---

## Non-Goals

- No amount range filter (can be added later)
- No tag-specific filter chip (search covers tags)
- No sorting by payment method or platform
- No column visibility toggle
- No export/download

---

## Testing Plan

- Unit tests: repo `getExpenses` with search + pagination params
- Unit tests: `useExpensesQuery` with `placeholderData` behavior
- E2E: filter by type → URL updates → results update → clear filter → results reset
- E2E: text search debounce (type → wait 300ms → fetch fires)
- E2E: pagination — next page → URL `?page=2` → different results
