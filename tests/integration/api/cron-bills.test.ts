import { describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/cron/bills/route'

const validSecret = 'test-cron-secret'

describe('POST /api/cron/bills', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = validSecret
  })

  it('returns 401 when no secret provided', async () => {
    const res = await POST(
      new NextRequest('http://localhost/api/cron/bills', { method: 'POST' })
    )
    expect(res.status).toBe(401)
  })

  it('returns 401 when secret does not match', async () => {
    const res = await POST(
      new NextRequest('http://localhost/api/cron/bills', {
        method: 'POST',
        headers: { 'x-cron-secret': 'wrong-secret' },
      })
    )
    expect(res.status).toBe(401)
  })

  it('returns 200 and results when secret in header matches', async () => {
    const res = await POST(
      new NextRequest('http://localhost/api/cron/bills', {
        method: 'POST',
        headers: { 'x-cron-secret': validSecret },
      })
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.results).toBeDefined()
    expect(Array.isArray(body.results)).toBe(true)
  })

  it('accepts secret in query param', async () => {
    const res = await POST(
      new NextRequest(`http://localhost/api/cron/bills?secret=${validSecret}`, {
        method: 'POST',
      })
    )
    expect(res.status).toBe(200)
  })
})
