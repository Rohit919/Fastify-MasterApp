export function Loading({ label = "Loading…" }: { label?: string }) {
  return <div style={{ padding: 24, color: "#64748b" }}>{label}</div>;
}
