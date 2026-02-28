import dayjs from 'dayjs'
import { billRepository } from '../db/repositories/bill.repo'
import type { RepoAuthContext } from '../db/repositories/expense.repo'
import { CreateBillInput, UpdateBillInput } from '../validators/bill.schema'
import type { UserContext } from '../auth/context'
import { Bill, BillType } from '@/types'
import { ensureInstanceForCurrentPeriod } from '@lib/recurring'
import { createServiceLogger } from '@/server/lib/logger'
const log = createServiceLogger('BillService')

function toRepoAuth(user: UserContext): RepoAuthContext {
  return { userId: user.userId, useMasterAccess: user.isMaster }
}

export class BillService {
  async getBills(typeFilter?: BillType[], user?: UserContext): Promise<Bill[]> {
    log.debug({ method: 'getBills', typeFilter }, 'Fetching bills')
    const auth = user ? toRepoAuth(user) : undefined
    return billRepository.getBills(typeFilter, auth)
  }

  async createBill(input: CreateBillInput, user: UserContext): Promise<Bill> {
    log.info({ method: 'createBill', userId: user.userId }, 'Creating bill')
    log.debug({ method: 'createBill', input }, 'Bill input')
    const auth = toRepoAuth(user)
    const billData = {
      name: input.name,
      type: input.type,
      frequency: input.frequency,
      day_of_month: input.day_of_month ?? null,
      day_of_week: input.day_of_week ?? null,
      start_date: input.start_date || null,
      end_date: input.end_date || null,
      amount: input.amount ?? null,
      auto_post: input.auto_post,
      notes: input.notes ?? null,
    }

    const bill = await billRepository.createBill(billData, auth)
    log.info({ method: 'createBill', billId: bill.id }, 'Bill created')
    return bill
  }

  async updateBill(input: UpdateBillInput, user: UserContext): Promise<Bill> {
    const { id, ...updates } = input
    if (!id) {
      throw new Error('Bill id is required for update')
    }
    log.info({ method: 'updateBill', billId: id, userId: user.userId }, 'Updating bill')
    const auth = toRepoAuth(user)
    return billRepository.updateBill({ id, ...updates }, auth)
  }

  async deleteBill(id: string, user: UserContext): Promise<{ id: string }> {
    log.info({ method: 'deleteBill', billId: id, userId: user.userId }, 'Deleting bill')
    const auth = toRepoAuth(user)
    await billRepository.deleteBill(id, auth)
    return { id }
  }

  async getBillById(id: string, user?: UserContext): Promise<Bill | null> {
    log.debug({ method: 'getBillById', billId: id }, 'Fetching bill by id')
    const auth = user ? toRepoAuth(user) : undefined
    return billRepository.getBillById(id, auth)
  }

  async processBillInstances(user?: UserContext): Promise<any[]> {
    log.info({ method: 'processBillInstances' }, 'Processing bill instances')
    const auth = user ? toRepoAuth(user) : undefined
    const bills = await billRepository.getBills(undefined, auth)
    const now = dayjs()
    const results: any[] = []

    for (const bill of bills) {
      const outcome = await ensureInstanceForCurrentPeriod(bill, now)
      results.push({
        bill_id: bill.id,
        skipped: outcome.skippedReason,
        created_instance_id: outcome.created?.id,
        expense_id: outcome.expense?.id,
      })
    }

    log.info({ method: 'processBillInstances', processed: results.length }, 'Bill instances processed')
    return results
  }
}

export const billService = new BillService()
