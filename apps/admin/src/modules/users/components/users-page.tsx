import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  MoreHorizontal,
  ShieldCheck,
  Pencil,
  Trash2,
  Plus,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/data-table";
import type { DataTableColumn } from "@/components/data-table";
import { SearchInput } from "@/components/data-table/search-input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { PermissionGate } from "@/modules/auth/components/permission-gate";
import { usePermissions } from "@/modules/auth/hooks/use-permissions";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { useUrlTableState } from "@/hooks/use-url-table-state";
import { useUsers } from "@/modules/users/hooks/use-users";
import {
  useDeleteUser,
  useBulkDeleteUsers,
} from "@/modules/users/hooks/use-user-mutations";
import { AssignRolesDialog } from "@/modules/users/components/assign-roles-dialog";
import { UserFormDialog } from "@/modules/users/components/user-form-dialog";
import type { UserListItem } from "@/modules/users/api/users.api";
import { formatDateShort } from "@/lib/utils";
import { PermissionKeys, type ListUsersQuery } from "@app/api-contracts";

const ROLE_OPTIONS = [
  { label: "admin", value: "admin" },
  { label: "support", value: "support" },
  { label: "viewer", value: "viewer" },
  { label: "user", value: "user" },
];

export function UsersPage() {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const { user: currentUser } = useAuth();
  const {
    state,
    setPage,
    setPageSize,
    setSearch,
    setSort,
    setFilter,
    isFiltered,
  } = useUrlTableState({ filterKeys: ["role"] });

  const query: Partial<ListUsersQuery> = {
    page: state.page,
    pageSize: state.pageSize,
    search: state.search || undefined,
    role: (state.filters.role as ListUsersQuery["role"]) || undefined,
    sortBy: (state.sort.sortBy as ListUsersQuery["sortBy"]) || undefined,
    sortOrder: state.sort.sortOrder,
  };

  const { data, isLoading, isFetching, error, refetch } = useUsers(query);
  const deleteUser = useDeleteUser();
  const bulkDelete = useBulkDeleteUsers();

  const [assignUser, setAssignUser] = useState<UserListItem | null>(null);
  const [formUser, setFormUser] = useState<UserListItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserListItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkConfirm, setBulkConfirm] = useState(false);

  const openCreate = () => {
    setFormUser(null);
    setFormOpen(true);
  };
  const openEdit = (u: UserListItem) => {
    setFormUser(u);
    setFormOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteUser.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  const confirmBulkDelete = () => {
    bulkDelete.mutate(selectedIds, {
      onSuccess: () => {
        setSelectedIds([]);
        setBulkConfirm(false);
      },
    });
  };

  // Show the row-action menu only if the caller can do at least one action.
  const canRowActions =
    can(PermissionKeys.UsersRolesUpdate) ||
    can(PermissionKeys.UsersUpdate) ||
    can(PermissionKeys.UsersDelete);

  const columns: DataTableColumn<UserListItem>[] = [
    {
      id: "name",
      header: t("users:columns.name"),
      sortKey: "name",
      cell: (u) => <span className="font-medium">{u.name}</span>,
    },
    {
      id: "email",
      header: t("users:columns.email"),
      sortKey: "email",
      cell: (u) => u.email,
    },
    {
      id: "role",
      header: t("users:columns.role"),
      cell: (u) => <Badge variant="secondary">{u.role}</Badge>,
    },
    {
      id: "createdAt",
      header: t("users:columns.createdAt"),
      sortKey: "createdAt",
      cell: (u) => formatDateShort(u.createdAt),
    },
  ];

  return (
    <>
      <PageHeader
        title={t("users:title")}
        description={t("users:subtitle")}
        actions={
          <PermissionGate permission={PermissionKeys.UsersCreate}>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              {t("users:create.trigger")}
            </Button>
          </PermissionGate>
        }
      />

      <DataTable<UserListItem>
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(u) => u.id}
        isLoading={isLoading}
        isFetching={isFetching}
        error={error}
        onRetry={() => refetch()}
        sort={state.sort}
        onSortChange={setSort}
        meta={data?.meta}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        isFiltered={isFiltered}
        emptyMessage={t("users:empty")}
        enableSelection={can(PermissionKeys.UsersDelete)}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        isRowSelectable={(u) => u.id !== currentUser?.id}
        bulkActions={({ selectedIds: ids }) => (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setBulkConfirm(true)}
            disabled={ids.length === 0}
          >
            <Trash2 className="h-4 w-4" />
            {t("users:bulkDelete.trigger")}
          </Button>
        )}
        toolbar={
          <>
            <SearchInput
              value={state.search}
              onChange={setSearch}
              placeholder={t("users:searchPlaceholder")}
            />
            <Select
              className="w-40"
              value={state.filters.role ?? ""}
              placeholder={t("users:filters.allRoles")}
              onChange={(e) => setFilter("role", e.target.value)}
              options={ROLE_OPTIONS}
            />
          </>
        }
        rowActions={
          canRowActions
            ? (u) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("common:labels.actions")}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <PermissionGate
                      permission={PermissionKeys.UsersRolesUpdate}
                    >
                      <DropdownMenuItem onClick={() => setAssignUser(u)}>
                        <ShieldCheck className="h-4 w-4" />
                        {t("users:actions.assignRoles")}
                      </DropdownMenuItem>
                    </PermissionGate>
                    <PermissionGate permission={PermissionKeys.UsersUpdate}>
                      <DropdownMenuItem onClick={() => openEdit(u)}>
                        <Pencil className="h-4 w-4" />
                        {t("common:actions.edit")}
                      </DropdownMenuItem>
                    </PermissionGate>
                    <PermissionGate permission={PermissionKeys.UsersDelete}>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        disabled={u.id === currentUser?.id}
                        onClick={() =>
                          u.id !== currentUser?.id && setDeleteTarget(u)
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                        {t("common:actions.delete")}
                      </DropdownMenuItem>
                    </PermissionGate>
                  </DropdownMenuContent>
                </DropdownMenu>
              )
            : undefined
        }
      />

      <AssignRolesDialog
        user={assignUser}
        open={Boolean(assignUser)}
        onOpenChange={(open) => !open && setAssignUser(null)}
      />

      <UserFormDialog
        user={formUser}
        open={formOpen}
        onOpenChange={setFormOpen}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("users:delete.title")}
        description={t("users:delete.confirm", {
          name: deleteTarget?.name ?? "",
        })}
        confirmLabel={t("common:actions.delete")}
        loading={deleteUser.isPending}
        onConfirm={confirmDelete}
      />

      <ConfirmDialog
        open={bulkConfirm}
        onOpenChange={setBulkConfirm}
        title={t("users:bulkDelete.title")}
        description={t("users:bulkDelete.confirm", {
          count: selectedIds.length,
        })}
        confirmLabel={t("common:actions.delete")}
        loading={bulkDelete.isPending}
        onConfirm={confirmBulkDelete}
      />
    </>
  );
}
