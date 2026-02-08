import { describe, it, expect, beforeEach } from 'vitest'
import { billService } from '@server/services/bill.service'
import { clearMockStore, createBillPayload, getDemoUserContext } from '../../setup'

const demoUser = getDemoUserContext()

beforeEach(() => {
  clearMockStore()
})

describe('BillService', () => {
  describe('createBill', () => {
    it('creates bill and returns with id', async () => {
      const bill = await billService.createBill(createBillPayload, demoUser)
      expect(bill.id).toBeDefined()
      expect(bill.name).toBe('Netflix')
      expect(bill.type).toBe('SUBSCRIPTION')
      expect(bill.frequency).toBe('MONTHLY')
      expect(bill.day_of_month).toBe(15)
      expect(bill.amount).toBe(15)
    })
  })

  describe('getBills', () => {
    it('returns empty array when no bills', async () => {
      const bills = await billService.getBills(undefined, demoUser)
      expect(bills).toEqual([])
    })

    it('returns created bills', async () => {
      await billService.createBill(createBillPayload, demoUser)
      const bills = await billService.getBills(undefined, demoUser)
      expect(bills.length).toBe(1)
      expect(bills[0].name).toBe('Netflix')
    })

    it('filters by type when provided', async () => {
      await billService.createBill(createBillPayload, demoUser)
      await billService.createBill({
        ...createBillPayload,
        name: 'Rent',
        type: 'BILL',
        day_of_month: 1,
      }, demoUser)
      const bills = await billService.getBills(['SUBSCRIPTION'], demoUser)
      expect(bills.length).toBe(1)
      expect(bills[0].type).toBe('SUBSCRIPTION')
    })
  })

  describe('updateBill', () => {
    it('updates bill and returns updated bill', async () => {
      const created = await billService.createBill(createBillPayload, demoUser)
      const updated = await billService.updateBill({
        id: created.id,
        name: 'Netflix Premium',
        amount: 20,
      }, demoUser)
      expect(updated.name).toBe('Netflix Premium')
      expect(updated.amount).toBe(20)
    })
  })

  describe('deleteBill', () => {
    it('deletes bill by id', async () => {
      const created = await billService.createBill(createBillPayload, demoUser)
      const result = await billService.deleteBill(created.id, demoUser)
      expect(result.id).toBe(created.id)
      const bills = await billService.getBills(undefined, demoUser)
      expect(bills.length).toBe(0)
    })
  })

  describe('getBillById', () => {
    it('returns null for unknown id', async () => {
      const bill = await billService.getBillById('b0000000-0000-0000-0000-000000000099', demoUser)
      expect(bill).toBeNull()
    })

    it('returns bill when found', async () => {
      const created = await billService.createBill(createBillPayload, demoUser)
      const bill = await billService.getBillById(created.id, demoUser)
      expect(bill).not.toBeNull()
      expect(bill?.id).toBe(created.id)
    })
  })
})
