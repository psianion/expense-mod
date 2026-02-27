import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios'
import { frontendLogger } from '@/lib/logger'

// Base API configuration
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api'

// API Error types
export interface ApiError {
  message: string
  status: number
  code?: string
  requestId?: string
}

// Response wrapper type
export interface ApiResponse<T> {
  data: T
  status: number
  message?: string
}

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for authentication and common headers
apiClient.interceptors.request.use(
  (config) => {
    // Add any auth headers here if needed
    // For now, we'll rely on cookies for Next.js API routes
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Unwrap our API response format: { success, data, error, meta } -> data
    if (response.data && typeof response.data === 'object' && 'success' in response.data) {
      if (response.data.success && response.data.data) {
        return {
          ...response,
          data: response.data.data,
        }
      } else if (!response.data.success && response.data.error) {
        // Handle API-level errors
        const apiError: ApiError = {
          message: response.data.error.message || 'API Error',
          status: response.status,
          code: response.data.error.code,
        }
        return Promise.reject(apiError)
      }
    }

    // Return response as-is for non-API responses
    return response
  },
  (error: AxiosError) => {
    const requestId = error.response?.headers?.['x-request-id']
    const apiError: ApiError = {
      message: (error.response?.data as any)?.error?.message ||
               error.message ||
               'An unexpected error occurred',
      status: error.response?.status || 500,
      code: (error.response?.data as any)?.error?.code || error.code,
      requestId,
    }

    frontendLogger.error(
      { requestId, status: apiError.status, code: apiError.code },
      `API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url} → ${apiError.message}`
    )

    return Promise.reject(apiError)
  }
)

export default apiClient
