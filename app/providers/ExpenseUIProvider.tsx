"use client"

import { createContext, useContext, useState, type ReactNode } from 'react'
import { ManualExpenseForm } from '@features/expenses/components/ManualExpenseForm'
import { Drawer } from '@/components/ui/drawer'

interface ExpenseUIProviderContextType {
  openExpenseDrawer: () => void
  closeExpenseDrawer: () => void
  isExpenseDrawerOpen: boolean
}

const ExpenseUIProviderContext = createContext<ExpenseUIProviderContextType | null>(null)

export function useExpenseUIProvider() {
  const context = useContext(ExpenseUIProviderContext)
  if (!context) {
    throw new Error('useExpenseUIProvider must be used within an ExpenseUIProvider')
  }
  return context
}

interface ExpenseUIProviderProps {
  children: ReactNode
  onSave?: (expenseData: any) => Promise<void>
  isLoading?: boolean
}

export function ExpenseUIProvider({ children, onSave, isLoading = false }: ExpenseUIProviderProps) {
  const [manualDrawerOpen, setManualDrawerOpen] = useState(false)

  const openExpenseDrawer = () => {
    setManualDrawerOpen(true)
  }

  const closeExpenseDrawer = () => {
    setManualDrawerOpen(false)
  }

  const handleManualSave = async (expenseData: any) => {
    if (onSave) {
      await onSave(expenseData)
    }
    setManualDrawerOpen(false)
  }

  return (
    <ExpenseUIProviderContext.Provider
      value={{
        openExpenseDrawer,
        closeExpenseDrawer,
        isExpenseDrawerOpen: manualDrawerOpen,
      }}
    >
      {children}

      <Drawer
        open={manualDrawerOpen}
        onOpenChange={setManualDrawerOpen}
        title="Add Manual Expense"
        description="Enter expense details manually"
      >
        <ManualExpenseForm onSave={handleManualSave} isLoading={isLoading} />
      </Drawer>
    </ExpenseUIProviderContext.Provider>
  )
}
