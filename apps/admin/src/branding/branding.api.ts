import { apiClient } from "@/lib/api-client";
import {
  BRANDING_CONTRACTS,
  type AppBrandingResponse,
} from "@app/api-contracts";
import type { AppBranding } from "./branding.types";
import { DEFAULT_BRANDING } from "./branding.config";
import { validateBranding } from "./branding.utils";
import { brandingCacheKey } from "./branding.constants";

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

/**
 * Fetch + validate runtime branding for the active tenant. Falls back to
 * defaults on any error. The active tenant is sent automatically via the
 * X-Tenant-Id header (see api-client); `tenantId` here only namespaces the
 * last-good cache so tenants never share a cached brand.
 */
export async function fetchBranding(
  tenantId?: string | null,
): Promise<AppBranding> {
  try {
    const envelope = await apiClient.request<AppBrandingResponse>(
      BRANDING_CONTRACTS.GET,
    );
    const validated = validateBranding(envelope?.data);
    writeCachedBranding(validated, tenantId);
    return validated;
  } catch {
    return DEFAULT_BRANDING;
  }
}

/** Read the last-good cached branding for a tenant, or null if none/invalid. */
export function readCachedBranding(
  tenantId?: string | null,
): AppBranding | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(brandingCacheKey(tenantId));
    if (!raw) return null;
    return validateBranding(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Persist a validated branding snapshot (per tenant) for instant next-load. */
export function writeCachedBranding(
  branding: AppBranding,
  tenantId?: string | null,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      brandingCacheKey(tenantId),
      JSON.stringify(branding),
    );
  } catch {
    // Storage full / disabled — non-fatal; runtime fetch still works.
  }
}
