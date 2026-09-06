import { apiClient } from '@/lib/api-client';

/** Logout — the refresh-token cookie is sent automatically and cleared server-side. */
export function logout(): Promise<{ message: string }> {
  return apiClient.post<{ message: string }>('/auth/logout', {}, true);
}
