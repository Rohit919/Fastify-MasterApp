import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface QuickAction {
  to: string;
  label: string;
  icon: LucideIcon;
}

/** Reusable quick-actions panel — a list of links into common admin flows. */
export function QuickActions({ title, actions }: { title: string; actions: QuickAction[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {actions.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
          >
            <span className="flex items-center gap-3">
              <Icon className="h-4 w-4 text-muted-foreground" />
              {label}
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
