import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { DataTablePagination } from "@/components/data-table/pagination";
import type {
  DataTableColumn,
  PageMeta,
  SortOrder,
  SortState,
} from "@/components/data-table/types";
import { cn } from "@/lib/utils";
import { getRequestId, mapApiError } from "@/lib/errors";

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

  // ── Optional row selection + bulk actions (additive; opt-in) ───────────────
  /** Enable a leading checkbox column + select-all. */
  enableSelection?: boolean;
  /** Controlled selected row keys. */
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  /**
   * Renders a bulk-action bar when ≥1 row is selected. Receives the selected
   * keys and a `clear()` to reset the selection after an action completes.
   */
  bulkActions?: (args: {
    selectedIds: string[];
    clear: () => void;
  }) => ReactNode;
  /** Rows a checkbox should be disabled for (e.g. the current user). */
  isRowSelectable?: (row: T) => boolean;
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
  enableSelection,
  selectedIds,
  onSelectionChange,
  bulkActions,
  isRowSelectable,
}: DataTableProps<T>) {
  const { t } = useTranslation();
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(
    () => new Set(columns.filter((c) => c.hidden).map((c) => c.id)),
  );

  // ── Selection helpers ──────────────────────────────────────────────────────
  const selected = useMemo(() => new Set(selectedIds ?? []), [selectedIds]);
  const selectableRows = useMemo(
    () => rows.filter((r) => (isRowSelectable ? isRowSelectable(r) : true)),
    [rows, isRowSelectable],
  );
  const allSelected =
    selectableRows.length > 0 &&
    selectableRows.every((r) => selected.has(rowKey(r)));
  const someSelected = selectableRows.some((r) => selected.has(rowKey(r)));

  const setSelection = (ids: string[]) => onSelectionChange?.(ids);
  const clearSelection = () => setSelection([]);
  const toggleRow = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelection([...next]);
  };
  const toggleAll = () => {
    if (allSelected) clearSelection();
    else setSelection(selectableRows.map(rowKey));
  };

  const visibleColumns = useMemo(
    () => columns.filter((c) => !hiddenIds.has(c.id)),
    [columns, hiddenIds],
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
      sort?.sortBy === sortKey && sort.sortOrder === "asc" ? "desc" : "asc";
    onSortChange({ sortBy: sortKey, sortOrder: nextOrder });
  };

  const columnCount =
    visibleColumns.length + (rowActions ? 1 : 0) + (enableSelection ? 1 : 0);

  const selectionCount = selected.size;

  return (
    <div className="space-y-4">
      {enableSelection && bulkActions && selectionCount > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-accent/40 px-4 py-2">
          <span className="text-sm font-medium">
            {t("common:labels.selectedCount", { count: selectionCount })}
          </span>
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {bulkActions({ selectedIds: [...selected], clear: clearSelection })}
          </div>
          <Button variant="ghost" size="sm" onClick={clearSelection}>
            <X className="h-4 w-4" />
            {t("common:actions.clear")}
          </Button>
        </div>
      )}

      {(toolbar || columns.some((c) => !c.alwaysVisible)) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {toolbar}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <SlidersHorizontal className="h-4 w-4" />
                {t("common:labels.columns")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>
                {t("common:labels.columns")}
              </DropdownMenuLabel>
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
              {enableSelection && (
                <TableHead className="w-0">
                  <Checkbox
                    aria-label={t("common:labels.selectAll")}
                    checked={
                      allSelected
                        ? true
                        : someSelected
                          ? "indeterminate"
                          : false
                    }
                    onCheckedChange={toggleAll}
                    disabled={selectableRows.length === 0}
                  />
                </TableHead>
              )}
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
                          sort?.sortOrder === "asc" ? (
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
                  {t("common:labels.actions")}
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
                  {enableSelection && (
                    <TableCell>
                      <Skeleton className="h-4 w-4" />
                    </TableCell>
                  )}
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
                    variant={isFiltered ? "no-results" : "empty"}
                    message={emptyMessage}
                  />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const id = rowKey(row);
                const selectable = isRowSelectable
                  ? isRowSelectable(row)
                  : true;
                const isSelected = selected.has(id);
                return (
                  <TableRow
                    key={id}
                    data-state={isSelected ? "selected" : undefined}
                    className={cn(
                      isFetching && "opacity-60 transition-opacity",
                    )}
                  >
                    {enableSelection && (
                      <TableCell>
                        <Checkbox
                          aria-label={t("common:labels.selectRow")}
                          checked={isSelected}
                          disabled={!selectable}
                          onCheckedChange={() => toggleRow(id)}
                        />
                      </TableCell>
                    )}
                    {visibleColumns.map((col) => (
                      <TableCell key={col.id} className={col.className}>
                        {col.cell(row)}
                      </TableCell>
                    ))}
                    {rowActions && (
                      <TableCell className="text-right">
                        {rowActions(row)}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
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
