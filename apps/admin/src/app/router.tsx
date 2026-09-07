import { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { AdminLayout } from '@/layouts/admin/admin-layout';
import { AuthLayout } from '@/layouts/auth/auth-layout';
import { ProtectedRoute } from '@/app/protected-route';
import { PermissionRoute } from '@/app/router/permission-route';
import { ADMIN_ROUTES } from '@/app/router/route-config';
import { Loading } from '@/components/feedback/loading';
import { NotFoundPage } from '@/modules/errors/not-found-page';

// ── Lazy-loaded pages (code-splitting; each becomes its own chunk) ──────────
const LoginPage = lazy(() =>
  import('@/modules/auth/components/login-page').then((m) => ({ default: m.LoginPage }))
);
const ForgotPasswordPage = lazy(() =>
  import('@/modules/auth/components/forgot-password-page').then((m) => ({
    default: m.ForgotPasswordPage,
  }))
);
const VerifyOtpPage = lazy(() =>
  import('@/modules/auth/components/verify-otp-page').then((m) => ({ default: m.VerifyOtpPage }))
);
const ResetPasswordPage = lazy(() =>
  import('@/modules/auth/components/reset-password-page').then((m) => ({
    default: m.ResetPasswordPage,
  }))
);
const DashboardPage = lazy(() =>
  import('@/modules/dashboard/components/dashboard-page').then((m) => ({ default: m.DashboardPage }))
);
const UsersPage = lazy(() =>
  import('@/modules/users/components/users-page').then((m) => ({ default: m.UsersPage }))
);
const RolesPage = lazy(() =>
  import('@/modules/roles/components/roles-page').then((m) => ({ default: m.RolesPage }))
);
const PermissionsPage = lazy(() =>
  import('@/modules/permissions/components/permissions-page').then((m) => ({
    default: m.PermissionsPage,
  }))
);
const SettingsPage = lazy(() =>
  import('@/modules/settings/components/settings-page').then((m) => ({ default: m.SettingsPage }))
);

/** Wrap lazy elements in a Suspense boundary with a consistent fallback. */
function Suspended({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<Loading />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  // ── Public (auth) routes ──────────────────────────────────────────────────
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <Suspended><LoginPage /></Suspended> },
      { path: '/forgot-password', element: <Suspended><ForgotPasswordPage /></Suspended> },
      { path: '/verify-otp', element: <Suspended><VerifyOtpPage /></Suspended> },
      { path: '/reset-password', element: <Suspended><ResetPasswordPage /></Suspended> },
    ],
  },

  // ── Authenticated admin routes ────────────────────────────────────────────
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          {
            element: <PermissionRoute permission={ADMIN_ROUTES.dashboard.permission} />,
            children: [
              {
                path: ADMIN_ROUTES.dashboard.path,
                element: <Suspended><DashboardPage /></Suspended>,
              },
            ],
          },
          {
            element: <PermissionRoute permission={ADMIN_ROUTES.users.permission} />,
            children: [{ path: ADMIN_ROUTES.users.path, element: <Suspended><UsersPage /></Suspended> }],
          },
          {
            element: <PermissionRoute permission={ADMIN_ROUTES.roles.permission} />,
            children: [{ path: ADMIN_ROUTES.roles.path, element: <Suspended><RolesPage /></Suspended> }],
          },
          {
            element: <PermissionRoute permission={ADMIN_ROUTES.permissions.permission} />,
            children: [
              {
                path: ADMIN_ROUTES.permissions.path,
                element: <Suspended><PermissionsPage /></Suspended>,
              },
            ],
          },
          {
            // Settings has no page-level permission (any authenticated user).
            element: <Outlet />,
            children: [
              { path: ADMIN_ROUTES.settings.path, element: <Suspended><SettingsPage /></Suspended> },
            ],
          },
          { path: '/', element: <Navigate to={ADMIN_ROUTES.dashboard.path} replace /> },
        ],
      },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
]);
