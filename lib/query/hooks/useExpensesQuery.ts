import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
      const data = await expensesApi.getExpenses(filters)
      return data.map(normalizeExpense)
    },
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
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: queryKeys.expenses.all })

      // Snapshot all active expense list cache entries so we can roll back any of them on error
      const previousQueriesData = queryClient.getQueriesData<Expense[]>({
        queryKey: queryKeys.expenses.lists(),
      })

      // Optimistically prepend the new expense to every active filtered/unfiltered expense list
      if (variables.expense) {
        const optimisticExpense: Expense = {
          ...variables.expense,
          id: `temp-${Date.now()}`, // Temporary ID
          user_id: null,
          bill_id: null,
          created_at: new Date().toISOString(),
          parsed_by_ai: variables.source === 'AI',
          raw_text: variables.raw_text || null,
          source: variables.source,
          bill_instance_id: variables.billMatch?.bill_id ? `temp-${Date.now()}` : null,
        }

        queryClient.setQueriesData<Expense[]>(
          { queryKey: queryKeys.expenses.lists() },
          (old) => {
            if (!old) return [optimisticExpense]
            return [optimisticExpense, ...old]
          }
        )
      }

      // Return a context object with the snapshotted values for rollback
      return { previousQueriesData }
    },
    onError: (err, variables, context) => {
      // If the mutation fails, roll back every expense list cache entry to its prior state
      if (context?.previousQueriesData) {
        for (const [queryKey, data] of context.previousQueriesData) {
          queryClient.setQueryData(queryKey, data)
        }
      }
    },
    onSettled: () => {
      // Always invalidate all expense queries after error or success so every
      // filtered view (by category, platform, date range, etc.) reflects the
      // latest server state rather than staying stale.
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
