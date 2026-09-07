import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { usersApi } from '@/modules/users/api/users.api';
import type { ListUsersQuery } from '@app/api-contracts';

/**
 * Server-side paginated users list. `keepPreviousData` avoids a flash of empty
 * table while paging/sorting. The query key includes every server param so the
 * cache is correct per filter combination.
 */
export function useUsers(query: Partial<ListUsersQuery>) {
  return useQuery({
    queryKey: ['users', 'list', query],
    queryFn: () => usersApi.list(query),
    placeholderData: keepPreviousData,
  });
}
