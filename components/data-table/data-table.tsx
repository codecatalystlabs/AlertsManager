"use client"

import * as React from "react"
import {
  type AggregationFnOption,
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnPinningState,
  type ExpandedState,
  type GroupingState,
  type PaginationState,
  type Row,
  type RowSelectionState,
  type SortingState,
  type Table,
  type VisibilityState,
  getCoreRowModel,
  getExpandedRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getGroupedRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  AlertTriangle,
  Check,
  ChevronRight,
  ClipboardCopy,
  Copy,
  Expand,
  Filter,
  Inbox,
  MousePointerClick,
  PanelRight,
  SearchX,
  SquareCheck,
  Minus,
  Braces,
} from "lucide-react"
import toast from "react-hot-toast"

import { Button } from "@/components/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { cn } from "@/lib/utils"

import { CardGrid, GroupCardHeader, RowCard } from "./card-view"
import { HeaderCell, type HeaderUi } from "./column-header"
import { ColumnInsightsDialog } from "./column-insights"
import {
  buildGlobalSearchFilter,
  filterFnForVariant,
  hasFilterValue,
  toDateTime,
  toNumber,
} from "./filters"
import { BulkActionBar, TableFooter } from "./footer"
import { canHeaderFilter, variantOf } from "./header-filter"
import { RowInspector } from "./row-inspector"
import {
  DataRow,
  DetailRow,
  GroupRow,
  SkeletonRows,
  VirtualBody,
  buildDisplayItems,
  pinProps,
  type DisplayItem,
  type PinInfo,
  type RenderItem,
  type VirtualApi,
} from "./table-rows"
import {
  FilterChips,
  SearchBox,
  ShortcutsDialog,
  ToolbarControls,
  type ExportScope,
  type TableController,
} from "./toolbar"
import type { AggregateKind, DataTableProps, Density } from "./types"
import { pinSignature, useColumnLayout } from "./use-column-layout"
import { useSearchHighlight } from "./use-search-highlight"
import { type SavedView, type TablePreferences, useIsomorphicLayoutEffect, useTablePreferences } from "./use-table-preferences"
import {
  ACTIONS_COLUMN_ID,
  EXPAND_COLUMN_ID,
  ROW_NUMBER_COLUMN_ID,
  SELECT_COLUMN_ID,
  buildExportMatrix,
  copyText,
  cssSafe,
  exportMatrix,
  formatNumber,
  getColumnLabel,
  getExportValue,
  isDataColumn,
  isSyntheticColumn,
  localDateStamp,
  stringifyValue,
  toTsv,
  type ExportFormat,
} from "./utils"

const ROW_ESTIMATE: Record<Density, number> = { compact: 28, cozy: 35, comfortable: 44 }
const CARD_ESTIMATE = 190
const DEFAULT_PAGE_SIZES = [10, 25, 50, 100]
const AGGREGATION_FN: Record<AggregateKind, string> = {
  sum: "sum",
  avg: "mean",
  min: "min",
  max: "max",
  count: "count",
  unique: "uniqueCount",
}

/** True when a click actually hit an interactive control inside the row. */
function fromInteractive(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        'button, a, input, select, textarea, label, [role="menuitem"], [role="checkbox"], [data-row-click-ignore]'
      )
    )
  )
}

function useMediaQuery(query: string): boolean {
  return React.useSyncExternalStore(
    (notify) => {
      const mql = window.matchMedia(query)
      mql.addEventListener("change", notify)
      return () => mql.removeEventListener("change", notify)
    },
    () => window.matchMedia(query).matches,
    () => false
  )
}

/** Group rows and expanded parents both list leaves; each leaf once, in order. */
function leafRows<TData>(rows: Row<TData>[]): Row<TData>[] {
  const seen = new Set<string>()
  const out: Row<TData>[] = []
  const push = (r: Row<TData>) => {
    if (!seen.has(r.id)) {
      seen.add(r.id)
      out.push(r)
    }
  }
  for (const row of rows) {
    if (row.getIsGrouped()) row.getLeafRows().filter((l) => !l.getIsGrouped()).forEach(push)
    else push(row)
  }
  return out
}

function TableCheckbox({
  checked,
  indeterminate,
  disabled,
  label,
  onToggle,
}: {
  checked: boolean
  indeterminate?: boolean
  disabled?: boolean
  label: string
  onToggle: (e: React.MouseEvent<HTMLButtonElement>) => void
}) {
  const state = checked ? "checked" : indeterminate ? "indeterminate" : "unchecked"
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate && !checked ? "mixed" : checked}
      aria-label={label}
      disabled={disabled}
      data-state={state}
      className="dt-check"
      onClick={onToggle}
    >
      {checked ? <Check className="h-3 w-3" strokeWidth={3} /> : indeterminate ? <Minus className="h-3 w-3" strokeWidth={3} /> : null}
    </button>
  )
}

function aggregateOf<TData>(
  kind: NonNullable<NonNullable<ColumnDef<TData, unknown>["meta"]>["aggregate"]>,
  rows: Row<TData>[],
  column: Column<TData, unknown>
): React.ReactNode {
  const values = rows.map((r) => getExportValue(r, column))
  if (typeof kind === "function") return kind(values, rows)
  if (kind === "count") return `n ${formatNumber(values.filter((v) => v !== null && v !== undefined && v !== "").length)}`
  if (kind === "unique") return `${formatNumber(new Set(values.map(stringifyValue)).size)} distinct`
  const nums = values.map(toNumber).filter((n): n is number => n !== null)
  if (nums.length === 0) return "—"
  if (kind === "sum") return `Σ ${formatNumber(nums.reduce((s, n) => s + n, 0))}`
  if (kind === "avg") return `avg ${formatNumber(nums.reduce((s, n) => s + n, 0) / nums.length)}`
  if (kind === "min") return `min ${formatNumber(Math.min(...nums))}`
  return `max ${formatNumber(Math.max(...nums))}`
}

type CtxTarget = { rowId: string; columnId?: string; text: string }

