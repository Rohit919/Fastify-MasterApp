import { apiClient } from "@/lib/api-client";
import {
  BRANDING_CONTRACTS,
  type AppBrandingResponse,
} from "@app/api-contracts";
import type { AppBranding } from "./branding.types";
import { DEFAULT_BRANDING } from "./branding.config";
import { validateBranding } from "./branding.utils";
import { BRANDING_CACHE_KEY } from "./branding.constants";

/**
 * Branding data access.
 *
 * Fetches the tenant branding from the contract-driven `GET /api/v1/branding`
 * (public). The response is external, untrusted data, so it is ALWAYS run
 * through `validateBranding` before use. On any failure we return safe defaults
 * — branding is non-critical and must never take the Admin down.
 *
 * A last-good copy is cached in localStorage so a subsequent load can apply the
 * brand instantly (avoiding a flash of the default) while the network revalidates.
 */

/** Fetch + validate runtime branding. Falls back to defaults on any error. */
export async function fetchBranding(): Promise<AppBranding> {
  try {
    const envelope = await apiClient.request<AppBrandingResponse>(
      BRANDING_CONTRACTS.GET,
    );
    const validated = validateBranding(envelope?.data);
    writeCachedBranding(validated);
    return validated;
  } catch {
    return DEFAULT_BRANDING;
  }
}

/** Read the last-good cached branding, or null if none/invalid. */
export function readCachedBranding(): AppBranding | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(BRANDING_CACHE_KEY);
    if (!raw) return null;
    return validateBranding(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Persist a validated branding snapshot for instant next-load application. */
export function writeCachedBranding(branding: AppBranding): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(branding));
  } catch {
    // Storage full / disabled — non-fatal; runtime fetch still works.
  }
}
