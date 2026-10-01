"use client"

import * as React from "react"
import { type Cell, type Row, flexRender } from "@tanstack/react-table"
import { useVirtualizer } from "@tanstack/react-virtual"
import { ChevronRight, Loader2 } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

import {
  EXPAND_COLUMN_ID,
  ROW_NUMBER_COLUMN_ID,
  cssSafe,
  formatNumber,
  getColumnLabel,
  isSyntheticColumn,
} from "./utils"

export type PinInfo = Record<string, { side: "left" | "right"; edge: boolean }>

/** A rendered line of the table body: a data row, a group header, or an expanded detail. */
export type DisplayItem<TData> =
  | { kind: "row"; row: Row<TData>; key: string }
  | { kind: "group"; row: Row<TData>; key: string }
  | { kind: "detail"; row: Row<TData>; key: string }

export function buildDisplayItems<TData>(
  rows: Row<TData>[],
  withDetails: boolean
): DisplayItem<TData>[] {
  const items: DisplayItem<TData>[] = []
  for (const row of rows) {
    if (row.getIsGrouped()) {
      items.push({ kind: "group", row, key: `g:${row.id}` })
      continue
    }
    items.push({ kind: "row", row, key: row.id })
    if (withDetails && row.getIsExpanded()) items.push({ kind: "detail", row, key: `d:${row.id}` })
  }
  return items
}

export function pinProps(
  columnId: string,
  pins: PinInfo
): { className?: string; style?: React.CSSProperties } {
  const pin = pins[columnId]
  if (!pin) return {}
  const variable = `var(--dt-p${pin.side === "left" ? "l" : "r"}-${cssSafe(columnId)})`
  return {
    className: cn("dt-pin", pin.side === "left" ? "dt-pin-l" : "dt-pin-r", pin.edge && "dt-pin-edge"),
    style: pin.side === "left" ? { left: variable } : { right: variable },
  }
}

function alignClass(meta: { align?: string; numeric?: boolean } | undefined) {
  const align = meta?.align ?? (meta?.numeric ? "right" : undefined)
  return align === "right" ? "text-right" : align === "center" ? "text-center" : undefined
}

function titleFor<TData>(cell: Cell<TData, unknown>): string | undefined {
  if (!cell.column.accessorFn) return undefined
  const v = cell.getValue()
  return typeof v === "string" && v.length > 28 ? v : undefined
}

interface DataRowProps<TData> {
  row: Row<TData>
  cells: Cell<TData, unknown>[]
  domId: string
  /** Position in the rendered list, for zebra striping. */
  index: number
  /** 1-based number shown in the row-number column. */
  rowNumber: number
  className?: string
  selected: boolean
  expanded: boolean
  active: boolean
  clickable: boolean
  pins: PinInfo
  measureRef?: (el: HTMLTableRowElement | null) => void
  virtualIndex?: number
}

function DataRowImpl<TData>({
  row,
  cells,
  domId,
  index,
  rowNumber,
  className,
  selected,
  active,
  clickable,
  pins,
  measureRef,
  virtualIndex,
}: DataRowProps<TData>) {
  return (
    <tr
      ref={measureRef}
      id={domId}
      data-row-id={row.id}
      data-index={virtualIndex}
      data-odd={index % 2 === 1 || undefined}
      data-state={selected ? "selected" : undefined}
      data-active={active || undefined}
      data-clickable={clickable || undefined}
      aria-selected={selected}
      className={cn("dt-tr", className)}
    >
      {cells.map((cell) => {
        const column = cell.column
        const meta = column.columnDef.meta
        const pin = pinProps(column.id, pins)
        if (cell.getIsPlaceholder()) {
          return <td key={cell.id} className={cn("dt-td", pin.className)} style={pin.style} />
        }
        if (column.id === ROW_NUMBER_COLUMN_ID) {
          return (
            <td key={cell.id} className={cn("dt-td dt-rownum", pin.className)} style={pin.style}>
              {rowNumber}
            </td>
          )
        }
        const synthetic = isSyntheticColumn(column.id)
        return (
          <td
            key={cell.id}
            data-col={column.id}
            className={cn(
              "dt-td",
              synthetic && "dt-td-synthetic",
              meta?.numeric && "tabular-nums",
              meta?.wrap && "dt-wrap",
              alignClass(meta),
              pin.className,
              meta?.className
            )}
            style={pin.style}
          >
            {synthetic || column.id === "actions" ? (
              flexRender(column.columnDef.cell, cell.getContext())
            ) : (
              <div className="dt-cell" data-dt-cell title={titleFor(cell)}>
                {flexRender(column.columnDef.cell, cell.getContext())}
              </div>
            )}
          </td>
        )
      })}
    </tr>
  )
}

