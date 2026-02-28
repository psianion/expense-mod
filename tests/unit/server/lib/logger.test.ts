import { describe, it, expect, vi, beforeEach } from 'vitest'

// We need to test that the logger module exports the expected API
describe('Logger', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('exports createServiceLogger that returns a pino child logger', async () => {
    const { createServiceLogger } = await import('@/server/lib/logger')
    const log = createServiceLogger('TestService')
    expect(log).toBeDefined()
    expect(typeof log.info).toBe('function')
    expect(typeof log.error).toBe('function')
    expect(typeof log.warn).toBe('function')
    expect(typeof log.debug).toBe('function')
  })

  it('exports requestContext with run and getStore', async () => {
    const { requestContext } = await import('@/server/lib/logger')
    expect(typeof requestContext.run).toBe('function')
    expect(typeof requestContext.getStore).toBe('function')
  })

  it('generates a requestId with req_ prefix', async () => {
    const { generateRequestId } = await import('@/server/lib/logger')
    const id = generateRequestId()
    expect(id).toMatch(/^req_[a-z0-9]+$/)
  })

  it('child logger binds service name', async () => {
    const { createServiceLogger } = await import('@/server/lib/logger')
    const log = createServiceLogger('ExpenseService')
    // pino child loggers have bindings
    expect((log as any).bindings().service).toBe('ExpenseService')
  })
})
