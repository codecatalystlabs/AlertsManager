"use client"

import * as React from "react"
import {
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  type Header,
  type PaginationState,
  type Row,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getPaginationRange } from "@/lib/pagination-utils"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const
const EMPTY_SELECT_VALUE = "__all__"

type HeaderFilterVariant = "text" | "select" | "dateRange"
type DateRangeFilterValue = { from?: string; to?: string }

interface HeaderFilterOption {
  label: string
  value: string
}

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    enableHeaderFilter?: boolean
    filterLabel?: string
    filterPlaceholder?: string
    filterVariant?: HeaderFilterVariant
    filterOptions?: HeaderFilterOption[]
  }
}

export function dateRangeFilter<TData>(
  row: Row<TData>,
  columnId: string,
  filterValue: unknown
): boolean {
  if (!isDateRangeFilterValue(filterValue) || !hasFilterValue(filterValue)) {
    return true
  }

  const rowTime = toDateTime(row.getValue(columnId))
  if (rowTime === null) return false

  const fromTime = filterValue.from ? toDateTime(filterValue.from) : null
  const toTime = filterValue.to ? toDateTime(`${filterValue.to}T23:59:59`) : null

  if (fromTime !== null && rowTime < fromTime) return false
  if (toTime !== null && rowTime > toTime) return false
  return true
}

export function exactStringFilter<TData>(
  row: Row<TData>,
  columnId: string,
  filterValue: unknown
): boolean {
  if (typeof filterValue !== "string" || filterValue.trim() === "") return true
  return (
    String(row.getValue(columnId) ?? "").toLowerCase() ===
    filterValue.toLowerCase()
  )
}

export function textIncludesFilter<TData>(
  row: Row<TData>,
  columnId: string,
  filterValue: unknown
): boolean {
  if (typeof filterValue !== "string" || filterValue.trim() === "") return true

  return String(row.getValue(columnId) ?? "")
    .toLowerCase()
    .includes(filterValue.toLowerCase())
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  /** Hide the built-in toolbar row (search + column visibility) when the parent supplies its own. */
  hideToolbar?: boolean
  enableHeaderFilters?: boolean
  pageSize?: number
  /** Server-driven pagination: parent owns page state and supplies total row count. */
  manualPagination?: boolean
  pageCount?: number
  totalRowCount?: number
  pageIndex?: number
  onPageChange?: (pageIndex: number) => void
  onPageSizeChange?: (pageSize: number) => void
  onColumnFiltersChange?: (filters: ColumnFiltersState) => void
  /**
   * Server-driven column filtering: the header filters are sent to the parent
   * (via onColumnFiltersChange) which re-fetches a filtered page, instead of
   * filtering only the rows already loaded on the current page. Pair with
   * manualPagination so a column filter scopes the whole dataset.
   */
  manualFiltering?: boolean
  /** Server-driven sorting: parent owns sort state and re-fetches sorted pages. */
  manualSorting?: boolean
  sorting?: SortingState
  onSortingChange?: (sorting: SortingState) => void
  isLoading?: boolean
  /** e.g. green background for verified rows */
  getRowClassName?: (row: Row<TData>) => string | undefined
}

