/**
 * Frontend runtime config. Vite exposes VITE_-prefixed env vars on
 * import.meta.env. In dev, API calls are proxied to :3000 (see vite.config.ts),
 * so the default base is empty (same-origin) and the versioned `/api/v1` prefix
 * comes from the centralized endpoint registry (API_ENDPOINTS).
 *
 * Set VITE_API_BASE_URL to a full origin (e.g. https://api.example.com) in
 * production; the endpoint paths already carry the `/api/v1` prefix.
 */
export const config = {
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "",
} as const;