export const DataRow = React.memo(DataRowImpl) as typeof DataRowImpl

interface GroupRowProps<TData> {
  row: Row<TData>
  cells: Cell<TData, unknown>[]
  expanded: boolean
  selected: boolean
  pins: PinInfo
  measureRef?: (el: HTMLTableRowElement | null) => void
  virtualIndex?: number
}

function GroupRowImpl<TData>({ row, cells, expanded, pins, measureRef, virtualIndex }: GroupRowProps<TData>) {
  const count = row.getLeafRows().length
  return (
    <tr
      ref={measureRef}
      data-row-id={row.id}
      data-index={virtualIndex}
      data-group
      aria-expanded={expanded}
      className="dt-tr dt-group-row"
    >
      {cells.map((cell) => {
        const column = cell.column
        const pin = pinProps(column.id, pins)
        if (cell.getIsGrouped()) {
          return (
            // The label may run on over the (empty) cells beside it rather
            // than truncate inside the grouped column's width.
            <td key={cell.id} className={cn("dt-td dt-group-cell", pin.className)} style={pin.style}>
              <button
                type="button"
                onClick={row.getToggleExpandedHandler()}
                className="inline-flex items-center gap-1.5 font-medium"
                style={{ paddingLeft: row.depth * 16 }}
              >
                <ChevronRight
                  className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-90")}
                />
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {getColumnLabel(column)}
                </span>
                <span data-dt-cell>{String(cell.getValue() ?? "—") || "—"}</span>
                <span className="rounded-full bg-action/10 px-1.5 text-[10px] font-semibold tabular-nums text-action">
                  {formatNumber(count)}
                </span>
              </button>
            </td>
          )
        }
        if (column.id === EXPAND_COLUMN_ID || column.id === ROW_NUMBER_COLUMN_ID) {
          return <td key={cell.id} className={cn("dt-td", pin.className)} style={pin.style} />
        }
        if (isSyntheticColumn(column.id)) {
          return (
            <td key={cell.id} className={cn("dt-td dt-td-synthetic", pin.className)} style={pin.style}>
              {flexRender(column.columnDef.cell, cell.getContext())}
            </td>
          )
        }
        // A group row's `original` is its first leaf, so a column's ordinary
        // cell renderer would show that one row's value as if it were the
        // group's. Only real aggregates are shown.
        const value = cell.getIsAggregated() ? cell.getValue() : undefined
        return (
          <td
            key={cell.id}
            className={cn("dt-td text-muted-foreground", alignClass(column.columnDef.meta), pin.className)}
            style={pin.style}
          >
            {column.columnDef.aggregatedCell
              ? flexRender(column.columnDef.aggregatedCell, cell.getContext())
              : typeof value === "number"
                ? <span className="tabular-nums">{formatNumber(value)}</span>
                : null}
          </td>
        )
      })}
    </tr>
  )
}

export const GroupRow = React.memo(GroupRowImpl) as typeof GroupRowImpl

