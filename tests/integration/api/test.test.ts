import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/test/route'

describe('GET /api/test', () => {
  it('returns test message', async () => {
    const res = await GET(new NextRequest('http://localhost/api/test'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.message).toBe('Test route works')
  })
})

describe('POST /api/test', () => {
  it('returns POST test message', async () => {
    const res = await POST(new NextRequest('http://localhost/api/test', { method: 'POST' }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.message).toBe('POST test works')
  })
})
