import React, { useState, useEffect } from 'react'
import Head from 'next/head'
import { Header } from '../components/Header'
import { QuickAdd } from '../components/QuickAdd'
import { PreviewModal } from '../components/PreviewModal'
import { ExpensesList } from '../components/ExpensesList'
import { FloatingActionButton } from '../components/FloatingActionButton'
import { ManualExpenseForm } from '../components/ManualExpenseForm'
import { AnalyticsDashboard } from '../components/AnalyticsDashboard'
import { Drawer } from '../components/ui/drawer'
import { supabase } from '../lib/supabaseClient'
import { Expense, ParsedExpense, ParseExpenseRequest, ParseExpenseResponse } from '../types'
import { startOfMonth, endOfMonth } from 'date-fns'

export default function Home() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [monthlyTotal, setMonthlyTotal] = useState(0)
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true)
  const [isParsing, setIsParsing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [previewDrawerOpen, setPreviewDrawerOpen] = useState(false)
  const [manualDrawerOpen, setManualDrawerOpen] = useState(false)
  const [parsedExpense, setParsedExpense] = useState<ParsedExpense | null>(null)
  const [dashboardView, setDashboardView] = useState<'expenses' | 'analytics'>('expenses')

  // Fetch expenses on component mount
  useEffect(() => {
    fetchExpenses()
  }, [])

  // Calculate monthly total when expenses change
  useEffect(() => {
    const now = new Date()
    const startOfCurrentMonth = startOfMonth(now)
    const endOfCurrentMonth = endOfMonth(now)

    const monthlyExpenses = expenses.filter((expense) => {
      const expenseDate = new Date(expense.datetime)
      return expenseDate >= startOfCurrentMonth && expenseDate <= endOfCurrentMonth
    })

    const total = monthlyExpenses.reduce((sum, expense) => {
      return sum + (expense.type === 'expense' ? -expense.amount : expense.amount)
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
      setExpenses(data || [])
    } catch (error) {
      console.error('Unexpected error fetching expenses:', error)
    } finally {
      setIsLoadingExpenses(false)
    }
  }

  const handleParse = async (text: string) => {
    try {
      setIsParsing(true)
      
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

      const expenseData = {
        user_id: null, // TODO: Set to actual user ID when auth is implemented
        amount: expense.amount,
        currency: expense.currency || 'INR',
        datetime: expense.datetime || new Date().toISOString(),
        category: expense.category,
        platform: expense.platform,
        payment_method: expense.payment_method,
        type: expense.type,
        event: expense.event,
        notes: expense.notes,
        parsed_by_ai: true,
        raw_text: null,
      }

      console.log('Saving expense data:', expenseData)

      const { data, error } = await supabase
        .from('expenses')
        .insert([expenseData])
        .select()

      if (error) {
        console.error('Supabase error:', error)
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        alert(`Failed to save expense: ${error.message}`)
        return
      }

      console.log('Successfully saved expense:', data)

      // Refresh expenses list
      await fetchExpenses()
      setPreviewDrawerOpen(false)
      setParsedExpense(null)
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
      
      const data = {
        user_id: null,
        amount: expenseData.amount,
        currency: expenseData.currency,
        datetime: expenseData.datetime,
        category: expenseData.category,
        platform: expenseData.platform,
        payment_method: expenseData.payment_method,
        type: expenseData.type,
        event: expenseData.event,
        notes: expenseData.notes,
        parsed_by_ai: false,
        raw_text: null,
      }

      console.log('Saving manual expense:', data)

      const { data: result, error } = await supabase
        .from('expenses')
        .insert([data])
        .select()

      if (error) {
        console.error('Supabase error:', error)
        alert(`Failed to save expense: ${error.message}`)
        return
      }

      console.log('Successfully saved manual expense:', result)
      await fetchExpenses()
      setManualDrawerOpen(false)
    } catch (error) {
      console.error('Unexpected error saving manual expense:', error)
      alert(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <Head>
        <title>Expense Tracker</title>
        <meta name="description" content="AI-powered expense tracking app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Header
            monthlyTotal={monthlyTotal}
            currency="₹"
            view={dashboardView}
            onViewChange={setDashboardView}
          />

          {dashboardView === 'analytics' ? (
            <AnalyticsDashboard expenses={expenses} isLoading={isLoadingExpenses} currency="₹" />
          ) : (
            <>
              <QuickAdd onParse={handleParse} isLoading={isParsing} />

              <ExpensesList expenses={expenses} isLoading={isLoadingExpenses} />
            </>
          )}
          
          <PreviewModal
            open={previewDrawerOpen}
            onOpenChange={setPreviewDrawerOpen}
            parsedExpense={parsedExpense}
            onSave={handleSave}
            isLoading={isSaving}
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
          
          <FloatingActionButton
            onClick={() => setManualDrawerOpen(true)}
          />
        </div>
      </main>
    </>
  )
}
