import { NextRequest } from 'next/server'
import { requireAuth } from '@server/auth/context'
import { profileService } from '@server/services/profile.service'
import { updateProfileSchema } from '@server/validators/profile.schema'
import { successResponse, withApiHandler } from '@/app/api/middleware'

export const dynamic = 'force-dynamic'

export const GET = withApiHandler(async (request: NextRequest) => {
  const user = await requireAuth(request)
  const profile = await profileService.getProfile(user.userId)
  return successResponse({ profile: profile ?? null })
})

export const POST = withApiHandler(async (request: NextRequest) => {
  const user = await requireAuth(request)
  const body = await request.json()
  const { displayName } = updateProfileSchema.parse(body)
  const profile = await profileService.updateDisplayName(user, displayName)
  return successResponse({ profile })
})
