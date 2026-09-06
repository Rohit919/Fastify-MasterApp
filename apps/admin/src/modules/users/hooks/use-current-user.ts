import { useQuery } from '@tanstack/react-query';
import { getCurrentUser } from '@/modules/users/api/get-current-user';

export function useCurrentUser() {
  return useQuery({
    queryKey: ['users', 'me'],
    queryFn: getCurrentUser,
  });
}
