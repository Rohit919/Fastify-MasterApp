import type {
  AppBranding,
  BrandingColors,
  BrandingMetadata,
} from "@app/api-contracts";

/**
 * Branding types for the Admin. The wire shape (`AppBranding`) is owned by the
 * shared contract — we re-export it so the whole app has ONE source of truth
 * and never defines a second, drifting branding interface.
 *
 * Branding = application/tenant identity. It is deliberately separate from
 * user preferences (theme mode, language) which live in the theme provider /
 * i18n. A user toggling dark mode must never mutate branding.
 */
export type { AppBranding, BrandingColors, BrandingMetadata };

/** Value exposed by `useBranding()`. Always fully resolved (never partial). */
export interface BrandingContextValue {
  /** The resolved, validated branding currently applied. */
  branding: AppBranding;
  /** Convenience accessors (all derived from `branding`). */
  appName: string;
  shortName: string;
  colors: BrandingColors;
  /** True while the runtime config is still loading (defaults are shown). */
  isLoading: boolean;
  /** True if the runtime fetch failed and defaults are in use. */
  isFallback: boolean;
  /** Force a re-fetch of runtime branding (e.g. after an admin edit). */
  refresh: () => void;
}
