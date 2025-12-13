"use client"

import { useEffect, useMemo, useState } from 'react'
import { AppSidebar } from '@components/layout/AppSidebar'
import { SiteHeader } from '@components/layout/SiteHeader'
import { SectionCards } from '@components/common/SectionCards'
import { QuickAdd } from '@features/expenses/components/QuickAdd'
import { PreviewModal } from '@features/expenses/components/PreviewModal'
import { DataTable } from '@components/common/DataTable'
import { FloatingActionButton } from '@components/common/FloatingActionButton'
import { ManualExpenseForm } from '@features/expenses/components/ManualExpenseForm'
import { AnalyticsDashboard } from '@features/analytics/components/AnalyticsDashboard'
import { Drawer } from '@/components/ui/drawer'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { supabase } from '@server/db/supabase'
import {
  BillMatchCandidate,
  Expense,
  ExpenseSource,
  ExpenseType,
  ParsedExpense,
  ParseExpenseRequest,
  ParseExpenseResponse,
  View,
} from '../../../types'
import { fromUTC, getLocalISO } from '@/lib/datetime'
import { getSummaryTotals } from '@/lib/analytics'

export default function HomePage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true)
  const [isParsing, setIsParsing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [previewDrawerOpen, setPreviewDrawerOpen] = useState(false)
  const [manualDrawerOpen, setManualDrawerOpen] = useState(false)
  const [parsedExpense, setParsedExpense] = useState<ParsedExpense | null>(null)
  const [billMatch, setBillMatch] = useState<BillMatchCandidate | null>(null)
  const [rawText, setRawText] = useState<string>('')
  const [dashboardView, setDashboardView] = useState<View>('EXPENSES')

  const handleSidebarViewChange = (view: View) => {
    if (view === 'EXPENSES' || view === 'ANALYTICS') {
      setDashboardView(view)
    }
  }

  useEffect(() => {
    fetchExpenses()
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#analytics') {
      setDashboardView('ANALYTICS')
    }
  }, [])

  const fetchExpenses = async () => {
    try {
      setIsLoadingExpenses(true)

      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Error fetching expenses:', error)
        console.error('Fetch error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        })
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
      console.error('Unexpected error fetching expenses:', error)
    } finally {
      setIsLoadingExpenses(false)
    }
  }

  const handleParse = async (text: string) => {
    try {
      setIsParsing(true)
      setRawText(text)

      const response = await fetch('/api/parse-expense', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text } as ParseExpenseRequest),
      })

      if (!response.ok) {
        throw new Error('Failed to parse expense')
      }

      const data: ParseExpenseResponse = await response.json()
      setParsedExpense(data.parsed)
      setBillMatch(data.bill_match ?? null)
      setPreviewDrawerOpen(true)
    } catch (error) {
      console.error('Error parsing expense:', error)
      alert('Failed to parse expense. Please try again.')
    } finally {
      setIsParsing(false)
    }
  }

  const handleSave = async (expense: ParsedExpense) => {
    try {
      setIsSaving(true)

      if (!expense.amount || expense.amount <= 0) {
        alert('Please enter a valid amount.')
        return
      }

      const localDateTime = expense.datetime || getLocalISO()
      const payload = {
        expense: {
          ...expense,
          currency: expense.currency || 'INR',
          datetime: localDateTime,
          type: (expense.type?.toUpperCase?.() as ExpenseType) || 'EXPENSE',
        },
        source: 'AI' as ExpenseSource,
        billMatch: billMatch,
        raw_text: rawText,
      }

      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const body = await response.json()
      if (!response.ok) {
        console.error('Failed to save expense:', body)
        alert(body.error || 'Failed to save expense')
        return
      }

      await fetchExpenses()
      setPreviewDrawerOpen(false)
      setParsedExpense(null)
      setBillMatch(null)
      setRawText('')
    } catch (error) {
      console.error('Unexpected error saving expense:', error)
      alert(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSaving(false)
    }
  }

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

      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const body = await response.json()
      if (!response.ok) {
        console.error('Failed to save expense:', body)
        alert(body.error || 'Failed to save expense')
        return
      }

      await fetchExpenses()
      setManualDrawerOpen(false)
    } catch (error) {
      console.error('Unexpected error saving manual expense:', error)
      alert(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSaving(false)
    }
  }

  const summary = useMemo(() => getSummaryTotals(expenses), [expenses])

  return (
    <>
      <SidebarProvider>
        <AppSidebar
          currentView={dashboardView}
          onViewChange={handleSidebarViewChange}
          onAddExpense={() => setManualDrawerOpen(true)}
        />
        <SidebarInset>
          <SiteHeader currentView={dashboardView} />
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="@container/main flex flex-1 flex-col gap-4">
              <SectionCards
                expenseTotal={summary.expenseTotal}
                inflowTotal={summary.inflowTotal}
                net={summary.net}
                currency="₹"
              />

              {dashboardView === 'ANALYTICS' ? (
                <AnalyticsDashboard expenses={expenses} isLoading={isLoadingExpenses} currency="₹" />
              ) : (
                <>
                  <QuickAdd onParse={handleParse} isLoading={isParsing} />
                  <DataTable expenses={expenses} isLoading={isLoadingExpenses} currency="₹" />
                </>
              )}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>

      <PreviewModal
        open={previewDrawerOpen}
        onOpenChange={setPreviewDrawerOpen}
        parsedExpense={parsedExpense}
        onSave={handleSave}
        isLoading={isSaving}
        billMatch={billMatch}
      />

      <Drawer
        open={manualDrawerOpen}
        onOpenChange={setManualDrawerOpen}
        title="Add Manual Expense"
        description="Enter expense details manually"
      >
        <ManualExpenseForm onSave={handleManualSave} isLoading={isSaving} />
      </Drawer>

      {dashboardView === 'EXPENSES' && <FloatingActionButton onClick={() => setManualDrawerOpen(true)} />}
    </>
  )
}

