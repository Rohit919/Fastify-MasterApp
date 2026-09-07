import { Toaster as SonnerToaster } from 'sonner';
import { useTheme } from '@/app/providers/theme-provider';

/**
 * App-wide toast surface. One instance, theme-aware. Trigger toasts via the
 * `notify` helper in lib/notify.ts — never import sonner directly in features.
 */
export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <SonnerToaster
      theme={resolvedTheme}
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: 'group border-border bg-background text-foreground',
        },
      }}
    />
  );
}
