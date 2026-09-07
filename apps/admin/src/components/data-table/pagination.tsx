import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import type { PageMeta } from '@/components/data-table/types';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

/**
 * Server-side pagination controls bound to the backend OffsetPageMeta.
 * Emits page/pageSize changes; the query hook re-fetches.
 */
export function DataTablePagination({
  meta,
  onPageChange,
  onPageSizeChange,
}: {
  meta: PageMeta;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}) {
  const { t } = useTranslation();
  const { page, pageSize, total, totalPages } = meta;

  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-sm text-muted-foreground">
        {start}–{end} {t('common:labels.of')} {total}
      </p>

      <div className="flex items-center gap-4">
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t('common:labels.rowsPerPage')}</span>
            <Select
              className="h-9 w-[72px]"
              value={String(pageSize)}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              options={PAGE_SIZE_OPTIONS.map((n) => ({ label: String(n), value: String(n) }))}
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {t('common:labels.page')} {page} {t('common:labels.of')} {Math.max(totalPages, 1)}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label={t('common:actions.previous')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label={t('common:actions.next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
