import { AsyncLocalStorage } from 'node:async_hooks'
import pino from 'pino'

// --- Request context (AsyncLocalStorage) ---

interface RequestStore {
  requestId: string
  userId?: string
}

export const requestContext = new AsyncLocalStorage<RequestStore>()

export function generateRequestId(): string {
  return `req_${Math.random().toString(36).slice(2, 9)}`
}

// --- Root logger ---

const isProduction = process.env.NODE_ENV === 'production'

export const rootLogger = pino({
  level: isProduction ? 'info' : 'debug',
  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      },
  // Inject requestId and userId from AsyncLocalStorage into every log line
  mixin() {
    const store = requestContext.getStore()
    if (!store) return {}
    return {
      requestId: store.requestId,
      ...(store.userId ? { userId: store.userId } : {}),
    }
  },
})

// --- Child logger factory ---

export function createServiceLogger(serviceName: string) {
  return rootLogger.child({ service: serviceName })
}
