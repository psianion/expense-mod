export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'DUPLICATE_ENTRY'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'DB_ERROR'
  | 'EXTERNAL_SERVICE_ERROR'
  | 'INTERNAL_ERROR'

export const HTTP_STATUS_MAP: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  DUPLICATE_ENTRY: 409,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  DB_ERROR: 500,
  EXTERNAL_SERVICE_ERROR: 502,
  INTERNAL_ERROR: 500,
}

export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly statusCode: number
  public readonly details?: Record<string, unknown>

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = HTTP_STATUS_MAP[code]
    this.details = details
  }
}
