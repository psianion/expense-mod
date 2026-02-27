import { profileRepository, ProfileRow } from '../db/repositories/profile.repo'
import type { UserContext } from '../auth/context'

export class ProfileService {
  async getProfile(userId: string): Promise<ProfileRow | null> {
    return profileRepository.getProfile(userId)
  }

  async updateDisplayName(user: UserContext, displayName: string): Promise<ProfileRow> {
    return profileRepository.upsertDisplayName(user.userId, user.email, displayName)
  }
}

export const profileService = new ProfileService()
