import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PermissionGate } from '@/modules/auth/components/permission-gate';
import { useAuthStore } from '@/stores/auth.store';

function setPermissions(permissions: string[], roles: string[] = []) {
  useAuthStore.setState({ permissions, roles });
}

describe('PermissionGate', () => {
  beforeEach(() => useAuthStore.setState({ permissions: [], roles: [] }));

  it('renders children when the permission is held', () => {
    setPermissions(['users.delete']);
    render(
      <PermissionGate permission="users.delete">
        <button>Delete</button>
      </PermissionGate>
    );
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('hides children when the permission is missing', () => {
    setPermissions(['users.read']);
    render(
      <PermissionGate permission="users.delete">
        <button>Delete</button>
      </PermissionGate>
    );
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('renders the fallback when denied', () => {
    setPermissions([]);
    render(
      <PermissionGate permission="users.delete" fallback={<span>denied</span>}>
        <button>Delete</button>
      </PermissionGate>
    );
    expect(screen.getByText('denied')).toBeInTheDocument();
  });

  it('supports anyOf', () => {
    setPermissions(['roles.read']);
    render(
      <PermissionGate anyOf={['users.read', 'roles.read']}>
        <span>visible</span>
      </PermissionGate>
    );
    expect(screen.getByText('visible')).toBeInTheDocument();
  });

  it('supports allOf (denies when one is missing)', () => {
    setPermissions(['users.read']);
    render(
      <PermissionGate allOf={['users.read', 'users.delete']}>
        <span>nope</span>
      </PermissionGate>
    );
    expect(screen.queryByText('nope')).not.toBeInTheDocument();
  });
});
