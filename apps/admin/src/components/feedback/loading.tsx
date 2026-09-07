import { Spinner } from '@/components/ui/spinner';

export function Loading({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
      <Spinner />
      <span>{label ?? 'Loading…'}</span>
    </div>
  );
}
