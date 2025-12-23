"use client"

import type { ReactNode } from 'react'
import { ThemeProvider } from 'next-themes'
import { ExpenseUIProvider } from './providers/ExpenseUIProvider'
import { useExpenseForm } from '@/features/expenses/hooks'

type ProvidersProps = {
  children: ReactNode
}

function ExpenseUIWithLogic({ children }: { children: ReactNode }) {
  const { createExpense, isCreating, error } = useExpenseForm()

  const handleSave = async (expenseData: any) => {
    if (error) {
      console.error('Previous error:', error)
    }
    await createExpense(expenseData)
  }

  return (
    <ExpenseUIProvider onSave={handleSave} isLoading={isCreating}>
      {children}
    </ExpenseUIProvider>
  )
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ExpenseUIWithLogic>
        {children}
      </ExpenseUIWithLogic>
    </ThemeProvider>
  )
}

