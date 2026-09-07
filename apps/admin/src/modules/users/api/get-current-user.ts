import { apiClient } from '@/lib/api-client';
import type { UserProfile } from '@app/api-contracts';

/** GET /users/me — the authenticated user's profile. */
export function getCurrentUser(): Promise<UserProfile> {
  return apiClient.get<UserProfile>('/users/me');
}
