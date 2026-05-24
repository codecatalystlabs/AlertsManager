"use client"

import * as React from "react"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
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

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-5">
        {searchKey && (
          <Input
            placeholder={searchPlaceholder}
            value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
            onChange={(event) => {
              table.getColumn(searchKey)?.setFilterValue(event.target.value)
              table.setPageIndex(0)
            }}
            className="max-w-sm h-9 text-xs bg-card border border-foreground/10 rounded-sm hover:border-foreground/30 focus:border-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="ml-auto h-9 px-3 mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground hover:bg-foreground/5 border border-foreground/10 rounded-sm">
              Columns <ChevronDown className="ml-2 h-3 w-3" />
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
      <div className="rounded-sm border border-foreground/[0.08] overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
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
                <TableCell colSpan={columns.length} className="h-48 text-center">
                  <div className="flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative h-[3px] w-40 overflow-hidden rounded-full bg-foreground/[0.06]">
                        <span className="loader-bar-red absolute top-0 h-full w-1/3 rounded-full bg-accent-red" />
                        <span className="loader-bar-yellow absolute top-0 h-full w-1/4 rounded-full bg-accent-yellow" />
                        <span className="loader-bar-green absolute top-0 h-full w-1/5 rounded-full bg-accent-green" />
                      </div>
                      <p className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                        Loading records…
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : pageRows.length ? (
              pageRows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    No results
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col gap-3 mt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground tabular-nums">
          Showing {startRow}–{endRow} of {filteredCount}
          {pageCount > 0 && (
            <span className="ml-2 text-foreground/60">
              · Page {currentPage + 1} of {pageCount}
            </span>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Rows per page</span>
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
                    page === currentPage && "bg-foreground text-background hover:opacity-90 rounded-sm mono"
                  )}
                  onClick={() => table.setPageIndex(page)}
                  aria-label={`Go to page ${page + 1}`}
                  aria-current={page === currentPage ? "page" : undefined}
                >
                  {page + 1}
                </Button>
              )
            )}
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
