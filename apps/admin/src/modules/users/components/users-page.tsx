import { useState } from "react";
import { PermissionKeys, type UserListItem } from "@app/api-contracts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table } from "@/components/ui/table";
import { Loading } from "@/components/feedback/loading";
import { ErrorState } from "@/components/feedback/error-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { formatDate } from "@/lib/utils";
import { useUsers } from "../hooks/use-users";
import { usePermissions } from "@/modules/auth/hooks/use-permissions";
import { UserRolesEditor } from "@/modules/roles/components/user-roles-editor";

export function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleUserId, setRoleUserId] = useState<string | null>(null);
  const { can } = usePermissions();
  const users = useUsers(page, search);

  if (users.isLoading) return <Loading label="Loading users…" />;
  if (users.error) return <ErrorState message={users.error.message} />;

  const rows = users.data?.data ?? [];
  const meta = users.data?.meta;

  return (
    <section>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
        }}
      >
        <h1 style={{ marginTop: 0, fontSize: 22, color: "#1e293b" }}>Users</h1>
        <div style={{ width: 320 }}>
          <Input
            aria-label="Search users"
            placeholder="Search name or email"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState message="No users found." />
      ) : (
        <Table<UserListItem>
          rowKey={(user) => user.id}
          rows={rows}
          columns={[
            { header: "Name", render: (user) => user.name },
            { header: "Email", render: (user) => user.email },
            { header: "Role", render: (user) => user.role },
            { header: "Created", render: (user) => formatDate(user.createdAt) },
            {
              header: "Actions",
              render: (user) =>
                can(PermissionKeys.UsersRolesUpdate) ? (
                  <Button
                    variant="secondary"
                    onClick={() => setRoleUserId(user.id)}
                  >
                    Manage roles
                  </Button>
                ) : (
                  "—"
                ),
            },
          ]}
        />
      )}

      {roleUserId && (
        <UserRolesEditor
          userId={roleUserId}
          onClose={() => setRoleUserId(null)}
        />
      )}

      {meta && (
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginTop: 16,
          }}
        >
          <Button
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
          >
            Previous
          </Button>
          <span>
            Page {meta.page} of {Math.max(meta.totalPages, 1)} · {meta.total}{" "}
            users
          </span>
          <Button
            variant="secondary"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </section>
  );
}
