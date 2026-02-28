import { describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, PUT, DELETE } from '@/app/api/bills/route'
import { clearMockStore, createBillPayload } from '../../setup'

beforeEach(() => {
  clearMockStore()
})

function jsonBody(body: object) {
  return new NextRequest('http://localhost/api/bills', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('GET /api/bills', () => {
  it('returns empty bills when none exist', async () => {
    const req = new NextRequest('http://localhost/api/bills')
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.bills).toEqual([])
  })

  it('returns created bills', async () => {
    await POST(jsonBody(createBillPayload))
    const req = new NextRequest('http://localhost/api/bills')
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.bills.length).toBe(1)
    expect(body.data.bills[0].name).toBe('Netflix')
  })

  it('filters by type when provided', async () => {
    await POST(jsonBody(createBillPayload))
    await POST(
      jsonBody({
        ...createBillPayload,
        name: 'Rent',
        type: 'BILL',
        frequency: 'MONTHLY',
        day_of_month: 1,
        auto_post: false,
        notes: null,
      })
    )
    const req = new NextRequest('http://localhost/api/bills?type=SUBSCRIPTION')
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.bills.length).toBe(1)
    expect(body.data.bills[0].type).toBe('SUBSCRIPTION')
  })
})

describe('POST /api/bills', () => {
  it('creates bill and returns it', async () => {
    const res = await POST(jsonBody(createBillPayload))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.bill).toBeDefined()
    expect(body.data.bill.name).toBe('Netflix')
    expect(body.data.bill.id).toBeDefined()
  })

  it('accepts minimal valid MONTHLY bill with day_of_month', async () => {
    const res = await POST(
      jsonBody({
        name: 'Rent',
        type: 'BILL',
        frequency: 'MONTHLY',
        day_of_month: 1,
        amount: 1200,
        auto_post: false,
      })
    )
    expect(res.status).toBe(200)
  })
})

describe('PUT /api/bills', () => {
  it('updates bill', async () => {
    const createRes = await POST(jsonBody(createBillPayload))
    const created = (await createRes.json()).data.bill
    const res = await PUT(
      new NextRequest('http://localhost/api/bills', {
        method: 'PUT',
        body: JSON.stringify({
          id: created.id,
          name: 'Netflix Premium',
          type: 'SUBSCRIPTION',
          frequency: 'MONTHLY',
          day_of_month: 15,
          amount: 20,
          auto_post: false,
          notes: null,
        }),
        headers: { 'Content-Type': 'application/json' },
      })
    )
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.bill.name).toBe('Netflix Premium')
    expect(body.data.bill.amount).toBe(20)
  })
})

describe('DELETE /api/bills', () => {
  it('deletes bill by id', async () => {
    const createRes = await POST(jsonBody(createBillPayload))
    const { id } = (await createRes.json()).data.bill
    const res = await DELETE(new NextRequest(`http://localhost/api/bills?id=${id}`))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.bill.id).toBe(id)
    const listRes = await GET(new NextRequest('http://localhost/api/bills'))
    const listBody = await listRes.json()
    expect(listBody.data.bills.length).toBe(0)
  })

  it('returns error when id missing', async () => {
    const res = await DELETE(new NextRequest('http://localhost/api/bills'))
    expect(res.status).toBe(400)
  })
})
