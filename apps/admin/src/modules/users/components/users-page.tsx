import { useCurrentUser } from '@/modules/users/hooks/use-current-user';
import { Table } from '@/components/ui/table';
import { Loading } from '@/components/feedback/loading';
import { ErrorState } from '@/components/feedback/error-state';
import { EmptyState } from '@/components/feedback/empty-state';
import { formatDate } from '@/lib/utils';
import type { UserProfile } from '@app/api-contracts';

/**
 * Users page.
 * The API currently exposes GET /users/me. When a list endpoint
 * (GET /users) is added on the backend, swap useCurrentUser for a
 * useUsers() list hook — the Table below already renders a UserProfile[].
 */
export function UsersPage() {
  const { data, isLoading, error } = useCurrentUser();

  if (isLoading) return <Loading label="Loading users…" />;
  if (error) return <ErrorState message={error instanceof Error ? error.message : 'Failed to load users'} />;

  const rows: UserProfile[] = data ? [data] : [];
  if (rows.length === 0) return <EmptyState message="No users found." />;

  return (
    <section>
      <h1 style={{ marginTop: 0, fontSize: 22, color: '#1e293b' }}>Users</h1>
      <div style={{ background: '#fff', borderRadius: 10, padding: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <Table<UserProfile>
          rowKey={(u) => u.id}
          rows={rows}
          columns={[
            { header: 'Name', render: (u) => u.name },
            { header: 'Email', render: (u) => u.email },
            { header: 'Role', render: (u) => u.role },
            { header: 'Created', render: (u) => formatDate(u.createdAt) },
          ]}
        />
      </div>
    </section>
  );
}
