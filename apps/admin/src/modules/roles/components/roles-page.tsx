import { useEffect, useState, type FormEvent } from "react";
import { PermissionKeys, type RoleDto } from "@app/api-contracts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table } from "@/components/ui/table";
import { Loading } from "@/components/feedback/loading";
import { ErrorState } from "@/components/feedback/error-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { usePermissions } from "@/modules/auth/hooks/use-permissions";
import { useRoles } from "../hooks/use-roles";
import {
  useCreateRole,
  useDeleteRole,
  usePermissionsCatalog,
  useUpdateRole,
} from "../hooks/use-role-mutations";

export function RolesPage() {
  const roles = useRoles();
  const catalog = usePermissionsCatalog();
  const create = useCreateRole();
  const update = useUpdateRole();
  const remove = useDeleteRole();
  const { can } = usePermissions();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<RoleDto | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [selectedDescription, setSelectedDescription] = useState("");

  useEffect(() => {
    setSelectedPermissions(selected?.permissions ?? []);
    setSelectedDescription(selected?.description ?? "");
  }, [selected]);

  if (roles.isLoading) return <Loading label="Loading roles…" />;
  if (roles.error) return <ErrorState message={roles.error.message} />;

  const submitCreate = (event: FormEvent) => {
    event.preventDefault();
    create.mutate(
      { name, description: description || undefined },
      {
        onSuccess: () => {
          setName("");
          setDescription("");
        },
      },
    );
  };

  const rows = roles.data ?? [];
  return (
    <section>
      <h1 style={{ marginTop: 0, fontSize: 22, color: "#1e293b" }}>Roles</h1>

      {can(PermissionKeys.RolesCreate) && (
        <form
          onSubmit={submitCreate}
          style={{
            display: "flex",
            gap: 8,
            alignItems: "end",
            marginBottom: 20,
          }}
        >
          <Input
            label="Role name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <Input
            label="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <Button type="submit" disabled={create.isPending}>
            Create role
          </Button>
        </form>
      )}

      {rows.length === 0 ? (
        <EmptyState message="No roles found." />
      ) : (
        <Table<RoleDto>
          rowKey={(role) => role.id}
          rows={rows}
          columns={[
            { header: "Name", render: (role) => role.name },
            {
              header: "Description",
              render: (role) => role.description ?? "—",
            },
            {
              header: "System",
              render: (role) => (role.isSystem ? "Yes" : "No"),
            },
            {
              header: "Permissions",
              render: (role) => `${role.permissions.length} permission(s)`,
            },
            {
              header: "Actions",
              render: (role) => (
                <div style={{ display: "flex", gap: 6 }}>
                  {can(PermissionKeys.RolesUpdate) && (
                    <Button
                      variant="secondary"
                      onClick={() => setSelected(role)}
                    >
                      Edit
                    </Button>
                  )}
                  {!role.isSystem && can(PermissionKeys.RolesDelete) && (
                    <Button
                      variant="danger"
                      disabled={remove.isPending}
                      onClick={() => {
                        if (window.confirm(`Delete role ${role.name}?`))
                          remove.mutate(role.id);
                      }}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
        />
      )}

      {selected && (
        <div
          style={{
            marginTop: 24,
            padding: 16,
            border: "1px solid #cbd5e1",
            borderRadius: 8,
          }}
        >
          <h2 style={{ marginTop: 0 }}>Edit {selected.name}</h2>
          <Input
            label="Description"
            value={selectedDescription}
            onChange={(event) => setSelectedDescription(event.target.value)}
          />
          <fieldset style={{ marginTop: 12, maxHeight: 260, overflow: "auto" }}>
            <legend>Permissions</legend>
            {(catalog.data ?? []).map((permission) => (
              <label
                key={permission.key}
                style={{ display: "block", padding: 4 }}
              >
                <input
                  type="checkbox"
                  checked={selectedPermissions.includes(permission.key)}
                  onChange={(event) =>
                    setSelectedPermissions((current) =>
                      event.target.checked
                        ? [...current, permission.key]
                        : current.filter((key) => key !== permission.key),
                    )
                  }
                />{" "}
                {permission.key}
              </label>
            ))}
          </fieldset>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Button
              disabled={update.isPending}
              onClick={() =>
                update.mutate(
                  {
                    id: selected.id,
                    description: selectedDescription || undefined,
                    permissions: selectedPermissions,
                  },
                  { onSuccess: (role) => setSelected(role) },
                )
              }
            >
              Save
            </Button>
            <Button variant="secondary" onClick={() => setSelected(null)}>
              Close
            </Button>
          </div>
        </div>
      )}

      {(create.error || update.error || remove.error || catalog.error) && (
        <ErrorState
          message={
            (create.error || update.error || remove.error || catalog.error)!
              .message
          }
        />
      )}
    </section>
  );
}
