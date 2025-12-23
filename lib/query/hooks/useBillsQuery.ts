import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { billsApi } from '@/lib/api'
import { queryKeys } from '../queryKeys'
import type { BillFilters, CreateBillRequest, UpdateBillRequest } from '@/lib/api/types'
import type { Bill } from '@/types'

const normalizeBill = (bill: Bill): Bill => ({
  ...bill,
  type: (bill.type?.toUpperCase?.() as Bill['type']) || 'BILL',
  frequency: (bill.frequency?.toUpperCase?.() as Bill['frequency']) || 'MONTHLY',
})

export function useBillsQuery(filters?: BillFilters) {
  return useQuery({
    queryKey: queryKeys.bills.list(filters),
    queryFn: async () => {
      const data = await billsApi.getBills(filters)
      return data.map(normalizeBill)
    },
  })
}

export function useCreateBillMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: billsApi.createBill,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bills.all })
    },
  })
}

export function useUpdateBillMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: billsApi.updateBill,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bills.all })
    },
  })
}

export function useDeleteBillMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: billsApi.deleteBill,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bills.all })
    },
  })
}
