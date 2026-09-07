import { rolesApi } from '@/modules/roles/api/roles.api';

/** @deprecated Use `rolesApi.list`. Thin re-export kept for existing callers. */
export const getRoles = () => rolesApi.list();
