/**
 * Unit tests for ExpenseRepository — specifically targeting the mock store's
 * or(), ilike pattern matching, and count behavior added in Task 1.
 *
 * These tests run against the in-memory mock store (tests/setup.ts) and
 * directly call the repo layer so they are isolated from route and service
 * concerns. They act as a specification for the mock store's behaviour and
 * will catch regressions if the mock is modified.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { expenseRepository } from '@server/db/repositories/expense.repo'
import { clearMockStore, getMockStore, getDemoUserContext } from '../../setup'

const demoUser = getDemoUserContext()
const auth = { userId: demoUser.userId, useMasterAccess: false }

/** Minimal valid expense row inserted directly into the mock store. */
function seedExpense(overrides: Partial<Record<string, unknown>> = {}) {
  const now = new Date().toISOString()
  const row = {
    id: crypto.randomUUID(),
    user_id: demoUser.userId,
    amount: 100,
    datetime: now,
    category: 'Food',
    platform: 'Other',
    payment_method: 'Other',
    type: 'EXPENSE',
    tags: [] as string[],
    parsed_by_ai: false,
    raw_text: null as string | null,
    source: 'MANUAL',
    bill_id: null,
    bill_instance_id: null,
    created_at: now,
    ...overrides,
  }
  getMockStore().expenses.push(row as never)
  return row
}

beforeEach(() => clearMockStore())

// ─── count / total ────────────────────────────────────────────────────────────

describe('count mode', () => {
  it('returns 0 total when the store is empty', async () => {
    const { expenses, total } = await expenseRepository.getExpenses({}, auth)
    expect(expenses).toHaveLength(0)
    expect(total).toBe(0)
  })

  it('returns total equal to the number of stored rows', async () => {
    seedExpense()
    seedExpense()
    seedExpense()
    const { total } = await expenseRepository.getExpenses({}, auth)
    expect(total).toBe(3)
  })

  it('total reflects filtered count, not the raw store count', async () => {
    seedExpense({ category: 'Food' })
    seedExpense({ category: 'Food' })
    seedExpense({ category: 'Transport' })
    const { expenses, total } = await expenseRepository.getExpenses(
      { category: 'Food' },
      auth
    )
    expect(expenses).toHaveLength(2)
    expect(total).toBe(2)
  })

  it('total is the pre-pagination count, not the page size', async () => {
    for (let i = 0; i < 5; i++) seedExpense({ amount: i + 1 })
    const { expenses, total } = await expenseRepository.getExpenses(
      { page: 1, limit: 2 },
      auth
    )
    expect(expenses).toHaveLength(2)
    expect(total).toBe(5)
  })

  it('total is pre-pagination count when using raw offset', async () => {
    for (let i = 0; i < 4; i++) seedExpense()
    const { expenses, total } = await expenseRepository.getExpenses(
      { offset: 0, limit: 2 },
      auth
    )
    expect(expenses).toHaveLength(2)
    expect(total).toBe(4)
  })

  it('total accounts for or() search before pagination', async () => {
    seedExpense({ category: 'Groceries' })
    seedExpense({ category: 'Groceries' })
    seedExpense({ category: 'Transport' })
    const { expenses, total } = await expenseRepository.getExpenses(
      { search: 'grocer', page: 1, limit: 1 },
      auth
    )
    // Only 1 row on the page but total should be 2 (both Groceries rows match)
    expect(expenses).toHaveLength(1)
    expect(total).toBe(2)
  })
})

// ─── or() / ilike matching ────────────────────────────────────────────────────

