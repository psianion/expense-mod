"use client"

import { useState, type ReactNode } from 'react'
import { frontendLogger } from '@/lib/logger'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider } from 'next-themes'
import { AuthProvider } from './providers/AuthProvider'
import { AuthGuard } from './providers/AuthGuard'
import { ExpenseUIProvider } from './providers/ExpenseUIProvider'
import { useExpenseForm } from '@/features/expenses/hooks'
import { createQueryClient } from '@/lib/query/queryClient'

type ProvidersProps = {
  children: ReactNode
}

function ExpenseUIWithLogic({ children }: { children: ReactNode }) {
  const { createExpense, isCreating, error, clearError } = useExpenseForm()

  const handleSave = async (expenseData: any) => {
    if (error) {
      frontendLogger.debug({ component: 'ExpenseUIWithLogic', err: error }, 'Clearing previous error before save')
    }
    clearError() // Clear any previous errors before attempting save
    await createExpense({ expense: expenseData })
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
        <AuthProvider>
          <AuthGuard>
            <ExpenseUIWithLogic>
              {children}
            </ExpenseUIWithLogic>
          </AuthGuard>
        </AuthProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

