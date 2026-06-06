"use client"

import * as React from "react"
import {
  type ColumnDef,
  type ColumnFiltersState,
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
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getPaginationRange } from "@/lib/pagination-utils"
import { cn } from "@/lib/utils"

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  pageSize?: number
  /** Server-driven pagination: parent owns page state and supplies total row count. */
  manualPagination?: boolean
  pageCount?: number
  totalRowCount?: number
  pageIndex?: number
  onPageChange?: (pageIndex: number) => void
  onPageSizeChange?: (pageSize: number) => void
  isLoading?: boolean
  /** e.g. green background for verified rows */
  getRowClassName?: (row: Row<TData>) => string | undefined
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Search...",
  pageSize = 10,
  manualPagination = false,
  pageCount: controlledPageCount,
  totalRowCount,
  pageIndex: controlledPageIndex,
  onPageChange,
  onPageSizeChange,
  isLoading = false,
  getRowClassName,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: controlledPageIndex ?? 0,
    pageSize,
  })

  React.useEffect(() => {
    setPagination((prev) => ({ ...prev, pageSize }))
  }, [pageSize])

  React.useEffect(() => {
    if (controlledPageIndex !== undefined) {
      setPagination((prev) => ({ ...prev, pageIndex: controlledPageIndex }))
    }
  }, [controlledPageIndex])

  const table = useReactTable({
    data,
    columns,
    manualPagination,
    pageCount: manualPagination ? controlledPageCount : undefined,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: (updater) => {
      setPagination((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater
        if (manualPagination) {
          if (next.pageIndex !== prev.pageIndex) {
            onPageChange?.(next.pageIndex)
          }
          if (next.pageSize !== prev.pageSize) {
            onPageSizeChange?.(next.pageSize)
          }
        }
        return next
      })
    },
    getCoreRowModel: getCoreRowModel(),
    ...(manualPagination
      ? {}
      : { getPaginationRowModel: getPaginationRowModel() }),
    getSortedRowModel: getSortedRowModel(),
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
  const pageRows = manualPagination
    ? table.getRowModel().rows
    : table.getPaginationRowModel().rows
  const startRow = filteredCount === 0 ? 0 : currentPage * pageSizeValue + 1
  const endRow = Math.min((currentPage + 1) * pageSizeValue, filteredCount)
  const pageRange = getPaginationRange(currentPage, pageCount)

  const headerGroups = table.getHeaderGroups()
  const leafHeaders = headerGroups[headerGroups.length - 1]?.headers ?? []
  const headerByColumnId = new Map(leafHeaders.map((h) => [h.column.id, h]))

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 py-2">
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
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-sm text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
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
          <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
            Loading...
          </div>
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
          Showing {startRow}–{endRow} of {filteredCount} row(s)
          {pageCount > 0 && (
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
