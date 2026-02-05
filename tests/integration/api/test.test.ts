import { describe, it, expect } from 'vitest'
import { GET, POST } from '@/app/api/test/route'

describe('GET /api/test', () => {
  it('returns test message', async () => {
    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.message).toBe('Test route works')
  })
})

describe('POST /api/test', () => {
  it('returns POST test message', async () => {
    const res = await POST()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.message).toBe('POST test works')
  })
})
