import dayjs from 'dayjs'
import { expenseRepository, ExpenseFilters, RepoAuthContext } from '../db/repositories/expense.repo'
import { billRepository } from '../db/repositories/bill.repo'
import { CreateExpenseInput, UpdateExpenseInput } from '../validators/expense.schema'
import type { UserContext } from '../auth/context'
import { Bill, BillMatchCandidate, Expense } from '@/types'
import { toUTC, getLocalISO } from '@lib/datetime'
import { billToExpenseType, findInstanceForPeriod } from '@lib/recurring'
import { findCreditCardByPaymentMethod } from '@lib/userPreferences'
import { createServiceLogger } from '@/server/lib/logger'
import { AppError } from '@/server/lib/errors'
const log = createServiceLogger('ExpenseService')

function toRepoAuth(user: UserContext): RepoAuthContext {
  return { userId: user.userId, useMasterAccess: user.isMaster }
}

export class ExpenseService {
  async createExpense(input: CreateExpenseInput, user: UserContext): Promise<{ expense: Expense; matchedBillId: string | null; creditCardId: string | null }> {
    log.info({ method: 'createExpense', userId: user.userId }, 'Creating expense')
    log.debug({ method: 'createExpense', input }, 'Expense input')
    const { expense: expenseInput, billMatch: billHint, source, raw_text } = input
    const auth = toRepoAuth(user)

    const datetimeLocal = expenseInput.datetime || getLocalISO()
    const utcDateTime = toUTC(datetimeLocal)

    // Get all bills for matching (keeping for backward compatibility, will be simplified in Phase 2)
    const bills = await billRepository.getBills(undefined, auth)
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
      user_id: user.userId,
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

    const expense = await expenseRepository.createExpense(expenseData, auth)

    // For now, keep bill instance logic for backward compatibility
    // This will be simplified in Phase 2 when we remove bill instances
    if (matchedBillId) {
      // Find existing instance or create new one for backward compatibility
      const bill = await billRepository.getBillById(matchedBillId, auth)
      if (bill) {
        const instance = await findInstanceForPeriod(bill, bill.frequency, dayjs())
        if (instance) {
          await this.updateBillInstanceStatus(instance.id, 'PAID', expense.id, expenseInput.amount, auth)
        }
      }
    }

    log.info({ method: 'createExpense', expenseId: expense.id, matchedBillId }, 'Expense created')
    return { expense, matchedBillId, creditCardId: creditCardBillId }
  }

  async getExpenses(
    filters?: ExpenseFilters,
    user?: UserContext
  ): Promise<{ expenses: Expense[]; total: number }> {
    log.debug({ method: 'getExpenses', filters }, 'Fetching expenses')
    const auth = user ? toRepoAuth(user) : undefined
    return expenseRepository.getExpenses(filters, auth)
  }

  async getFacets(user: UserContext): Promise<{
    categories: string[]
    platforms: string[]
    payment_methods: string[]
  }> {
    const auth = toRepoAuth(user)
    return expenseRepository.getFacets(auth)
  }

  async updateExpense(id: string, updates: UpdateExpenseInput, user: UserContext): Promise<Expense> {
    log.info({ method: 'updateExpense', expenseId: id, userId: user.userId }, 'Updating expense')
    const auth = toRepoAuth(user)
    return expenseRepository.updateExpense(id, updates, auth)
  }

  async deleteExpense(id: string, user: UserContext): Promise<void> {
    log.info({ method: 'deleteExpense', expenseId: id, userId: user.userId }, 'Deleting expense')
    const auth = toRepoAuth(user)
    return expenseRepository.deleteExpense(id, auth)
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

  private async updateBillInstanceStatus(
    instanceId: string,
    status: 'PAID',
    expenseId: string,
    amount: number,
    auth?: RepoAuthContext
  ): Promise<void> {
    const { getServiceRoleClientIfAvailable, supabase } = await import('../db/supabase')
    const client = auth?.useMasterAccess ? (getServiceRoleClientIfAvailable() ?? supabase) : supabase
    const { error } = await client
      .from('bill_instances')
      .update({
        status,
        posted_expense_id: expenseId,
        amount,
      })
      .eq('id', instanceId)

    if (error) {
      throw new AppError('DB_ERROR', `Failed to update bill instance ${instanceId} status`, {
        instanceId,
        cause: error.message,
      })
    }
  }
}

export const expenseService = new ExpenseService()
