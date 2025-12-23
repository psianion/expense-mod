"use client"

import { useState, type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider } from 'next-themes'
import { ExpenseUIProvider } from './providers/ExpenseUIProvider'
import { useExpenseForm } from '@/features/expenses/hooks'
import { createQueryClient } from '@/lib/query/queryClient'

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
  const [queryClient] = useState(() => createQueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <ExpenseUIWithLogic>
          {children}
        </ExpenseUIWithLogic>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

