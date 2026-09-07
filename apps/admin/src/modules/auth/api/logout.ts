import { authApi } from '@/modules/auth/api/auth.api';

/** @deprecated Use `authApi.logout`. Kept as a thin re-export for callers. */
export const logout = () => authApi.logout();
