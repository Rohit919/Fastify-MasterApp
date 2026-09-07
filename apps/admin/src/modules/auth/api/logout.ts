import { apiClient } from '@/lib/api-client';

export function logout(refreshToken: string): Promise<{ message: string }> {
  return apiClient.post<{ message: string }>('/auth/logout', { refreshToken }, true);
}
