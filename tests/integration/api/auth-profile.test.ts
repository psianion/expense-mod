import { describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/auth/profile/route'
import { clearMockStore, getMockStore } from '../../setup'

beforeEach(() => {
  clearMockStore()
})

function postRequest(body: object) {
  return new NextRequest('http://localhost/api/auth/profile', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function getRequest() {
  return new NextRequest('http://localhost/api/auth/profile')
}

describe('POST /api/auth/profile', () => {
  it('returns 400 when displayName is missing', async () => {
    const res = await POST(postRequest({}))
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.success).toBe(false)
    expect(body.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when displayName is empty string', async () => {
    const res = await POST(postRequest({ displayName: '' }))
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.success).toBe(false)
    expect(body.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when displayName is whitespace-only', async () => {
    const res = await POST(postRequest({ displayName: '   ' }))
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.success).toBe(false)
    expect(body.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when displayName exceeds 100 characters', async () => {
    const res = await POST(postRequest({ displayName: 'a'.repeat(101) }))
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.success).toBe(false)
    expect(body.error?.code).toBe('VALIDATION_ERROR')
  })

  it('upserts and returns the profile with display_name set', async () => {
    const res = await POST(postRequest({ displayName: 'Alice' }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.profile).toBeDefined()
    expect(body.data.profile.display_name).toBe('Alice')
    expect(getMockStore().profiles).toHaveLength(1)
  })

  it('updates display_name on a second POST (upsert not insert-only)', async () => {
    await POST(postRequest({ displayName: 'Alice' }))
    const res = await POST(postRequest({ displayName: 'Alice Updated' }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.profile.display_name).toBe('Alice Updated')
    // upsert should not create a second row
    expect(getMockStore().profiles).toHaveLength(1)
  })
})

describe('GET /api/auth/profile', () => {
  it('returns null profile when no profile exists for the user', async () => {
    const res = await GET(getRequest())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.profile).toBeNull()
  })

  it('returns the profile after a POST has created it', async () => {
    await POST(postRequest({ displayName: 'Bob' }))
    const res = await GET(getRequest())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.profile).toBeDefined()
    expect(body.data.profile.display_name).toBe('Bob')
  })
})
