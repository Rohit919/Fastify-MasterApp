import { cn } from '@/lib/utils';

/**
 * Minimal initials avatar. Kept dependency-free (no image loading) because the
 * backend user model has no avatar field yet; swap to an image-backed avatar
 * when the API exposes one.
 */
export function Avatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const text = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <span
      className={cn(
        'inline-flex h-9 w-9 select-none items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary',
        className
      )}
      aria-hidden="true"
    >
      {text || '?'}
    </span>
  );
}
