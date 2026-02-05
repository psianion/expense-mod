import { describe, it, expect, beforeAll } from 'vitest'
import { E2E_BASE_URL, isE2EEnabled } from './setup.e2e'

/**
 * E2E tests for expenses flow.
 * Run with: E2E_BASE_URL=http://localhost:3000 npm run test:run -- tests/e2e
 * Or use the "Run Tests" / "Debug Tests" skill with MCP Docker browser to drive the UI.
 */
describe.skipIf(!isE2EEnabled())('E2E: Expenses', () => {
  beforeAll(() => {
    if (!isE2EEnabled()) return
  })

  it('GET /api/expenses returns 200', async () => {
    const res = await fetch(`${E2E_BASE_URL}/api/expenses`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.expenses).toBeDefined()
  })

  it('POST /api/expenses creates expense', async () => {
    const res = await fetch(`${E2E_BASE_URL}/api/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expense: {
          amount: 25,
          datetime: new Date().toISOString(),
          category: 'Food',
          platform: 'Other',
          payment_method: 'Other',
          type: 'EXPENSE',
          tags: [],
        },
        source: 'MANUAL',
      }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.data.expense.id).toBeDefined()
  })
})
