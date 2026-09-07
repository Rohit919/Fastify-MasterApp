import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, userEvent } from '@/test/test-utils';
import { LoginPage } from '@/modules/auth/components/login-page';
import { useAuthStore } from '@/stores/auth.store';

// Mock the auth API service so no network happens.
const login = vi.hoisted(() => vi.fn());
vi.mock('@/modules/auth/api/auth.api', () => ({ authApi: { login } }));

// Capture navigation without a real router history side-effect.
const navigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigate };
});

const authUser = { id: 'u1', email: 'admin@example.local', name: 'Admin', role: 'admin' };

describe('login flow', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, user: null, roles: [], permissions: [] });
    login.mockReset();
    navigate.mockReset();
  });

  it('logs in, stores the session, and navigates to the dashboard', async () => {
    login.mockResolvedValue({ accessToken: 'tok-123', user: authUser });
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />, { route: '/login' });

    await user.type(screen.getByLabelText(/email/i), 'admin@example.local');
    await user.type(screen.getByLabelText(/password/i), 'supersecret');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(login).toHaveBeenCalledWith({
      email: 'admin@example.local',
      password: 'supersecret',
    }));
    await waitFor(() => expect(useAuthStore.getState().accessToken).toBe('tok-123'));
    expect(navigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  });

  it('shows an error message and does not navigate on invalid credentials', async () => {
    const { ApiError } = await import('@/lib/api-client');
    login.mockRejectedValue(new ApiError('bad', 401, undefined, 'INVALID_CREDENTIALS'));
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />, { route: '/login' });

    await user.type(screen.getByLabelText(/email/i), 'admin@example.local');
    await user.type(screen.getByLabelText(/password/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('validates required fields client-side before calling the API', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />, { route: '/login' });

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // zod resolver blocks submission; the API is never hit.
    expect(login).not.toHaveBeenCalled();
  });
});