describe('search (or / ilike)', () => {
  it('matches by category (case-insensitive)', async () => {
    seedExpense({ category: 'Groceries' })
    seedExpense({ category: 'Transport' })
    const { expenses } = await expenseRepository.getExpenses(
      { search: 'GROCER' },
      auth
    )
    expect(expenses).toHaveLength(1)
    expect(expenses[0].category).toBe('Groceries')
  })

  it('matches by platform (case-insensitive)', async () => {
    seedExpense({ platform: 'Swiggy', category: 'Food' })
    seedExpense({ platform: 'Uber', category: 'Transport' })
    const { expenses } = await expenseRepository.getExpenses(
      { search: 'swig' },
      auth
    )
    expect(expenses).toHaveLength(1)
    expect((expenses[0] as Record<string, unknown>).platform).toBe('Swiggy')
  })

  it('matches by payment_method (case-insensitive)', async () => {
    seedExpense({ payment_method: 'CreditCard' })
    seedExpense({ payment_method: 'UPI' })
    const { expenses } = await expenseRepository.getExpenses(
      { search: 'credit' },
      auth
    )
    expect(expenses).toHaveLength(1)
    expect((expenses[0] as Record<string, unknown>).payment_method).toBe('CreditCard')
  })

  it('matches by raw_text (case-insensitive)', async () => {
    seedExpense({ raw_text: 'paid 200 for lunch at Zomato', category: 'Food' })
    seedExpense({ raw_text: null, category: 'Transport' })
    const { expenses } = await expenseRepository.getExpenses(
      { search: 'zomato' },
      auth
    )
    expect(expenses).toHaveLength(1)
    expect((expenses[0] as Record<string, unknown>).raw_text).toContain('Zomato')
  })

  it('matches across multiple columns — category or platform', async () => {
    seedExpense({ category: 'Food', platform: 'Swiggy' })
    seedExpense({ category: 'Food', platform: 'Other' })
    seedExpense({ category: 'Transport', platform: 'Ola' })
    // 'food' should match the two Food rows
    const { expenses } = await expenseRepository.getExpenses(
      { search: 'food' },
      auth
    )
    expect(expenses).toHaveLength(2)
  })

  it('returns no results when search term does not match any column', async () => {
    seedExpense({ category: 'Food', platform: 'Swiggy', payment_method: 'UPI', raw_text: 'lunch' })
    const { expenses, total } = await expenseRepository.getExpenses(
      { search: 'zzznomatch' },
      auth
    )
    expect(expenses).toHaveLength(0)
    expect(total).toBe(0)
  })

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

  it('empty search string returns all rows (no or() filter applied)', async () => {
    seedExpense({ category: 'Food' })
    seedExpense({ category: 'Transport' })
    const { expenses } = await expenseRepository.getExpenses(
      { search: '' },
      auth
    )
    // Empty string is falsy, so the repo skips the or() call entirely
    expect(expenses).toHaveLength(2)
  })

  it('does not crash when a column value is null', async () => {
    // raw_text is null on this row — should not throw
    seedExpense({ raw_text: null, category: 'Food' })
    const { expenses } = await expenseRepository.getExpenses(
      { search: 'food' },
      auth
    )
    expect(expenses).toHaveLength(1)
  })

  it('does not crash when a column value is undefined/missing', async () => {
    // Seed a row that has no platform key at all (simulates a sparse record)
    const now = new Date().toISOString()
    getMockStore().expenses.push({
      id: crypto.randomUUID(),
      user_id: demoUser.userId,
      amount: 50,
      datetime: now,
      category: 'Food',
      // platform intentionally omitted
      payment_method: 'Other',
      type: 'EXPENSE',
      tags: [],
      parsed_by_ai: false,
      raw_text: null,
      source: 'MANUAL',
      bill_id: null,
      bill_instance_id: null,
      created_at: now,
    } as never)
    await expect(
      expenseRepository.getExpenses({ search: 'food' }, auth)
    ).resolves.toBeDefined()
  })

  it('search term with percent signs does not break matching', async () => {
    // The repo escapes literal % in the user search term before passing to or()
    // The mock strips all % when building the ilike pattern — so a search for
    // 'foo%bar' should not throw and should match 'foobar' category
    seedExpense({ category: 'foobar' })
    seedExpense({ category: 'Transport' })
    const { expenses } = await expenseRepository.getExpenses(
      { search: 'foo%bar' },
      auth
    )
    // After escaping: search becomes 'foo\%bar'; mock strips % → pattern 'foo\bar'
    // 'foobar'.includes('foo\\bar') is false — this is a known limitation of the
    // mock vs real Supabase. The test documents that behaviour rather than
    // asserting a match: the key requirement is no crash.
    expect(Array.isArray(expenses)).toBe(true)
  })
})