function isDateRangeFilterValue(value: unknown): value is DateRangeFilterValue {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

function hasFilterValue(value: unknown): boolean {
  if (typeof value === "string") return value.trim().length > 0
  if (isDateRangeFilterValue(value)) {
    return Boolean(value.from || value.to)
  }
  return value !== undefined && value !== null
}

function toDateTime(value: unknown): number | null {
  if (value instanceof Date) {
    const time = value.getTime()
    return Number.isNaN(time) ? null : time
  }

  if (typeof value !== "string" && typeof value !== "number") return null

  const time = new Date(value).getTime()
  return Number.isNaN(time) ? null : time
}

function getHeaderFilterLabel<TData, TValue>(
  header: Header<TData, TValue>
): string {
  const metaLabel = header.column.columnDef.meta?.filterLabel
  if (metaLabel) return metaLabel

  const columnHeader = header.column.columnDef.header
  if (typeof columnHeader === "string") return columnHeader

  return header.column.id
}

function HeaderFilterControl<TData, TValue>({
  header,
  onFilterChange,
}: {
  header: Header<TData, TValue>
  onFilterChange: () => void
}) {
  const column = header.column
  const meta = column.columnDef.meta
  const filterValue = column.getFilterValue()
  const isActive = hasFilterValue(filterValue)

  if (!column.getCanFilter() || meta?.enableHeaderFilter === false) {
    return null
  }

  const label = getHeaderFilterLabel(header)
  const variant = meta?.filterVariant ?? "text"

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          aria-label={`Filter ${label}`}
          title={`Filter ${label}`}
        >
          <ListFilter
            className={cn(
              "h-3.5 w-3.5",
              isActive ? "text-uganda-red" : "text-muted-foreground"
            )}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-xs font-semibold uppercase tracking-wide">
              Filter {label}
            </p>
            {isActive && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                aria-label={`Clear ${label} filter`}
                onClick={() => {
                  column.setFilterValue(undefined)
                  onFilterChange()
                }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <HeaderFilterInput
            column={column}
            label={label}
            variant={variant}
            onFilterChange={onFilterChange}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}

function HeaderFilterInput<TData, TValue>({
  column,
  label,
  variant,
  onFilterChange,
}: {
  column: Column<TData, TValue>
  label: string
  variant: HeaderFilterVariant
  onFilterChange: () => void
}) {
  const meta = column.columnDef.meta
  const filterValue = column.getFilterValue()

  if (variant === "select") {
    const value =
      typeof filterValue === "string" && filterValue
        ? filterValue
        : EMPTY_SELECT_VALUE

    return (
      <Select
        value={value}
        onValueChange={(nextValue) => {
          column.setFilterValue(
            nextValue === EMPTY_SELECT_VALUE ? undefined : nextValue
          )
          onFilterChange()
        }}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder={`All ${label}`} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={EMPTY_SELECT_VALUE}>All</SelectItem>
          {(meta?.filterOptions ?? []).map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (variant === "dateRange") {
    const value = isDateRangeFilterValue(filterValue) ? filterValue : {}

    const updateRange = (patch: DateRangeFilterValue) => {
      const next = { ...value, ...patch }
      column.setFilterValue(hasFilterValue(next) ? next : undefined)
      onFilterChange()
    }

    return (
      <div className="grid grid-cols-2 gap-2">
        <Input
          type="date"
          value={value.from ?? ""}
          onChange={(event) => updateRange({ from: event.target.value })}
          className="h-8 text-xs"
          aria-label={`${label} from`}
        />
        <Input
          type="date"
          value={value.to ?? ""}
          onChange={(event) => updateRange({ to: event.target.value })}
          className="h-8 text-xs"
          aria-label={`${label} to`}
        />
      </div>
    )
  }

  return (
    <Input
      value={typeof filterValue === "string" ? filterValue : ""}
      onChange={(event) => {
        column.setFilterValue(event.target.value)
        onFilterChange()
      }}
      placeholder={meta?.filterPlaceholder ?? `Search ${label}`}
      className="h-8 text-xs"
    />
  )
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Search...",
  hideToolbar = false,
  enableHeaderFilters = false,
  pageSize = 10,
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
  isLoading = false,
  getRowClassName,
}: DataTableProps<TData, TValue>) {
  const [internalSorting, setInternalSorting] = React.useState<SortingState>([])
  const sorting = controlledSorting ?? internalSorting
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: controlledPageIndex ?? 0,
    pageSize,
  })
  const pendingManualPaginationRef = React.useRef<PaginationState | null>(null)

  React.useEffect(() => {
    setPagination((prev) =>
      prev.pageSize === pageSize ? prev : { ...prev, pageSize }
    )
  }, [pageSize])

  React.useEffect(() => {
    if (controlledPageIndex !== undefined) {
      setPagination((prev) =>
        prev.pageIndex === controlledPageIndex
          ? prev
          : { ...prev, pageIndex: controlledPageIndex }
      )
    }
  }, [controlledPageIndex])

  React.useEffect(() => {
    if (!manualPagination) {
      pendingManualPaginationRef.current = null
      return
    }

    const next = pendingManualPaginationRef.current
    if (!next) return

    pendingManualPaginationRef.current = null

    if (next.pageIndex !== controlledPageIndex) {
      onPageChange?.(next.pageIndex)
    }
    if (next.pageSize !== pageSize) {
      onPageSizeChange?.(next.pageSize)
    }
  }, [
    controlledPageIndex,
    manualPagination,
    onPageChange,
    onPageSizeChange,
    pageSize,
    pagination,
  ])

  React.useEffect(() => {
    onColumnFiltersChange?.(columnFilters)
  }, [columnFilters, onColumnFiltersChange])

  const table = useReactTable({
    data,
    columns,
    manualPagination,
    manualFiltering,
    manualSorting,
    pageCount: manualPagination ? controlledPageCount : undefined,
    onSortingChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(sorting) : updater
      if (onSortingChange) {
        onSortingChange(next)
      } else {
        setInternalSorting(next)
      }
    },
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: (updater) => {
      setPagination((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater
        if (manualPagination) {
          if (
            next.pageIndex !== prev.pageIndex ||
            next.pageSize !== prev.pageSize
          ) {
            pendingManualPaginationRef.current = next
          }
        }
        return next
      })
    },
    getCoreRowModel: getCoreRowModel(),
    ...(manualPagination
      ? {}
      : { getPaginationRowModel: getPaginationRowModel() }),
    ...(manualSorting ? {} : { getSortedRowModel: getSortedRowModel() }),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
    },
  })

  const filteredCount = manualPagination
    ? (totalRowCount ?? data.length)
    : table.getFilteredRowModel().rows.length
  const pageCount = manualPagination
    ? (controlledPageCount ?? 1)
    : table.getPageCount()
  const currentPage = table.getState().pagination.pageIndex
  const pageSizeValue = table.getState().pagination.pageSize
  // Only relevant when filtering is client-side: with manualFiltering the server
  // already returned the correct filtered page, so we render it as-is and report
  // the server's totals rather than a "filtered rows on this page" subset.
  const hasActiveClientFilters =
    !manualFiltering &&
    columnFilters.some((filter) => hasFilterValue(filter.value))
  const clientFilteredRows = table.getFilteredRowModel().rows
  const pageRows = manualPagination
    ? hasActiveClientFilters
      ? clientFilteredRows
      : table.getRowModel().rows
    : table.getPaginationRowModel().rows
  const startRow = filteredCount === 0 ? 0 : currentPage * pageSizeValue + 1
  const endRow = Math.min((currentPage + 1) * pageSizeValue, filteredCount)
  const pageRange = getPaginationRange(currentPage, pageCount)

  const headerGroups = table.getHeaderGroups()
  const leafHeaders = headerGroups[headerGroups.length - 1]?.headers ?? []
  const headerByColumnId = new Map(leafHeaders.map((h) => [h.column.id, h]))

  return (
    <div className="w-full">
      {!hideToolbar && (
      <div className="flex items-center gap-2 py-1">
        {searchKey && (
          <Input
            placeholder={searchPlaceholder}
            value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
            onChange={(event) => {
              table.getColumn(searchKey)?.setFilterValue(event.target.value)
              table.setPageIndex(0)
            }}
            className="h-8 max-w-xs text-xs"
          />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="ml-auto h-8 gap-1.5">
              Columns <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      )}

      {/* Desktop / tablet: compact table with a sticky header */}
      <div className="hidden rounded-md border md:block">
        <Table containerClassName="max-h-[65vh]">
          <TableHeader>
            {headerGroups.map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      className="sticky top-0 z-10 h-9 whitespace-nowrap bg-muted px-3 text-[11px] font-semibold uppercase tracking-wide"
                    >
                      {header.isPlaceholder ? null : (
                        <div className="flex items-center gap-1">
                          <span>
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          </span>
                          {enableHeaderFilters && (
                            <HeaderFilterControl
                              header={header}
                              onFilterChange={() => table.setPageIndex(0)}
                            />
                          )}
                        </div>
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: Math.min(pageSize || 8, 8) }).map((_, r) => (
                <TableRow key={`skeleton-${r}`} className="hover:bg-transparent">
                  {columns.map((_, c) => (
                    <TableCell key={c} className="px-3 py-2.5">
                      <Skeleton
                        className={cn("h-4", c === 0 ? "w-2/3" : "w-full max-w-[8rem]")}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : pageRows.length ? (
              pageRows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={getRowClassName?.(row)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} data-cell className="px-3 py-1.5 text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-sm text-muted-foreground">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: each row becomes a stacked label/value card */}
      <div className="space-y-2 md:hidden">
        {isLoading ? (
          Array.from({ length: Math.min(pageSize || 4, 4) }).map((_, r) => (
            <div
              key={`skeleton-card-${r}`}
              className="space-y-2 rounded-lg border bg-card p-3 shadow-sm"
            >
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))
        ) : pageRows.length ? (
          pageRows.map((row) => (
            <div
              key={row.id}
              className={cn(
                "overflow-hidden rounded-lg border bg-card p-3 shadow-sm",
                getRowClassName?.(row)
              )}
            >
              {row.getVisibleCells().map((cell) => {
                const header = headerByColumnId.get(cell.column.id)
                const label =
                  header && !header.isPlaceholder
                    ? flexRender(header.column.columnDef.header, header.getContext())
                    : null
                return (
                  <div
                    key={cell.id}
                    className="flex items-start justify-between gap-3 border-b border-border/60 py-1.5 last:border-0"
                  >
                    <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {label}
                    </span>
                    <span data-cell className="min-w-0 text-right text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </span>
                  </div>
                )
              })}
            </div>
          ))
        ) : (
          <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
            No results.
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-col gap-2 rounded-md border bg-muted/30 px-2 py-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground sm:text-sm">
          {manualPagination && hasActiveClientFilters ? (
            <>
              Showing {pageRows.length} filtered row(s) on this page
              <span className="ml-1">
                · {totalRowCount ?? data.length} total row(s)
              </span>
            </>
          ) : (
            <>Showing {startRow}–{endRow} of {filteredCount} row(s)</>
          )}
          {pageCount > 0 && !(manualPagination && hasActiveClientFilters) && (
            <span className="ml-1">
              · Page {currentPage + 1} of {pageCount}
            </span>
          )}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap text-xs text-muted-foreground sm:text-sm">Rows per page</span>
            <Select
              value={String(pageSizeValue)}
              onValueChange={(value) => {
                table.setPageSize(Number(value))
                table.setPageIndex(0)
              }}
            >
              <SelectTrigger className="h-8 w-[72px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {/* Numeric page buttons collapse to Prev/Next on small screens */}
            <div className="hidden items-center gap-1 sm:flex">
              {pageRange.map((page, index) =>
                page === "ellipsis" ? (
                  <span
                    key={`ellipsis-${index}`}
                    className="flex h-8 w-8 items-center justify-center text-sm text-muted-foreground"
                  >
                    …
                  </span>
                ) : (
                  <Button
                    key={page}
                    variant={page === currentPage ? "default" : "outline"}
                    size="icon"
                    className={cn(
                      "h-8 w-8",
                      page === currentPage && "bg-uganda-red hover:bg-uganda-red/90"
                    )}
                    onClick={() => table.setPageIndex(page)}
                    aria-label={`Go to page ${page + 1}`}
                    aria-current={page === currentPage ? "page" : undefined}
                  >
                    {page + 1}
                  </Button>
                )
              )}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
