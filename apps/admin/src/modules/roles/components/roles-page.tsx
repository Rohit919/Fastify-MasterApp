import { useRoles } from '@/modules/roles/hooks/use-roles';
import { Table } from '@/components/ui/table';
import { Loading } from '@/components/feedback/loading';
import { ErrorState } from '@/components/feedback/error-state';
import { EmptyState } from '@/components/feedback/empty-state';
import type { RoleDto } from '@app/api-contracts';

/**
 * Roles management page. Lists roles and their permissions.
 * Visibility of this page is gated by the roles.read permission (see sidebar);
 * the API independently enforces roles.read on GET /admin/roles.
 */
export function RolesPage() {
  const { data, isLoading, error } = useRoles();

  if (isLoading) return <Loading label="Loading roles…" />;
  if (error) {
    return <ErrorState message={error instanceof Error ? error.message : 'Failed to load roles'} />;
  }

  const rows = data ?? [];
  if (rows.length === 0) return <EmptyState message="No roles found." />;

  return (
    <section>
      <h1 style={{ marginTop: 0, fontSize: 22, color: '#1e293b' }}>Roles</h1>
      <div
        style={{
          background: '#fff',
          borderRadius: 10,
          padding: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        <Table<RoleDto>
          rowKey={(r) => r.id}
          rows={rows}
          columns={[
            { header: 'Name', render: (r) => r.name },
            { header: 'Description', render: (r) => r.description ?? '—' },
            { header: 'System', render: (r) => (r.isSystem ? 'Yes' : 'No') },
            {
              header: 'Permissions',
              render: (r) => (
                <span style={{ fontSize: 12, color: '#475569' }}>
                  {r.permissions.length > 0 ? `${r.permissions.length} permission(s)` : '—'}
                </span>
              ),
            },
          ]}
        />
      </div>
    </section>
  );
}
