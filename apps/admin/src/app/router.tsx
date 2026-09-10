import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "@/app/layout";
import { ProtectedRoute } from "@/app/protected-route";
import { LoginPage } from "@/modules/auth/components/login-page";
import { RecoveryPage } from "@/modules/auth/components/recovery-page";
import { VerifyEmailPage } from "@/modules/auth/components/verify-email-page";
import { ChangePasswordPage } from "@/modules/auth/components/change-password-page";
import { DashboardPage } from "@/modules/dashboard/components/dashboard-page";
import { UsersPage } from "@/modules/users/components/users-page";
import { RolesPage } from "@/modules/roles/components/roles-page";
import { OrdersPage } from "@/modules/orders/components/orders-page";
import { AuditPage } from "@/modules/audit/components/audit-page";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/forgot-password", element: <RecoveryPage /> },
  { path: "/verify-email", element: <VerifyEmailPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/dashboard", element: <DashboardPage /> },
          { path: "/users", element: <UsersPage /> },
          { path: "/roles", element: <RolesPage /> },
          { path: "/orders", element: <OrdersPage /> },
          { path: "/audit", element: <AuditPage /> },
          { path: "/security", element: <ChangePasswordPage /> },
          { path: "/", element: <Navigate to="/dashboard" replace /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/dashboard" replace /> },
]);
