import { usersApi, type CurrentUser } from '@/modules/users/api/users.api';

export type { CurrentUser };

/** @deprecated Use `usersApi.me`. Thin re-export kept for existing callers. */
export const getCurrentUser = (): Promise<CurrentUser> => usersApi.me();
