import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/common/page-header';
import { cn } from '@/lib/utils';
import { ProfileSettings } from '@/modules/settings/components/profile-settings';
import { AppearanceSettings } from '@/modules/settings/components/appearance-settings';
import { SecuritySettings } from '@/modules/settings/components/security-settings';

type TabKey = 'profile' | 'appearance' | 'security';

const TABS: { key: TabKey; labelKey: string }[] = [
  { key: 'profile', labelKey: 'nav:profile' },
  { key: 'appearance', labelKey: 'nav:appearance' },
  { key: 'security', labelKey: 'nav:security' },
];

/**
 * Settings shell with tabbed sections. The active tab is kept in the URL
 * (?tab=) so it's linkable and survives refresh. Only backend-supported
 * sections are shown.
 */
export function SettingsPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const active = (params.get('tab') as TabKey) || 'profile';

  const setTab = (key: TabKey) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', key);
      return next;
    });

  return (
    <>
      <PageHeader title={t('settings:title')} />

      <div className="mb-6 flex gap-1 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setTab(tab.key)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              active === tab.key
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {active === 'profile' && <ProfileSettings />}
      {active === 'appearance' && <AppearanceSettings />}
      {active === 'security' && <SecuritySettings />}
    </>
  );
}