export function DataTable<TData, TValue = unknown>(props: DataTableProps<TData, TValue>) {
  const {
    columns,
    data,
    id,
    title,
    description,
    getRowId,
    searchKey,
    searchPlaceholder,
    enableGlobalSearch,
    onGlobalFilterChange,
    hideToolbar = false,
    toolbarActions,
    enableHeaderFilters = false,
    pageSize = 10,
    pageSizeOptions,
    manualPagination = false,
    pageCount: controlledPageCount,
    totalRowCount,
    pageIndex: controlledPageIndex,
    onPageChange,
    onPageSizeChange,
    onColumnFiltersChange,
    manualFiltering = false,
    manualSorting = false,
    sorting: controlledSorting,
    onSortingChange,
    filtersResetKey,
    defaultDensity = "cozy",
    defaultView = "table",
    defaultScrollMode = "paginated",
    enableVirtualization,
    height,
    enableRowSelection = false,
    onSelectionChange,
    bulkActions,
    enableColumnResizing = true,
    enableColumnReordering = true,
    enableColumnPinning = true,
    enableGrouping,
    enableExport = true,
    exportFilename,
    enableInspector = true,
    enableContextMenu = true,
    showRowNumbers = false,
    renderSubComponent,
    getRowCanExpand,
    renderCard,
    getRowClassName,
    onRowClick,
    onEndReached,
    hasMore,
    isLoading = false,
    error,
    onRefresh,
    emptyState,
    initialState,
    className,
  } = props

  const instanceId = React.useId().replace(/:/g, "")
  const isMobile = useMediaQuery("(max-width: 767px)")
  const selectionEnabled = Boolean(enableRowSelection)
  const canVirtual = enableVirtualization ?? !manualPagination
  const canGroup = enableGrouping ?? !manualPagination
  const pageSizes = React.useMemo(() => {
    const base = pageSizeOptions ?? DEFAULT_PAGE_SIZES
    return base.includes(pageSize) ? base : [...base, pageSize].sort((a, b) => a - b)
  }, [pageSizeOptions, pageSize])

  /* ── columns ─────────────────────────────────────────────────────────── */

  // The select cell toggles through a ref, so the column definitions stay
  // stable (and memoized rows stay memoized) while the handler sees fresh state.
  const toggleRowRef = React.useRef<(row: Row<TData>, shift: boolean) => void>(() => {})
  const selectAllModeRef = React.useRef<"page" | "all">("page")

  const allColumns = React.useMemo<ColumnDef<TData, unknown>[]>(() => {
    const synthetic: ColumnDef<TData, unknown>[] = []
    if (selectionEnabled) {
      synthetic.push({
        id: SELECT_COLUMN_ID,
        size: 34,
        enableSorting: false,
        enableHiding: false,
        enableColumnFilter: false,
        enableGrouping: false,
        enableResizing: false,
        header: ({ table }) => {
          const all = selectAllModeRef.current === "all"
          const checked = all ? table.getIsAllRowsSelected() : table.getIsAllPageRowsSelected()
          const some = all ? table.getIsSomeRowsSelected() : table.getIsSomePageRowsSelected()
          return (
            <TableCheckbox
              checked={checked}
              indeterminate={some}
              label={all ? "Select all rows" : "Select all rows on this page"}
              onToggle={() => (all ? table.toggleAllRowsSelected(!checked) : table.toggleAllPageRowsSelected(!checked))}
            />
          )
        },
        cell: ({ row }) => (
          <TableCheckbox
            checked={row.getIsGrouped() ? row.getIsAllSubRowsSelected() : row.getIsSelected()}
            indeterminate={row.getIsSomeSelected()}
            disabled={!row.getCanSelect()}
            label="Select row"
            onToggle={(e) => {
              e.stopPropagation()
              toggleRowRef.current(row, e.shiftKey)
            }}
          />
        ),
      })
    }
    if (renderSubComponent) {
      synthetic.push({
        id: EXPAND_COLUMN_ID,
        size: 30,
        enableSorting: false,
        enableHiding: false,
        enableColumnFilter: false,
        enableGrouping: false,
        enableResizing: false,
        header: () => null,
        cell: ({ row }) =>
          row.getCanExpand() ? (
            <button
              type="button"
              className="dt-expander"
              aria-expanded={row.getIsExpanded()}
              aria-label={row.getIsExpanded() ? "Collapse row" : "Expand row"}
              onClick={row.getToggleExpandedHandler()}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          ) : null,
      })
    }
    synthetic.push({
      id: ROW_NUMBER_COLUMN_ID,
      size: 46,
      header: "#",
      enableSorting: false,
      enableColumnFilter: false,
      enableGrouping: false,
      enableResizing: false,
      meta: { label: "Row numbers" },
      cell: () => null,
    })

    const enhanced = (columns as ColumnDef<TData, unknown>[]).map((col) => {
      const meta = col.meta
      let next = col
      if (!col.filterFn && meta?.filterVariant) {
        const fn = filterFnForVariant<TData>(meta.filterVariant)
        if (fn) next = { ...next, filterFn: fn }
      }
      if (!col.aggregationFn && typeof meta?.aggregate === "string") {
        next = { ...next, aggregationFn: AGGREGATION_FN[meta.aggregate] as AggregationFnOption<TData> }
      }
      return next
    })
    return [...synthetic, ...enhanced]
  }, [columns, selectionEnabled, renderSubComponent])

  const hasActions = React.useMemo(
    () => allColumns.some((c) => c.id === ACTIONS_COLUMN_ID),
    [allColumns]
  )
  const defaultPinning = React.useMemo<ColumnPinningState>(
    () => ({
      left: [
        selectionEnabled && SELECT_COLUMN_ID,
        renderSubComponent && EXPAND_COLUMN_ID,
        ROW_NUMBER_COLUMN_ID,
      ].filter(Boolean) as string[],
      // The row-actions column stays reachable when a wide table scrolls.
      right: hasActions ? [ACTIONS_COLUMN_ID] : [],
    }),
    [selectionEnabled, renderSubComponent, hasActions]
  )
  const defaultVisibility = React.useMemo<VisibilityState>(
    () => ({ [ROW_NUMBER_COLUMN_ID]: showRowNumbers, ...initialState?.columnVisibility }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  /* ── preferences (persisted per table id) ────────────────────────────── */

  const { prefs, setPref, resetLayout, views, saveView, deleteView, persistent } = useTablePreferences(id, {
    density: defaultDensity,
    view: defaultView,
    scrollMode: defaultScrollMode,
    striped: false,
    gridLines: false,
    wrap: false,
    inspector: false,
    columnVisibility: defaultVisibility,
    columnOrder: [],
    columnPinning: initialState?.columnPinning ?? null,
    columnSizing: {},
  })
  const view = isMobile ? "cards" : prefs.view
  const virtual = canVirtual && prefs.scrollMode === "virtual"
  const inspectorOpen = enableInspector && prefs.inspector
  selectAllModeRef.current = virtual ? "all" : "page"

  /* ── table state ─────────────────────────────────────────────────────── */

  const [internalSorting, setInternalSorting] = React.useState<SortingState>(initialState?.sorting ?? [])
  const sorting = controlledSorting ?? internalSorting
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(initialState?.columnFilters ?? [])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [expanded, setExpanded] = React.useState<ExpandedState>({})
  const [grouping, setGrouping] = React.useState<GroupingState>(initialState?.grouping ?? [])
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: controlledPageIndex ?? 0,
    pageSize,
  })
  const paginationRef = React.useRef(pagination)
  paginationRef.current = pagination

  React.useEffect(() => {
    setPagination((prev) => (prev.pageSize === pageSize ? prev : { ...prev, pageSize }))
  }, [pageSize])

  React.useEffect(() => {
    if (controlledPageIndex === undefined) return
    setPagination((prev) =>
      prev.pageIndex === controlledPageIndex ? prev : { ...prev, pageIndex: controlledPageIndex }
    )
  }, [controlledPageIndex])

  React.useEffect(() => {
    onColumnFiltersChange?.(columnFilters)
  }, [columnFilters, onColumnFiltersChange])

  // Clear the table's own column-filter state when the parent signals a reset,
  // so header funnels, chips and popover inputs visually clear too.
  const didMountResetRef = React.useRef(false)
  React.useEffect(() => {
    if (!didMountResetRef.current) {
      didMountResetRef.current = true
      return
    }
    setColumnFilters([])
  }, [filtersResetKey])

  const searchableIdsRef = React.useRef<string[]>([])
  const globalFilterFn = React.useMemo(() => buildGlobalSearchFilter<TData>(() => searchableIdsRef.current), [])
  const globalAnchorRef = React.useRef<string | undefined>(undefined)

  const table = useReactTable<TData>({
    data,
    columns: allColumns,
    // TanStack gives every column `size: 150` by default, which would make
    // every column look explicitly sized. Only a declared size is fixed;
    // everything else is fitted to its content (use-column-layout).
    defaultColumn: { size: undefined },
    getRowId,
    initialState: {
      columnPinning: defaultPinning,
      columnVisibility: defaultVisibility,
      columnOrder: [],
    },
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnVisibility: prefs.columnVisibility,
      columnOrder: prefs.columnOrder,
      columnPinning: prefs.columnPinning ?? defaultPinning,
      columnSizing: prefs.columnSizing,
      rowSelection,
      expanded,
      grouping,
      pagination,
    },
    manualPagination,
    manualFiltering,
    manualSorting,
    pageCount: manualPagination ? (controlledPageCount ?? -1) : undefined,
    enableRowSelection: selectionEnabled
      ? typeof enableRowSelection === "function"
        ? enableRowSelection
        : true
      : false,
    enableMultiSort: !manualSorting,
    isMultiSortEvent: (e) => Boolean((e as MouseEvent | undefined)?.shiftKey),
    enableGrouping: canGroup,
    groupedColumnMode: "reorder",
    enableColumnPinning: true,
    getRowCanExpand: (row) =>
      row.subRows.length > 0 || (renderSubComponent ? (getRowCanExpand ? getRowCanExpand(row) : true) : false),
    globalFilterFn,
    getColumnCanGlobalFilter: (column) => column.id === globalAnchorRef.current,
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater
      if (onSortingChange) onSortingChange(next)
      else setInternalSorting(next)
    },
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: (u) => setPref("columnVisibility", u),
    onColumnOrderChange: (u) => setPref("columnOrder", u),
    onColumnPinningChange: (u) =>
      setPref("columnPinning", (prev) => (typeof u === "function" ? u(prev ?? defaultPinning) : u)),
    onColumnSizingChange: (u) => setPref("columnSizing", u),
    onRowSelectionChange: setRowSelection,
    onExpandedChange: setExpanded,
    onGroupingChange: setGrouping,
    onPaginationChange: (updater) => {
      const prev = paginationRef.current
      const next = typeof updater === "function" ? updater(prev) : updater
      if (next.pageIndex === prev.pageIndex && next.pageSize === prev.pageSize) return
      paginationRef.current = next
      setPagination(next)
      if (manualPagination) {
        if (next.pageIndex !== prev.pageIndex) onPageChange?.(next.pageIndex)
        if (next.pageSize !== prev.pageSize) onPageSizeChange?.(next.pageSize)
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
  })

  const dataColumns = React.useMemo(
    () => table.getAllLeafColumns().filter((c) => isDataColumn(c as Column<TData, unknown>)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allColumns]
  )
  searchableIdsRef.current = dataColumns.filter((c) => c.accessorFn).map((c) => c.id)
  globalAnchorRef.current = searchableIdsRef.current[0]

  /* ── search ──────────────────────────────────────────────────────────── */

  const searchInputRef = React.useRef<HTMLInputElement>(null)
  const globalSearchOn = !searchKey && (enableGlobalSearch ?? (!manualFiltering || Boolean(onGlobalFilterChange)))
  const searchColumn = searchKey ? table.getColumn(searchKey) : undefined
  const searchValue = searchKey
    ? typeof searchColumn?.getFilterValue() === "string"
      ? (searchColumn?.getFilterValue() as string)
      : ""
    : globalFilter
  const commitSearch = React.useCallback(
    (value: string) => {
      if (searchKey) {
        table.getColumn(searchKey)?.setFilterValue(value || undefined)
      } else {
        // A 100k-row refilter is not allowed to make typing stutter.
        React.startTransition(() => setGlobalFilter(value))
        onGlobalFilterChange?.(value)
      }
      table.setPageIndex(0)
    },
    [searchKey, table, onGlobalFilterChange]
  )

  /* ── rows ────────────────────────────────────────────────────────────── */

  const rows = virtual ? table.getPrePaginationRowModel().rows : table.getRowModel().rows
  const items = React.useMemo(
    () => buildDisplayItems(rows, Boolean(renderSubComponent)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, renderSubComponent, expanded]
  )
  const itemIndexById = React.useMemo(() => {
    const map = new Map<string, number>()
    items.forEach((item, i) => {
      if (item.kind !== "detail") map.set(item.row.id, i)
    })
    return map
  }, [items])
  const rowsRef = React.useRef<Row<TData>[]>([])
  rowsRef.current = React.useMemo(() => items.filter((i) => i.kind === "row").map((i) => i.row), [items])
  // Position of each data row in the rendered list (row numbers, inspector).
  const rowPosition = React.useMemo(() => {
    const map = new Map<string, number>()
    rowsRef.current.forEach((r, i) => map.set(r.id, i))
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])
  const findRow = React.useCallback(
    (rowId: string | null) => {
      if (!rowId) return undefined
      const i = itemIndexById.get(rowId)
      return i === undefined ? undefined : items[i].row
    },
    [itemIndexById, items]
  )

  // With server-paged data and index-based ids, a selection cannot survive a
  // page change: row "3" on page 2 is a different record.
  React.useEffect(() => {
    if (manualPagination && !getRowId) setRowSelection({})
  }, [data, manualPagination, getRowId])

  const onSelectionChangeRef = React.useRef(onSelectionChange)
  onSelectionChangeRef.current = onSelectionChange
  React.useEffect(() => {
    onSelectionChangeRef.current?.(table.getSelectedRowModel().flatRows.map((r) => r.original))
  }, [rowSelection, table])

  const anchorRef = React.useRef<string | null>(null)
  toggleRowRef.current = (row, shift) => {
    const list = rowsRef.current
    const nextValue = !(row.getIsGrouped() ? row.getIsAllSubRowsSelected() : row.getIsSelected())
    const anchor = anchorRef.current
    if (shift && anchor) {
      const a = list.findIndex((r) => r.id === anchor)
      const b = list.findIndex((r) => r.id === row.id)
      if (a !== -1 && b !== -1) {
        const [s, e] = a < b ? [a, b] : [b, a]
        table.setRowSelection((prev) => {
          const next = { ...prev }
          for (let i = s; i <= e; i++) {
            if (!list[i].getCanSelect()) continue
            if (nextValue) next[list[i].id] = true
            else delete next[list[i].id]
          }
          return next
        })
        anchorRef.current = row.id
        return
      }
    }
    row.toggleSelected(nextValue)
    anchorRef.current = row.id
  }

  /* ── layout ──────────────────────────────────────────────────────────── */

  const scrollRef = React.useRef<HTMLDivElement>(null)
  const theadRef = React.useRef<HTMLTableSectionElement>(null)
  const rootRef = React.useRef<HTMLDivElement>(null)
  const rangeRef = React.useRef<HTMLSpanElement>(null)
  const virtualApiRef = React.useRef<VirtualApi | null>(null)
  const lastScrollLeft = React.useRef(0)
  const [fullscreen, setFullscreen] = React.useState(false)

  const dataVersion = React.useMemo(() => ({}), [data])
  const dataVersionRef = React.useRef({ key: dataVersion, n: 0 })
  if (dataVersionRef.current.key !== dataVersion) {
    dataVersionRef.current = { key: dataVersion, n: dataVersionRef.current.n + 1 }
  }
  const visibleIds = table.getVisibleLeafColumns().map((c) => c.id).join(",")
  const tableActive = view === "table" && !error
  const layout = useColumnLayout({
    table,
    scrollRef,
    active: tableActive,
    measureKey: [
      visibleIds,
      prefs.density,
      prefs.wrap,
      grouping.join(","),
      dataVersionRef.current.n,
      allColumns.length,
      // Grouped, the leaf rows on screen change as groups open and close;
      // measure what is visible. (Not while ungrouped: widths must not jump
      // on every search keystroke.)
      grouping.length ? rowsRef.current.length : 0,
    ].join("|"),
    sizing: prefs.columnSizing,
  })
  const pinSig = pinSignature(layout.offsets)
  // Only pin placement (not offsets) reaches the rows; offsets are CSS
  // variables, so a resize never re-renders a row.
  const pins = React.useMemo<PinInfo>(
    () =>
      Object.fromEntries(
        Object.entries(layout.offsets).map(([colId, p]) => [colId, { side: p.side, edge: p.edge }])
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pinSig]
  )

  const [headerHeight, setHeaderHeight] = React.useState(32)
  useIsomorphicLayoutEffect(() => {
    const h = theadRef.current?.offsetHeight
    if (h && h !== headerHeight) setHeaderHeight(h)
  })

  // The measure pass renders a narrower table for a moment, and the browser
  // clamps the horizontal scroll to it. Put the reader back where they were.
  useIsomorphicLayoutEffect(() => {
    if (layout.phase === "fixed" && scrollRef.current && lastScrollLeft.current > 0) {
      scrollRef.current.scrollLeft = lastScrollLeft.current
    }
  }, [layout.phase])

  const onScroll = React.useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    if (layout.phase === "fixed") lastScrollLeft.current = el.scrollLeft
    const max = el.scrollWidth - el.clientWidth
    const x = max <= 1 ? "none" : el.scrollLeft <= 1 ? "start" : el.scrollLeft >= max - 1 ? "end" : "middle"
    if (el.dataset.scrollX !== x) el.dataset.scrollX = x
  }, [layout.phase])
  React.useEffect(() => {
    onScroll()
  }, [onScroll, layout.total, layout.containerWidth])

  /* ── active row & keyboard ───────────────────────────────────────────── */

  const [activeId, setActiveId] = React.useState<string | null>(null)
  const activeRow = findRow(activeId)
  const pendingEdgeRef = React.useRef<"first" | "last" | null>(null)
  const domIdFor = React.useCallback((rowId: string) => `dt-${instanceId}-r-${cssSafe(rowId)}`, [instanceId])

  const revealTableTop = React.useCallback(() => {
    const root = rootRef.current
    if (root && root.getBoundingClientRect().top < 0) root.scrollIntoView({ block: "start" })
  }, [])

  const scrollToItem = React.useCallback(
    (index: number) => {
      const item = items[index]
      if (!item) return
      if (virtual) {
        virtualApiRef.current?.scrollToIndex(index)
        return
      }
      const el = document.getElementById(domIdFor(item.row.id))
      el?.scrollIntoView({ block: "nearest" })
    },
    [items, virtual, domIdFor]
  )

  const goToPage = React.useCallback(
    (index: number) => {
      table.setPageIndex(index)
      revealTableTop()
    },
    [table, revealTableTop]
  )

  // After a keyboard page turn, land on the first/last row of the new page.
  React.useEffect(() => {
    const edge = pendingEdgeRef.current
    if (!edge || items.length === 0) return
    pendingEdgeRef.current = null
    const candidates = items.filter((i) => i.kind !== "detail")
    const target = edge === "first" ? candidates[0] : candidates[candidates.length - 1]
    if (target) setActiveId(target.row.id)
  }, [items])

  const exportColumns = layout.displayColumns

  const scopeRows = React.useCallback(
    (scope: ExportScope): Row<TData>[] => {
      if (scope === "selected") return table.getSelectedRowModel().flatRows.filter((r) => !r.getIsGrouped())
      if (scope === "page") return leafRows(rows)
      return leafRows(manualPagination ? table.getRowModel().rows : table.getSortedRowModel().rows)
    },
    [table, rows, manualPagination]
  )

  const copyRows = React.useCallback(
    async (scope: ExportScope | Row<TData>[]) => {
      const list = Array.isArray(scope) ? scope : scopeRows(scope)
      if (list.length === 0) return
      const text = toTsv(buildExportMatrix(list, exportColumns as Column<TData, unknown>[]))
      if (await copyText(text)) toast.success(`Copied ${formatNumber(list.length)} row${list.length === 1 ? "" : "s"}`)
      else toast.error("Could not copy to the clipboard")
    },
    [scopeRows, exportColumns]
  )

  const exportRows = React.useCallback(
    async (format: ExportFormat, scope: ExportScope) => {
      const list = scopeRows(scope)
      const matrix = buildExportMatrix(list, exportColumns as Column<TData, unknown>[])
      if (matrix.body.length === 0) {
        toast.error("There are no rows to export")
        return
      }
      try {
        await exportMatrix(matrix, exportFilename ?? id ?? "table", format)
        toast.success(`Exported ${formatNumber(matrix.body.length)} rows`)
      } catch {
        toast.error("The export failed")
      }
    },
    [scopeRows, exportColumns, exportFilename, id]
  )

  // Leaf rows only: a group's own id can sit in the selection state too.
  const selectedCount = selectionEnabled ? table.getSelectedRowModel().flatRows.length : 0

  const onGridKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return
    const mod = e.ctrlKey || e.metaKey
    const key = e.key
    if (key === "/") {
      e.preventDefault()
      searchInputRef.current?.focus()
      return
    }
    if (key === "?") {
      e.preventDefault()
      setShortcutsOpen(true)
      return
    }
    if (key === "f" && !mod) {
      e.preventDefault()
      setFullscreen((v) => !v)
      return
    }
    if (key === "i" && !mod && enableInspector) {
      e.preventDefault()
      setPref("inspector", !prefs.inspector)
      return
    }
    if (key === "Escape") {
      if (selectedCount > 0) table.resetRowSelection(true)
      else if (fullscreen) setFullscreen(false)
      else setActiveId(null)
      return
    }
    if (mod && key.toLowerCase() === "a" && selectionEnabled) {
      e.preventDefault()
      table.toggleAllRowsSelected(true)
      return
    }
    if (mod && key.toLowerCase() === "c") {
      e.preventDefault()
      if (selectedCount > 0) copyRows("selected")
      else if (activeRow && !activeRow.getIsGrouped()) copyRows([activeRow])
      return
    }

    const nav = items.map((it, i) => (it.kind === "detail" ? -1 : i)).filter((i) => i >= 0)
    if (nav.length === 0) return
    const current = activeId ? nav.indexOf(itemIndexById.get(activeId) ?? -1) : -1
    const moveTo = (pos: number, extend = false) => {
      const clamped = Math.max(0, Math.min(nav.length - 1, pos))
      const item = items[nav[clamped]]
      if (extend && selectionEnabled && item.kind === "row") {
        const from = activeRow
        if (from && !from.getIsSelected()) from.toggleSelected(true)
        if (!item.row.getIsSelected()) item.row.toggleSelected(true)
      }
      setActiveId(item.row.id)
      scrollToItem(nav[clamped])
    }
    const pageEdge = (dir: 1 | -1) => {
      if (virtual) return false
      if (dir === 1 && table.getCanNextPage()) {
        pendingEdgeRef.current = "first"
        goToPage(pagination.pageIndex + 1)
        return true
      }
      if (dir === -1 && table.getCanPreviousPage()) {
        pendingEdgeRef.current = "last"
        goToPage(pagination.pageIndex - 1)
        return true
      }
      return false
    }

    switch (key) {
      case "ArrowDown":
      case "j":
        e.preventDefault()
        if (current >= nav.length - 1 && pageEdge(1)) return
        moveTo(current + 1, e.shiftKey)
        return
      case "ArrowUp":
      case "k":
        e.preventDefault()
        if (current === 0 && pageEdge(-1)) return
        moveTo(current < 0 ? 0 : current - 1, e.shiftKey)
        return
      case "PageDown":
        e.preventDefault()
        if (current >= nav.length - 1 && pageEdge(1)) return
        moveTo(current + 10)
        return
      case "PageUp":
        e.preventDefault()
        if (current <= 0 && pageEdge(-1)) return
        moveTo(current - 10)
        return
      case "Home":
        e.preventDefault()
        moveTo(0)
        return
      case "End":
        e.preventDefault()
        moveTo(nav.length - 1)
        return
    }

    if (!activeRow) return
    if (key === "Enter") {
      e.preventDefault()
      if (activeRow.getIsGrouped()) activeRow.toggleExpanded()
      else if (onRowClick) onRowClick(activeRow.original)
      else if (renderSubComponent && activeRow.getCanExpand()) activeRow.toggleExpanded()
      else if (enableInspector) setPref("inspector", true)
    } else if (key === " " && selectionEnabled) {
      e.preventDefault()
      toggleRowRef.current(activeRow, e.shiftKey)
    } else if (key === "ArrowRight" && activeRow.getCanExpand() && !activeRow.getIsExpanded()) {
      e.preventDefault()
      activeRow.toggleExpanded(true)
    } else if (key === "ArrowLeft") {
      if (activeRow.getIsExpanded()) {
        e.preventDefault()
        activeRow.toggleExpanded(false)
      } else if (activeRow.parentId) {
        e.preventDefault()
        setActiveId(activeRow.parentId)
      }
    }
  }

  const onBodyClick = (e: React.MouseEvent) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-row-id]")
    if (!el) return
    const rowId = el.dataset.rowId!
    setActiveId(rowId)
    if (fromInteractive(e.target)) return
    const row = findRow(rowId)
    if (!row || row.getIsGrouped()) return
    if (onRowClick) onRowClick(row.original)
    else if (renderSubComponent && row.getCanExpand()) row.toggleExpanded()
  }

  /* ── fullscreen ──────────────────────────────────────────────────────── */

  React.useEffect(() => {
    if (!fullscreen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      // Leave Escape to an open menu, popover or dialog first.
      if (
        e.key !== "Escape" ||
        document.querySelector("[data-radix-popper-content-wrapper], [role='dialog'][data-state='open'], [role='alertdialog'][data-state='open']")
      )
        return
      setFullscreen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener("keydown", onKey)
    }
  }, [fullscreen])

  /* ── filters, insights, context menu ─────────────────────────────────── */

  const onFilterChange = React.useCallback(() => table.setPageIndex(0), [table])
  const [insightsId, setInsightsId] = React.useState<string | null>(null)
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false)
  const [ctx, setCtx] = React.useState<CtxTarget | null>(null)

  const canFilterColumn = React.useCallback(
    (column: Column<TData, unknown> | undefined) =>
      Boolean(column && enableHeaderFilters && !isSyntheticColumn(column.id) && canHeaderFilter(column)),
    [enableHeaderFilters]
  )

  const filterByValue = React.useCallback(
    (column: Column<TData, unknown>, raw: unknown) => {
      const variant = variantOf(column)
      let next: unknown
      if (variant === "multiSelect") next = (Array.isArray(raw) ? raw : [raw]).map(stringifyValue)
      else if (variant === "dateRange") {
        const t = toDateTime(raw)
        if (t === null) return
        const day = localDateStamp(new Date(t))
        next = { from: day, to: day }
      } else if (variant === "numberRange") {
        const n = toNumber(raw)
        if (n === null) return
        next = [n, n]
      } else if (variant === "boolean") {
        next = raw === true || ["true", "yes", "1", "y"].includes(stringifyValue(raw).toLowerCase()) ? "true" : "false"
      } else next = stringifyValue(raw)
      column.setFilterValue(hasFilterValue(next) ? next : undefined)
      onFilterChange()
      toast.success(`Filtered by ${getColumnLabel(column)}`)
    },
    [onFilterChange]
  )

  const insightsColumn = insightsId ? (table.getColumn(insightsId) as Column<TData, unknown> | undefined) ?? null : null
  const insightsRows = React.useMemo(
    () => (insightsColumn ? leafRows(manualPagination ? table.getRowModel().rows : table.getFilteredRowModel().rows) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [insightsColumn, rows]
  )

  // Touch long-press opens the menu from pointerdown, before any contextmenu
  // event, so record the target there too.
  const onBodyPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "touch") return
    const rowEl = (e.target as HTMLElement).closest<HTMLElement>("[data-row-id]")
    if (!rowEl || rowEl.hasAttribute("data-group")) return
    const cellEl = (e.target as HTMLElement).closest<HTMLElement>("[data-col]")
    setCtx({ rowId: rowEl.dataset.rowId!, columnId: cellEl?.dataset.col, text: (cellEl?.innerText ?? "").trim() })
  }

  const onContextMenuCapture = (e: React.MouseEvent) => {
    const rowEl = (e.target as HTMLElement).closest<HTMLElement>("[data-row-id]")
    if (!rowEl || rowEl.hasAttribute("data-group")) {
      e.preventDefault()
      setCtx(null)
      return
    }
    const cellEl = (e.target as HTMLElement).closest<HTMLElement>("[data-col]")
    const rowId = rowEl.dataset.rowId!
    setActiveId(rowId)
    setCtx({ rowId, columnId: cellEl?.dataset.col, text: (cellEl?.innerText ?? "").trim() })
  }

  /* ── controller for toolbar / footer ─────────────────────────────────── */

  const hasClientFilters =
    !manualFiltering && (columnFilters.some((f) => hasFilterValue(f.value)) || Boolean(globalFilter))
  const filteredCount = manualPagination
    ? (totalRowCount ?? data.length)
    : table.getFilteredRowModel().rows.length
  const pageLeafCount = React.useMemo(() => rows.filter((r) => !r.getIsGrouped()).length, [rows])

  const applyView = React.useCallback(
    (v: SavedView) => {
      table.setSorting(v.state.sorting)
      setColumnFilters(v.state.columnFilters)
      setGrouping(v.state.grouping)
      if (!searchKey) commitSearch(v.state.globalFilter)
      setPref("density", v.state.density)
      setPref("columnVisibility", v.state.columnVisibility)
      setPref("columnOrder", v.state.columnOrder)
      setPref("columnPinning", v.state.columnPinning)
      table.setPageIndex(0)
      toast.success(`Applied “${v.name}”`)
    },
    [table, searchKey, commitSearch, setPref]
  )

  const controller: TableController<TData> = {
    table,
    prefs,
    setPref: setPref as <K extends keyof TablePreferences>(key: K, value: TablePreferences[K]) => void,
    resetLayout: () => {
      resetLayout()
      setGrouping([])
    },
    persistent,
    views,
    saveView: (name) => {
      saveView(name, {
        sorting,
        columnFilters,
        grouping,
        globalFilter,
        density: prefs.density,
        columnVisibility: prefs.columnVisibility,
        columnOrder: prefs.columnOrder,
        columnPinning: prefs.columnPinning,
      })
      toast.success(`Saved view “${name.trim()}”`)
    },
    applyView,
    deleteView,
    canVirtual,
    canGroup,
    canInspector: enableInspector,
    canExport: enableExport,
    canReorder: enableColumnReordering,
    isMobile,
    fullscreen,
    toggleFullscreen: () => setFullscreen((v) => !v),
    exportRows,
    copyRows,
    scopeCounts: {
      all: manualPagination ? pageLeafCount : filteredCount,
      page: pageLeafCount,
      selected: selectedCount,
    },
    allScopeLabel: manualPagination ? "Rows on this page" : hasClientFilters ? "All matching rows" : "All rows",
    openShortcuts: () => setShortcutsOpen(true),
    onRefresh,
    isLoading,
    onFilterChange,
    moveColumn: (colId, target, side) => moveColumn(colId, target, side),
  }

  function moveColumn(colId: string, target: string | number, side: "before" | "after" = "before") {
    const order = table.getAllLeafColumns().map((c) => c.id)
    if (!order.includes(colId)) return
    const next = order.filter((x) => x !== colId)
    let to: number
    if (typeof target === "number") {
      const col = table.getColumn(colId)
      const peers = order.filter((x) => {
        const c = table.getColumn(x)
        return !isSyntheticColumn(x) && c?.getIsVisible() && c.getIsPinned() === col?.getIsPinned()
      })
      const neighbor = peers[peers.indexOf(colId) + target]
      if (!neighbor) return
      to = next.indexOf(neighbor) + (target > 0 ? 1 : 0)
    } else {
      const t = next.indexOf(target)
      if (t < 0) return
      to = side === "after" ? t + 1 : t
    }
    next.splice(to, 0, colId)
    table.setColumnOrder(next)
  }

  /* ── header ui ───────────────────────────────────────────────────────── */

  const resizingRef = React.useRef(false)
  const [resizingId, setResizingId] = React.useState<string | null>(null)
  const [dragId, setDragId] = React.useState<string | null>(null)
  const [dropTarget, setDropTarget] = React.useState<HeaderUi<TData>["dropTarget"]>(null)
  const currentWidthRef = React.useRef(layout.currentWidth)
  currentWidthRef.current = layout.currentWidth

  const headerUi: HeaderUi<TData> = {
    table,
    enableHeaderFilters,
    showFacetCounts: !manualFiltering,
    canBuiltInSort: (column) => {
      if (!column.getCanSort()) return false
      if (manualSorting) return column.columnDef.meta?.sortable === true || column.columnDef.enableSorting === true
      return true
    },
    enablePinning: enableColumnPinning,
    enableGrouping: canGroup,
    enableResizing: enableColumnResizing && tableActive,
    enableReordering: enableColumnReordering,
    onFilterChange,
    openInsights: setInsightsId,
    startResize: (colId, e) => {
      if (e.button !== 0) return
      e.preventDefault()
      e.stopPropagation()
      const el = e.currentTarget
      el.setPointerCapture(e.pointerId)
      const startX = e.clientX
      const startW = currentWidthRef.current(colId)
      const min = table.getColumn(colId)?.columnDef.meta?.minWidth ?? 48
      resizingRef.current = true
      setResizingId(colId)
      let frame = 0
      let lastX = startX
      const onMove = (ev: PointerEvent) => {
        lastX = ev.clientX
        cancelAnimationFrame(frame)
        frame = requestAnimationFrame(() => {
          const w = Math.max(min, Math.round(startW + lastX - startX))
          table.setColumnSizing((prev) => (prev[colId] === w ? prev : { ...prev, [colId]: w }))
        })
      }
      const onUp = () => {
        cancelAnimationFrame(frame)
        el.removeEventListener("pointermove", onMove)
        el.removeEventListener("pointerup", onUp)
        el.removeEventListener("pointercancel", onUp)
        resizingRef.current = false
        setResizingId(null)
      }
      el.addEventListener("pointermove", onMove)
      el.addEventListener("pointerup", onUp)
      el.addEventListener("pointercancel", onUp)
    },
    nudgeWidth: (colId, delta) => {
      const w = Math.max(48, Math.round(currentWidthRef.current(colId) + delta))
      table.setColumnSizing((prev) => ({ ...prev, [colId]: w }))
    },
    resetWidth: (colId) =>
      table.setColumnSizing((prev) => {
        if (!(colId in prev)) return prev
        const next = { ...prev }
        delete next[colId]
        return next
      }),
    isResizing: () => resizingRef.current,
    resizingId,
    dragId,
    dropTarget,
    setDrag: setDragId,
    setDropTarget,
    moveColumn,
  }

  /* ── rendering ───────────────────────────────────────────────────────── */

  const showSkeleton = isLoading && data.length === 0
  const isPageTransition =
    manualPagination && controlledPageIndex !== undefined && pagination.pageIndex !== controlledPageIndex
  const busy = isPageTransition || (isLoading && !showSkeleton)
  const rowOffset = virtual ? 0 : pagination.pageIndex * pagination.pageSize
  const colSpan = layout.displayColumns.length || 1
  const headerGroups = table.getHeaderGroups()
  const leafGroupIndex = headerGroups.length - 1
  const clickable = Boolean(onRowClick)

  const renderItem: RenderItem<TData> = (item, index, measure) => {
    const row = item.row
    if (item.kind === "detail") {
      return (
        <DetailRow
          key={item.key}
          row={row}
          colSpan={colSpan}
          render={renderSubComponent!}
          measureRef={measure?.ref}
          virtualIndex={measure?.index}
        />
      )
    }
    const cells = row.getVisibleCells()
    if (item.kind === "group") {
      return (
        <GroupRow
          key={item.key}
          row={row}
          cells={cells}
          expanded={row.getIsExpanded()}
          selected={row.getIsAllSubRowsSelected()}
          pins={pins}
          measureRef={measure?.ref}
          virtualIndex={measure?.index}
        />
      )
    }
    return (
      <DataRow
        key={item.key}
        row={row}
        cells={cells}
        domId={domIdFor(row.id)}
        index={index}
        rowNumber={rowOffset + (rowPosition.get(row.id) ?? index) + 1}
        className={getRowClassName?.(row)}
        selected={row.getIsSelected()}
        expanded={row.getIsExpanded()}
        active={row.id === activeId}
        clickable={clickable}
        pins={pins}
        measureRef={measure?.ref}
        virtualIndex={measure?.index}
      />
    )
  }

  const renderCardItem = (item: DisplayItem<TData>) => {
    const row = item.row
    if (item.kind === "group") return <GroupCardHeader row={row} expanded={row.getIsExpanded()} />
    return (
      <RowCard
        row={row}
        cells={row.getVisibleCells()}
        domId={domIdFor(row.id)}
        selected={row.getIsSelected()}
        active={row.id === activeId}
        expanded={row.getIsExpanded()}
        clickable={clickable}
        className={getRowClassName?.(row)}
        renderCard={renderCard}
        renderSubComponent={renderSubComponent}
      />
    )
  }

  const filtersActive = columnFilters.some((f) => hasFilterValue(f.value)) || Boolean(searchValue)
  const clearEverything = () => {
    table.resetColumnFilters(true)
    if (searchValue) commitSearch("")
    onFilterChange()
  }
  const empty = (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
      {emptyState ?? (
        <>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            {filtersActive ? <SearchX className="h-5 w-5" /> : <Inbox className="h-5 w-5" />}
          </span>
          <p className="text-sm font-medium">{filtersActive ? "Nothing matches these filters" : "No results."}</p>
          {filtersActive && (
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={clearEverything}>
              Clear filters
            </Button>
          )}
        </>
      )}
    </div>
  )

  const aggregateColumns = layout.displayColumns.filter((c) => c.columnDef.meta?.aggregate)
  const firstDataIndex = layout.displayColumns.findIndex((c) => !isSyntheticColumn(c.id))
  const aggregateRows = React.useMemo(
    () =>
      aggregateColumns.length
        ? leafRows(manualPagination ? table.getRowModel().rows : table.getFilteredRowModel().rows)
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [aggregateColumns.length, rows]
  )

  const boundedHeight = fullscreen ? undefined : virtual ? (height ?? "min(70vh, 760px)") : undefined
  const scrollStyle: React.CSSProperties = {
    ...(virtual && !fullscreen
      ? height !== undefined
        ? { height: typeof height === "number" ? `${height}px` : height }
        : { maxHeight: boundedHeight }
      : {}),
    ...layout.cssVars,
    ...(layout.containerWidth > 0 ? { ["--dt-viewport-w" as string]: `${layout.containerWidth}px` } : {}),
  }

  const tableStyle: React.CSSProperties =
    layout.phase === "fixed"
      ? { tableLayout: "fixed", width: `max(${layout.total}px, 100%)` }
      : { tableLayout: "auto", width: "max-content", minWidth: "100%" }

  const tableEl = (
    <table className="dt-table" style={tableStyle} aria-rowcount={manualPagination ? totalRowCount : filteredCount}>
      {layout.phase === "fixed" && (
        <colgroup>
          {layout.displayColumns.map((c) => (
            <col key={c.id} style={{ width: layout.widths[c.id] }} />
          ))}
        </colgroup>
      )}
      <thead ref={theadRef}>
        {headerGroups.map((group, gi) => (
          <tr key={group.id}>
            {group.headers.map((header) => {
              const pin = gi === leafGroupIndex ? pinProps(header.column.id, pins) : {}
              return (
                <HeaderCell
                  key={header.id}
                  header={header}
                  ui={headerUi}
                  registerRef={gi === leafGroupIndex ? layout.registerHeader(header.column.id) : undefined}
                  style={{ ...pin.style, top: gi * 32 || undefined }}
                  pinClass={pin.className}
                />
              )
            })}
          </tr>
        ))}
      </thead>
      {error ? (
        <tbody>
          <tr>
            <td colSpan={colSpan}>
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div className="text-sm">{error}</div>
                {onRefresh && (
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onRefresh}>
                    Try again
                  </Button>
                )}
              </div>
            </td>
          </tr>
        </tbody>
      ) : showSkeleton ? (
        <tbody>
          <SkeletonRows columns={colSpan} count={Math.min(pagination.pageSize || 8, 8)} />
        </tbody>
      ) : items.length === 0 ? (
        <tbody>
          <tr>
            <td colSpan={colSpan} className="dt-empty">
              <div className="dt-detail-inner">{empty}</div>
            </td>
          </tr>
        </tbody>
      ) : virtual ? (
        <VirtualBody
          items={items}
          scrollRef={scrollRef}
          estimateSize={ROW_ESTIMATE[prefs.density]}
          renderItem={renderItem}
          colSpan={colSpan}
          headerHeight={headerHeight}
          apiRef={virtualApiRef}
          onRangeChange={(first, last) => {
            if (rangeRef.current) {
              rangeRef.current.textContent = items.length
                ? ` · viewing ${formatNumber(first + 1)}–${formatNumber(Math.min(last + 1, items.length))}`
                : ""
            }
          }}
          onEndReached={onEndReached}
          hasMore={hasMore}
          loadingMore={isLoading}
        />
      ) : (
        <tbody>{items.map((item, i) => renderItem(item, i))}</tbody>
      )}
      {aggregateColumns.length > 0 && items.length > 0 && !error && (
        <tfoot>
          <tr className="dt-foot-row">
            {layout.displayColumns.map((c, i) => {
              const pin = pinProps(c.id, pins)
              const agg = c.columnDef.meta?.aggregate
              return (
                <td
                  key={c.id}
                  className={cn("dt-td", pin.className, c.columnDef.meta?.numeric && "text-right tabular-nums")}
                  style={pin.style}
                >
                  {agg ? (
                    aggregateOf(agg, aggregateRows, c as Column<TData, unknown>)
                  ) : i === firstDataIndex ? (
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {manualPagination ? "This page" : "Totals"}
                    </span>
                  ) : null}
                </td>
              )
            })}
          </tr>
        </tfoot>
      )}
    </table>
  )

  const cardsEl = error ? (
    <div className="p-6 text-center text-sm">{error}</div>
  ) : showSkeleton ? (
    <div className="grid gap-2 p-2 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="dt-card space-y-2">
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
          <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  ) : items.length === 0 ? (
    empty
  ) : (
    <div className="p-2">
      <CardGrid
        items={items}
        renderItem={renderCardItem}
        scrollRef={scrollRef}
        virtual={virtual}
        single={isMobile}
        estimateSize={CARD_ESTIMATE}
        apiRef={virtualApiRef}
      />
    </div>
  )

  useSearchHighlight(scrollRef, searchValue, !error)

  const withContextMenu = (node: React.ReactNode) =>
    enableContextMenu ? (
      <ContextMenu onOpenChange={(open) => !open && setCtx(null)}>
        <ContextMenuTrigger asChild>{node}</ContextMenuTrigger>
        <RowContextMenu
          target={ctx}
          row={ctx ? findRow(ctx.rowId) : undefined}
          table={table}
          selectionEnabled={selectionEnabled}
          canExpand={Boolean(renderSubComponent)}
          canInspect={enableInspector}
          canFilter={canFilterColumn}
          onOpen={onRowClick}
          onInspect={() => setPref("inspector", true)}
          onFilter={filterByValue}
          onCopyRow={(row) => copyRows([row])}
          exportColumns={exportColumns as Column<TData, unknown>[]}
        />
      </ContextMenu>
    ) : (
      node
    )

  const inspectorPosition = activeRow ? (rowPosition.get(activeRow.id) ?? -1) : -1

  return (
    <div
      ref={rootRef}
      className={cn(
        "dt w-full scroll-mt-14",
        fullscreen && "dt-fullscreen fixed inset-0 z-50 flex flex-col bg-background p-3",
        className
      )}
      data-density={prefs.density}
      data-striped={prefs.striped || undefined}
      data-grid={prefs.gridLines || undefined}
      data-wrap={prefs.wrap || undefined}
      data-view={view}
    >
      {!hideToolbar ? (
        <div className="dt-toolbar mb-2 space-y-1.5">
          {(title || description) && (
            <div className="min-w-0">
              {title && <h3 className="truncate text-sm font-semibold">{title}</h3>}
              {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </div>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {(searchKey || globalSearchOn) && (
              <SearchBox
                value={searchValue}
                onCommit={commitSearch}
                placeholder={searchPlaceholder ?? (searchKey ? "Search..." : "Search all columns…")}
                inputRef={searchInputRef}
              />
            )}
            <div className="min-w-0 flex-1">
              <FilterChips table={table} onChange={onFilterChange} />
            </div>
            <div className="flex items-center justify-end gap-1">
              {toolbarActions}
              <ToolbarControls c={controller} />
            </div>
          </div>
        </div>
      ) : (
        (columnFilters.length > 0 || grouping.length > 0) && (
          <div className="mb-1.5">
            <FilterChips table={table} onChange={onFilterChange} />
          </div>
        )
      )}

      <div
        className={cn("dt-frame relative flex rounded-md border bg-card", fullscreen && "min-h-0 flex-1")}
        data-bounded={virtual || fullscreen || undefined}
      >
        {busy && <div className="dt-progress" aria-hidden />}
        <div
          ref={scrollRef}
          role="grid"
          aria-label={typeof title === "string" ? title : "Data table"}
          aria-busy={busy || showSkeleton}
          aria-activedescendant={activeRow && !activeRow.getIsGrouped() ? domIdFor(activeRow.id) : undefined}
          aria-multiselectable={selectionEnabled || undefined}
          tabIndex={0}
          data-busy={busy || undefined}
          className={cn("dt-scroll relative min-w-0 flex-1", fullscreen && "h-full")}
          style={scrollStyle}
          onScroll={onScroll}
          onKeyDown={onGridKeyDown}
          onClick={onBodyClick}
          onFocus={(e) => {
            if (e.target === e.currentTarget && !activeId) {
              const first = items.find((i) => i.kind !== "detail")
              if (first) setActiveId(first.row.id)
            }
          }}
        >
          {view === "table"
            ? withContextMenu(<div onContextMenu={onContextMenuCapture} onPointerDown={onBodyPointerDown}>{tableEl}</div>)
            : withContextMenu(<div onContextMenu={onContextMenuCapture} onPointerDown={onBodyPointerDown}>{cardsEl}</div>)}
        </div>
        {inspectorOpen && (
          <RowInspector
            style={virtual && !fullscreen ? (height !== undefined ? { height: scrollStyle.height } : { maxHeight: boundedHeight }) : undefined}
            row={activeRow && !activeRow.getIsGrouped() ? activeRow : null}
            position={inspectorPosition}
            total={rowsRef.current.length}
            onPrev={() => {
              const prev = rowsRef.current[inspectorPosition - 1]
              if (prev) {
                setActiveId(prev.id)
                const i = itemIndexById.get(prev.id)
                if (i !== undefined) scrollToItem(i)
              }
            }}
            onNext={() => {
              const next = rowsRef.current[inspectorPosition + 1]
              if (next) {
                setActiveId(next.id)
                const i = itemIndexById.get(next.id)
                if (i !== undefined) scrollToItem(i)
              }
            }}
            onClose={() => setPref("inspector", false)}
          />
        )}
      </div>

      <TableFooter
        virtual={virtual}
        pageIndex={pagination.pageIndex}
        pageCount={manualPagination ? (controlledPageCount ?? 1) : table.getPageCount()}
        pageSize={pagination.pageSize}
        pageSizeOptions={pageSizes}
        rowCount={filteredCount}
        preFilterCount={hasClientFilters && !manualPagination ? table.getPreFilteredRowModel().rows.length : undefined}
        pageRowCount={pageLeafCount}
        clientFilteredPage={manualPagination && hasClientFilters}
        selectedCount={selectedCount}
        rangeRef={rangeRef}
        canPrev={table.getCanPreviousPage()}
        canNext={table.getCanNextPage()}
        onPage={goToPage}
        onPageSize={(size) => {
          table.setPagination({ pageIndex: 0, pageSize: size })
          revealTableTop()
        }}
        onBackToTop={() => virtualApiRef.current?.scrollToTop()}
        controls={hideToolbar ? <div className="dt-dense-controls"><ToolbarControls c={controller} /></div> : undefined}
      />

      {selectionEnabled && (
        <BulkActionBar
          count={selectedCount}
          total={filteredCount}
          canSelectAll={!manualPagination}
          onSelectAll={() => table.toggleAllRowsSelected(true)}
          onClear={() => table.resetRowSelection(true)}
          onCopy={() => copyRows("selected")}
          onExport={() => exportRows("xlsx", "selected")}
        >
          {bulkActions?.({
            rows: table.getSelectedRowModel().flatRows.map((r) => r.original),
            clearSelection: () => table.resetRowSelection(true),
          })}
        </BulkActionBar>
      )}

      <ColumnInsightsDialog
        column={insightsColumn}
        rows={insightsRows}
        scopeLabel={
          manualPagination
            ? `the ${formatNumber(insightsRows.length)} rows on this page`
            : `${formatNumber(insightsRows.length)} ${hasClientFilters ? "matching" : ""} rows`
        }
        onOpenChange={(open) => !open && setInsightsId(null)}
        onFilterValue={
          insightsColumn && canFilterColumn(insightsColumn)
            ? (column, value) => {
                filterByValue(column, value)
                setInsightsId(null)
              }
            : undefined
        }
      />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  )
}

function RowContextMenu<TData>({
  target,
  row,
  table,
  selectionEnabled,
  canExpand,
  canInspect,
  canFilter,
  onOpen,
  onInspect,
  onFilter,
  onCopyRow,
  exportColumns,
}: {
  target: CtxTarget | null
  row: Row<TData> | undefined
  table: Table<TData>
  selectionEnabled: boolean
  canExpand: boolean
  canInspect: boolean
  canFilter: (column: Column<TData, unknown> | undefined) => boolean
  onOpen?: (row: TData) => void
  onInspect: () => void
  onFilter: (column: Column<TData, unknown>, raw: unknown) => void
  onCopyRow: (row: Row<TData>) => void
  exportColumns: Column<TData, unknown>[]
}) {
  if (!target || !row) return <ContextMenuContent className="hidden" />
  const column = target.columnId ? (table.getColumn(target.columnId) as Column<TData, unknown> | undefined) : undefined
  const raw = column ? getExportValue(row, column) : undefined
  const preview = target.text.length > 28 ? `${target.text.slice(0, 28)}…` : target.text
  return (
    <ContextMenuContent className="w-60 text-xs">
      {target.text && (
        <ContextMenuItem
          onSelect={async () => {
            if (await copyText(target.text)) toast.success("Copied")
          }}
        >
          <Copy className="mr-2 h-3.5 w-3.5" />
          <span className="truncate">Copy “{preview}”</span>
        </ContextMenuItem>
      )}
      <ContextMenuItem onSelect={() => onCopyRow(row)}>
        <ClipboardCopy className="mr-2 h-3.5 w-3.5" /> Copy row
        <ContextMenuShortcut>⌘C</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem
        onSelect={async () => {
          const m = buildExportMatrix([row], exportColumns)
          const obj = Object.fromEntries(m.headers.map((h, i) => [h, m.body[0]?.[i]]))
          if (await copyText(JSON.stringify(obj, null, 2))) toast.success("Copied as JSON")
        }}
      >
        <Braces className="mr-2 h-3.5 w-3.5" /> Copy row as JSON
      </ContextMenuItem>
      {column && canFilter(column) && stringifyValue(raw) !== "" && (
        <>
          <ContextMenuSeparator />
          <ContextMenuItem onSelect={() => onFilter(column, raw)}>
            <Filter className="mr-2 h-3.5 w-3.5" />
            <span className="truncate">
              Filter {getColumnLabel(column)} = “{preview || stringifyValue(raw)}”
            </span>
          </ContextMenuItem>
        </>
      )}
      <ContextMenuSeparator />
      {selectionEnabled && row.getCanSelect() && (
        <ContextMenuItem onSelect={() => row.toggleSelected()}>
          <SquareCheck className="mr-2 h-3.5 w-3.5" /> {row.getIsSelected() ? "Deselect row" : "Select row"}
          <ContextMenuShortcut>Space</ContextMenuShortcut>
        </ContextMenuItem>
      )}
      {canExpand && row.getCanExpand() && (
        <ContextMenuItem onSelect={() => row.toggleExpanded()}>
          <Expand className="mr-2 h-3.5 w-3.5" /> {row.getIsExpanded() ? "Collapse" : "Expand"}
          <ContextMenuShortcut>→</ContextMenuShortcut>
        </ContextMenuItem>
      )}
      {canInspect && (
        <ContextMenuItem onSelect={onInspect}>
          <PanelRight className="mr-2 h-3.5 w-3.5" /> Show all fields
          <ContextMenuShortcut>i</ContextMenuShortcut>
        </ContextMenuItem>
      )}
      {onOpen && (
        <ContextMenuItem onSelect={() => onOpen(row.original)}>
          <MousePointerClick className="mr-2 h-3.5 w-3.5" /> Open
          <ContextMenuShortcut>↵</ContextMenuShortcut>
        </ContextMenuItem>
      )}
    </ContextMenuContent>
  )
}
