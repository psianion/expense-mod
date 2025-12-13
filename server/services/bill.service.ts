import dayjs from 'dayjs'
import { billRepository } from '../db/repositories/bill.repo'
import { CreateBillInput, UpdateBillInput } from '../validators/bill.schema'
import { Bill, BillType } from '@types'
import { ensureInstanceForCurrentPeriod } from '@lib/recurring'

export class BillService {
  async getBills(typeFilter?: BillType[]): Promise<Bill[]> {
    return billRepository.getBills(typeFilter)
  }

  async createBill(input: CreateBillInput): Promise<Bill> {
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

    return billRepository.createBill(billData)
  }

  async updateBill(input: UpdateBillInput): Promise<Bill> {
    const { id, ...updates } = input
    if (!id) {
      throw new Error('Bill id is required for update')
    }
    return billRepository.updateBill({ id, ...updates })
  }

  async deleteBill(id: string): Promise<{ id: string }> {
    await billRepository.deleteBill(id)
    return { id }
  }

  async getBillById(id: string): Promise<Bill | null> {
    return billRepository.getBillById(id)
  }

  async processBillInstances(): Promise<any[]> {
    const bills = await billRepository.getBills()
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

    return results
  }
}

export const billService = new BillService()
