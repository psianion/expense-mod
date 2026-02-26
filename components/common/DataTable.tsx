"use client"

import * as React from "react"
import dayjs from "dayjs"
import { ArrowUpRight, ArrowDownRight, CalendarIcon, Filter, Receipt, SortAsc, SortDesc } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Expense } from "@/types"
import { formatPrice } from "@/lib/formatPrice"
import { cn } from "@/lib/utils"
import type { DateRange } from "react-day-picker"

type SortField = 'date' | 'amount' | 'category'
type SortOrder = 'asc' | 'desc'
type ExpenseFilter = 'ALL' | 'EXPENSE' | 'INFLOW'

interface DataTableProps {
  expenses: Expense[]
  isLoading: boolean
  currency: string
  // Filter props
  dateRange: DateRange
  expenseFilter: ExpenseFilter
  categoryFilter: string
  sortField: SortField
  sortOrder: SortOrder
  availableCategories: string[]
  // Filter handlers
  onDateRangeChange: (range: DateRange) => void
  onExpenseFilterChange: (filter: ExpenseFilter) => void
  onCategoryFilterChange: (category: string) => void
  onSortToggle: (field: SortField) => void
  onClearDateRange: () => void
}

export function DataTable({
  expenses,
  isLoading,
  currency,
  dateRange,
  expenseFilter,
  categoryFilter,
  sortField,
  sortOrder,
  availableCategories,
  onDateRangeChange,
  onExpenseFilterChange,
  onCategoryFilterChange,
  onSortToggle,
  onClearDateRange
}: DataTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
          <CardDescription>Your expense history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 py-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (expenses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
          <CardDescription>Your expense history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="rounded-full bg-muted p-3">
              <Receipt className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">No expenses yet</p>
              <p className="text-sm text-muted-foreground">Add your first expense to get started</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Expenses</CardTitle>
        <CardDescription>
          {expenses.length} expense{expenses.length !== 1 ? 's' : ''} found
        </CardDescription>

        {/* Filters and Sorting Controls */}
        <div className="flex flex-wrap items-center justify-end gap-2 p-4 bg-muted/30 rounded-lg">
          {/* Date Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full sm:w-[280px] justify-start text-left font-normal",
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
                onSelect={(range) => onDateRangeChange(range || { from: undefined, to: undefined })}
                numberOfMonths={1}
              />
              {dateRange.from && (
                <div className="p-3 border-t">
                  <Button variant="outline" size="sm" onClick={onClearDateRange}>
                    Clear
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Expense Type Filter */}
          <Select value={expenseFilter} onValueChange={onExpenseFilterChange}>
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
          <Select value={categoryFilter} onValueChange={onCategoryFilterChange}>
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

          <div className="flex flex-wrap items-center gap-2">
            {/* Sort Controls */}
            <Button
              variant={sortField === 'date' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onSortToggle('date')}
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
              onClick={() => onSortToggle('amount')}
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
              onClick={() => onSortToggle('category')}
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
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="font-medium">
                    {dayjs(expense.datetime).isValid()
                      ? dayjs(expense.datetime).format('MMM DD, YYYY HH:mm')
                      : expense.datetime}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={cn(expense.type === 'EXPENSE' ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400')}>
                        {expense.type === 'EXPENSE' ? (
                          <ArrowDownRight className="h-4 w-4 inline" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4 inline" />
                        )}
                      </span>
                      <span className="font-medium tabular-nums">
                        {formatPrice(expense.amount)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {expense.category ? (
                      <Badge variant="secondary">{expense.category}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {expense.platform || <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell>
                    {expense.payment_method || <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={expense.type === 'EXPENSE' ? 'destructive' : 'default'}>
                      {expense.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={expense.source === 'RECURRING' ? 'default' : 'secondary'}>
                      {expense.source}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {expense.tags && expense.tags.length > 0 ? expense.tags.join(', ') : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

