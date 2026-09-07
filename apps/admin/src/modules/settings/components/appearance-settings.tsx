import { useTranslation } from 'react-i18next';
import { Monitor, Moon, Sun } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { useTheme, type Theme } from '@/app/providers/theme-provider';
import { cn } from '@/lib/utils';
import { SUPPORTED_LANGUAGES } from '@/i18n/config';
import { setLanguage } from '@/i18n';

const THEME_OPTIONS: { value: Theme; icon: typeof Sun; labelKey: string }[] = [
  { value: 'light', icon: Sun, labelKey: 'settings:appearance.themeLight' },
  { value: 'dark', icon: Moon, labelKey: 'settings:appearance.themeDark' },
  { value: 'system', icon: Monitor, labelKey: 'settings:appearance.themeSystem' },
];

export function AppearanceSettings() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings:appearance.title')}</CardTitle>
        <CardDescription>{t('settings:appearance.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="mb-3 text-sm font-medium">{t('settings:appearance.theme')}</p>
          <div className="grid grid-cols-3 gap-3">
            {THEME_OPTIONS.map(({ value, icon: Icon, labelKey }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-lg border p-4 text-sm transition-colors hover:bg-accent',
                  theme === value ? 'border-primary bg-primary/5' : 'border-input'
                )}
                aria-pressed={theme === value}
              >
                <Icon className="h-5 w-5" />
                {t(labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-xs">
          <p className="mb-2 text-sm font-medium">{t('settings:appearance.language')}</p>
          <Select
            value={i18n.language}
            onChange={(e) => setLanguage(e.target.value)}
            options={SUPPORTED_LANGUAGES.map((l) => ({ label: l.label, value: l.code }))}
          />
        </div>
      </CardContent>
    </Card>
  );
}
