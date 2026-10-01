"use client"

import * as React from "react"
import {
  ArrowUpToLine,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ClipboardCopy,
  Download,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getPaginationRange } from "@/lib/pagination-utils"
import { cn } from "@/lib/utils"

import { formatNumber } from "./utils"

export function TableFooter({
  virtual,
  pageIndex,
  pageCount,
  pageSize,
  pageSizeOptions,
  rowCount,
  preFilterCount,
  pageRowCount,
  clientFilteredPage,
  selectedCount,
  rangeRef,
  canPrev,
  canNext,
  onPage,
  onPageSize,
  onBackToTop,
  controls,
}: {
  virtual: boolean
  pageIndex: number
  pageCount: number
  pageSize: number
  pageSizeOptions: number[]
  /** Rows matching the current filters (the server's total for server tables). */
  rowCount: number
  /** Rows before client-side filtering, when that differs. */
  preFilterCount?: number
  pageRowCount: number
  /** Server-paged data narrowed by a client-side filter on this page only. */
  clientFilteredPage: boolean
  selectedCount: number
  rangeRef: React.RefObject<HTMLSpanElement | null>
  canPrev: boolean
  canNext: boolean
  onPage: (index: number) => void
  onPageSize: (size: number) => void
  onBackToTop: () => void
  controls?: React.ReactNode
}) {
  const start = rowCount === 0 ? 0 : pageIndex * pageSize + 1
  const end = Math.min((pageIndex + 1) * pageSize, rowCount)
  const range = getPaginationRange(pageIndex, pageCount)
  const [jump, setJump] = React.useState("")

  return (
    <div className="dt-footer mt-1.5 flex flex-col gap-1.5 rounded-md border bg-muted/30 px-2 py-1 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {virtual ? (
          <>
            <b className="font-semibold tabular-nums text-foreground">{formatNumber(rowCount)}</b> row{rowCount === 1 ? "" : "s"}
            <span ref={rangeRef} className="tabular-nums" />
          </>
        ) : clientFilteredPage ? (
          <>
            Showing {formatNumber(pageRowCount)} filtered row(s) on this page
            <span className="ml-1">· {formatNumber(rowCount)} total row(s)</span>
          </>
        ) : (
          <>
            Showing <span className="tabular-nums">{formatNumber(start)}–{formatNumber(end)}</span> of{" "}
            <b className="font-semibold tabular-nums text-foreground">{formatNumber(rowCount)}</b>
            {pageCount > 0 && (
              <span className="ml-1 tabular-nums">
                · Page {pageIndex + 1} of {formatNumber(pageCount)}
              </span>
            )}
          </>
        )}
        {preFilterCount !== undefined && preFilterCount !== rowCount && (
          <span> (filtered from {formatNumber(preFilterCount)})</span>
        )}
        {selectedCount > 0 && (
          <span className="font-medium text-primary"> · {formatNumber(selectedCount)} selected</span>
        )}
      </p>

      <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
        {controls}
        {virtual ? (
          <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs [&_svg]:size-3.5" onClick={onBackToTop}>
            <ArrowUpToLine /> Top
          </Button>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="hidden whitespace-nowrap text-xs text-muted-foreground sm:inline">Rows per page</span>
              <Select value={String(pageSize)} onValueChange={(v) => onPageSize(Number(v))}>
                <SelectTrigger className="h-7 w-[68px] text-xs" aria-label="Rows per page">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <nav className="flex items-center gap-1" aria-label="Pagination">
              <PageButton label="First page" onClick={() => onPage(0)} disabled={!canPrev} className="hidden md:inline-flex">
                <ChevronsLeft />
              </PageButton>
              <PageButton label="Previous page" onClick={() => onPage(pageIndex - 1)} disabled={!canPrev}>
                <ChevronLeft />
              </PageButton>
              {/* Numeric page buttons collapse to Prev/Next on small screens */}
              <div className="hidden items-center gap-1 sm:flex">
                {range.map((page, i) =>
                  page === "ellipsis" ? (
                    <span key={`e-${i}`} className="flex h-7 w-5 items-center justify-center text-xs text-muted-foreground">
                      …
                    </span>
                  ) : (
                    <Button
                      key={page}
                      variant={page === pageIndex ? "default" : "outline"}
                      size="icon"
                      className={cn("h-7 min-w-7 w-auto px-1.5 text-xs tabular-nums", page === pageIndex && "bg-uganda-red hover:bg-uganda-red/90")}
                      onClick={() => onPage(page)}
                      aria-label={`Go to page ${page + 1}`}
                      aria-current={page === pageIndex ? "page" : undefined}
                    >
                      {page + 1}
                    </Button>
                  )
                )}
              </div>
              <PageButton label="Next page" onClick={() => onPage(pageIndex + 1)} disabled={!canNext}>
                <ChevronRight />
              </PageButton>
              <PageButton label="Last page" onClick={() => onPage(pageCount - 1)} disabled={!canNext} className="hidden md:inline-flex">
                <ChevronsRight />
              </PageButton>
              {pageCount > 7 && (
                <form
                  className="ml-1 hidden items-center gap-1 lg:flex"
                  onSubmit={(e) => {
                    e.preventDefault()
                    const n = Number(jump)
                    if (Number.isInteger(n) && n >= 1 && n <= pageCount) onPage(n - 1)
                    setJump("")
                  }}
                >
                  <input
                    value={jump}
                    onChange={(e) => setJump(e.target.value.replace(/\D/g, ""))}
                    inputMode="numeric"
                    placeholder="Go to"
                    aria-label="Go to page"
                    className="h-7 w-14 rounded-md border bg-background px-1.5 text-center text-xs tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </form>
              )}
            </nav>
          </>
        )}
      </div>
    </div>
  )
}

