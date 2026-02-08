import Papa from 'papaparse'
import type { Expense } from '@/types'
import { format } from 'date-fns'

/**
 * Export expenses data to CSV format
 */
export async function exportToCSV(
  expenses: Expense[],
  filename?: string
): Promise<void> {
  // Format data for CSV
  const csvData = expenses.map((expense) => ({
    Date: format(new Date(expense.datetime), 'yyyy-MM-dd HH:mm:ss'),
    Amount: expense.amount,
    Type: expense.type,
    Category: expense.category || 'Uncategorized',
    Platform: expense.platform || 'Unknown',
    PaymentMethod: expense.payment_method || 'Unknown',
    Source: expense.source,
    Tags: expense.tags?.join('; ') || '',
    BillId: expense.bill_id || '',
  }))

  // Convert to CSV string
  const csv = Papa.unparse(csvData)

  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute(
    'download',
    filename || `expenses_export_${format(new Date(), 'yyyy-MM-dd')}.csv`
  )
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

/**
 * Export summary statistics to CSV
 */
export async function exportSummaryToCSV(
  summary: {
    label: string
    value: string | number
  }[],
  filename?: string
): Promise<void> {
  const csv = Papa.unparse(summary)

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute(
    'download',
    filename || `analytics_summary_${format(new Date(), 'yyyy-MM-dd')}.csv`
  )
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

/**
 * Export category breakdown to CSV
 */
export async function exportCategoryBreakdownToCSV(
  categoryData: { name: string; value: number }[],
  filename?: string
): Promise<void> {
  const total = categoryData.reduce((sum, cat) => sum + cat.value, 0)

  const csvData = categoryData.map((cat) => ({
    Category: cat.name,
    Amount: cat.value.toFixed(2),
    Percentage: ((cat.value / total) * 100).toFixed(2) + '%',
  }))

  const csv = Papa.unparse(csvData)

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute(
    'download',
    filename || `category_breakdown_${format(new Date(), 'yyyy-MM-dd')}.csv`
  )
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}
