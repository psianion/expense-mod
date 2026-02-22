"use client"

import { useState } from 'react'
import { QuickAdd } from '@features/expenses/components/QuickAdd'
import { PreviewModal } from '@features/expenses/components/PreviewModal'
import { ExpensesPreviewCard } from '@/components/common/ExpensesPreviewCard'
import { BillsPreviewCard } from '@/components/common/BillsPreviewCard'
import { AnalyticsPreviewCard } from '@/components/common/AnalyticsPreviewCard'
import { aiApi } from '@/lib/api'
import { BillMatchCandidate, ExpenseSource, ExpenseType, ParsedExpense } from '@/types'
import { getLocalISO } from '@/lib/datetime'
import { useCreateExpenseMutation } from '@/lib/query/hooks'
import { StaggerContainer, StaggerItem } from '@/components/animations'

export default function Page() {
  const [isParsing, setIsParsing] = useState(false)
  const [previewDrawerOpen, setPreviewDrawerOpen] = useState(false)
  const [parsedExpense, setParsedExpense] = useState<ParsedExpense | null>(null)
  const [billMatch, setBillMatch] = useState<BillMatchCandidate | null>(null)
  const [rawText, setRawText] = useState<string>('')

  const createExpenseMutation = useCreateExpenseMutation()

  const handleParse = async (text: string) => {
    try {
      setIsParsing(true)
      setRawText(text)

      const data = await aiApi.parseExpense({ text })
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
      if (!expense.amount || expense.amount <= 0) {
        alert('Please enter a valid amount.')
        return
      }

      const localDateTime = expense.datetime || getLocalISO()
      const payload = {
        expense: {
          amount: expense.amount,
          datetime: localDateTime,
          type: (expense.type?.toUpperCase?.() as ExpenseType) || 'EXPENSE',
          category: expense.category || undefined,
          platform: expense.platform || undefined,
          payment_method: expense.payment_method || undefined,
          tags: expense.tags || [],
        },
        source: 'AI' as ExpenseSource,
        billMatch: billMatch,
        raw_text: rawText,
      }

      await createExpenseMutation.mutateAsync(payload)

      // Reset form and close modal
      setPreviewDrawerOpen(false)
      setParsedExpense(null)
      setBillMatch(null)
      setRawText('')
    } catch (error) {
      console.error('Unexpected error saving expense:', error)
      alert(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <>
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Quick Add Section */}
        <div className="max-w-2xl mx-auto">
          <QuickAdd onParse={handleParse} isLoading={isParsing} />
        </div>

        {/* Preview Cards Grid */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StaggerItem>
            <ExpensesPreviewCard />
          </StaggerItem>
          <StaggerItem>
            <BillsPreviewCard />
          </StaggerItem>
          <StaggerItem>
            <AnalyticsPreviewCard />
          </StaggerItem>
        </StaggerContainer>
      </div>

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