function PageButton({
  label,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <Button variant="outline" size="icon" className={cn("h-7 w-7 [&_svg]:size-3.5", className)} aria-label={label} title={label} {...props}>
      {children}
    </Button>
  )
}

/** Floats over the page while rows are selected. */
export function BulkActionBar({
  count,
  total,
  canSelectAll,
  onSelectAll,
  onClear,
  onCopy,
  onExport,
  children,
}: {
  count: number
  total: number
  canSelectAll: boolean
  onSelectAll: () => void
  onClear: () => void
  onCopy: () => void
  onExport: () => void
  children?: React.ReactNode
}) {
  if (count === 0) return null
  return (
    <div
      role="toolbar"
      aria-label="Selected rows"
      className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-fit max-w-[calc(100vw-2rem)] flex-wrap items-center gap-1.5 rounded-xl border bg-foreground px-2 py-1.5 text-background shadow-2xl animate-in fade-in slide-in-from-bottom-4"
    >
      <span className="px-1.5 text-xs font-semibold tabular-nums">{formatNumber(count)} selected</span>
      {canSelectAll && count < total && (
        <button type="button" onClick={onSelectAll} className="rounded px-1.5 text-xs text-background/80 underline-offset-2 hover:text-background hover:underline">
          Select all {formatNumber(total)}
        </button>
      )}
      <span className="mx-0.5 h-4 w-px bg-background/20" aria-hidden />
      <BarButton onClick={onCopy}>
        <ClipboardCopy className="h-3.5 w-3.5" /> Copy
      </BarButton>
      <BarButton onClick={onExport}>
        <Download className="h-3.5 w-3.5" /> Export
      </BarButton>
      {children}
      <button
        type="button"
        onClick={onClear}
        aria-label="Clear selection"
        className="ml-0.5 rounded-md p-1 text-background/70 hover:bg-background/10 hover:text-background"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function BarButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium hover:bg-background/10"
      {...props}
    >
      {children}
    </button>
  )
}
