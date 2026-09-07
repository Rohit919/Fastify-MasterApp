import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { ThemeProvider } from '@/app/providers/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import '@/i18n';

/**
 * Composes all app-wide providers in one place (theme → query → toasts), so
 * main.tsx stays a thin mount point and provider order is explicit.
 * i18n is initialized on import (side effect above).
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
