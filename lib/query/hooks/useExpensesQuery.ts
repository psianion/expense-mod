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

      // Snapshot the previous value
      const previousExpenses = queryClient.getQueryData(queryKeys.expenses.list())

      // Optimistically update to the new value
      if (variables.expense) {
        const optimisticExpense = {
          ...variables.expense,
          id: `temp-${Date.now()}`, // Temporary ID
          user_id: null,
          created_at: new Date().toISOString(),
          parsed_by_ai: variables.source === 'AI',
          raw_text: variables.raw_text || null,
          source: variables.source,
          bill_instance_id: variables.billMatch?.bill_id ? `temp-${Date.now()}` : null,
        }

        queryClient.setQueryData(queryKeys.expenses.list(), (old: any) => {
          if (!old) return [optimisticExpense]
          return [optimisticExpense, ...old]
        })
      }

      // Return a context object with the snapshotted value
      return { previousExpenses }
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousExpenses) {
        queryClient.setQueryData(queryKeys.expenses.list(), context.previousExpenses)
      }
    },
    onSettled: () => {
      // Always refetch after error or success
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
