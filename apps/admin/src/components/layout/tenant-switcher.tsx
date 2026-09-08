import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTenantStore } from "@/stores/tenant.store";
import { useSwitchTenant } from "@/modules/tenants/hooks/use-switch-tenant";

/**
 * Active-tenant switcher. Renders only when the user belongs to more than one
 * tenant — single-tenant users have nothing to switch. Switching goes through
 * useSwitchTenant, which re-scopes the token, resets the cache, and reloads.
 *
 * UX only: the backend validates the target tenant membership; a user cannot
 * switch to a tenant they don't belong to even by tampering with this UI.
 */
export function TenantSwitcher() {
  const { t } = useTranslation();
  const activeTenant = useTenantStore((s) => s.activeTenant);
  const activeTenantId = useTenantStore((s) => s.activeTenantId);
  const availableTenants = useTenantStore((s) => s.availableTenants);
  const switchTenant = useSwitchTenant();

  // Nothing to switch between — hide the control entirely.
  if (availableTenants.length < 2) return null;

  const label =
    activeTenant?.name ??
    t("common:tenant.select", { defaultValue: "Select tenant" });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex max-w-[12rem] items-center gap-2"
          disabled={switchTenant.isPending}
          aria-label={t("common:tenant.switch", {
            defaultValue: "Switch tenant",
          })}
        >
          <Building2 className="h-4 w-4 shrink-0" />
          <span className="truncate">{label}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>
          {t("common:tenant.label", { defaultValue: "Organizations" })}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableTenants.map((tenant) => {
          const isActive = tenant.id === activeTenantId;
          return (
            <DropdownMenuItem
              key={tenant.id}
              disabled={isActive || switchTenant.isPending}
              onClick={() => {
                if (!isActive) switchTenant.mutate(tenant.id);
              }}
            >
              <Check
                className={cn(
                  "h-4 w-4",
                  isActive ? "opacity-100" : "opacity-0",
                )}
              />
              <span className="truncate">{tenant.name}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
