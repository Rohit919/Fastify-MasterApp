import { useQuery } from "@tanstack/react-query";
import { getRoles } from "@/modules/roles/api/get-roles";

/** Loads all roles with their permissions (requires roles.read on the API). */
export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: getRoles,
  });
}
