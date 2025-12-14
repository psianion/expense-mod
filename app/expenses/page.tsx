"use client"

import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { CalendarIcon, Filter, SortAsc, SortDesc } from 'lucide-react'

import { AppSidebar } from '@components/layout/AppSidebar'
import { SiteHeader } from '@components/layout/SiteHeader'
import { QuickAdd } from '@features/expenses/components/QuickAdd'
import { PreviewModal } from '@features/expenses/components/PreviewModal'
import { DataTable } from '@components/common/DataTable'
import { FloatingActionButton } from '@components/common/FloatingActionButton'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@server/db/supabase'
import { useExpenseProvider } from '@/app/expense-provider'
import {
  BillMatchCandidate,
  Expense,
  ExpenseSource,
  ExpenseType,
  ParsedExpense,
  ParseExpenseRequest,
  ParseExpenseResponse,
} from '@/types'
import { fromUTC, getLocalISO } from '@/lib/datetime'
import { cn } from '@/lib/utils'

type SortField = 'date' | 'amount' | 'category'
type SortOrder = 'asc' | 'desc'
type ExpenseFilter = 'ALL' | 'EXPENSE' | 'INFLOW'

import type { DateRange } from "react-day-picker"

export default function ExpensesPage() {
  const { openExpenseDrawer } = useExpenseProvider()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true)
  const [isParsing, setIsParsing] = useState(false)
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

  const handleParse = async (text: string) => {
    try {
      setIsParsing(true)
      setRawText(text)

      const response = await fetch('/api/ai/parse-expense', {
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
              {/* Filters and Sorting Controls */}
              <div className="flex flex-wrap items-center gap-2 p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <span className="text-sm font-medium">Filters:</span>
                </div>

                {/* Date Range Picker */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[280px] justify-start text-left font-normal",
                        !dateRange.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? (
                        dateRange.to ? (
                          <>
                            {dayjs(dateRange.from).format("LL")} -{" "}
                            {dayjs(dateRange.to).format("LL")}
                          </>
                        ) : (
                          dayjs(dateRange.from).format("LL")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange.from}
                      selected={dateRange}
                      onSelect={(range) => setDateRange(range || { from: undefined, to: undefined })}
                      numberOfMonths={2}
                    />
                    {dateRange.from && (
                      <div className="p-3 border-t">
                        <Button variant="outline" size="sm" onClick={clearDateRange}>
                          Clear
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>

                {/* Expense Type Filter */}
                <Select value={expenseFilter} onValueChange={(value: ExpenseFilter) => setExpenseFilter(value)}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Types</SelectItem>
                    <SelectItem value="EXPENSE">Expenses</SelectItem>
                    <SelectItem value="INFLOW">Income</SelectItem>
                  </SelectContent>
                </Select>

                {/* Category Filter */}
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Categories</SelectItem>
                    {availableCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2 ml-4">
                  <span className="text-sm font-medium">Sort:</span>

                  {/* Sort Controls */}
                  <Button
                    variant={sortField === 'date' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleSort('date')}
                    className="flex items-center gap-1"
                  >
                    Date
                    {sortField === 'date' && (
                      sortOrder === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
                    )}
                  </Button>

                  <Button
                    variant={sortField === 'amount' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleSort('amount')}
                    className="flex items-center gap-1"
                  >
                    Amount
                    {sortField === 'amount' && (
                      sortOrder === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
                    )}
                  </Button>

                  <Button
                    variant={sortField === 'category' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleSort('category')}
                    className="flex items-center gap-1"
                  >
                    Category
                    {sortField === 'category' && (
                      sortOrder === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
                    )}
                  </Button>
                </div>

                {/* Active Filters Display */}
                <div className="flex gap-1 ml-auto">
                  {expenseFilter !== 'ALL' && (
                    <Badge variant="secondary" className="text-xs">
                      {expenseFilter}
                    </Badge>
                  )}
                  {categoryFilter !== 'ALL' && (
                    <Badge variant="secondary" className="text-xs">
                      {categoryFilter}
                    </Badge>
                  )}
                  {(dateRange.from || dateRange.to) && (
                    <Badge variant="secondary" className="text-xs">
                      Date Range
                    </Badge>
                  )}
                </div>
              </div>

              <QuickAdd onParse={handleParse} isLoading={isParsing} />
              <DataTable expenses={filteredAndSortedExpenses} isLoading={isLoadingExpenses} currency="₹" />
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
