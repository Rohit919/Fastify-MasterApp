import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Empty state. Distinguishes "no data exists" from "no results for the current
 * filter" via the `variant` prop so pages can message correctly.
 */
export function EmptyState({
  title,
  message,
  icon,
  action,
  variant = 'empty',
}: {
  title?: string;
  message?: string;
  icon?: ReactNode;
  action?: ReactNode;
  variant?: 'empty' | 'no-results';
}) {
  const defaultTitle = variant === 'no-results' ? 'No matching results' : 'Nothing here yet';
  const defaultMessage =
    variant === 'no-results'
      ? 'Try adjusting your search or filters.'
      : 'There is no data to display.';

  return (
    <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
      <div className="text-muted-foreground">{icon ?? <Inbox className="h-9 w-9" />}</div>
      <div>
        <p className="text-sm font-medium text-foreground">{title ?? defaultTitle}</p>
        <p className="mt-1 text-sm text-muted-foreground">{message ?? defaultMessage}</p>
      </div>
      {action}
    </div>
  );
}
