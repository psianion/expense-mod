"use client"

import { createContext, useContext, useState, type ReactNode } from 'react'
import { ManualExpenseForm } from '@features/expenses/components/ManualExpenseForm'
import { Drawer } from '@/components/ui/drawer'
import { expensesApi } from '@/lib/api'
import { ExpenseSource, ExpenseType } from '@/types'
import { getLocalISO } from '@/lib/datetime'

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
  const [isSaving, setIsSaving] = useState(false)

  const handleManualSave = async (expenseData: any) => {
    try {
      setIsSaving(true)

      const payload = {
        expense: {
          ...expenseData,
          datetime: expenseData.datetime,
          type: (expenseData.type?.toUpperCase?.() as ExpenseType) || 'EXPENSE',
        },
        source: 'MANUAL' as ExpenseSource,
      }

      await expensesApi.createExpense(payload)
      setManualDrawerOpen(false)
    } catch (error) {
      console.error('Unexpected error saving manual expense:', error)
      alert(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSaving(false)
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
        <ManualExpenseForm onSave={handleManualSave} isLoading={isSaving} />
      </Drawer>
    </ExpenseProviderContext.Provider>
  )
}