export function DetailRow<TData>({
  row,
  colSpan,
  render,
  measureRef,
  virtualIndex,
}: {
  row: Row<TData>
  colSpan: number
  render: (row: Row<TData>) => React.ReactNode
  measureRef?: (el: HTMLTableRowElement | null) => void
  virtualIndex?: number
}) {
  return (
    <tr ref={measureRef} data-index={virtualIndex} className="dt-detail-row">
      <td colSpan={colSpan} className="p-0">
        {/* Sticky to the viewport's left edge so the panel stays in view
            however far the grid is scrolled sideways. */}
        <div className="dt-detail-inner">{render(row)}</div>
      </td>
    </tr>
  )
}

export function SkeletonRows({ columns, count }: { columns: number; count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, r) => (
        <tr key={`sk-${r}`} className="dt-tr">
          {Array.from({ length: columns }).map((__, c) => (
            <td key={c} className="dt-td">
              <Skeleton
                className={cn("h-3", c === 0 ? "w-2/3" : "w-full max-w-[8rem]")}
                style={{ opacity: 1 - r * 0.09 }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

export type RenderItem<TData> = (
  item: DisplayItem<TData>,
  index: number,
  measure?: { ref: (el: HTMLTableRowElement | null) => void; index: number }
) => React.ReactNode

export interface VirtualApi {
  scrollToIndex: (index: number) => void
  scrollToTop: () => void
}

/**
 * Renders only the rows in (and just around) the viewport, with spacer rows
 * holding the scroll height. Owns the virtualizer so a scroll re-renders this
 * body alone — not the toolbar, header or footer.
 */
export function VirtualBody<TData>({
  items,
  scrollRef,
  estimateSize,
  renderItem,
  colSpan,
  headerHeight,
  apiRef,
  onRangeChange,
  onEndReached,
  hasMore,
  loadingMore,
}: {
  items: DisplayItem<TData>[]
  scrollRef: React.RefObject<HTMLDivElement | null>
  estimateSize: number
  renderItem: RenderItem<TData>
  colSpan: number
  headerHeight: number
  apiRef: React.MutableRefObject<VirtualApi | null>
  onRangeChange?: (first: number, last: number) => void
  onEndReached?: () => void
  hasMore?: boolean
  loadingMore?: boolean
}) {
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateSize,
    overscan: 12,
    scrollPaddingStart: headerHeight,
    getItemKey: (i) => items[i]?.key ?? i,
  })

  // Density changes the row height; drop cached measurements.
  React.useEffect(() => {
    virtualizer.measure()
  }, [estimateSize, virtualizer])

  apiRef.current = {
    scrollToIndex: (index) => virtualizer.scrollToIndex(index, { align: "auto" }),
    scrollToTop: () => virtualizer.scrollToOffset(0),
  }

  const virtualItems = virtualizer.getVirtualItems()
  const first = virtualItems[0]?.index ?? 0
  const last = virtualItems[virtualItems.length - 1]?.index ?? 0

  React.useEffect(() => {
    onRangeChange?.(first, last)
  }, [first, last, onRangeChange])

  React.useEffect(() => {
    if (hasMore && !loadingMore && items.length > 0 && last >= items.length - 8) onEndReached?.()
  }, [last, items.length, hasMore, loadingMore, onEndReached])

  const paddingTop = virtualItems[0]?.start ?? 0
  const paddingBottom = Math.max(
    0,
    virtualizer.getTotalSize() - (virtualItems[virtualItems.length - 1]?.end ?? 0)
  )

  return (
    <tbody>
      {paddingTop > 0 && (
        <tr aria-hidden className="dt-spacer">
          <td colSpan={colSpan} style={{ height: paddingTop }} />
        </tr>
      )}
      {virtualItems.map((vi) =>
        renderItem(items[vi.index], vi.index, { ref: virtualizer.measureElement, index: vi.index })
      )}
      {paddingBottom > 0 && (
        <tr aria-hidden className="dt-spacer">
          <td colSpan={colSpan} style={{ height: paddingBottom }} />
        </tr>
      )}
      {hasMore && (
        <tr className="dt-spacer">
          <td colSpan={colSpan} className="py-3 text-center text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading more…
            </span>
          </td>
        </tr>
      )}
    </tbody>
  )
}