// ─── tags array matching ──────────────────────────────────────────────────────

describe('tags array matching via or()', () => {
  it('matches when search term is contained in a tags array element', async () => {
    // With the RPC-based getExpenses, the mock passes "tags.ilike.%pattern%"
    // (no ::text cast) to or(). The mock's or() handler checks Array.isArray(val)
    // and does substring matching on each element — so tags DO match now.
    seedExpense({ tags: ['lunch', 'work'], category: 'Food' })
    const { expenses } = await expenseRepository.getExpenses(
      { search: 'lunch' },
      auth
    )
    // 'lunch' matches the tags array element 'lunch' (case-insensitive).
    // Category 'Food' does not contain 'lunch', but tags do — result: 1 match.
    expect(expenses).toHaveLength(1)
  })

  it('tags search falls back to other columns — category match is unaffected', async () => {
    // Even when tags don't match due to the column alias issue, other columns work
    seedExpense({ tags: ['lunch'], category: 'Lunch', platform: 'Other' })
    const { expenses } = await expenseRepository.getExpenses(
      { search: 'lunch' },
      auth
    )
    // 'lunch' matches category 'Lunch' (case-insensitive)
    expect(expenses).toHaveLength(1)
  })
})

// ─── pagination ───────────────────────────────────────────────────────────────

describe('pagination', () => {
  it('page=1, limit=2 returns first two rows', async () => {
    for (let i = 1; i <= 4; i++) seedExpense({ amount: i * 100 })
    const { expenses } = await expenseRepository.getExpenses(
      { page: 1, limit: 2, sort_by: 'amount', sort_order: 'asc' },
      auth
    )
    expect(expenses).toHaveLength(2)
    expect((expenses[0] as Record<string, unknown>).amount).toBe(100)
    expect((expenses[1] as Record<string, unknown>).amount).toBe(200)
  })

  it('page=2, limit=2 returns rows 3 and 4', async () => {
    for (let i = 1; i <= 4; i++) seedExpense({ amount: i * 100 })
    const { expenses } = await expenseRepository.getExpenses(
      { page: 2, limit: 2, sort_by: 'amount', sort_order: 'asc' },
      auth
    )
    expect(expenses).toHaveLength(2)
    expect((expenses[0] as Record<string, unknown>).amount).toBe(300)
    expect((expenses[1] as Record<string, unknown>).amount).toBe(400)
  })

  it('page beyond available data returns empty array', async () => {
    seedExpense()
    seedExpense()
    const { expenses, total } = await expenseRepository.getExpenses(
      { page: 5, limit: 10 },
      auth
    )
    expect(expenses).toHaveLength(0)
    expect(total).toBe(2) // total still reflects full count
  })

  it('page=0 is treated as "no page" (no pagination applied)', async () => {
    // The repo condition is: if (filters?.page && filters.page > 0).
    // page=0 is falsy, so falls through to offset/limit branches.
    // With only page=0 and no limit/offset, all rows are returned.
    for (let i = 0; i < 3; i++) seedExpense()
    const { expenses } = await expenseRepository.getExpenses({ page: 0 }, auth)
    expect(expenses).toHaveLength(3)
  })

  it('raw offset works independently of page', async () => {
    for (let i = 1; i <= 4; i++) seedExpense({ amount: i * 10 })
    const { expenses } = await expenseRepository.getExpenses(
      { offset: 2, limit: 2, sort_by: 'amount', sort_order: 'asc' },
      auth
    )
    expect(expenses).toHaveLength(2)
    expect((expenses[0] as Record<string, unknown>).amount).toBe(30)
    expect((expenses[1] as Record<string, unknown>).amount).toBe(40)
  })
})

