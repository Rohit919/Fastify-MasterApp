import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

export function ForbiddenPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <ShieldAlert className="h-12 w-12 text-destructive" />
      <div>
        <h1 className="text-2xl font-semibold">{t('common:forbiddenPage.title')}</h1>
        <p className="mt-1 text-muted-foreground">{t('common:forbiddenPage.message')}</p>
      </div>
      <Button asChild variant="outline">
        <Link to="/dashboard">{t('common:forbiddenPage.back')}</Link>
      </Button>
    </div>
  );
}
