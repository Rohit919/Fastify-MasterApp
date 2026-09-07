import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@app/api-contracts';

/** Logout — the refresh-token cookie is sent automatically and cleared server-side. */
export function logout(): Promise<{ message: string }> {
  return apiClient.post<{ message: string }>(API_ENDPOINTS.AUTH.LOGOUT, {}, true);
}
