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

// Message used by server/db/supabase and repos for 503 responses
const DB_UNAVAILABLE_MSG =
  'Database unavailable. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env (see .env.example).'

// Handle API errors consistently
export function handleApiError(error: any): NextResponse<ApiResponse> {
  // Auth errors
  if (error?.code === 'AUTH_REQUIRED' || error?.status === 401) {
    return errorResponse('Authentication required', 401, 'UNAUTHORIZED')
  }
  if (error?.code === 'FORBIDDEN' || error?.status === 403) {
    return errorResponse('Permission denied', 403, 'FORBIDDEN')
  }

  const msg = String(error?.message ?? '')
  const isConfigOrNetwork =
    msg.includes('Missing Supabase configuration') ||
    msg.includes(DB_UNAVAILABLE_MSG) ||
    msg.includes('fetch failed') ||
    (error?.name === 'TypeError' && msg.includes('fetch'))

  if (msg === 'Invalid API key' || msg.includes('Invalid API key')) {
    console.warn('API: Supabase returned Invalid API key (check .env keys match project).')
    return errorResponse(
      'Invalid Supabase API key. In .env set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from the same project (Dashboard → Settings → API). Use the anon public key, not the service_role key.',
      503,
      'SERVICE_UNAVAILABLE'
    )
  }

  if (isConfigOrNetwork) {
    console.warn('API: Database unavailable (check .env and Supabase connectivity).')
    return errorResponse(
      msg.includes('Missing Supabase') ? msg : DB_UNAVAILABLE_MSG,
      503,
      'SERVICE_UNAVAILABLE'
    )
  }

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
