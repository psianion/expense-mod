import { describe, it, expect } from 'vitest'
import { E2E_BASE_URL, isE2EEnabled } from './setup.e2e'

describe.skipIf(!isE2EEnabled())('E2E: Analytics', () => {
  it('GET /api/analytics returns 200 and summary', async () => {
    const res = await fetch(`${E2E_BASE_URL}/api/analytics`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.summary).toBeDefined()
    expect(body.data.totalTransactions).toBeDefined()
  })
})
