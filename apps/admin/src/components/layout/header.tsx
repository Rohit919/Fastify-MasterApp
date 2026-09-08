import { Menu, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import { UserMenu } from "@/components/layout/user-menu";
import { TenantSwitcher } from "@/components/layout/tenant-switcher";
import { Button } from "@/components/ui/button";

export function Header({
  onMenuClick,
  onSearchClick,
}: {
  onMenuClick: () => void;
  onSearchClick: () => void;
}) {
  const { t } = useTranslation();

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

      {/* Active-tenant switcher (only rendered for multi-tenant users). */}
      <TenantSwitcher />

      <div className="ml-auto flex items-center gap-1">
        {/* Command-palette trigger — click or ⌘/Ctrl-K. */}
        <Button
          variant="outline"
          size="sm"
          onClick={onSearchClick}
          className="hidden items-center gap-2 text-muted-foreground sm:flex"
        >
          <Search className="h-4 w-4" />
          {t("common:command.trigger")}
          <kbd className="pointer-events-none ml-2 hidden items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium md:inline-flex">
            ⌘K
          </kbd>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden"
          onClick={onSearchClick}
          aria-label={t("common:command.trigger")}
        >
          <Search className="h-5 w-5" />
        </Button>
        <ThemeSwitcher />
        <UserMenu />
      </div>
    </header>
  );
}
