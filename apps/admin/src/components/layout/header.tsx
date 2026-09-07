import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { logout } from '@/modules/auth/api/logout';

export function Header() {
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);

  const handleLogout = async () => {
    // Best-effort server-side revocation (cookie sent automatically); clear local regardless.
    try {
      await logout();
    } catch {
      // Ignore — logout is idempotent and we clear locally anyway.
    }
    clearSession();
  };

  return (
    <header
      style={{
        height: 56,
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 16,
        padding: '0 24px',
      }}
    >
      <span style={{ fontSize: 14, color: '#475569' }}>
        {user ? `${user.name} · ${user.role}` : ''}
      </span>
      <Button variant="secondary" onClick={handleLogout}>
        Log out
      </Button>
    </header>
  );
}
