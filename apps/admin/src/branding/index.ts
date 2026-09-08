/**
 * White-label branding module — public surface.
 *
 * Import branding through this barrel only. It exposes the provider, the
 * `useBranding` hook, the reusable brand components, the default config, and
 * the pure utilities. Nothing else in the app should read raw branding config
 * or redefine branding types.
 */
export { BrandingProvider, useBranding } from "./branding.provider";
export { DEFAULT_BRANDING } from "./branding.config";

export { AppLogo } from "./components/app-logo";
export { AppIcon } from "./components/app-icon";
export { AppName } from "./components/app-name";
export { DocumentTitle } from "./components/document-title";
export { FaviconManager } from "./components/favicon-manager";

export {
  applyBranding,
  applyThemeVariables,
  updateDocumentTitle,
  updateFavicon,
  validateBranding,
  normalizeColor,
  parseColor,
  isSafeAssetUrl,
  resolveAssetUrl,
  getReadableForeground,
} from "./branding.utils";

export { fetchBranding, readCachedBranding } from "./branding.api";

export type {
  AppBranding,
  BrandingColors,
  BrandingMetadata,
  BrandingContextValue,
} from "./branding.types";
