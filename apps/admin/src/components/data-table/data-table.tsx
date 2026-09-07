import { useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown, SlidersHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { DataTablePagination } from '@/components/data-table/pagination';
import type { DataTableColumn, PageMeta, SortOrder, SortState } from '@/components/data-table/types';
import { cn } from '@/lib/utils';
import { getRequestId, mapApiError } from '@/lib/errors';

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;

  isLoading?: boolean;
  isFetching?: boolean;
  error?: unknown;
  onRetry?: () => void;

  /** Server-side sort state + handler. Omit for a non-sortable table. */
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;

  /** Server-side pagination. Omit to hide pagination. */
  meta?: PageMeta;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;

  /** Distinguishes "no data" from "no results for the active filter". */
  isFiltered?: boolean;
  /** Slot above the table (search + filters). */
  toolbar?: ReactNode;
  /** Row actions cell renderer (rendered in a trailing column). */
  rowActions?: (row: T) => ReactNode;
  emptyMessage?: string;
}

/**
 * Reusable, server-oriented data table (Slash Admin pattern). One
 * implementation powers Users, Roles, Permissions, and future modules:
 * sorting, pagination, search/filter toolbar, column visibility, row actions,
 * plus loading/empty/error states. Sorting and pagination are server-side by
 * design — the table never downloads a full dataset to paginate in the browser.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isLoading,
  isFetching,
  error,
  onRetry,
  sort,
  onSortChange,
  meta,
  onPageChange,
  onPageSizeChange,
  isFiltered,
  toolbar,
  rowActions,
  emptyMessage,
}: DataTableProps<T>) {
  const { t } = useTranslation();
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(
    () => new Set(columns.filter((c) => c.hidden).map((c) => c.id))
  );

  const visibleColumns = useMemo(
    () => columns.filter((c) => !hiddenIds.has(c.id)),
    [columns, hiddenIds]
  );

  const toggleColumn = (id: string) => {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSort = (sortKey: string) => {
    if (!onSortChange) return;
    const nextOrder: SortOrder =
      sort?.sortBy === sortKey && sort.sortOrder === 'asc' ? 'desc' : 'asc';
    onSortChange({ sortBy: sortKey, sortOrder: nextOrder });
  };

  const columnCount = visibleColumns.length + (rowActions ? 1 : 0);

  return (
    <div className="space-y-4">
      {(toolbar || columns.some((c) => !c.alwaysVisible)) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">{toolbar}</div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <SlidersHorizontal className="h-4 w-4" />
                {t('common:labels.columns')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>{t('common:labels.columns')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columns
                .filter((c) => !c.alwaysVisible)
                .map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.id}
                    checked={!hiddenIds.has(c.id)}
                    onCheckedChange={() => toggleColumn(c.id)}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {c.header}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {visibleColumns.map((col) => {
                const active = sort?.sortBy === col.sortKey;
                return (
                  <TableHead key={col.id} className={col.className}>
                    {col.sortKey && onSortChange ? (
                      <button
                        type="button"
                        onClick={() => handleSort(col.sortKey!)}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        {col.header}
                        {active ? (
                          sort?.sortOrder === 'asc' ? (
                            <ArrowUp className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </TableHead>
                );
              })}
              {rowActions && (
                <TableHead className="w-0 text-right">
                  {t('common:labels.actions')}
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {error ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="p-0">
                  <ErrorState
                    message={mapApiError(error, (k, f) => t(k, f))}
                    requestId={getRequestId(error)}
                    onRetry={onRetry}
                  />
                </TableCell>
              </TableRow>
            ) : isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {visibleColumns.map((col) => (
                    <TableCell key={col.id}>
                      <Skeleton className="h-4 w-full max-w-[160px]" />
                    </TableCell>
                  ))}
                  {rowActions && (
                    <TableCell>
                      <Skeleton className="ml-auto h-8 w-8" />
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="p-0">
                  <EmptyState
                    variant={isFiltered ? 'no-results' : 'empty'}
                    message={emptyMessage}
                  />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={rowKey(row)}
                  className={cn(isFetching && 'opacity-60 transition-opacity')}
                >
                  {visibleColumns.map((col) => (
                    <TableCell key={col.id} className={col.className}>
                      {col.cell(row)}
                    </TableCell>
                  ))}
                  {rowActions && (
                    <TableCell className="text-right">{rowActions(row)}</TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {meta && onPageChange && (
        <DataTablePagination
          meta={meta}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
}
