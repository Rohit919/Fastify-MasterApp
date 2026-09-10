import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useCurrentUser } from "@/modules/users/hooks/use-current-user";

/**
 * Authenticated app shell — sidebar + header + routed page content.
 * Loads the current user (and effective permissions) once for the shell so
 * permission-aware navigation and controls have the data they need.
 */
export function AppLayout() {
  // Fetch + sync effective permissions into the auth store.
  useCurrentUser();

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Header />
        <main style={{ flex: 1, padding: 24, background: "#f8fafc" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
