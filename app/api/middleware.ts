import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

// Standard API response interface
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    message: string
    code?: string
    details?: any
  }
  meta?: {
    timestamp: string
    requestId?: string
  }
}

// Success response helper
export function successResponse<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
      },
    },
    { status }
  )
}

// Error response helper
export function errorResponse(
  message: string,
  status = 500,
  code?: string,
  details?: any
): NextResponse<ApiResponse> {
  const errorResponse: ApiResponse = {
    success: false,
    error: {
      message,
      code,
      details: process.env.NODE_ENV === 'development' ? details : undefined,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  }

  return NextResponse.json(errorResponse, { status })
}

// Handle API errors consistently
export function handleApiError(error: any): NextResponse<ApiResponse> {
  console.error('API Error:', error)

  // Zod validation errors
  if (error instanceof ZodError) {
    return errorResponse(
      'Validation failed',
      400,
      'VALIDATION_ERROR',
      error.issues
    )
  }

  // Known error types
  if (error?.code === 'PGRST116') {
    return errorResponse('Resource not found', 404, 'NOT_FOUND')
  }

  // Database errors
  if (error?.code?.startsWith('23')) {
    return errorResponse('Database constraint violation', 400, 'CONSTRAINT_VIOLATION', error.code)
  }

  // Supabase/config or network errors (e.g. missing env, unreachable DB)
  const msg = String(error?.message ?? '')
  const isConfigOrNetwork =
    msg.includes('Missing Supabase configuration') ||
    msg.includes('fetch failed') ||
    (error?.name === 'TypeError' && msg.includes('fetch'))
  if (isConfigOrNetwork) {
    return errorResponse(
      msg.includes('Missing Supabase') ? msg : 'Database unavailable. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (see env.example).',
      503,
      'SERVICE_UNAVAILABLE'
    )
  }

  // Generic error handling
  const message = error?.message || 'An unexpected error occurred'
  const status = error?.status || 500

  return errorResponse(message, status, error?.code)
}

// Wrapper for API route handlers
export function withApiHandler(
  handler: (request: Request, context?: any) => Promise<Response>
) {
  return async (request: Request, context?: any) => {
    try {
      return await handler(request, context)
    } catch (error) {
      return handleApiError(error)
    }
  }
}
