import { NextRequest } from 'next/server'
import { getCurrentUser } from '@server/auth/context'
import { successResponse, handleApiError, errorResponse } from '../../middleware'

export const dynamic = 'force-dynamic'

/**
 * Returns current user context for the client (userId, email, isMaster, isDemo).
 * Returns 401 if not authenticated.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return errorResponse('Authentication required', 401, 'UNAUTHORIZED')
    }
    return successResponse({
      user: {
        userId: user.userId,
        email: user.email,
        isMaster: user.isMaster,
        isDemo: user.isDemo,
        roles: user.roles,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
