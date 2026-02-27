import { NextRequest } from 'next/server'
import { getCurrentUser } from '@server/auth/context'
import { getServiceRoleClientIfAvailable } from '@server/db/supabase'
import { successResponse, handleApiError, errorResponse } from '../../middleware'

export const dynamic = 'force-dynamic'

/**
 * Returns current user context for the client, including displayName and needsOnboarding.
 * Returns 401 if not authenticated.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return errorResponse('Authentication required', 401, 'UNAUTHORIZED')
    }

    let displayName: string | null = null
    let needsOnboarding = false

    if (user.isDemo) {
      displayName = 'Demo User'
    } else {
      const service = getServiceRoleClientIfAvailable()
      if (service) {
        const { data: profile } = await service
          .from('profiles')
          .select('display_name')
          .eq('id', user.userId)
          .single()

        displayName = profile?.display_name ?? null
        needsOnboarding = !displayName
      }
    }

    return successResponse({
      user: {
        userId: user.userId,
        email: user.email,
        isMaster: user.isMaster,
        isDemo: user.isDemo,
        roles: user.roles,
        displayName,
        needsOnboarding,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
