import { describe, it, expect } from 'vitest'
import { E2E_BASE_URL, isE2EEnabled } from '../setup.e2e'

/**
 * E2E workflow: create expense and verify it appears in list.
 * When using MCP Docker Playwright skill:
 * 1. browser_navigate to E2E_BASE_URL/expenses
 * 2. browser_snapshot to get page structure
 * 3. Use QuickAdd or form to create expense (browser_type, browser_click)
 * 4. browser_wait_for for list update
 * 5. browser_snapshot to verify new expense in list
 */
describe.skipIf(!isE2EEnabled())('E2E workflow: create expense', () => {
  it('create expense via API and list via GET', async () => {
    const createRes = await fetch(`${E2E_BASE_URL}/api/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expense: {
          amount: 99,
          datetime: new Date().toISOString(),
          category: 'Transport',
          platform: 'Other',
          payment_method: 'Other',
          type: 'EXPENSE',
          tags: ['e2e'],
        },
        source: 'MANUAL',
      }),
    })
    expect(createRes.status).toBe(200)
    const { data } = await createRes.json()
    const id = data.expense.id

    const listRes = await fetch(`${E2E_BASE_URL}/api/expenses`)
    expect(listRes.status).toBe(200)
    const listBody = await listRes.json()
    const found = listBody.data.expenses.find((e: { id: string }) => e.id === id)
    expect(found).toBeDefined()
    expect(found.amount).toBe(99)
  })
})
