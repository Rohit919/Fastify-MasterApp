import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { usePermissions } from "@/modules/auth/hooks/use-permissions";
import { NAV_ROUTES } from "@/app/router/route-config";

/**
 * Global command palette (⌘/Ctrl-K). Lists only the nav destinations the caller
 * is permitted to reach (route-config permission gates), and navigates on
 * select. UX only — routes remain guarded independently.
 */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { t } = useTranslation();

  // Toggle on ⌘K / Ctrl-K anywhere in the app.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const items = NAV_ROUTES.filter(
    (r) => !r.hideInNav && (!r.permission || can(r.permission)),
  );

  const go = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      label={t("common:command.label")}
    >
      <CommandInput placeholder={t("common:command.placeholder")} />
      <CommandList>
        <CommandEmpty>{t("common:command.empty")}</CommandEmpty>
        <CommandGroup heading={t("nav:sections.overview")}>
          {items.map((route) => {
            const Icon = route.icon;
            return (
              <CommandItem
                key={route.path}
                value={t(route.titleKey)}
                onSelect={() => go(route.path)}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {t(route.titleKey)}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
