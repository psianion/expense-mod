"use client"

import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'

import { AppSidebar } from '@components/layout/AppSidebar'
import { SiteHeader } from '@components/layout/SiteHeader'
import { PreviewModal } from '@features/expenses/components/PreviewModal'
import { DataTable } from '@components/common/DataTable'
import { FloatingActionButton } from '@components/common/FloatingActionButton'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { supabase } from '@server/db/supabase'
import { useExpenseProvider } from '@/app/expense-provider'
import {
  BillMatchCandidate,
  Expense,
  ExpenseSource,
  ExpenseType,
  ParsedExpense,
} from '@/types'
import { fromUTC, getLocalISO } from '@/lib/datetime'

type SortField = 'date' | 'amount' | 'category'
type SortOrder = 'asc' | 'desc'
type ExpenseFilter = 'ALL' | 'EXPENSE' | 'INFLOW'

import type { DateRange } from "react-day-picker"

export default function ExpensesPage() {
  const { openExpenseDrawer } = useExpenseProvider()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [previewDrawerOpen, setPreviewDrawerOpen] = useState(false)
  const [parsedExpense, setParsedExpense] = useState<ParsedExpense | null>(null)
  const [billMatch, setBillMatch] = useState<BillMatchCandidate | null>(null)
  const [rawText, setRawText] = useState<string>('')

  // Filtering and sorting state
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined })
  const [expenseFilter, setExpenseFilter] = useState<ExpenseFilter>('ALL')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  // Available categories for filter dropdown
  const [availableCategories, setAvailableCategories] = useState<string[]>([])

  useEffect(() => {
    fetchExpenses()
  }, [])

  useEffect(() => {
    // Extract unique categories from expenses
    const categories = Array.from(new Set(expenses.map(e => e.category).filter((c): c is string => c !== null)))
    setAvailableCategories(categories)
  }, [expenses])

  const fetchExpenses = async () => {
    try {
      setIsLoadingExpenses(true)

      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: false })

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

  // Filtered and sorted expenses
  const filteredAndSortedExpenses = useMemo(() => {
    let filtered = expenses

    // Apply date range filter
    if (dateRange.from || dateRange.to) {
      filtered = filtered.filter(expense => {
        const expenseDate = dayjs(expense.datetime)
        const fromMatch = !dateRange.from || expenseDate.isAfter(dateRange.from) || expenseDate.isSame(dateRange.from, 'day')
        const toMatch = !dateRange.to || expenseDate.isBefore(dateRange.to) || expenseDate.isSame(dateRange.to, 'day')
        return fromMatch && toMatch
      })
    }

    // Apply expense type filter
    if (expenseFilter !== 'ALL') {
      filtered = filtered.filter(expense => expense.type === expenseFilter)
    }

    // Apply category filter
    if (categoryFilter !== 'ALL') {
      filtered = filtered.filter(expense => expense.category === categoryFilter)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortField) {
        case 'date':
          aValue = new Date(a.datetime).getTime()
          bValue = new Date(b.datetime).getTime()
          break
        case 'amount':
          aValue = a.amount
          bValue = b.amount
          break
        case 'category':
          aValue = a.category || ''
          bValue = b.category || ''
          break
        default:
          return 0
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return filtered
  }, [expenses, dateRange, expenseFilter, categoryFilter, sortField, sortOrder])


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

  const clearDateRange = () => {
    setDateRange({ from: undefined, to: undefined })
  }

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  return (
    <>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="@container/main flex flex-1 flex-col gap-4">

              <DataTable
                expenses={filteredAndSortedExpenses}
                isLoading={isLoadingExpenses}
                currency="₹"
                dateRange={dateRange}
                expenseFilter={expenseFilter}
                categoryFilter={categoryFilter}
                sortField={sortField}
                sortOrder={sortOrder}
                availableCategories={availableCategories}
                onDateRangeChange={setDateRange}
                onExpenseFilterChange={setExpenseFilter}
                onCategoryFilterChange={setCategoryFilter}
                onSortToggle={toggleSort}
                onClearDateRange={clearDateRange}
              />
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

      <FloatingActionButton onClick={openExpenseDrawer} />
    </>
  )
}
