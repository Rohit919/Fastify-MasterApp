import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PermissionRoute } from '@/app/router/permission-route';
import { useAuthStore } from '@/stores/auth.store';

// Control the /users/me query state without hitting the network.
const currentUser = vi.hoisted(() => ({ value: { isLoading: false, isError: false } }));
vi.mock('@/modules/users/hooks/use-current-user', () => ({
  useCurrentUser: () => currentUser.value,
}));

function renderGuard(permission: string) {
  return render(
    <MemoryRouter initialEntries={['/users']}>
      <Routes>
        <Route element={<PermissionRoute permission={permission as never} />}>
          <Route path="/users" element={<div>users page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('PermissionRoute', () => {
  beforeEach(() => {
    useAuthStore.setState({ permissions: [], roles: [] });
    currentUser.value = { isLoading: false, isError: false };
  });

  it('renders the page when the permission is held', () => {
    useAuthStore.setState({ permissions: ['users.read'] });
    renderGuard('users.read');
    expect(screen.getByText('users page')).toBeInTheDocument();
  });

  it('shows the 403 page when the permission is missing', () => {
    renderGuard('users.read');
    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    expect(screen.queryByText('users page')).not.toBeInTheDocument();
  });

  it('shows a loading state while permissions are still loading', () => {
    currentUser.value = { isLoading: true, isError: false };
    renderGuard('users.read');
    expect(screen.queryByText('users page')).not.toBeInTheDocument();
    expect(screen.queryByText(/access denied/i)).not.toBeInTheDocument();
  });

  it('does not gate a route without a permission', () => {
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <Routes>
          <Route element={<PermissionRoute />}>
            <Route path="/settings" element={<div>settings page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('settings page')).toBeInTheDocument();
  });
});
