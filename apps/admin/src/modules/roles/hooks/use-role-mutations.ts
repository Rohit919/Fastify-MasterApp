import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createRole,
  deleteRole,
  getPermissions,
  updateRole,
} from "../api/roles";

export function usePermissionsCatalog() {
  return useQuery({ queryKey: ["permissions"], queryFn: getPermissions });
}

export function useCreateRole() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createRole,
    onSuccess: () => client.invalidateQueries({ queryKey: ["roles"] }),
  });
}

export function useUpdateRole() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      description,
      permissions,
    }: {
      id: string;
      description?: string;
      permissions: string[];
    }) => updateRole(id, { description, permissions }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["roles"] }),
  });
}

export function useDeleteRole() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: deleteRole,
    onSuccess: () => client.invalidateQueries({ queryKey: ["roles"] }),
  });
}
