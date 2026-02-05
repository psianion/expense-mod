import { describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, PATCH } from '@/app/api/bill-instances/route'
import { clearMockStore, createBillPayload } from '../../setup'
import { billService } from '@server/services/bill.service'

beforeEach(() => {
  clearMockStore()
})

describe('GET /api/bill-instances', () => {
  it('returns empty instances when none exist', async () => {
    const req = new NextRequest('http://localhost/api/bill-instances')
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.instances).toEqual([])
  })

  it('filters by status when provided', async () => {
    const req = new NextRequest('http://localhost/api/bill-instances?status=DUE,PAID')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.data.instances)).toBe(true)
  })
})

describe('POST /api/bill-instances', () => {
  it('creates instance for existing bill', async () => {
    const bill = await billService.createBill(createBillPayload)
    const res = await POST(
      new NextRequest('http://localhost/api/bill-instances', {
        method: 'POST',
        body: JSON.stringify({
          billId: bill.id,
          amount: 15,
          due_date: '2025-02-15',
        }),
        headers: { 'Content-Type': 'application/json' },
      })
    )
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.instance).toBeDefined()
    expect(body.data.instance.bill_id).toBe(bill.id)
    expect(body.data.instance.status).toBe('DUE')
  })

  it('returns error when bill not found', async () => {
    const res = await POST(
      new NextRequest('http://localhost/api/bill-instances', {
        method: 'POST',
        body: JSON.stringify({
          billId: 'b0000000-0000-0000-0000-000000000099',
          amount: 100,
        }),
        headers: { 'Content-Type': 'application/json' },
      })
    )
    expect(res.status).toBe(500)
  })
})

describe('PATCH /api/bill-instances', () => {
  it('skip action marks instance as SKIPPED', async () => {
    const bill = await billService.createBill(createBillPayload)
    const createRes = await POST(
      new NextRequest('http://localhost/api/bill-instances', {
        method: 'POST',
        body: JSON.stringify({ billId: bill.id, amount: 15, due_date: '2025-02-15' }),
        headers: { 'Content-Type': 'application/json' },
      })
    )
    const { instance } = (await createRes.json()).data
    const res = await PATCH(
      new NextRequest('http://localhost/api/bill-instances', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'skip', id: instance.id }),
        headers: { 'Content-Type': 'application/json' },
      })
    )
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.instance.status).toBe('SKIPPED')
  })

  it('update action updates amount', async () => {
    const bill = await billService.createBill(createBillPayload)
    const createRes = await POST(
      new NextRequest('http://localhost/api/bill-instances', {
        method: 'POST',
        body: JSON.stringify({ billId: bill.id, amount: 15, due_date: '2025-02-20' }),
        headers: { 'Content-Type': 'application/json' },
      })
    )
    const { instance } = (await createRes.json()).data
    const res = await PATCH(
      new NextRequest('http://localhost/api/bill-instances', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'update', id: instance.id, amount: 20 }),
        headers: { 'Content-Type': 'application/json' },
      })
    )
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.instance.amount).toBe(20)
  })
})
