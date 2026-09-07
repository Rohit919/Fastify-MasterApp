import { config } from '@/config';
import { useAuthStore } from '@/stores/auth.store';
import type { ErrorEnvelope } from '@app/api-contracts';

/**
 * Central HTTP client. Never call fetch() directly from components — go through
 * a module api/ function that uses this client.
 *
 * Responsibilities:
 * - Attach the bearer token
 * - Parse the standard { success, data | error } envelope
 * - Throw a typed ApiError on non-2xx so TanStack Query can surface it
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly requestId?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Skip attaching the auth token (for login/register). */
  anonymous?: boolean;
}

async function request<TData>(path: string, options: RequestOptions = {}): Promise<TData> {
  const { method = 'GET', body, anonymous = false } = options;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (!anonymous) {
    const token = useAuthStore.getState().accessToken;
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${config.apiBaseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    // Send/receive the HTTP-only refresh cookie (needed cross-origin).
    credentials: 'include',
  });

  const json = (await res.json().catch(() => null)) as unknown;

  if (!res.ok) {
    const err = json as ErrorEnvelope | null;
    throw new ApiError(
      err?.error?.message ?? `Request failed (${res.status})`,
      res.status,
      err?.error?.requestId
    );
  }

  // The API wraps successful responses as { success: true, data: ... }.
  // Unwrap to the data payload for the caller.
  const envelope = json as { success: true; data: TData };
  return envelope.data;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown, anonymous = false) =>
    request<T>(path, { method: 'POST', body, anonymous }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
