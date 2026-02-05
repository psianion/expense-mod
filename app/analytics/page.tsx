"use client"

import { useEffect, useState } from 'react'
import { AppSidebar } from '@components/layout/AppSidebar'
import { SiteHeader } from '@components/layout/SiteHeader'
import { AnalyticsDashboard } from '@features/analytics/components/AnalyticsDashboard'
import { CreditCardStatements } from '@features/analytics/components/CreditCardStatements'
import { BillReconciliation } from '@features/analytics/components/BillReconciliation'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { supabase } from '@server/db/supabase'
import { Expense, ExpenseSource, ExpenseType } from '@/types'
import { fromUTC } from '@/lib/datetime'

export default function AnalyticsPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchExpenses()
  }, [])

  const fetchExpenses = async () => {
    try {
      setIsLoading(true)

      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching expenses for analytics:', error)
        return
      }

      const expensesWithLocalTime = (data || []).map((expense) => ({
        ...expense,
        datetime: fromUTC(expense.datetime),
        type: (expense.type?.toUpperCase?.() as ExpenseType) || 'EXPENSE',
        source: (expense.source?.toUpperCase?.() as ExpenseSource) || 'MANUAL',
        bill_instance_id: expense.bill_instance_id ?? null,
      }))

      setExpenses(expensesWithLocalTime)
    } catch (error) {
      console.error('Unexpected error fetching expenses for analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="@container/main flex flex-1 flex-col gap-4">
            <AnalyticsDashboard expenses={expenses} isLoading={isLoading} currency="₹" />
            <CreditCardStatements expenses={expenses} />
            <BillReconciliation expenses={expenses} />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
