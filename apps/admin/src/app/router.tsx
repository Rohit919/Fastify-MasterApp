import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/app/layout';
import { ProtectedRoute } from '@/app/protected-route';
import { LoginPage } from '@/modules/auth/components/login-page';
import { DashboardPage } from '@/modules/dashboard/components/dashboard-page';
import { UsersPage } from '@/modules/users/components/users-page';
import { OrdersPage } from '@/modules/orders/components/orders-page';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/users', element: <UsersPage /> },
          { path: '/orders', element: <OrdersPage /> },
          { path: '/', element: <Navigate to="/dashboard" replace /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);
