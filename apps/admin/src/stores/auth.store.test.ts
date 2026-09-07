import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/stores/auth.store';

const resetStore = () =>
  useAuthStore.setState({ accessToken: null, user: null, roles: [], permissions: [] });

const user = { id: 'u1', email: 'a@b.c', name: 'Admin', role: 'admin' };

describe('auth store', () => {
  beforeEach(resetStore);

  it('starts unauthenticated', () => {
    expect(useAuthStore.getState().isAuthenticated()).toBe(false);
  });

  it('setSession marks the user authenticated', () => {
    useAuthStore.getState().setSession({ accessToken: 'tok', user });
    const s = useAuthStore.getState();
    expect(s.isAuthenticated()).toBe(true);
    expect(s.user?.email).toBe('a@b.c');
  });

  it('setAccessToken replaces only the token (silent refresh)', () => {
    useAuthStore.getState().setSession({ accessToken: 'old', user });
    useAuthStore.getState().setAccessToken('new');
    expect(useAuthStore.getState().accessToken).toBe('new');
    expect(useAuthStore.getState().user?.id).toBe('u1');
  });

  it('clearSession wipes token, user, roles, and permissions', () => {
    useAuthStore.getState().setSession({ accessToken: 'tok', user });
    useAuthStore.getState().setAuthorization({ roles: ['ADMIN'], permissions: ['users.read'] });
    useAuthStore.getState().clearSession();
    const s = useAuthStore.getState();
    expect(s.isAuthenticated()).toBe(false);
    expect(s.roles).toEqual([]);
    expect(s.permissions).toEqual([]);
  });

  describe('permission checks', () => {
    beforeEach(() => {
      useAuthStore
        .getState()
        .setAuthorization({ roles: ['MANAGER'], permissions: ['users.read', 'roles.read'] });
    });

    it('can() is true only for held permissions', () => {
      expect(useAuthStore.getState().can('users.read')).toBe(true);
      expect(useAuthStore.getState().can('users.delete')).toBe(false);
    });

    it('canAny() is true when at least one is held', () => {
      expect(useAuthStore.getState().canAny(['users.delete', 'roles.read'])).toBe(true);
      expect(useAuthStore.getState().canAny(['users.delete', 'roles.delete'])).toBe(false);
    });

    it('canAll() is true only when every one is held', () => {
      expect(useAuthStore.getState().canAll(['users.read', 'roles.read'])).toBe(true);
      expect(useAuthStore.getState().canAll(['users.read', 'roles.delete'])).toBe(false);
    });
  });
});
