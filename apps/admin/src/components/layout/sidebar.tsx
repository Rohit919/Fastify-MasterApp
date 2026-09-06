import { NavLink } from 'react-router-dom';
import { cx } from '@/lib/utils';

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/users', label: 'Users' },
  { to: '/orders', label: 'Orders' },
];

export function Sidebar() {
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
      {links.map((link) => (
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
