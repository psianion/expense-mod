"use client"

import React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import dayjs from 'dayjs'
import {
  Search,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  X,
  CalendarIcon,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/formatPrice'
import { useExpensesQuery, useExpenseFacetsQuery } from '@/lib/query/hooks'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { DateRange } from 'react-day-picker'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SortBy = 'datetime' | 'amount' | 'category'
type SortOrder = 'asc' | 'desc'
type TypeFilter = 'EXPENSE' | 'INFLOW' | 'ALL'
type SourceFilter = 'MANUAL' | 'AI' | 'RECURRING' | 'ALL'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parsePage(raw: string | null): number {
  const n = parseInt(raw ?? '1', 10)
  return isNaN(n) || n < 1 ? 1 : n
}

function parseLimit(raw: string | null): 10 | 25 | 50 {
  const n = parseInt(raw ?? '25', 10)
  if (n === 10 || n === 50) return n
  return 25
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExpensesDataTable({ currency = '₹' }: { currency?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // ---- Read URL state ----
  const searchParam = searchParams.get('search') ?? ''
  const typeParam = (searchParams.get('type') ?? 'ALL') as TypeFilter
  const categoryParam = searchParams.get('category') ?? 'ALL'
  const platformParam = searchParams.get('platform') ?? 'ALL'
  const paymentMethodParam = searchParams.get('payment_method') ?? 'ALL'
  const sourceParam = (searchParams.get('source') ?? 'ALL') as SourceFilter
  const dateFrom = searchParams.get('date_from') ?? ''
  const dateTo = searchParams.get('date_to') ?? ''
  const sortBy = (searchParams.get('sort_by') ?? 'datetime') as SortBy
  const sortOrder = (searchParams.get('sort_order') ?? 'desc') as SortOrder
  const page = parsePage(searchParams.get('page'))
  const limit = parseLimit(searchParams.get('limit'))

  // ---- Local UI state ----
  const [searchInput, setSearchInput] = React.useState(searchParam)
  const [showAdvanced, setShowAdvanced] = React.useState(false)
  const [datePickerOpen, setDatePickerOpen] = React.useState(false)
  const searchDebounceRef = React.useRef<ReturnType<typeof setTimeout>>(undefined)

  // Keep local search input in sync if URL changes externally
  React.useEffect(() => {
    setSearchInput(searchParam)
  }, [searchParam])

  // ---- Param helpers ----
  const buildParams = React.useCallback(
    (overrides: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(overrides)) {
        if (value === undefined || value === '' || value === 'ALL') {
          next.delete(key)
        } else {
          next.set(key, value)
        }
      }
      return next
    },
    [searchParams]
  )

  const setParam = React.useCallback(
    (key: string, value: string | undefined, resetPage = true) => {
      const next = buildParams({
        [key]: value,
        ...(resetPage ? { page: undefined } : {}),
      })
      router.push(`?${next.toString()}`, { scroll: false })
    },
    [buildParams, router]
  )

  const setMultiParam = React.useCallback(
    (overrides: Record<string, string | undefined>, resetPage = true) => {
      const next = buildParams({
        ...overrides,
        ...(resetPage ? { page: undefined } : {}),
      })
      router.push(`?${next.toString()}`, { scroll: false })
    },
    [buildParams, router]
  )

  // ---- Search debounce ----
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSearchInput(val)
    clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      setParam('search', val || undefined)
    }, 300)
  }

  // ---- Sort toggle ----
  const handleSortToggle = (col: SortBy) => {
    if (sortBy === col) {
      setMultiParam({ sort_by: col, sort_order: sortOrder === 'asc' ? 'desc' : 'asc' }, false)
    } else {
      setMultiParam({ sort_by: col, sort_order: 'desc' }, false)
    }
  }

  // ---- Date range ----
  const dateFromObj = dateFrom ? new Date(dateFrom) : undefined
  const dateToObj = dateTo ? new Date(dateTo) : undefined

  const handleDateSelect = (range: DateRange | undefined) => {
    setMultiParam({
      date_from: range?.from ? dayjs(range.from).format('YYYY-MM-DD') : undefined,
      date_to: range?.to ? dayjs(range.to).format('YYYY-MM-DD') : undefined,
    })
  }

  // ---- Build filters for query ----
  const filters = React.useMemo(
    () => ({
      ...(searchParam ? { search: searchParam } : {}),
      ...(typeParam !== 'ALL' ? { type: typeParam as 'EXPENSE' | 'INFLOW' } : {}),
      ...(categoryParam !== 'ALL' ? { category: categoryParam } : {}),
      ...(platformParam !== 'ALL' ? { platform: platformParam } : {}),
      ...(paymentMethodParam !== 'ALL' ? { payment_method: paymentMethodParam } : {}),
      ...(sourceParam !== 'ALL' ? { source: sourceParam as 'MANUAL' | 'AI' | 'RECURRING' } : {}),
      ...(dateFrom ? { date_from: dateFrom } : {}),
      ...(dateTo ? { date_to: dateTo } : {}),
      sort_by: sortBy,
      sort_order: sortOrder,
      page,
      limit,
    }),
    [searchParam, typeParam, categoryParam, platformParam, paymentMethodParam, sourceParam, dateFrom, dateTo, sortBy, sortOrder, page, limit]
  )

  const { data, isLoading, isFetching, isPlaceholderData } = useExpensesQuery(filters)
  const { data: facets } = useExpenseFacetsQuery()

  const expenses = data?.expenses ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / limit))

  // ---- Active filter state ----
  const hasBasicFilters = [
    searchParam !== '',
    typeParam !== 'ALL',
    categoryParam !== 'ALL',
    dateFrom !== '',
    dateTo !== '',
  ].some(Boolean)

  const advancedActiveCount = [
    platformParam !== 'ALL',
    paymentMethodParam !== 'ALL',
    sourceParam !== 'ALL',
  ].filter(Boolean).length

  const hasAnyFilters = hasBasicFilters || advancedActiveCount > 0

  // ---- Clear all filters ----
  const clearAllFilters = () => {
    setSearchInput('')
    router.push('?', { scroll: false })
  }

  // ---- Active chip list ----
  type Chip = { key: string; label: string; paramKey: string; paramValue?: string }
  const activeChips: Chip[] = []
  if (searchParam) activeChips.push({ key: 'search', label: `"${searchParam}"`, paramKey: 'search' })
  if (typeParam !== 'ALL') activeChips.push({ key: 'type', label: `Type: ${typeParam}`, paramKey: 'type' })
  if (categoryParam !== 'ALL') activeChips.push({ key: 'category', label: `Category: ${categoryParam}`, paramKey: 'category' })
  if (platformParam !== 'ALL') activeChips.push({ key: 'platform', label: `Platform: ${platformParam}`, paramKey: 'platform' })
  if (paymentMethodParam !== 'ALL') activeChips.push({ key: 'payment_method', label: `Payment: ${paymentMethodParam}`, paramKey: 'payment_method' })
  if (sourceParam !== 'ALL') activeChips.push({ key: 'source', label: `Source: ${sourceParam}`, paramKey: 'source' })
  if (dateFrom) activeChips.push({ key: 'date_from', label: `From: ${dayjs(dateFrom).format('MMM D, YYYY')}`, paramKey: 'date_from' })
  if (dateTo) activeChips.push({ key: 'date_to', label: `To: ${dayjs(dateTo).format('MMM D, YYYY')}`, paramKey: 'date_to' })

  const removeChip = (chip: Chip) => {
    if (chip.paramKey === 'search') setSearchInput('')
    setParam(chip.paramKey, undefined)
  }

  // ---- Totals for header description ----
  const totalAmount = expenses.reduce((acc, e) => acc + e.amount, 0)

  // ---- Pagination ----
  const pageNumbers = React.useMemo(() => {
    const pages: (number | 'ellipsis')[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (page > 3) pages.push('ellipsis')
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i)
      }
      if (page < totalPages - 2) pages.push('ellipsis')
      pages.push(totalPages)
    }
    return pages
  }, [page, totalPages])

  // ---- Sort icon helper ----
  const SortIcon = ({ col }: { col: SortBy }) => {
    if (sortBy !== col) return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground" />
    return sortOrder === 'asc'
      ? <ArrowUp className="ml-1 h-3.5 w-3.5" />
      : <ArrowDown className="ml-1 h-3.5 w-3.5" />
  }

  // ---- Row animation key (triggers exit+enter on filter change) ----
  const tbodyKey = `${page}-${searchParam}-${typeParam}-${categoryParam}`

  return (
    <Card>
      {/* ---------------------------------------------------------------- */}
      {/* CardHeader                                                        */}
      {/* ---------------------------------------------------------------- */}
      <CardHeader className="space-y-4 pb-4">
        {/* Title row */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Expenses</h2>
            <div className="text-sm text-muted-foreground mt-0.5">
              {isLoading ? (
                <Skeleton className="h-4 w-40 mt-1" />
              ) : isFetching && !isLoading ? (
                'Updating...'
              ) : (
                <>
                  {total} {total === 1 ? 'record' : 'records'}
                  {expenses.length > 0 && (
                    <> &mdash; total {currency}{formatPrice(totalAmount)}</>
                  )}
                </>
              )}
            </div>
          </div>
          {hasAnyFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="mr-1.5 h-3.5 w-3.5" />
              Clear all
            </Button>
          )}
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              className="h-9 pl-8"
              placeholder="Search expenses..."
              value={searchInput}
              onChange={handleSearchChange}
            />
          </div>

          {/* Date range popover */}
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'h-9 gap-1.5',
                  (dateFrom || dateTo) && 'border-primary text-primary'
                )}
              >
                <CalendarIcon className="h-4 w-4" />
                {dateFrom || dateTo
                  ? [
                      dateFrom ? dayjs(dateFrom).format('MMM D') : '...',
                      dateTo ? dayjs(dateTo).format('MMM D') : '...',
                    ].join(' – ')
                  : 'Date range'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={
                  dateFromObj || dateToObj
                    ? { from: dateFromObj, to: dateToObj }
                    : undefined
                }
                onSelect={(range) => handleDateSelect(range as DateRange | undefined)}
                numberOfMonths={1}
              />
              {(dateFrom || dateTo) && (
                <div className="border-t p-2 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setMultiParam({ date_from: undefined, date_to: undefined })
                      setDatePickerOpen(false)
                    }}
                  >
                    Clear dates
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Type select */}
          <Select value={typeParam} onValueChange={(v) => setParam('type', v)}>
            <SelectTrigger className="h-9 w-[120px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All types</SelectItem>
              <SelectItem value="EXPENSE">Expense</SelectItem>
              <SelectItem value="INFLOW">Inflow</SelectItem>
            </SelectContent>
          </Select>

          {/* Category select */}
          <Select value={categoryParam} onValueChange={(v) => setParam('category', v)}>
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All categories</SelectItem>
              {(facets?.categories ?? []).map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Advanced filters button */}
          <Button
            variant={advancedActiveCount > 0 ? 'default' : 'outline'}
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => setShowAdvanced((v) => !v)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {advancedActiveCount > 0 && (
              <span className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary-foreground text-primary text-[10px] font-bold">
                {advancedActiveCount}
              </span>
            )}
            {showAdvanced
              ? <ChevronUp className="h-3.5 w-3.5" />
              : <ChevronDown className="h-3.5 w-3.5" />
            }
          </Button>
        </div>

        {/* Advanced panel */}
        <AnimatePresence initial={false}>
          {showAdvanced && (
            <motion.div
              key="advanced-panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {/* Platform */}
                <Select value={platformParam} onValueChange={(v) => setParam('platform', v)}>
                  <SelectTrigger className="h-9 w-[140px]">
                    <SelectValue placeholder="Platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All platforms</SelectItem>
                    {(facets?.platforms ?? []).map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Payment method */}
                <Select value={paymentMethodParam} onValueChange={(v) => setParam('payment_method', v)}>
                  <SelectTrigger className="h-9 w-[160px]">
                    <SelectValue placeholder="Payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All methods</SelectItem>
                    {(facets?.payment_methods ?? []).map((pm) => (
                      <SelectItem key={pm} value={pm}>{pm}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Source */}
                <Select value={sourceParam} onValueChange={(v) => setParam('source', v)}>
                  <SelectTrigger className="h-9 w-[130px]">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All sources</SelectItem>
                    <SelectItem value="MANUAL">Manual</SelectItem>
                    <SelectItem value="AI">AI</SelectItem>
                    <SelectItem value="RECURRING">Recurring</SelectItem>
                  </SelectContent>
                </Select>

                {/* Sort buttons */}
                <div className="ml-auto flex items-center gap-1">
                  <span className="text-xs text-muted-foreground mr-1">Sort:</span>
                  {(['datetime', 'amount', 'category'] as SortBy[]).map((col) => (
                    <Button
                      key={col}
                      variant={sortBy === col ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-8 capitalize"
                      onClick={() => handleSortToggle(col)}
                    >
                      {col === 'datetime' ? 'Date' : col.charAt(0).toUpperCase() + col.slice(1)}
                      <SortIcon col={col} />
                    </Button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active filter chips */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <AnimatePresence>
              {activeChips.map((chip) => (
                <motion.div
                  key={chip.key}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.1 }}
                >
                  <Badge
                    variant="secondary"
                    className="cursor-pointer gap-1 pr-1 hover:bg-secondary/80"
                    onClick={() => removeChip(chip)}
                  >
                    {chip.label}
                    <X className="h-3 w-3" />
                  </Badge>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardHeader>

      {/* ---------------------------------------------------------------- */}
      {/* CardContent — Table                                               */}
      {/* ---------------------------------------------------------------- */}
      <CardContent className="p-0 pb-4">
        <div className="overflow-x-auto rounded-md border mx-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8 font-medium text-muted-foreground hover:text-foreground"
                    onClick={() => handleSortToggle('datetime')}
                  >
                    Date
                    <SortIcon col="datetime" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8 font-medium text-muted-foreground hover:text-foreground"
                    onClick={() => handleSortToggle('amount')}
                  >
                    Amount
                    <SortIcon col="amount" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8 font-medium text-muted-foreground hover:text-foreground"
                    onClick={() => handleSortToggle('category')}
                  >
                    Category
                    <SortIcon col="category" />
                  </Button>
                </TableHead>
                <TableHead className="text-muted-foreground font-medium">Platform</TableHead>
                <TableHead className="text-muted-foreground font-medium">Payment</TableHead>
                <TableHead className="text-muted-foreground font-medium">Type</TableHead>
                <TableHead className="text-muted-foreground font-medium">Source</TableHead>
                <TableHead className="text-muted-foreground font-medium">Tags</TableHead>
              </TableRow>
            </TableHeader>

            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.tbody
                  key="skeleton"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.08 }}
                  className="[&_tr:last-child]:border-0"
                >
                  {Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </motion.tbody>
              ) : expenses.length === 0 ? (
                <motion.tbody
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.08 }}
                  className="[&_tr:last-child]:border-0"
                >
                  <TableRow>
                    <TableCell colSpan={8} className="p-8 text-center text-muted-foreground">
                      {hasAnyFilters
                        ? 'No expenses match the current filters.'
                        : 'No expenses yet. Add your first expense to get started.'}
                    </TableCell>
                  </TableRow>
                </motion.tbody>
              ) : (
                <motion.tbody
                  key={tbodyKey}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isPlaceholderData ? 0.6 : 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.08 }}
                  className="[&_tr:last-child]:border-0"
                >
                  {expenses.map((expense, idx) => (
                    <motion.tr
                      key={expense.id}
                      className="border-b transition-colors hover:bg-muted/50"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{
                        duration: 0.12,
                        delay: idx * 0.015,
                      }}
                    >
                      {/* Date */}
                      <TableCell className="whitespace-nowrap">
                        <div className="text-sm font-medium text-foreground">
                          {dayjs(expense.datetime).format('MMM D, YYYY')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {dayjs(expense.datetime).format('HH:mm')}
                        </div>
                      </TableCell>

                      {/* Amount */}
                      <TableCell className="whitespace-nowrap">
                        <div className={cn(
                          'flex items-center gap-1 font-medium tabular-nums',
                          expense.type === 'EXPENSE'
                            ? 'text-destructive'
                            : 'text-emerald-600 dark:text-emerald-400'
                        )}>
                          {expense.type === 'EXPENSE'
                            ? <ArrowDownRight className="h-3.5 w-3.5 shrink-0" />
                            : <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
                          }
                          {currency}{formatPrice(expense.amount)}
                        </div>
                      </TableCell>

                      {/* Category */}
                      <TableCell>
                        {expense.category
                          ? <Badge variant="secondary">{expense.category}</Badge>
                          : <span className="text-muted-foreground">&mdash;</span>
                        }
                      </TableCell>

                      {/* Platform */}
                      <TableCell>
                        {expense.platform
                          ? <span className="text-sm">{expense.platform}</span>
                          : <span className="text-muted-foreground">&mdash;</span>
                        }
                      </TableCell>

                      {/* Payment method */}
                      <TableCell>
                        {expense.payment_method
                          ? <span className="text-sm">{expense.payment_method}</span>
                          : <span className="text-muted-foreground">&mdash;</span>
                        }
                      </TableCell>

                      {/* Type */}
                      <TableCell>
                        <Badge
                          variant={expense.type === 'EXPENSE' ? 'destructive' : 'default'}
                        >
                          {expense.type === 'EXPENSE' ? 'Expense' : 'Inflow'}
                        </Badge>
                      </TableCell>

                      {/* Source */}
                      <TableCell>
                        <Badge variant="outline">
                          {expense.source.charAt(0) + expense.source.slice(1).toLowerCase()}
                        </Badge>
                      </TableCell>

                      {/* Tags */}
                      <TableCell>
                        {expense.tags && expense.tags.length > 0 ? (
                          <span
                            className="inline-block max-w-[160px] truncate text-sm text-muted-foreground"
                            title={expense.tags.join(', ')}
                          >
                            {expense.tags.join(', ')}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">&mdash;</span>
                        )}
                      </TableCell>
                    </motion.tr>
                  ))}
                </motion.tbody>
              )}
            </AnimatePresence>
          </Table>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Pagination controls                                              */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 pt-4">
          {/* Rows per page */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Rows per page</span>
            <Select
              value={String(limit)}
              onValueChange={(v) =>
                setMultiParam({ limit: v, page: '1' }, false)
              }
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Page buttons */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setParam('page', String(page - 1), false)}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous page</span>
            </Button>

            {pageNumbers.map((p, i) =>
              p === 'ellipsis' ? (
                <span
                  key={`ellipsis-${i}`}
                  className="flex h-8 w-8 items-center justify-center text-sm text-muted-foreground"
                >
                  &hellip;
                </span>
              ) : (
                <Button
                  key={p}
                  variant={p === page ? 'default' : 'outline'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setParam('page', String(p), false)}
                >
                  {p}
                </Button>
              )
            )}

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => setParam('page', String(page + 1), false)}
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next page</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
