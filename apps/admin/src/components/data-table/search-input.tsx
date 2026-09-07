import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

/**
 * Debounced search box for list toolbars. Keeps local state responsive while
 * only pushing to the URL/query after the user pauses typing.
 */
export function SearchInput({
  value,
  onChange,
  placeholder,
  delay = 350,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  delay?: number;
}) {
  const [local, setLocal] = useState(value);

  // Sync when the external value changes (e.g. cleared filters / back nav).
  useEffect(() => setLocal(value), [value]);

  useEffect(() => {
    if (local === value) return;
    const id = setTimeout(() => onChange(local), delay);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local, delay]);

  return (
    <div className="relative w-full sm:w-72">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        className="pl-9"
        value={local}
        placeholder={placeholder}
        onChange={(e) => setLocal(e.target.value)}
      />
    </div>
  );
}
