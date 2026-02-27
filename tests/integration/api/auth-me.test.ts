import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/auth/me/route'

describe('GET /api/auth/me', () => {
  it('returns current user in DEMO mode', async () => {
    const req = new NextRequest('http://localhost/api/auth/me')
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data?.user).toBeDefined()
    expect(body.data.user.userId).toBeDefined()
    expect(body.data.user.isDemo).toBe(true)
    expect(body.data.user.email).toBe('demo@expense-tracker.app')
    expect(body.data.user.displayName).toBe('Demo User')
    expect(body.data.user.needsOnboarding).toBe(false)
  })
})
