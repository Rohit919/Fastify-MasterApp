import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { useLogout } from '@/modules/auth/hooks/use-logout';
import { useAuthStore } from '@/stores/auth.store';
import { createTestQueryClient } from '@/test/test-utils';

const logout = vi.hoisted(() => vi.fn());
vi.mock('@/modules/auth/api/logout', () => ({ logout }));

const navigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigate };
});

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('useLogout', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'tok', user: { id: 'u1', email: 'a@b.c', name: 'A', role: 'admin' } });
    logout.mockReset();
    navigate.mockReset();
  });

  it('clears the session and redirects to /login on success', async () => {
    logout.mockResolvedValue({ message: 'ok' });
    const { result } = renderHook(() => useLogout(), { wrapper });

    result.current.mutate();

    await waitFor(() => expect(useAuthStore.getState().accessToken).toBeNull());
    expect(navigate).toHaveBeenCalledWith('/login', { replace: true });
  });

  it('still clears the session even if the server call fails', async () => {
    logout.mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useLogout(), { wrapper });

    result.current.mutate();

    await waitFor(() => expect(useAuthStore.getState().accessToken).toBeNull());
    expect(navigate).toHaveBeenCalledWith('/login', { replace: true });
  });
});
