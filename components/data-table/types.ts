import type * as React from "react"
import type {
  ColumnDef,
  ColumnFiltersState,
  ColumnPinningState,
  Row,
  RowData,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table"

/** Row height / type scale. `cozy` is the app's long-standing default. */
export type Density = "compact" | "cozy" | "comfortable"
/** How rows are laid out: a grid of cells, or one card per row. */
export type ViewMode = "table" | "cards"
/** How a long list is traversed: numbered pages, or one windowed scroll. */
export type ScrollMode = "paginated" | "virtual"

export type HeaderFilterVariant =
  | "text"
  | "select"
  | "multiSelect"
  | "dateRange"
  | "numberRange"
  | "boolean"

export type DateRangeFilterValue = { from?: string; to?: string }
export type NumberRangeFilterValue = [number | undefined, number | undefined]
export type AggregateKind = "sum" | "avg" | "min" | "max" | "count" | "unique"

export interface HeaderFilterOption {
  label: string
  value: string
}

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Set false to keep a filterable column out of the header filters. */
    enableHeaderFilter?: boolean
    filterLabel?: string
    filterPlaceholder?: string
    filterVariant?: HeaderFilterVariant
    /** Fixed choices for select / multiSelect. Omitted → derived from the loaded rows. */
    filterOptions?: HeaderFilterOption[]

    /** Human name used by menus, cards, the inspector and exports. */
    label?: string
    align?: "left" | "center" | "right"
    /** Right-aligned tabular figures, numeric insights, number exports. */
    numeric?: boolean
    /** Let this column's cells wrap even when the table does not. */
    wrap?: boolean
    minWidth?: number
    /** Cap for the auto-fitted width (the user can still drag past it). */
    maxWidth?: number
    /** Footer summary for this column over the rows in view. */
    aggregate?:
      | AggregateKind
      | ((values: unknown[], rows: Row<TData>[]) => React.ReactNode)
    /** Value written to CSV / Excel / clipboard instead of row.getValue(). */
    exportValue?: (row: TData) => unknown
    /** false keeps the column out of exports and copies. */
    exportable?: boolean
    /** Leave this column out of the card layout. */
    hideInCard?: boolean
    /** Use this column as the card's heading. */
    cardTitle?: boolean
    /** Opt a column into the built-in header sort when sorting is server-side. */
    sortable?: boolean
    className?: string
    headerClassName?: string
  }
}

export interface BulkActionContext<TData> {
  rows: TData[]
  clearSelection: () => void
}

export interface DataTableInitialState {
  columnVisibility?: VisibilityState
  columnPinning?: ColumnPinningState
  sorting?: SortingState
  grouping?: string[]
  columnFilters?: ColumnFiltersState
}

export interface DataTableProps<TData, TValue = unknown> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  /**
   * Stable name for this table. When set, the viewer's layout (density, view,
   * columns, widths, pins) and their saved views persist in this browser.
   */
  id?: string
  title?: React.ReactNode
  description?: React.ReactNode
  getRowId?: (row: TData, index: number) => string

  /* ── search ─────────────────────────────────────────────────────────── */
  /** Bind the search box to one column's filter (server tables use this). */
  searchKey?: string
  searchPlaceholder?: string
  /** Search every column. Defaults on for client-side tables without a searchKey. */
  enableGlobalSearch?: boolean
  /** Server-driven global search: the parent refetches on change. */
  onGlobalFilterChange?: (value: string) => void

  /* ── toolbar ────────────────────────────────────────────────────────── */
  /** Hide the top toolbar; view controls move to a menu in the footer. */
  hideToolbar?: boolean
  toolbarActions?: React.ReactNode
  enableHeaderFilters?: boolean

  /* ── pagination ─────────────────────────────────────────────────────── */
  pageSize?: number
  pageSizeOptions?: number[]
  /** Server-driven pagination: parent owns page state and supplies total row count. */
  manualPagination?: boolean
  pageCount?: number
  totalRowCount?: number
  pageIndex?: number
  onPageChange?: (pageIndex: number) => void
  onPageSizeChange?: (pageSize: number) => void

  /* ── server filtering / sorting ─────────────────────────────────────── */
  onColumnFiltersChange?: (filters: ColumnFiltersState) => void
  /**
   * Server-driven column filtering: the header filters are sent to the parent
   * (via onColumnFiltersChange) which re-fetches a filtered page, instead of
   * filtering only the rows already loaded on the current page.
   */
  manualFiltering?: boolean
  manualSorting?: boolean
  sorting?: SortingState
  onSortingChange?: (sorting: SortingState) => void
  /**
   * Bump this when the parent clears its filters, so the table also clears its
   * internal column-filter state (header funnels, chips, popover inputs).
   */
  filtersResetKey?: number

  /* ── modes ──────────────────────────────────────────────────────────── */
  defaultDensity?: Density
  defaultView?: ViewMode
  defaultScrollMode?: ScrollMode
  /** Offer the windowed "virtual" scroll mode. Defaults on for client-side data. */
  enableVirtualization?: boolean
  /** Viewport height of the windowed scroll mode. */
  height?: number | string

  /* ── selection ──────────────────────────────────────────────────────── */
  enableRowSelection?: boolean | ((row: Row<TData>) => boolean)
  onSelectionChange?: (rows: TData[]) => void
  /** Extra buttons in the floating bar shown while rows are selected. */
  bulkActions?: (ctx: BulkActionContext<TData>) => React.ReactNode

  /* ── features ───────────────────────────────────────────────────────── */
  enableColumnResizing?: boolean
  enableColumnReordering?: boolean
  enableColumnPinning?: boolean
  /** Group rows by a column. Defaults on for client-side data. */
  enableGrouping?: boolean
  enableExport?: boolean
  exportFilename?: string
  enableInspector?: boolean
  enableContextMenu?: boolean
  showRowNumbers?: boolean

  /* ── rows ───────────────────────────────────────────────────────────── */
  /** Makes rows expandable; renders under the row when expanded. */
  renderSubComponent?: (row: Row<TData>) => React.ReactNode
  getRowCanExpand?: (row: Row<TData>) => boolean
  /** Replaces the default card in the cards view. */
  renderCard?: (row: Row<TData>) => React.ReactNode
  /** e.g. green background for verified rows */
  getRowClassName?: (row: Row<TData>) => string | undefined
  /**
   * Makes each row open something (e.g. its details) on click / Enter. Clicks
   * that land on a control inside the row are left to that control.
   */
  onRowClick?: (row: TData) => void

  /* ── infinite loading (virtual mode) ────────────────────────────────── */
  onEndReached?: () => void
  hasMore?: boolean

  /* ── state ──────────────────────────────────────────────────────────── */
  isLoading?: boolean
  error?: React.ReactNode
  onRefresh?: () => void
  /** Replaces the default "No results" message. */
  emptyState?: React.ReactNode
  initialState?: DataTableInitialState
  className?: string
}
