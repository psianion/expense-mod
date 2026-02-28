import { describe, it, expect } from 'vitest'
import { AppError, ErrorCode, HTTP_STATUS_MAP } from '@/server/lib/errors'

describe('AppError', () => {
  it('creates error with code, message, and details', () => {
    const err = new AppError('VALIDATION_ERROR', 'Invalid input', { field: 'amount' })
    expect(err).toBeInstanceOf(Error)
    expect(err.code).toBe('VALIDATION_ERROR')
    expect(err.message).toBe('Invalid input')
    expect(err.details).toEqual({ field: 'amount' })
    expect(err.statusCode).toBe(400)
  })

  it('maps error codes to HTTP status codes', () => {
    expect(new AppError('NOT_FOUND', 'x').statusCode).toBe(404)
    expect(new AppError('DUPLICATE_ENTRY', 'x').statusCode).toBe(409)
    expect(new AppError('UNAUTHORIZED', 'x').statusCode).toBe(401)
    expect(new AppError('FORBIDDEN', 'x').statusCode).toBe(403)
    expect(new AppError('DB_ERROR', 'x').statusCode).toBe(500)
    expect(new AppError('EXTERNAL_SERVICE_ERROR', 'x').statusCode).toBe(502)
    expect(new AppError('INTERNAL_ERROR', 'x').statusCode).toBe(500)
  })

  it('is an instanceof Error for catch blocks', () => {
    const err = new AppError('NOT_FOUND', 'Resource not found')
    expect(err instanceof Error).toBe(true)
    expect(err.name).toBe('AppError')
    expect(err.stack).toBeDefined()
  })
})
