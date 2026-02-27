import { NextRequest } from 'next/server'
import { requireAuth } from '@server/auth/context'
import { profileService } from '@server/services/profile.service'
import { updateProfileSchema } from '@server/validators/profile.schema'
import { successResponse, handleApiError } from '@/app/api/middleware'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const profile = await profileService.getProfile(user.userId)
    return successResponse({ profile: profile ?? null })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()
    const { displayName } = updateProfileSchema.parse(body)
    const profile = await profileService.updateDisplayName(user, displayName)
    return successResponse({ profile })
  } catch (error) {
    return handleApiError(error)
  }
}
