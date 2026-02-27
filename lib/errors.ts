// lib/errors.ts

const USER_FRIENDLY_MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: 'Please check your input and try again',
  NOT_FOUND: 'The item you\'re looking for was not found',
  DUPLICATE_ENTRY: 'This item already exists',
  UNAUTHORIZED: 'Please log in to continue',
  FORBIDDEN: 'You don\'t have permission for this action',
  DB_ERROR: 'Something went wrong. Please try again',
  EXTERNAL_SERVICE_ERROR: 'AI service is temporarily unavailable',
  INTERNAL_ERROR: 'Something went wrong. Please try again',
  SERVICE_UNAVAILABLE: 'Service is temporarily unavailable',
  CONSTRAINT_VIOLATION: 'This operation conflicts with existing data',
}

export function getUserFriendlyMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const code = (error as any).code as string
    if (code && USER_FRIENDLY_MESSAGES[code]) {
      return USER_FRIENDLY_MESSAGES[code]
    }
    const message = (error as any).message as string
    if (message) return message
  }
  if (error instanceof Error) return error.message
  return 'Something went wrong. Please try again'
}
