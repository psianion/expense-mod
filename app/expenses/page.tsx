"use client"

import { Suspense, useState } from 'react'
import { AppLayoutClient } from '@components/layout/AppLayoutClient'
import { PreviewModal } from '@features/expenses/components/PreviewModal'
import { ExpensesDataTable } from '@features/expenses/components/ExpensesDataTable'
import { ImportModal } from '@features/import/components/ImportModal'
import { useCreateExpenseMutation } from '@/lib/query/hooks'
import { BillMatchCandidate, ExpenseSource, ExpenseType, ParsedExpense } from '@/types'
import { getLocalISO } from '@/lib/datetime'
import { Button } from '@components/ui/button'
import { Upload } from 'lucide-react'

export default function ExpensesPage() {
  const createExpenseMutation = useCreateExpenseMutation()
  const [previewDrawerOpen, setPreviewDrawerOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [parsedExpense, setParsedExpense] = useState<ParsedExpense | null>(null)
  const [billMatch, setBillMatch] = useState<BillMatchCandidate | null>(null)
  const [rawText, setRawText] = useState<string>('')

  const handleSave = async (expense: ParsedExpense) => {
    if (!expense.amount || expense.amount <= 0) {
      alert('Please enter a valid amount.')
      return
    }
    const payload = {
      expense: {
        amount: expense.amount,
        datetime: expense.datetime || getLocalISO(),
        type: (expense.type?.toUpperCase?.() as ExpenseType) || 'EXPENSE',
        category: expense.category || undefined,
        platform: expense.platform || undefined,
        payment_method: expense.payment_method || undefined,
        event: (expense as { event?: string }).event || undefined,
        notes: (expense as { notes?: string }).notes || undefined,
        tags: expense.tags || [],
      },
      source: 'AI' as ExpenseSource,
      billMatch,
      raw_text: rawText,
    }
    createExpenseMutation.mutate(payload, {
      onSuccess: () => {
        setPreviewDrawerOpen(false)
        setParsedExpense(null)
        setBillMatch(null)
        setRawText('')
      },
      onError: (error) => {
        console.error('Unexpected error saving expense:', error)
        alert(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      },
    })
  }

  return (
    <>
      <AppLayoutClient>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportOpen(true)}
              data-testid="import-statement-btn"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import Statement
            </Button>
          </div>
          <Suspense fallback={<div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mt-8" />}>
            <ExpensesDataTable currency="₹" />
          </Suspense>
        </div>
      </AppLayoutClient>

      <ImportModal open={importOpen} onOpenChange={setImportOpen} />

      <PreviewModal
        open={previewDrawerOpen}
        onOpenChange={setPreviewDrawerOpen}
        parsedExpense={parsedExpense}
        onSave={handleSave}
        isLoading={createExpenseMutation.isPending}
        billMatch={billMatch}
      />
    </>
  )
}
