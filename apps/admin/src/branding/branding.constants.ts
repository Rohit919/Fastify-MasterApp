/**
 * Branding constants — the single place for the CSS-variable names, storage
 * keys, and asset-URL policy the branding system depends on. Keeping these
 * here avoids magic strings scattered across the provider/utils.
 */

/**
 * Maps a branding color to the CSS custom properties it drives. These names
 * MUST match the tokens declared in src/styles/globals.css and consumed by
 * tailwind.config.ts (`hsl(var(--x))`). We only override brand-relevant
 * tokens; everything else keeps the design-system default.
 *
 * `primary` also drives `--ring` and `--sidebar-accent` so focus rings and the
 * active-nav highlight track the brand color — matching how globals.css wires
 * them today.
 */
export const BRAND_COLOR_VARS = {
  primary: ["--primary", "--ring", "--sidebar-accent"],
  secondary: ["--secondary"],
  accent: ["--accent"],
} as const;

export type BrandColorKey = keyof typeof BRAND_COLOR_VARS;

/** Base localStorage key caching the last good branding for instant next-load. */
export const BRANDING_CACHE_KEY = "admin-branding";

/**
 * Per-tenant branding cache key. Namespacing by tenant ensures Tenant A's brand
 * is never seeded/flashed while Tenant B is active (MULTI-TENANT §35, §69).
 * With no active tenant (platform-only / single-tenant), the base key is used.
 */
export function brandingCacheKey(tenantId?: string | null): string {
  return tenantId ? `${BRANDING_CACHE_KEY}:${tenantId}` : BRANDING_CACHE_KEY;
}

/** DOM id for the favicon <link> the FaviconManager owns. */
export const FAVICON_LINK_ID = "app-favicon";

/**
 * Allowed schemes for tenant-supplied asset URLs. Absolute URLs must be https;
 * relative paths (starting with `/`) are also allowed (same-origin assets).
 * Everything else — notably `javascript:` and `data:` — is rejected.
 */
export const ALLOWED_ASSET_PROTOCOLS = ["https:"] as const;
