import { describe, it, expect, vi } from 'vitest'
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
