import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/auth/profile/route'
import { clearMockStore, getMockStore } from '@/tests/setup'
import { profileService } from '@server/services/profile.service'

beforeEach(() => clearMockStore())

describe('GET /api/auth/profile', () => {
  it('returns profile null when no profile exists', async () => {
    const req = new NextRequest('http://localhost/api/auth/profile')
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.profile).toBeNull()
  })

  it('returns existing profile', async () => {
    const store = getMockStore()
    store.profiles.push({
      id: process.env.DEMO_USER_ID,
      email: 'demo@expense-tracker.app',
      display_name: 'Test User',
      avatar_url: null,
      created_at: new Date().toISOString(),
    })
    const req = new NextRequest('http://localhost/api/auth/profile')
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.profile).toBeDefined()
    expect(body.data.profile.display_name).toBe('Test User')
  })

  it('includes requestId in meta', async () => {
    const req = new NextRequest('http://localhost/api/auth/profile')
    const res = await GET(req)
    const body = await res.json()
    expect(body.meta?.requestId).toMatch(/^req_/)
  })
})

describe('POST /api/auth/profile', () => {
  it('updates display name successfully', async () => {
    vi.spyOn(profileService, 'updateDisplayName').mockResolvedValueOnce({
      id: process.env.DEMO_USER_ID!,
      email: 'demo@expense-tracker.app',
      display_name: 'New Name',
      avatar_url: null,
      created_at: new Date().toISOString(),
    })
    const req = new NextRequest('http://localhost/api/auth/profile', {
      method: 'POST',
      body: JSON.stringify({ displayName: 'New Name' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.profile.display_name).toBe('New Name')
  })

  it('returns 400 for missing displayName', async () => {
    const req = new NextRequest('http://localhost/api/auth/profile', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 for empty displayName string', async () => {
    const req = new NextRequest('http://localhost/api/auth/profile', {
      method: 'POST',
      body: JSON.stringify({ displayName: '' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
