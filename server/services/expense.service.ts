import dayjs from 'dayjs'
import { expenseRepository } from '../db/repositories/expense.repo'
import { billRepository } from '../db/repositories/bill.repo'
import { CreateExpenseInput } from '../validators/expense.schema'
import { Bill, BillMatchCandidate, Expense } from '@types'
import { toUTC, getLocalISO } from '@lib/datetime'
import { billToExpenseType, findInstanceForPeriod } from '@lib/recurring'

export class ExpenseService {
  async createExpense(input: CreateExpenseInput): Promise<{ expense: Expense; matchedInstanceId: string | null }> {
    const { expense: expenseInput, billMatch: billHint, source, raw_text } = input

    const datetimeLocal = expenseInput.datetime || getLocalISO()
    const utcDateTime = toUTC(datetimeLocal)

    // Get all bills for matching
    const bills = await billRepository.getBills()
    const haystack = `${expenseInput.event || ''} ${expenseInput.notes || ''} ${raw_text || ''}`.toLowerCase()
    const matchedBill = this.findBestBill(bills, haystack, billHint)

    let matchedInstanceId: string | null = null
    if (matchedBill) {
      const instance = await findInstanceForPeriod(matchedBill, matchedBill.frequency, dayjs())
      if (instance) {
        matchedInstanceId = instance.id
      }
    }

    const expenseType = matchedBill ? billToExpenseType(matchedBill.type) : (expenseInput.type as 'EXPENSE' | 'INFLOW')

    const expenseData = {
      user_id: null,
      amount: expenseInput.amount,
      currency: expenseInput.currency || 'INR',
      datetime: utcDateTime,
      category: expenseInput.category ?? null,
      platform: expenseInput.platform ?? null,
      payment_method: expenseInput.payment_method ?? null,
      type: expenseType,
      event: expenseInput.event ?? matchedBill?.name ?? null,
      notes: expenseInput.notes ?? null,
      parsed_by_ai: source === 'AI',
      raw_text: raw_text ?? null,
      source,
      bill_instance_id: matchedInstanceId,
    }

    const expense = await expenseRepository.createExpense(expenseData)

    // Update bill instance if matched
    if (matchedInstanceId) {
      await this.updateBillInstanceStatus(matchedInstanceId, 'PAID', expense.id, expenseInput.amount)
    }

    return { expense, matchedInstanceId }
  }

  async getExpenses(): Promise<Expense[]> {
    return expenseRepository.getExpenses()
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
