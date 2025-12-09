import React, { useState, useEffect, useMemo } from 'react'
import Head from 'next/head'
import { AppSidebar } from '../components/AppSidebar'
import { SiteHeader } from '../components/SiteHeader'
import { SectionCards } from '../components/SectionCards'
import { QuickAdd } from '../components/QuickAdd'
import { PreviewModal } from '../components/PreviewModal'
import { DataTable } from '../components/DataTable'
import { FloatingActionButton } from '../components/FloatingActionButton'
import { ManualExpenseForm } from '../components/ManualExpenseForm'
import { AnalyticsDashboard } from '../components/AnalyticsDashboard'
import { Drawer } from '../components/ui/drawer'
import { SidebarProvider, SidebarInset } from '../components/ui/sidebar'
import { supabase } from '../lib/supabaseClient'
import {
  BillMatchCandidate,
  Expense,
  ExpenseSource,
  ExpenseType,
  ParsedExpense,
  ParseExpenseRequest,
  ParseExpenseResponse,
  View,
} from '../types'
import { startOfMonth, endOfMonth } from 'date-fns'
import { fromUTC, getLocalISO } from '../lib/datetime'
import { getSummaryTotals } from '../lib/analytics'

export default function Home() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [monthlyTotal, setMonthlyTotal] = useState(0)
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

  // Fetch expenses on component mount
  useEffect(() => {
    fetchExpenses()
  }, [])

  // Calculate monthly total when expenses change
  useEffect(() => {
    const now = new Date()
    const startOfCurrentMonth = startOfMonth(now)
    const endOfCurrentMonth = endOfMonth(now)

    // Expenses are already in local time format, parse them correctly
    const monthlyExpenses = expenses.filter((expense) => {
      // Parse local time string to Date object
      const expenseDate = new Date(expense.datetime)
      return expenseDate >= startOfCurrentMonth && expenseDate <= endOfCurrentMonth
    })

    const total = monthlyExpenses.reduce((sum, expense) => {
      return sum + (expense.type === 'EXPENSE' ? -expense.amount : expense.amount)
    }, 0)

    setMonthlyTotal(total)
  }, [expenses])

  const fetchExpenses = async () => {
    try {
      setIsLoadingExpenses(true)
      
      // Test Supabase connection
      console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.log('Supabase Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      
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
          code: error.code
        })
        return
      }

      console.log('Successfully fetched expenses:', data?.length || 0)
      
      // Convert UTC datetimes from database to local time for UI
      const expensesWithLocalTime = (data || []).map((expense) => ({
        ...expense,
        datetime: fromUTC(expense.datetime),
        type: (expense.type?.toUpperCase?.() as ExpenseType) || 'EXPENSE',
        source: (expense.source?.toUpperCase?.() as ExpenseSource) || 'MANUAL',
        bill_instance_id: expense.bill_instance_id ?? null
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
      
      // Validate required fields
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

      // Refresh expenses list
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

      console.log('Successfully saved manual expense:', body)
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
      <Head>
        <title>Expense Tracker</title>
        <meta name="description" content="AI-powered expense tracking app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

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
        <ManualExpenseForm
          onSave={handleManualSave}
          isLoading={isSaving}
        />
      </Drawer>
      
      {dashboardView === 'EXPENSES' && (
        <FloatingActionButton
          onClick={() => setManualDrawerOpen(true)}
        />
      )}
    </>
  )
}
