// lib/logger.ts

const isProduction = typeof window !== 'undefined'
  ? window.location.hostname !== 'localhost'
  : process.env.NODE_ENV === 'production'

type LogData = Record<string, unknown>

function formatPrefix(data?: LogData): string {
  const requestId = data?.requestId ? `[${data.requestId}] ` : ''
  const component = data?.component ? `(${data.component}) ` : ''
  return `${requestId}${component}`
}

export const frontendLogger = {
  debug(data: LogData, message: string, ...args: unknown[]) {
    if (!isProduction) {
      console.debug(`%c${formatPrefix(data)}${message}`, 'color: #888', ...args)
    }
  },

  info(data: LogData, message: string, ...args: unknown[]) {
    if (!isProduction) {
      console.info(`${formatPrefix(data)}${message}`, ...args)
    }
  },

  warn(data: LogData, message: string, ...args: unknown[]) {
    console.warn(`${formatPrefix(data)}${message}`, ...args)
  },

  error(data: LogData, message: string, ...args: unknown[]) {
    console.error(`${formatPrefix(data)}${message}`, ...args)
  },
}
