import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AppBranding, BrandingContextValue } from "./branding.types";
import { DEFAULT_BRANDING } from "./branding.config";
import { fetchBranding, readCachedBranding } from "./branding.api";
import {
  applyThemeVariables,
  updateDocumentTitle,
  updateFavicon,
} from "./branding.utils";
import { useTenantStore } from "@/stores/tenant.store";

/**
 * Centralized branding provider — the ONE source of truth for tenant branding.
 *
 * Bootstrap flow:
 *  1. Seed synchronously from the last-good localStorage cache (or defaults) so
 *     the first paint already shows the tenant brand — no flash of default.
 *  2. Apply CSS variables / title / favicon immediately from that seed.
 *  3. Fetch the authoritative runtime config; when it resolves, update state
 *     and re-apply. On failure, defaults remain (isFallback = true).
 *
 * Sits ABOVE the app so every surface can consume branding via `useBranding()`.
 * Never accesses raw config directly elsewhere.
 */

const BrandingContext = createContext<BrandingContextValue | null>(null);

function getSeed(tenantId: string | null): AppBranding {
  return readCachedBranding(tenantId) ?? DEFAULT_BRANDING;
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  // The active tenant drives which branding we show. When it changes (login,
  // tenant switch), we re-seed from that tenant's cache and re-fetch so Tenant
  // A's brand is never shown under Tenant B (MULTI-TENANT §35, §67-§69).
  const activeTenantId = useTenantStore((s) => s.activeTenantId);

  const seed = useRef<AppBranding>(getSeed(activeTenantId));
  const [branding, setBranding] = useState<AppBranding>(seed.current);
  const [isLoading, setIsLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);
  const [nonce, setNonce] = useState(0);

  // Apply branding to the DOM whenever it changes (colors, title, favicon).
  useEffect(() => {
    applyThemeVariables(branding.colors);
    updateDocumentTitle(branding.appName);
    updateFavicon(branding.favicon);
  }, [branding]);

  // When the active tenant changes, immediately re-seed from that tenant's
  // cached brand (instant, no flash of the previous tenant) before the network
  // revalidates below.
  useEffect(() => {
    setBranding(getSeed(activeTenantId));
  }, [activeTenantId]);

  // Fetch authoritative runtime branding for the active tenant. Re-runs on
  // refresh() (nonce) and whenever the active tenant changes.
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchBranding(activeTenantId)
      .then((next) => {
        if (cancelled) return;
        // If fetch returned defaults (failure path), flag fallback so UI/telemetry
        // can react; we detect it by reference equality with DEFAULT_BRANDING.
        setIsFallback(next === DEFAULT_BRANDING);
        setBranding(next);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [nonce, activeTenantId]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  const value = useMemo<BrandingContextValue>(
    () => ({
      branding,
      appName: branding.appName,
      shortName: branding.shortName,
      colors: branding.colors,
      isLoading,
      isFallback,
      refresh,
    }),
    [branding, isLoading, isFallback, refresh],
  );

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

/**
 * Access the current branding. Always returns fully-resolved, safe values
 * (defaults until runtime config loads), so callers never null-check.
 */
export function useBranding(): BrandingContextValue {
  const ctx = useContext(BrandingContext);
  if (!ctx)
    throw new Error("useBranding must be used within a BrandingProvider");
  return ctx;
}
