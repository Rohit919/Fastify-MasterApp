import { apiClient } from '@/lib/api-client';
import { API_CONTRACTS, type MeResponse } from '@app/api-contracts';

/** The `/users/me` payload — profile plus effective roles and permissions. */
export type CurrentUser = MeResponse['data'];

/**
 * GET /api/v1/users/me — the authenticated user's profile + effective
 * permissions. Driven by the shared endpoint contract (method + path).
 */
export async function getCurrentUser(): Promise<CurrentUser> {
  const res = await apiClient.request<MeResponse>(API_CONTRACTS.USERS.ME);
  return res.data;
}
