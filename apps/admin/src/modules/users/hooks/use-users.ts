import { useQuery } from "@tanstack/react-query";
import { getUsers } from "../api/get-users";

export function useUsers(page: number, search: string) {
  return useQuery({
    queryKey: ["users", "list", { page, search }],
    queryFn: () =>
      getUsers({ page, pageSize: 25, search: search.trim() || undefined }),
    placeholderData: (previous) => previous,
  });
}
