import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { expensesApi } from '@/lib/api'
import { queryKeys } from '../queryKeys'
import { fromUTC } from '@/lib/datetime'
import type { ExpenseFilters, CreateExpenseRequest } from '@/lib/api/types'
import type { Expense, ExpenseType, ExpenseSource } from '@/types'
import { toast } from 'sonner'
import { getUserFriendlyMessage } from '@/lib/errors'

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
          category: variables.expense.category ?? 'Other',
          platform: variables.expense.platform ?? 'Other',
          payment_method: variables.expense.payment_method ?? 'Other',
          tags: variables.expense.tags ?? [],
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
    onError: (err, _variables, context) => {
      if (context?.previousQueriesData) {
        for (const [queryKey, data] of context.previousQueriesData) {
          queryClient.setQueryData(queryKey, data)
        }
      }
      toast.error(getUserFriendlyMessage(err))
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