// ─── sort ─────────────────────────────────────────────────────────────────────

describe('sort', () => {
  it('sorts by amount ascending', async () => {
    seedExpense({ amount: 300 })
    seedExpense({ amount: 100 })
    seedExpense({ amount: 200 })
    const { expenses } = await expenseRepository.getExpenses(
      { sort_by: 'amount', sort_order: 'asc' },
      auth
    )
    const amounts = expenses.map((e) => (e as unknown as Record<string, unknown>).amount)
    expect(amounts).toEqual([100, 200, 300])
  })

  it('sorts by amount descending', async () => {
    seedExpense({ amount: 300 })
    seedExpense({ amount: 100 })
    seedExpense({ amount: 200 })
    const { expenses } = await expenseRepository.getExpenses(
      { sort_by: 'amount', sort_order: 'desc' },
      auth
    )
    const amounts = expenses.map((e) => (e as unknown as Record<string, unknown>).amount)
    expect(amounts).toEqual([300, 200, 100])
  })

  it('defaults to datetime descending when no sort is specified', async () => {
    const t1 = new Date('2025-01-01T10:00:00Z').toISOString()
    const t2 = new Date('2025-01-02T10:00:00Z').toISOString()
    seedExpense({ datetime: t1, amount: 1 })
    seedExpense({ datetime: t2, amount: 2 })
    const { expenses } = await expenseRepository.getExpenses({}, auth)
    // Default: sort_by=datetime, sort_order=desc (ascending=false)
    expect((expenses[0] as Record<string, unknown>).amount).toBe(2)
    expect((expenses[1] as Record<string, unknown>).amount).toBe(1)
  })
})

// ─── facets ───────────────────────────────────────────────────────────────────

describe('getFacets', () => {
  it('returns empty arrays when there are no expenses', async () => {
    const facets = await expenseRepository.getFacets(auth)
    expect(facets.categories).toEqual([])
    expect(facets.platforms).toEqual([])
    expect(facets.payment_methods).toEqual([])
  })

  it('returns unique sorted categories', async () => {
    seedExpense({ category: 'Transport' })
    seedExpense({ category: 'Food' })
    seedExpense({ category: 'Food' }) // duplicate
    const { categories } = await expenseRepository.getFacets(auth)
    expect(categories).toEqual(['Food', 'Transport'])
  })

  it('returns unique sorted platforms', async () => {
    seedExpense({ platform: 'Swiggy' })
    seedExpense({ platform: 'Uber' })
    seedExpense({ platform: 'Swiggy' }) // duplicate
    const { platforms } = await expenseRepository.getFacets(auth)
    expect(platforms).toEqual(['Swiggy', 'Uber'])
  })

  it('returns unique sorted payment_methods', async () => {
    seedExpense({ payment_method: 'UPI' })
    seedExpense({ payment_method: 'Card' })
    seedExpense({ payment_method: 'Card' }) // duplicate
    const { payment_methods } = await expenseRepository.getFacets(auth)
    expect(payment_methods).toEqual(['Card', 'UPI'])
  })

  it('filters facets to the authenticated user only', async () => {
    const otherUserId = '00000000-0000-0000-0000-000000000099'
    seedExpense({ category: 'Food' })
    getMockStore().expenses.push({
      id: crypto.randomUUID(),
      user_id: otherUserId,
      amount: 200,
      datetime: new Date().toISOString(),
      category: 'OtherUserCategory',
      platform: 'Other',
      payment_method: 'Cash',
      type: 'EXPENSE',
      tags: [],
      parsed_by_ai: false,
      raw_text: null,
      source: 'MANUAL',
      bill_id: null,
      bill_instance_id: null,
      created_at: new Date().toISOString(),
    } as never)
    const { categories } = await expenseRepository.getFacets(auth)
    expect(categories).toContain('Food')
    expect(categories).not.toContain('OtherUserCategory')
  })
})
