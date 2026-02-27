import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@server/auth/context'
import { getServiceRoleClient } from '@server/db/supabase'
import { successResponse, handleApiError } from '@/app/api/middleware'

export const dynamic = 'force-dynamic'

const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1, 'Name is required').max(100),
})

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const supabase = getServiceRoleClient()

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, email, display_name, avatar_url, created_at')
      .eq('id', user.userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return successResponse({
      profile: profile ?? null,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()
    const { displayName } = updateProfileSchema.parse(body)

    const supabase = getServiceRoleClient()

    const { data: profile, error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.userId,
          email: user.email,
          display_name: displayName,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      .select('id, email, display_name, avatar_url')
      .single()

    if (error) throw error

    return successResponse({ profile })
  } catch (error) {
    return handleApiError(error)
  }
}
