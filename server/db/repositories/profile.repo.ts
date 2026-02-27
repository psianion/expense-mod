import { getServiceRoleClient } from '../supabase'
import { createServiceLogger } from '@/server/lib/logger'
import { AppError } from '@/server/lib/errors'
const log = createServiceLogger('ProfileRepo')

export interface ProfileRow {
  id: string
  email: string | null
  display_name: string | null
  avatar_url: string | null
  created_at: string
}

export class ProfileRepository {
  /**
   * Returns the profile row or null if no row exists (PGRST116).
   * Throws on any other database error.
   */
  async getProfile(userId: string): Promise<ProfileRow | null> {
    const client = getServiceRoleClient()
    const { data, error } = await client
      .from('profiles')
      .select('id, email, display_name, avatar_url, created_at')
      .eq('id', userId)
      .single()

    if (error?.code === 'PGRST116') return null
    if (error) {
      log.error({ method: 'getProfile', userId, err: error }, 'Database operation failed')
      throw new AppError('DB_ERROR', error.message, { code: error.code, hint: error.hint })
    }
    return data as ProfileRow
  }

  /**
   * Upserts display_name for the given user. Creates the row if absent.
   */
  async upsertDisplayName(
    userId: string,
    email: string | null,
    displayName: string
  ): Promise<ProfileRow> {
    const client = getServiceRoleClient()
    const { data, error } = await client
      .from('profiles')
      .upsert(
        { id: userId, email, display_name: displayName, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      )
      .select('id, email, display_name, avatar_url, created_at')
      .single()

    if (error) {
      log.error({ method: 'upsertDisplayName', userId, err: error }, 'Database operation failed')
      throw new AppError('DB_ERROR', error.message, { code: error.code, hint: error.hint })
    }
    return data as ProfileRow
  }
}

export const profileRepository = new ProfileRepository()
