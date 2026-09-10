import { useCurrentUser } from "@/modules/users/hooks/use-current-user";
import { Loading } from "@/components/feedback/loading";
import { ErrorState } from "@/components/feedback/error-state";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 10,
        padding: 20,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        flex: 1,
      }}
    >
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: "#1e293b" }}>
        {value}
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { data: user, isLoading, error } = useCurrentUser();

  if (isLoading) return <Loading label="Loading dashboard…" />;
  if (error)
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Failed to load"}
      />
    );

  return (
    <section>
      <h1 style={{ marginTop: 0, fontSize: 22, color: "#1e293b" }}>
        Dashboard
      </h1>
      <p style={{ color: "#475569", marginTop: -8 }}>
        Welcome back{user ? `, ${user.name}` : ""}.
      </p>
      <div style={{ display: "flex", gap: 16, marginTop: 20 }}>
        <StatCard label="Signed in as" value={user?.email ?? "—"} />
        <StatCard label="Role" value={user?.role ?? "—"} />
        <StatCard label="Session" value="Active" />
      </div>
    </section>
  );
}
