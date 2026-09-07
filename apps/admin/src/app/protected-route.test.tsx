import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/app/protected-route';
import { useAuthStore } from '@/stores/auth.store';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<div>protected content</div>} />
        </Route>
        <Route path="/login" element={<div>login page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => useAuthStore.setState({ accessToken: null, user: null }));

  it('redirects unauthenticated users to /login', () => {
    renderAt('/dashboard');
    expect(screen.getByText('login page')).toBeInTheDocument();
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
  });

  it('renders the protected content when authenticated', () => {
    useAuthStore.setState({ accessToken: 'tok' });
    renderAt('/dashboard');
    expect(screen.getByText('protected content')).toBeInTheDocument();
  });
});
