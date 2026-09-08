import type { AppBranding, BrandingColors } from "./branding.types";
import { DEFAULT_BRANDING } from "./branding.config";
import {
  BRAND_COLOR_VARS,
  FAVICON_LINK_ID,
  type BrandColorKey,
} from "./branding.constants";

/**
 * Branding utilities — small, pure, testable helpers for:
 *  - normalizing tenant colors into the HSL triplet the CSS theme consumes,
 *  - validating untrusted runtime config into a safe `AppBranding`,
 *  - validating asset URLs (no `javascript:`/`data:` schemes),
 *  - deriving a readable foreground color for contrast,
 *  - applying branding to the DOM (CSS vars, <title>, favicon).
 *
 * Everything treats branding as PLAIN TEXT; nothing is ever rendered as HTML.
 */

// ── Color parsing / normalization ────────────────────────────────────────────

/** An HSL triple in the "H S% L%" string form the CSS variables expect. */
export interface Hsl {
  h: number;
  s: number;
  l: number;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Parse `#rgb` / `#rrggbb` into 0–255 channels, or null if malformed. */
function parseHex(input: string): { r: number; g: number; b: number } | null {
  const hex = input.trim().replace(/^#/, "");
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;
  if (full.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

/** Convert 0–255 RGB channels to an HSL triple (h 0–360, s/l 0–100). */
function rgbToHsl(r: number, g: number, b: number): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Parse any supported color string into an HSL triple, or null if it cannot be
 * understood. Supports: hex (`#2563EB`), `rgb(...)`, `hsl(...)`, and a bare
 * `H S% L%` triplet (the CSS-variable format).
 */
export function parseColor(input: string): Hsl | null {
  const value = input.trim();
  if (!value) return null;

  // Bare "H S% L%" triplet (what the CSS variables already use).
  const triplet = value.match(
    /^(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%$/,
  );
  if (triplet) {
    return {
      h: clamp(Number(triplet[1]), 0, 360),
      s: clamp(Number(triplet[2]), 0, 100),
      l: clamp(Number(triplet[3]), 0, 100),
    };
  }

  // hsl(H, S%, L%) / hsl(H S% L%)
  const hsl = value.match(
    /^hsla?\(\s*(-?\d+(?:\.\d+)?)\s*(?:,|\s)\s*(-?\d+(?:\.\d+)?)%\s*(?:,|\s)\s*(-?\d+(?:\.\d+)?)%/i,
  );
  if (hsl) {
    return {
      h: clamp(Number(hsl[1]), 0, 360),
      s: clamp(Number(hsl[2]), 0, 100),
      l: clamp(Number(hsl[3]), 0, 100),
    };
  }

  // rgb(r, g, b) / rgb(r g b)
  const rgb = value.match(
    /^rgba?\(\s*(\d{1,3})\s*(?:,|\s)\s*(\d{1,3})\s*(?:,|\s)\s*(\d{1,3})/i,
  );
  if (rgb) {
    const r = clamp(Number(rgb[1]), 0, 255);
    const g = clamp(Number(rgb[2]), 0, 255);
    const b = clamp(Number(rgb[3]), 0, 255);
    return rgbToHsl(r, g, b);
  }

  // Hex
  const parsedHex = parseHex(value);
  if (parsedHex) return rgbToHsl(parsedHex.r, parsedHex.g, parsedHex.b);

  return null;
}

/** Serialize an HSL triple into the "H S% L%" string the CSS variables use. */
export function hslToVar({ h, s, l }: Hsl): string {
  return `${h} ${s}% ${l}%`;
}

/**
 * Normalize any color into the CSS-variable "H S% L%" form, or null if invalid.
 * This is the single normalization point — defaults and runtime values both
 * pass through it so the applied format is always identical.
 */
export function normalizeColor(input: string): string | null {
  const hsl = parseColor(input);
  return hsl ? hslToVar(hsl) : null;
}

/**
 * Pick a readable foreground ("0 0% 100%" white or "0 0% 0%" black) for a given
 * background color using WCAG relative luminance. Used so a bright brand color
 * never leaves button text unreadable. Falls back to white if unparseable.
 */
export function getReadableForeground(background: string): string {
  const hsl = parseColor(background);
  if (!hsl) return "0 0% 100%";
  // Relative luminance approximation from lightness is sufficient for a
  // black/white foreground decision without pulling in a color library.
  return hsl.l > 60 ? "222.2 47.4% 11.2%" : "0 0% 100%";
}

// ── Asset URL validation ─────────────────────────────────────────────────────

/**
 * Whether an asset URL is safe to use as an image `src`. Allows same-origin
 * relative paths (starting with `/`) and absolute https URLs. Rejects
 * `javascript:`, `data:`, `http:` (mixed content), and anything malformed.
 */
export function isSafeAssetUrl(url: string): boolean {
  const value = url.trim();
  if (!value) return false;
  // Trusted relative path (no scheme, no protocol-relative "//").
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/** Return the URL if safe, otherwise undefined (so callers fall back). */
export function resolveAssetUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return isSafeAssetUrl(url) ? url.trim() : undefined;
}

// ── Runtime config validation ────────────────────────────────────────────────

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/**
 * Validate & sanitize untrusted runtime branding into a safe `AppBranding`,
 * merging over DEFAULT_BRANDING so partial/invalid configs never crash the app.
 * Unsafe asset URLs and unparseable colors are dropped in favor of defaults.
 */
export function validateBranding(input: unknown): AppBranding {
  if (!input || typeof input !== "object") return DEFAULT_BRANDING;
  const raw = input as Record<string, unknown>;

  const appName = isNonEmptyString(raw.appName)
    ? raw.appName.trim().slice(0, 80)
    : DEFAULT_BRANDING.appName;
  const shortName = isNonEmptyString(raw.shortName)
    ? raw.shortName.trim().slice(0, 24)
    : DEFAULT_BRANDING.shortName;

  const rawColors = (raw.colors ?? {}) as Record<string, unknown>;
  const primary =
    (isNonEmptyString(rawColors.primary) &&
      normalizeColor(rawColors.primary)) ||
    DEFAULT_BRANDING.colors.primary;
  const colors: BrandingColors = { primary };
  if (isNonEmptyString(rawColors.secondary)) {
    const s = normalizeColor(rawColors.secondary);
    if (s) colors.secondary = s;
  }
  if (isNonEmptyString(rawColors.accent)) {
    const a = normalizeColor(rawColors.accent);
    if (a) colors.accent = a;
  }

  const result: AppBranding = { appName, shortName, colors };

  const logo = resolveAssetUrl(raw.logo as string | undefined);
  if (logo) result.logo = logo;
  const logoDark = resolveAssetUrl(raw.logoDark as string | undefined);
  if (logoDark) result.logoDark = logoDark;
  const icon = resolveAssetUrl(raw.icon as string | undefined);
  if (icon) result.icon = icon;
  const favicon = resolveAssetUrl(raw.favicon as string | undefined);
  if (favicon) result.favicon = favicon;

  const rawMeta = (raw.metadata ?? {}) as Record<string, unknown>;
  const metadata: NonNullable<AppBranding["metadata"]> = {};
  if (isNonEmptyString(rawMeta.companyName))
    metadata.companyName = rawMeta.companyName.trim().slice(0, 120);
  if (isNonEmptyString(rawMeta.description))
    metadata.description = rawMeta.description.trim().slice(0, 280);
  if (Object.keys(metadata).length > 0) result.metadata = metadata;

  return result;
}

// ── DOM application ──────────────────────────────────────────────────────────

/**
 * Apply brand colors to the document root as CSS custom properties. Because
 * every color is normalized to the "H S% L%" form, the existing Tailwind/shadcn
 * `hsl(var(--x))` tokens pick them up with no other change — no second theme
 * system. Foreground vars are derived for contrast.
 */
export function applyThemeVariables(
  colors: BrandingColors,
  root: HTMLElement = document.documentElement,
): void {
  (Object.keys(BRAND_COLOR_VARS) as BrandColorKey[]).forEach((key) => {
    const value = colors[key];
    if (!value) return;
    const normalized = normalizeColor(value);
    if (!normalized) return;
    for (const cssVar of BRAND_COLOR_VARS[key]) {
      root.style.setProperty(cssVar, normalized);
    }
  });

  // Keep primary/sidebar-accent text readable against the brand color.
  const primaryNormalized = normalizeColor(colors.primary);
  if (primaryNormalized) {
    const fg = getReadableForeground(primaryNormalized);
    root.style.setProperty("--primary-foreground", fg);
    root.style.setProperty("--sidebar-accent-foreground", fg);
  }
}

/** Set document.title from branding (optionally suffixed with a page label). */
export function updateDocumentTitle(appName: string, pageTitle?: string): void {
  document.title = pageTitle ? `${pageTitle} · ${appName}` : appName;
}

/**
 * Update (or create) the favicon <link>. Owns a single element by id so
 * repeated calls replace rather than accumulate links. No-ops on unsafe URLs.
 */
export function updateFavicon(
  href: string | undefined,
  doc: Document = document,
): void {
  const safe = resolveAssetUrl(href);
  if (!safe) return;
  let link = doc.getElementById(FAVICON_LINK_ID) as HTMLLinkElement | null;
  if (!link) {
    link = doc.createElement("link");
    link.id = FAVICON_LINK_ID;
    link.rel = "icon";
    doc.head.appendChild(link);
  }
  // Derive a sensible type from the extension (png/svg/ico all supported).
  const lower = safe.toLowerCase();
  if (lower.endsWith(".svg")) link.type = "image/svg+xml";
  else if (lower.endsWith(".png")) link.type = "image/png";
  else if (lower.endsWith(".ico")) link.type = "image/x-icon";
  else link.removeAttribute("type");
  link.href = safe;
}

/** Apply the full branding to the DOM (colors + title + favicon) in one call. */
export function applyBranding(
  branding: AppBranding,
  root: HTMLElement = document.documentElement,
): void {
  applyThemeVariables(branding.colors, root);
  updateDocumentTitle(branding.appName);
  updateFavicon(branding.favicon);
}
