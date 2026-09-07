import { config } from '@/config';
import { useAuthStore } from '@/stores/auth.store';
import {
  buildPath,
  API_ENDPOINTS,
  type ApiEndpoint,
  type ErrorEnvelope,
} from '@app/api-contracts';

/**
 * Central HTTP client. Never call fetch() directly from components — go through
 * a module api/ function that uses this client.
 *
 * Responsibilities:
 * - Attach the bearer access token.
 * - Send/receive the HTTP-only refresh cookie (credentials: 'include').
 * - Parse both envelope conventions the backend uses:
 *     legacy   { success, data }
 *     canonical{ data, meta }
 * - Throw a typed ApiError (with the stable error `code`) on non-2xx.
 * - Transparently refresh the access token once on 401 and retry the request.
 * - On refresh failure, clear the session and redirect to /login.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly requestId?: string,
    /** Stable, machine-readable error code — branch on this, never the message. */
    public readonly code: string = 'INTERNAL_ERROR'
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Skip attaching the auth token (for login/register/refresh). */
  anonymous?: boolean;
  /** Per-request timeout override in ms. Defaults to config.apiTimeoutMs. */
  timeoutMs?: number;
  /** Internal: prevents infinite refresh recursion. */
  _isRetry?: boolean;
}

/**
 * fetch() with an abort-based timeout. If the request exceeds `timeoutMs`, the
 * AbortController fires and we surface a typed TIMEOUT ApiError so callers (and
 * TanStack Query) handle it like any other failure. A caller-supplied signal is
 * chained so React Query cancellations still work.
 */
async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('Request timed out', 0, undefined, 'TIMEOUT');
    }
    // Network failure (DNS, offline, CORS) — normalize to a typed error.
    throw new ApiError(
      err instanceof Error ? err.message : 'Network request failed',
      0,
      undefined,
      'NETWORK_ERROR'
    );
  } finally {
    clearTimeout(timer);
  }
}

function buildHeaders(anonymous: boolean): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (!anonymous) {
    const token = useAuthStore.getState().accessToken;
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function parseError(res: Response, json: unknown): Promise<ApiError> {
  // Handles both the canonical `{ error: {...} }` envelope and the
  // requirePermission `{ success:false, error:{ message, statusCode } }` shape.
  const err = json as ErrorEnvelope | null;
  return new ApiError(
    err?.error?.message ?? `Request failed (${res.status})`,
    res.status,
    err?.error?.requestId,
    err?.error?.code ?? (res.status === 403 ? 'FORBIDDEN' : 'INTERNAL_ERROR')
  );
}

// ── Single-flight refresh ──────────────────────────────────────────────────
// Multiple concurrent 401s share ONE refresh call so we don't hammer /refresh
// or rotate the token family repeatedly.
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetchWithTimeout(
        `${config.apiBaseUrl}${API_ENDPOINTS.AUTH.REFRESH}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        },
        config.apiTimeoutMs
      );
      if (!res.ok) return false;
      const json = (await res.json().catch(() => null)) as
        | { success: true; data: { accessToken: string } }
        | null;
      const accessToken = json?.data?.accessToken;
      if (!accessToken) return false;
      useAuthStore.getState().setAccessToken(accessToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function handleSessionExpired(): void {
  useAuthStore.getState().clearSession();
  // Avoid redirect loops if already on an auth page.
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    window.location.assign('/login');
  }
}

/**
 * Core fetch. Returns the FULL parsed body (envelope included). Higher-level
 * helpers unwrap `.data` as needed.
 */
async function rawRequest<TBody>(path: string, options: RequestOptions = {}): Promise<TBody> {
  const { method = 'GET', body, anonymous = false, _isRetry = false, timeoutMs } = options;

  const res = await fetchWithTimeout(
    `${config.apiBaseUrl}${path}`,
    {
      method,
      headers: buildHeaders(anonymous),
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'include',
    },
    timeoutMs ?? config.apiTimeoutMs
  );

  const json = (await res.json().catch(() => null)) as unknown;

  if (res.ok) return json as TBody;

  // ── 401 → attempt one refresh + retry ────────────────────────────────────
  if (res.status === 401 && !anonymous && !_isRetry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return rawRequest<TBody>(path, { ...options, _isRetry: true });
    }
    handleSessionExpired();
  }

  throw await parseError(res, json);
}

/** Request that unwraps the legacy `{ success, data }` envelope to `data`. */
async function request<TData>(path: string, options: RequestOptions = {}): Promise<TData> {
  const envelope = await rawRequest<{ success?: boolean; data: TData }>(path, options);
  return envelope.data;
}

export interface ContractRequestArgs {
  params?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

/**
 * Contract-driven request. Derives method + path from a shared endpoint
 * contract so the Admin never hardcodes either. Returns the FULL response body
 * (envelope included) typed as TResponse — callers pick `.data` / `.meta`.
 */
function requestContract<TResponse>(
  endpoint: ApiEndpoint,
  args: ContractRequestArgs = {}
): Promise<TResponse> {
  let path = buildPath(endpoint, args.params ?? {});
  if (args.query) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(args.query)) {
      if (value !== undefined && value !== '') search.append(key, String(value));
    }
    const qs = search.toString();
    if (qs) path += `?${qs}`;
  }
  return rawRequest<TResponse>(path, {
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

  /** Raw request returning the full response envelope (no unwrap). */
  raw: rawRequest,

  /** Contract-driven request returning the full response envelope. */
  request: requestContract,
};
