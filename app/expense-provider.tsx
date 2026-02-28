"use client"

import { createContext, useContext, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { ManualExpenseForm } from '@features/expenses/components/ManualExpenseForm'
import { Drawer } from '@/components/ui/drawer'
import { ExpenseSource, ExpenseType } from '@/types'
import { getLocalISO } from '@/lib/datetime'
import { useCreateExpenseMutation } from '@/lib/query/hooks'
import { getUserFriendlyMessage } from '@/lib/errors'

interface ExpenseProviderContextType {
  openExpenseDrawer: () => void
}

const ExpenseProviderContext = createContext<ExpenseProviderContextType | null>(null)

export function useExpenseProvider() {
  const context = useContext(ExpenseProviderContext)
  if (!context) {
    throw new Error('useExpenseProvider must be used within an ExpenseProvider')
  }
  return context
}

interface ExpenseProviderProps {
  children: ReactNode
}

export function ExpenseProvider({ children }: ExpenseProviderProps) {
  const [manualDrawerOpen, setManualDrawerOpen] = useState(false)

  const createExpenseMutation = useCreateExpenseMutation()

  const handleManualSave = async (expenseData: any) => {
    try {
      const { currency: _currency, ...rest } = expenseData
      const payload = {
        expense: {
          ...rest,
          datetime: expenseData.datetime,
          type: (expenseData.type?.toUpperCase?.() as ExpenseType) || 'EXPENSE',
        },
        source: 'MANUAL' as ExpenseSource,
      }

      await createExpenseMutation.mutateAsync(payload)
      setManualDrawerOpen(false)
    } catch (error) {
      console.error('Unexpected error saving manual expense:', error)
      toast.error(getUserFriendlyMessage(error))
    }
  }

  const openExpenseDrawer = () => {
    setManualDrawerOpen(true)
  }

  return (
    <ExpenseProviderContext.Provider value={{ openExpenseDrawer }}>
      {children}

      <Drawer
        open={manualDrawerOpen}
        onOpenChange={setManualDrawerOpen}
        title="Add Manual Expense"
        description="Enter expense details manually"
      >
        <ManualExpenseForm onSave={handleManualSave} isLoading={createExpenseMutation.isPending} />
      </Drawer>
    </ExpenseProviderContext.Provider>
  )
}
