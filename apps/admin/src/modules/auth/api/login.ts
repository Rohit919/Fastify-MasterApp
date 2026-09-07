import { authApi } from '@/modules/auth/api/auth.api';
import type { LoginBody } from '@app/api-contracts';

/** @deprecated Use `authApi.login`. Kept as a thin re-export for callers. */
export const login = (body: LoginBody) => authApi.login(body);
