import type { ReactNode } from 'react';

/** A single column definition for the shared DataTable. */
export interface DataTableColumn<T> {
  /** Stable id (used for column-visibility toggles and React keys). */
  id: string;
  /** Header label (already translated by the caller). */
  header: string;
  /** Cell renderer. */
  cell: (row: T) => ReactNode;
  /** Backend sort key. Present → column is sortable (server-side). */
  sortKey?: string;
  /** Hide by default (still toggleable via the column menu). */
  hidden?: boolean;
  /** Optional cell className. */
  className?: string;
  /** Exclude from the column-visibility menu (e.g. an actions column). */
  alwaysVisible?: boolean;
}

export type SortOrder = 'asc' | 'desc';

/** Sort state shared between the table UI and the query hook. */
export interface SortState {
  sortBy?: string;
  sortOrder?: SortOrder;
}

/** Offset pagination state (mirrors the backend OffsetPageMeta). */
export interface PaginationState {
  page: number;
  pageSize: number;
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
