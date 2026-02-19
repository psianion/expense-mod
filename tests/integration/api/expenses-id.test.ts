import { describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/expenses/route'
import { PATCH, DELETE } from '@/app/api/expenses/[id]/route'
import { clearMockStore, createExpensePayload } from '../../setup'

beforeEach(() => {
  clearMockStore()
})

function makeRequest(url: string, method: string, body?: object) {
  return new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'Content-Type': 'application/json' } : {},
  })
}

function makeParams(id: string) {
  return { params: { id } }
}

async function createExpense() {
  const req = makeRequest('http://localhost/api/expenses', 'POST', createExpensePayload)
  const res = await POST(req)
  const body = await res.json()
  return body.data.expense
}

describe('PATCH /api/expenses/[id]', () => {
  it('updates an existing expense and returns the updated record', async () => {
    const expense = await createExpense()

    const res = await PATCH(
      makeRequest(`http://localhost/api/expenses/${expense.id}`, 'PATCH', {
        amount: 999,
        category: 'Updated',
      }),
      makeParams(expense.id)
    )

    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.expense).toBeDefined()
    expect(body.data.expense.id).toBe(expense.id)
    expect(body.data.expense.amount).toBe(999)
    expect(body.data.expense.category).toBe('Updated')
  })

  it('updates only the provided fields (partial update)', async () => {
    const expense = await createExpense()

    const res = await PATCH(
      makeRequest(`http://localhost/api/expenses/${expense.id}`, 'PATCH', {
        platform: 'Swiggy',
      }),
      makeParams(expense.id)
    )

    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.expense.platform).toBe('Swiggy')
    // Original fields remain unchanged
    expect(body.data.expense.amount).toBe(expense.amount)
  })

  it('returns 400 for invalid payload (negative amount)', async () => {
    const expense = await createExpense()

    const res = await PATCH(
      makeRequest(`http://localhost/api/expenses/${expense.id}`, 'PATCH', {
        amount: -50,
      }),
      makeParams(expense.id)
    )

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error?.code).toBe('VALIDATION_ERROR')
  })
})

describe('DELETE /api/expenses/[id]', () => {
  it('deletes an existing expense and returns deleted: true', async () => {
    const expense = await createExpense()

    const res = await DELETE(
      makeRequest(`http://localhost/api/expenses/${expense.id}`, 'DELETE'),
      makeParams(expense.id)
    )

    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.deleted).toBe(true)
  })

  it('confirms the expense is no longer accessible after deletion', async () => {
    const { GET } = await import('@/app/api/expenses/route')
    const expense = await createExpense()

    await DELETE(
      makeRequest(`http://localhost/api/expenses/${expense.id}`, 'DELETE'),
      makeParams(expense.id)
    )

    // Verify the expense list is now empty
    const listRes = await GET(new NextRequest('http://localhost/api/expenses'))
    const listBody = await listRes.json()
    expect(listBody.data.expenses.length).toBe(0)
  })
})
