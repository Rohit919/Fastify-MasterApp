import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SortState } from '@/components/data-table/types';

/**
 * Syncs table state (page, pageSize, search, sort, and arbitrary filters) with
 * the URL query string. This makes list views bookmarkable, shareable, and
 * refresh-safe, and keeps a single source of truth for the query hook.
 *
 *   /users?search=rohit&role=admin&page=2&sortBy=name&sortOrder=asc
 */
export interface TableUrlState {
  page: number;
  pageSize: number;
  search: string;
  sort: SortState;
  /** Arbitrary extra filters (e.g. role). */
  filters: Record<string, string>;
}

export function useUrlTableState(options?: {
  defaultPageSize?: number;
  filterKeys?: string[];
}): {
  state: TableUrlState;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setSearch: (search: string) => void;
  setSort: (sort: SortState) => void;
  setFilter: (key: string, value: string) => void;
  isFiltered: boolean;
} {
  const { defaultPageSize = 25, filterKeys = [] } = options ?? {};
  const [params, setParams] = useSearchParams();

  const state = useMemo<TableUrlState>(() => {
    const filters: Record<string, string> = {};
    for (const key of filterKeys) {
      const v = params.get(key);
      if (v) filters[key] = v;
    }
    return {
      page: Number(params.get('page')) || 1,
      pageSize: Number(params.get('pageSize')) || defaultPageSize,
      search: params.get('search') ?? '',
      sort: {
        sortBy: params.get('sortBy') ?? undefined,
        sortOrder: (params.get('sortOrder') as 'asc' | 'desc' | null) ?? undefined,
      },
      filters,
    };
  }, [params, defaultPageSize, filterKeys]);

  const update = useCallback(
    (mutator: (next: URLSearchParams) => void) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          mutator(next);
          return next;
        },
        { replace: true }
      );
    },
    [setParams]
  );

  const setPage = useCallback((page: number) => update((n) => n.set('page', String(page))), [update]);

  const setPageSize = useCallback(
    (pageSize: number) =>
      update((n) => {
        n.set('pageSize', String(pageSize));
        n.set('page', '1');
      }),
    [update]
  );

  const setSearch = useCallback(
    (search: string) =>
      update((n) => {
        if (search) n.set('search', search);
        else n.delete('search');
        n.set('page', '1');
      }),
    [update]
  );

  const setSort = useCallback(
    (sort: SortState) =>
      update((n) => {
        if (sort.sortBy) n.set('sortBy', sort.sortBy);
        else n.delete('sortBy');
        if (sort.sortOrder) n.set('sortOrder', sort.sortOrder);
        else n.delete('sortOrder');
      }),
    [update]
  );

  const setFilter = useCallback(
    (key: string, value: string) =>
      update((n) => {
        if (value) n.set(key, value);
        else n.delete(key);
        n.set('page', '1');
      }),
    [update]
  );

  const isFiltered = Boolean(state.search) || Object.keys(state.filters).length > 0;

  return { state, setPage, setPageSize, setSearch, setSort, setFilter, isFiltered };
}
