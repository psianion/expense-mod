import { describe, it, expect } from 'vitest'
import { E2E_BASE_URL, isE2EEnabled } from '../setup.e2e'

/**
 * E2E workflow: create bill, create instance, confirm (pay) instance.
 * MCP Docker Playwright: navigate to bills/analytics and use UI to reconcile.
 */
describe.skipIf(!isE2EEnabled())('E2E workflow: bill reconciliation', () => {
  it('create bill and instance via API', async () => {
    const billRes = await fetch(`${E2E_BASE_URL}/api/bills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'E2E Bill',
        type: 'BILL',
        frequency: 'MONTHLY',
        day_of_month: 1,
        amount: 100,
        auto_post: false,
        notes: null,
      }),
    })
    expect(billRes.status).toBe(200)
    const { data: billData } = await billRes.json()
    const billId = billData.bill.id

    const instanceRes = await fetch(`${E2E_BASE_URL}/api/bill-instances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        billId,
        amount: 100,
        due_date: new Date().toISOString().slice(0, 10),
      }),
    })
    expect(instanceRes.status).toBe(200)
    const { data: instanceData } = await instanceRes.json()
    expect(instanceData.instance.id).toBeDefined()
    expect(instanceData.instance.status).toBe('DUE')
  })
})
