import { NextRequest } from 'next/server'
import { getCurrentUser } from '@server/auth/context'
import { profileService } from '@server/services/profile.service'
import { successResponse, handleApiError, errorResponse } from '../../middleware'

export const dynamic = 'force-dynamic'

/**
 * Returns current user context including displayName and needsOnboarding.
 * Requires SUPABASE_SERVICE_ROLE_KEY to resolve profile fields — both
 * default to null/false when the key is absent.
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
      try {
        const profile = await profileService.getProfile(user.userId)
        displayName = profile?.display_name ?? null
        needsOnboarding = !displayName
      } catch (profileErr) {
        // Log but don't block auth — client-side guards still apply.
        console.error('[api/auth/me] profile lookup failed:', profileErr)
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
