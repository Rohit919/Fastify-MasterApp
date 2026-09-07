import { Menu } from 'lucide-react';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { ThemeSwitcher } from '@/components/layout/theme-switcher';
import { UserMenu } from '@/components/layout/user-menu';
import { Button } from '@/components/ui/button';

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onMenuClick}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="hidden md:block">
        <Breadcrumbs />
      </div>

      <div className="ml-auto flex items-center gap-1">
        <ThemeSwitcher />
        <UserMenu />
      </div>
    </header>
  );
}
