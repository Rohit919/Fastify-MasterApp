import { describe, expect, it } from 'vitest';
import { groupPermissionsByResource } from '@/modules/permissions/lib/group-permissions';
import type { PermissionDto } from '@app/api-contracts';

const perm = (key: string): PermissionDto => ({ id: key, key, description: null });

describe('groupPermissionsByResource', () => {
  it('groups by the resource prefix (part before the first dot)', () => {
    const groups = groupPermissionsByResource([
      perm('users.read'),
      perm('users.create'),
      perm('roles.read'),
    ]);
    const users = groups.find((g) => g.resource === 'users');
    const roles = groups.find((g) => g.resource === 'roles');
    expect(users?.permissions).toHaveLength(2);
    expect(roles?.permissions).toHaveLength(1);
  });

  it('sorts resources and permissions alphabetically', () => {
    const groups = groupPermissionsByResource([
      perm('roles.read'),
      perm('users.read'),
      perm('users.create'),
    ]);
    expect(groups.map((g) => g.resource)).toEqual(['roles', 'users']);
    expect(groups[1].permissions.map((p) => p.key)).toEqual(['users.create', 'users.read']);
  });

  it('buckets keys without a dot under "other"', () => {
    const groups = groupPermissionsByResource([perm('standalone')]);
    expect(groups[0].resource).toBe('standalone');
  });

  it('returns an empty array for no permissions', () => {
    expect(groupPermissionsByResource([])).toEqual([]);
  });
});
