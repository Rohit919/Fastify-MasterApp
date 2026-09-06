export function EmptyState({ message = 'Nothing here yet.' }: { message?: string }) {
  return <div style={{ padding: 24, color: '#94a3b8', textAlign: 'center' }}>{message}</div>;
}
