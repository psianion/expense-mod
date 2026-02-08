"use client"

import { useState } from 'react'
import { Card, CardContent } from '@components/ui/card'
import { Button } from '@components/ui/button'
import { Calendar } from '@components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@components/ui/popover'
import { Label } from '@components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select'
import { cn } from '@lib/utils'
import { Calendar as CalendarIcon, X, Download, Filter, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import { useAnalyticsFilters } from '@features/analytics/hooks/useAnalyticsFilters'
import { exportToCSV } from '@features/analytics/utils/export'
import type { Expense } from '@/types'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@components/ui/dropdown-menu'
import { useIsMobile } from '@hooks/use-mobile'

interface FiltersPanelProps {
  expenses: Expense[]
  availableCategories: string[]
  availablePlatforms: string[]
  availablePaymentMethods: string[]
  className?: string
}

export function FiltersPanel({
  expenses,
  availableCategories,
  availablePlatforms,
  availablePaymentMethods,
  className,
}: FiltersPanelProps) {
  const { filters, updateFilters, clearFilters, applyDatePreset, presets, hasActiveFilters } =
    useAnalyticsFilters()
  const isMobile = useIsMobile()
  const [showFilters, setShowFilters] = useState(!isMobile)
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: filters.dateRange ? new Date(filters.dateRange.start) : undefined,
    to: filters.dateRange ? new Date(filters.dateRange.end) : undefined,
  })

  const handleDateRangeApply = () => {
    if (dateRange.from && dateRange.to) {
      updateFilters({
        dateRange: {
          start: dateRange.from.toISOString(),
          end: dateRange.to.toISOString(),
        },
      })
    }
  }

  const handleExportCSV = async () => {
    try {
      await exportToCSV(expenses)
      toast.success('Exported to CSV successfully')
    } catch (error) {
      toast.error('Failed to export CSV')
      console.error(error)
    }
  }

  return (
    <Card className={cn('sticky top-4 z-10', className)}>
      <CardContent className="p-4">
        {/* Header with Toggle and Export */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden"
            >
              <Filter className="mr-2 h-4 w-4" />
              {showFilters ? 'Hide' : 'Show'} Filters
            </Button>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Clear All
              </Button>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCSV}>
                Export to CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Filters Grid */}
        {showFilters && (
          <div className="grid gap-4 @container sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {/* Date Range Picker */}
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !dateRange.from && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd')}
                        </>
                      ) : (
                        format(dateRange.from, 'PPP')
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="border-b p-2">
                    <div className="grid grid-cols-2 gap-1">
                      {presets.map((preset) => (
                        <Button
                          key={preset.label}
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            applyDatePreset(preset)
                            const { start, end } = preset.getValue()
                            setDateRange({ from: start, to: end })
                          }}
                          className="justify-start text-xs"
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <Calendar
                    mode="range"
                    selected={dateRange.from && dateRange.to ? { from: dateRange.from, to: dateRange.to } : undefined}
                    onSelect={(range) => {
                      if (range) {
                        setDateRange({ from: range.from, to: range.to })
                      } else {
                        setDateRange({ from: undefined, to: undefined })
                      }
                    }}
                    numberOfMonths={2}
                    defaultMonth={dateRange.from}
                  />
                  <div className="border-t p-2">
                    <Button size="sm" className="w-full" onClick={handleDateRangeApply}>
                      Apply
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Period */}
            <div className="space-y-2">
              <Label>Period</Label>
              <Select
                value={filters.period}
                onValueChange={(value) =>
                  updateFilters({ period: value as 'DAILY' | 'WEEKLY' | 'MONTHLY' })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Type Filter */}
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={filters.type || 'ALL'}
                onValueChange={(value) =>
                  updateFilters({ type: value as 'EXPENSE' | 'INFLOW' | 'ALL' })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="EXPENSE">Expenses</SelectItem>
                  <SelectItem value="INFLOW">Inflows</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category Filter */}
            <div className="space-y-2">
              <Label>Categories</Label>
              <Select
                value={filters.categories?.[0] || 'all'}
                onValueChange={(value) =>
                  updateFilters({
                    categories: value === 'all' ? [] : [value],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {availableCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Platform Filter */}
            <div className="space-y-2">
              <Label>Platforms</Label>
              <Select
                value={filters.platforms?.[0] || 'all'}
                onValueChange={(value) =>
                  updateFilters({
                    platforms: value === 'all' ? [] : [value],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All platforms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  {availablePlatforms.map((platform) => (
                    <SelectItem key={platform} value={platform}>
                      {platform}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
