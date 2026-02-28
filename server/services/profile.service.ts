import { profileRepository, ProfileRow } from '../db/repositories/profile.repo'
import type { UserContext } from '../auth/context'
import { createServiceLogger } from '@/server/lib/logger'

const log = createServiceLogger('ProfileService')

export class ProfileService {
  async getProfile(userId: string): Promise<ProfileRow | null> {
    log.debug({ method: 'getProfile', userId }, 'Fetching profile')
    return profileRepository.getProfile(userId)
  }

  async updateDisplayName(user: UserContext, displayName: string): Promise<ProfileRow> {
    log.info({ method: 'updateDisplayName', userId: user.userId }, 'Updating display name')
    const profile = await profileRepository.upsertDisplayName(user.userId, user.email, displayName)
    log.info({ method: 'updateDisplayName', userId: user.userId }, 'Display name updated')
    return profile
  }
}

export const profileService = new ProfileService()
