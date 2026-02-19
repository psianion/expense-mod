import { describe, it, expect } from 'vitest'
import { queryKeys } from '@/lib/query/queryKeys'

/**
 * Tests for query key structure used in optimistic updates.
 *
 * The fix for issue #39 replaces setQueryData(queryKeys.expenses.list()) with
 * setQueriesData({ queryKey: queryKeys.expenses.lists() }) so that ALL active
 * expense list cache entries — both unfiltered and filtered — are patched during
 * an optimistic create, and ALL are invalidated in onSettled.
 */
describe('queryKeys — expenses', () => {
  it('expenses.all is a stable array prefix', () => {
    expect(queryKeys.expenses.all).toEqual(['expenses'])
  })

  it('expenses.lists() starts with expenses.all', () => {
    const lists = queryKeys.expenses.lists()
    expect(lists[0]).toBe('expenses')
    expect(lists[1]).toBe('list')
  })

  it('unfiltered list key starts with expenses.lists()', () => {
    const unfiltered = queryKeys.expenses.list()
    const listsPrefix = queryKeys.expenses.lists()
    // unfiltered list should be a superset of the lists prefix
    expect(unfiltered.slice(0, listsPrefix.length)).toEqual([...listsPrefix])
  })

  it('filtered list key shares the same lists() prefix as unfiltered', () => {
    const filtered = queryKeys.expenses.list({ category: 'Food' })
    const unfiltered = queryKeys.expenses.list()
    const listsPrefix = queryKeys.expenses.lists()

    // Both filtered and unfiltered share the lists() prefix —
    // this is what allows setQueriesData({ queryKey: lists() }) to update both.
    expect(filtered.slice(0, listsPrefix.length)).toEqual([...listsPrefix])
    expect(unfiltered.slice(0, listsPrefix.length)).toEqual([...listsPrefix])
  })

  it('filtered and unfiltered keys are distinct', () => {
    const filtered = queryKeys.expenses.list({ category: 'Food' })
    const unfiltered = queryKeys.expenses.list()
    // They must differ so filtered results are cached separately
    expect(filtered).not.toEqual(unfiltered)
  })

  it('different filters produce distinct keys', () => {
    const byCategory = queryKeys.expenses.list({ category: 'Food' })
    const byPlatform = queryKeys.expenses.list({ platform: 'Swiggy' })
    expect(byCategory).not.toEqual(byPlatform)
  })

  it('expenses.all is a prefix of every expense list key', () => {
    const prefix = queryKeys.expenses.all
    const keys = [
      queryKeys.expenses.list(),
      queryKeys.expenses.list({ category: 'Food' }),
      queryKeys.expenses.list({ platform: 'Swiggy', date_from: '2024-01-01' }),
      queryKeys.expenses.recent(5),
      queryKeys.expenses.detail('some-id'),
    ]

    for (const key of keys) {
      expect(key.slice(0, prefix.length)).toEqual([...prefix])
    }
  })
})
