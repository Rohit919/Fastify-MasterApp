import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted/30 text-center">
      <p className="text-6xl font-bold text-primary">404</p>
      <div>
        <h1 className="text-2xl font-semibold">{t('common:notFoundPage.title')}</h1>
        <p className="mt-1 text-muted-foreground">{t('common:notFoundPage.message')}</p>
      </div>
      <Button asChild>
        <Link to="/dashboard">{t('common:notFoundPage.back')}</Link>
      </Button>
    </div>
  );
}
