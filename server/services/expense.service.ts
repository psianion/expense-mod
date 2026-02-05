import dayjs from 'dayjs'
import { expenseRepository, ExpenseFilters } from '../db/repositories/expense.repo'
import { billRepository } from '../db/repositories/bill.repo'
import { CreateExpenseInput } from '../validators/expense.schema'
import { Bill, BillMatchCandidate, Expense } from '@/types'
import { toUTC, getLocalISO } from '@lib/datetime'
import { billToExpenseType, findInstanceForPeriod } from '@lib/recurring'
import { findCreditCardByPaymentMethod } from '@lib/userPreferences'

export class ExpenseService {
  async createExpense(input: CreateExpenseInput): Promise<{ expense: Expense; matchedBillId: string | null; creditCardId: string | null }> {
    const { expense: expenseInput, billMatch: billHint, source, raw_text } = input

    const datetimeLocal = expenseInput.datetime || getLocalISO()
    const utcDateTime = toUTC(datetimeLocal)

    // Get all bills for matching (keeping for backward compatibility, will be simplified in Phase 2)
    const bills = await billRepository.getBills()
    const haystack = `${expenseInput.tags?.join(' ') || ''} ${raw_text || ''}`.toLowerCase()
    const matchedBill = this.findBestBill(bills, haystack, billHint)

    let matchedBillId: string | null = null
    if (matchedBill) {
      matchedBillId = matchedBill.id
    }

    const expenseType = matchedBill ? billToExpenseType(matchedBill.type) : (expenseInput.type as 'EXPENSE' | 'INFLOW')

    // Phase 2: Credit card attribution
    // Check if payment method matches any credit card in user preferences
    const creditCard = expenseInput.payment_method ? findCreditCardByPaymentMethod(expenseInput.payment_method) : null
    const creditCardBillId = creditCard ? creditCard.id : null

    // Use credit card bill_id if found, otherwise use matched bill_id from AI parsing
    const finalBillId = creditCardBillId || matchedBillId

    const expenseData = {
      user_id: null,
      amount: expenseInput.amount,
      datetime: utcDateTime,
      category: expenseInput.category || 'Other',
      platform: expenseInput.platform || 'Other',
      payment_method: expenseInput.payment_method || 'Other',
      type: expenseType,
      tags: expenseInput.tags || [],
      parsed_by_ai: source === 'AI',
      raw_text: raw_text ?? null,
      source,
      bill_id: finalBillId, // Phase 2: Links to credit card if payment method matches
    }

    const expense = await expenseRepository.createExpense(expenseData)

    // For now, keep bill instance logic for backward compatibility
    // This will be simplified in Phase 2 when we remove bill instances
    if (matchedBillId) {
      // Find existing instance or create new one for backward compatibility
      const bill = await billRepository.getBillById(matchedBillId)
      if (bill) {
        const instance = await findInstanceForPeriod(bill, bill.frequency, dayjs())
        if (instance) {
          await this.updateBillInstanceStatus(instance.id, 'PAID', expense.id, expenseInput.amount)
        }
      }
    }

    return { expense, matchedBillId, creditCardId: creditCardBillId }
  }

  async getExpenses(filters?: ExpenseFilters): Promise<Expense[]> {
    return expenseRepository.getExpenses(filters)
  }

  private findBestBill(bills: Bill[], haystack: string, hint?: BillMatchCandidate | null): Bill | null {
    if (hint?.bill_id) {
      const byId = bills.find((bill) => bill.id === hint.bill_id)
      if (byId) return byId
    }

    if (hint?.bill_name) {
      const byName = bills.find((bill) => bill.name.toLowerCase() === hint.bill_name?.toLowerCase())
      if (byName) return byName
    }

    let best: { bill: Bill; score: number } | null = null
    for (const bill of bills) {
      const score = this.computeBillMatchScore(bill, haystack)
      if (!best || score > best.score) {
        best = { bill, score }
      }
    }

    if (!best || best.score < 2) return null
    return best.bill
  }

  private computeBillMatchScore(bill: Bill, haystack: string): number {
    const name = bill.name?.toLowerCase?.() || ''
    const billType = bill.type?.toString?.().toUpperCase()
    let score = 0
    if (name && haystack.includes(name)) score += 3

    const keywordBuckets: Record<string, string[]> = {
      rent: ['rent', 'rental', 'house', 'flat', 'apartment'],
      electricity: ['electricity', 'power', 'eb bill'],
      wifi: ['wifi', 'internet', 'broadband'],
      salary: ['salary', 'payroll', 'pay cheque', 'paycheck', 'paycheque'],
      emi: ['emi', 'loan', 'installment', 'instalment'],
      card: ['card', 'credit card'],
      maid: ['maid', 'househelp', 'house help', 'helper'],
    }

    const bucketKeys = Object.keys(keywordBuckets)
    for (const key of bucketKeys) {
      const keywords = keywordBuckets[key]
      if (keywords.some((kw) => name.includes(kw) || haystack.includes(kw))) {
        score += 2
      }
    }

    if (billType === 'SALARY' && haystack.includes('salary')) score += 2
    if (billType === 'INCOME' && haystack.includes('income')) score += 1
    return score
  }

  private async updateBillInstanceStatus(instanceId: string, status: 'PAID', expenseId: string, amount: number): Promise<void> {
    // This would need to be implemented in the bill repository
    // For now, we'll use direct supabase call since bill instances aren't fully extracted yet
    const { supabase } = await import('../db/supabase')
    await supabase
      .from('bill_instances')
      .update({
        status,
        posted_expense_id: expenseId,
        amount,
      })
      .eq('id', instanceId)
  }
}

export const expenseService = new ExpenseService()
