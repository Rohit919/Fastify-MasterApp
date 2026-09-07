import { config } from '@/config';
import { useAuthStore } from '@/stores/auth.store';
import { buildPath, type ApiEndpoint, type ErrorEnvelope } from '@app/api-contracts';

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
    public readonly requestId?: string,
    /**
     * Stable, machine-readable error code. Branch on this — never on the
     * message (API_CONVENTIONS §39). Falls back to a generic value when the
     * server omits it.
     */
    public readonly code: string = 'INTERNAL_ERROR'
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
      err?.error?.requestId,
      err?.error?.code ?? 'INTERNAL_ERROR'
    );
  }

  // The API wraps successful responses as { success: true, data: ... }.
  // Unwrap to the data payload for the caller.
  const envelope = json as { success: true; data: TData };
  return envelope.data;
}

/** Raw request that returns the full parsed body (envelope included). */
async function requestRaw<TBody>(path: string, options: RequestOptions = {}): Promise<TBody> {
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
    credentials: 'include',
  });

  const json = (await res.json().catch(() => null)) as unknown;

  if (!res.ok) {
    const err = json as ErrorEnvelope | null;
    throw new ApiError(
      err?.error?.message ?? `Request failed (${res.status})`,
      res.status,
      err?.error?.requestId,
      err?.error?.code ?? 'INTERNAL_ERROR'
    );
  }

  return json as TBody;
}

export interface ContractRequestArgs {
  params?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

/**
 * Contract-driven request (API_CONTRACTS §31, §81). Derives method + path from
 * a shared endpoint contract so the Admin never hardcodes either. Returns the
 * FULL response body (envelope included) typed as TResponse — callers pick
 * `.data` / `.meta`.
 */
function requestContract<TResponse>(
  endpoint: ApiEndpoint,
  args: ContractRequestArgs = {}
): Promise<TResponse> {
  let path = buildPath(endpoint, args.params ?? {});
  if (args.query) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(args.query)) {
      if (value !== undefined) search.append(key, String(value));
    }
    const qs = search.toString();
    if (qs) path += `?${qs}`;
  }
  return requestRaw<TResponse>(path, {
    method: endpoint.method,
    body: args.body,
    anonymous: endpoint.auth === 'public',
  });
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown, anonymous = false) =>
    request<T>(path, { method: 'POST', body, anonymous }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),

  /** Contract-driven request returning the full response envelope. */
  request: requestContract,
};
