import { describe, it, expect, vi } from 'vitest'
import { ZodError, z } from 'zod'
import { withApiHandler, handleApiError, successResponse, errorResponse } from '@/app/api/middleware'
import { AppError } from '@/server/lib/errors'

describe('withApiHandler', () => {
  it('returns response with X-Request-Id header', async () => {
    const handler = withApiHandler(async () => {
      return successResponse({ ok: true })
    })
    const req = new Request('http://localhost/api/test', { method: 'GET' })
    const res = await handler(req)
    const requestId = res.headers.get('X-Request-Id')
    expect(requestId).toMatch(/^req_/)
  })

  it('includes requestId in error responses', async () => {
    const handler = withApiHandler(async () => {
      throw new Error('boom')
    })
    const req = new Request('http://localhost/api/test', { method: 'GET' })
    const res = await handler(req)
    const body = await res.json()
    expect(body.meta?.requestId).toMatch(/^req_/)
  })
})

describe('handleApiError — branch coverage', () => {
  it('maps ZodError to 400 VALIDATION_ERROR', () => {
    const schema = z.object({ name: z.string() })
    let zodErr: ZodError
    try { schema.parse({ name: 123 }) } catch (e) { zodErr = e as ZodError }
    const res = handleApiError(zodErr!)
    expect(res.status).toBe(400)
  })

  it('maps PGRST116 (not found) to 404', () => {
    const res = handleApiError({ code: 'PGRST116', message: 'not found' })
    expect(res.status).toBe(404)
  })

  it('maps DB constraint code 23xxx to 400', async () => {
    const res = handleApiError({ code: '23505', message: 'duplicate key' })
    expect(res.status).toBe(400)
  })

  it('maps AUTH_REQUIRED to 401', () => {
    const res = handleApiError({ code: 'AUTH_REQUIRED' })
    expect(res.status).toBe(401)
  })

  it('maps FORBIDDEN to 403', () => {
    const res = handleApiError({ code: 'FORBIDDEN' })
    expect(res.status).toBe(403)
  })

  it('maps Missing Supabase configuration to 503', () => {
    const res = handleApiError(new Error('Missing Supabase configuration'))
    expect(res.status).toBe(503)
  })

  it('maps Invalid API key to 503', () => {
    const res = handleApiError(new Error('Invalid API key'))
    expect(res.status).toBe(503)
  })
})

describe('handleApiError with AppError', () => {
  it('maps AppError to correct status and code', () => {
    const err = new AppError('NOT_FOUND', 'Expense not found')
    const res = handleApiError(err)
    expect(res.status).toBe(404)
  })

  it('maps DUPLICATE_ENTRY to 409', () => {
    const err = new AppError('DUPLICATE_ENTRY', 'Already exists')
    const res = handleApiError(err)
    expect(res.status).toBe(409)
  })
})
