import type { AppBranding } from "./branding.types";

/**
 * Default (fallback) branding.
 *
 * Used when: runtime config is unavailable, the API request fails, or the
 * returned config is invalid/incomplete. Mirrors the project's current default
 * brand so the app looks identical to today when no tenant config is present.
 *
 * The primary color is expressed as an HSL triplet ("H S% L%") because that is
 * the format the CSS theme variables consume directly (see globals.css). The
 * runtime validator normalizes hex/rgb into this same format, so defaults and
 * runtime values are applied identically.
 */
export const DEFAULT_BRANDING: AppBranding = {
  appName: "Admin · Logistics",
  shortName: "Admin",
  colors: {
    // 243 75% 59% == the current --primary (indigo) in globals.css.
    primary: "243 75% 59%",
  },
  metadata: {
    companyName: "Logistics",
    description: "Secure admin control panel.",
  },
};
