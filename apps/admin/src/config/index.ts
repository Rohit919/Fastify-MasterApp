/**
 * Frontend runtime config. Vite exposes VITE_-prefixed env vars on
 * import.meta.env. In dev, API calls are proxied to :3000 (see vite.config.ts),
 * so the default base is a relative '/api/v1'.
 */
export const config = {
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api/v1',
} as const;
