import { NavLink } from 'react-router-dom';
import { cx } from '@/lib/utils';
import { usePermissions } from '@/modules/auth/hooks/use-permissions';
import { PermissionKeys, type PermissionKey } from '@app/api-contracts';

/**
 * Navigation. Each link declares the permission required to see it; the sidebar
 * hides links the caller can't use. This is UX only — the API enforces access.
 * A link with no `permission` is always shown.
 */
const links: { to: string; label: string; permission?: PermissionKey }[] = [
  { to: '/dashboard', label: 'Dashboard', permission: PermissionKeys.DashboardRead },
  { to: '/users', label: 'Users', permission: PermissionKeys.UsersRead },
  { to: '/roles', label: 'Roles', permission: PermissionKeys.RolesRead },
  { to: '/orders', label: 'Orders', permission: PermissionKeys.OrdersRead },
];

export function Sidebar() {
  const { can } = usePermissions();
  const visible = links.filter((link) => !link.permission || can(link.permission));

  return (
    <nav
      style={{
        width: 220,
        background: '#0f172a',
        color: '#e2e8f0',
        padding: '24px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 18, padding: '0 12px 20px' }}>⚡ Admin</div>
      {visible.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) => cx('nav-link', isActive && 'active')}
          style={({ isActive }) => ({
            padding: '10px 12px',
            borderRadius: 6,
            color: isActive ? '#fff' : '#94a3b8',
            background: isActive ? '#4f46e5' : 'transparent',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: 14,
          })}
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
