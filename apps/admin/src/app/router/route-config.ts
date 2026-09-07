import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  KeyRound,
  Settings,
} from 'lucide-react';
import { PermissionKeys, type PermissionKey } from '@app/api-contracts';

/**
 * Central route metadata (Slash Admin pattern). ONE place declares each admin
 * route's path, i18n title key, icon, required permission, and navigation
 * grouping. The router, sidebar navigation, and breadcrumbs all derive from
 * this — no duplicated permission logic per page.
 *
 * `permission` is UX only (hide nav / redirect). The API remains the security
 * boundary and enforces every permission server-side.
 */
export interface AdminRoute {
  /** Absolute path under the admin shell. */
  path: string;
  /** i18n key (nav namespace) for the label/title. */
  titleKey: string;
  icon?: LucideIcon;
  /** Permission required to see/enter this route. Undefined = always visible. */
  permission?: PermissionKey;
  /** Navigation section grouping key (nav.sections.*). Omit to hide from nav. */
  section?: string;
  /** Hide from the sidebar (still routable, e.g. detail pages). */
  hideInNav?: boolean;
}

export const ADMIN_ROUTES = {
  dashboard: {
    path: '/dashboard',
    titleKey: 'nav:dashboard',
    icon: LayoutDashboard,
    permission: PermissionKeys.DashboardRead,
    section: 'overview',
  },
  users: {
    path: '/users',
    titleKey: 'nav:users',
    icon: Users,
    permission: PermissionKeys.UsersRead,
    section: 'accessControl',
  },
  roles: {
    path: '/roles',
    titleKey: 'nav:roles',
    icon: ShieldCheck,
    permission: PermissionKeys.RolesRead,
    section: 'accessControl',
  },
  permissions: {
    path: '/permissions',
    titleKey: 'nav:permissions',
    icon: KeyRound,
    permission: PermissionKeys.PermissionsRead,
    section: 'accessControl',
  },
  settings: {
    path: '/settings',
    titleKey: 'nav:settings',
    icon: Settings,
    section: 'system',
  },
} satisfies Record<string, AdminRoute>;

/** Ordered list for navigation rendering. */
export const NAV_ROUTES: AdminRoute[] = [
  ADMIN_ROUTES.dashboard,
  ADMIN_ROUTES.users,
  ADMIN_ROUTES.roles,
  ADMIN_ROUTES.permissions,
  ADMIN_ROUTES.settings,
];

/** Navigation section order + label keys. */
export const NAV_SECTIONS = [
  { key: 'overview', labelKey: 'nav:sections.overview' },
  { key: 'accessControl', labelKey: 'nav:sections.accessControl' },
  { key: 'system', labelKey: 'nav:sections.system' },
] as const;
