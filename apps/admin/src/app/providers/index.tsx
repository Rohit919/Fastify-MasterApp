import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { ThemeProvider } from "@/app/providers/theme-provider";
import { BrandingProvider } from "@/branding";
import { Toaster } from "@/components/ui/toaster";
import "@/i18n";

/**
 * Composes all app-wide providers in one place (theme → branding → query →
 * toasts), so main.tsx stays a thin mount point and provider order is explicit.
 * i18n is initialized on import (side effect above).
 *
 * BrandingProvider sits inside ThemeProvider (so brand components can read the
 * resolved light/dark theme, e.g. to pick a dark logo) and above the app so
 * every surface can consume `useBranding()`. It applies brand CSS variables,
 * the document title, and the favicon at bootstrap.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <BrandingProvider>
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster />
        </QueryClientProvider>
      </BrandingProvider>
    </ThemeProvider>
  );
}
