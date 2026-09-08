import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { CommandPalette } from "@/components/layout/command-palette";
import { ErrorBoundary } from "@/components/feedback/error-boundary";
import { useCurrentUser } from "@/modules/users/hooks/use-current-user";
import { useTenants } from "@/modules/tenants/hooks/use-tenants";

/**
 * Authenticated app shell — sidebar + header + routed page content.
 * Loads the current user (and effective permissions) once for the shell so
 * permission-aware navigation and controls have the data they need. No
 * feature-specific business logic lives here.
 */
export function AdminLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const location = useLocation();

  // Fetch + sync effective permissions (and active tenant) into the stores.
  useCurrentUser();
  // Load the user's tenants so the switcher can render (multi-tenant users).
  useTenants();

  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar
        mobileOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          onMenuClick={() => setMobileNavOpen(true)}
          onSearchClick={() => setCommandOpen(true)}
        />
        <main className="flex-1 p-4 md:p-6">
          {/* Keyed by pathname so navigating away resets a crashed page. A
              feature crash is contained here and never takes down the shell. */}
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
