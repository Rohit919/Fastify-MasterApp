import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usersApi } from '@/modules/users/api/users.api';
import { apiClient } from '@/lib/api-client';

describe('usersApi role assignment', () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it('getRoles calls the admin user-roles endpoint and returns the roles array', async () => {
    const get = vi
      .spyOn(apiClient, 'get')
      .mockResolvedValue({ userId: 'u1', roles: ['ADMIN', 'MANAGER'] });

    const roles = await usersApi.getRoles('u1');

    expect(roles).toEqual(['ADMIN', 'MANAGER']);
    expect(get).toHaveBeenCalledWith('/api/v1/admin/users/u1/roles');
  });

  it('setRoles PUTs the new role set to the correct endpoint', async () => {
    const put = vi
      .spyOn(apiClient, 'put')
      .mockResolvedValue({ userId: 'u1', roles: ['SUPPORT'] });

    const roles = await usersApi.setRoles('u1', ['SUPPORT']);

    expect(roles).toEqual(['SUPPORT']);
    expect(put).toHaveBeenCalledWith('/api/v1/admin/users/u1/roles', { roles: ['SUPPORT'] });
  });

  it('list forwards pagination + filter query params via the contract request', async () => {
    const request = vi
      .spyOn(apiClient, 'request')
      .mockResolvedValue({ data: [], meta: { page: 1, pageSize: 25, total: 0, totalPages: 0 } });

    await usersApi.list({ page: 2, pageSize: 10, search: 'ann', role: 'admin' });

    expect(request).toHaveBeenCalledTimes(1);
    const [, args] = request.mock.calls[0];
    expect(args?.query).toMatchObject({ page: 2, pageSize: 10, search: 'ann', role: 'admin' });
  });
});
