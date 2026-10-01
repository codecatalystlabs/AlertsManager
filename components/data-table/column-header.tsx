"use client"

import * as React from "react"
import { type Column, type Header, type Table, flexRender } from "@tanstack/react-table"
import {
  ArrowDown,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUp,
  ArrowUpDown,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  Group,
  MoveHorizontal,
  MoreVertical,
  PinOff,
  Ungroup,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

import { HeaderFilter, canHeaderFilter } from "./header-filter"
import { getColumnLabel, isDataColumn, isSyntheticColumn } from "./utils"

export interface HeaderUi<TData> {
  table: Table<TData>
  enableHeaderFilters: boolean
  showFacetCounts: boolean
  canBuiltInSort: (column: Column<TData, unknown>) => boolean
  enablePinning: boolean
  enableGrouping: boolean
  enableResizing: boolean
  enableReordering: boolean
  onFilterChange: () => void
  openInsights: (columnId: string) => void
  startResize: (columnId: string, event: React.PointerEvent<HTMLElement>) => void
  nudgeWidth: (columnId: string, delta: number) => void
  resetWidth: (columnId: string) => void
  isResizing: () => boolean
  resizingId: string | null
  dragId: string | null
  dropTarget: { id: string; side: "before" | "after" } | null
  setDrag: (id: string | null) => void
  setDropTarget: (target: { id: string; side: "before" | "after" } | null) => void
  moveColumn: (id: string, target: string | number, side?: "before" | "after") => void
}

function SortGlyph({ sorted, index, multi }: { sorted: false | "asc" | "desc"; index: number; multi: boolean }) {
  if (!sorted) return <ArrowUpDown className="dt-sort-idle h-3 w-3 shrink-0" />
  const Icon = sorted === "asc" ? ArrowUp : ArrowDown
  return (
    <span className="inline-flex shrink-0 items-center text-primary">
      <Icon className="h-3 w-3" />
      {multi && <sup className="ml-px text-[9px] font-bold">{index + 1}</sup>}
    </span>
  )
}

export function HeaderCell<TData>({
  header,
  ui,
  registerRef,
  style,
  pinClass,
}: {
  header: Header<TData, unknown>
  ui: HeaderUi<TData>
  registerRef?: (el: HTMLTableCellElement | null) => void
  style?: React.CSSProperties
  pinClass?: string
}) {
  const column = header.column
  const def = column.columnDef
  const meta = def.meta
  const synthetic = isSyntheticColumn(column.id)
  const label = getColumnLabel(column)
  const custom = typeof def.header === "function"
  const sortable = !synthetic && ui.canBuiltInSort(column)
  const sorted = column.getIsSorted()
  const multiSort = ui.table.getState().sorting.length > 1
  const filterable = ui.enableHeaderFilters && !synthetic && canHeaderFilter(column)
  const draggable = ui.enableReordering && !synthetic && !header.isPlaceholder
  const drop = ui.dropTarget?.id === column.id ? ui.dropTarget.side : undefined
  const align = meta?.align ?? (meta?.numeric ? "right" : "left")

  return (
    <th
      ref={registerRef}
      colSpan={header.colSpan}
      scope="col"
      style={style}
      aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
      data-col={column.id}
      data-drop={drop}
      data-dragging={ui.dragId === column.id || undefined}
      data-resizing={ui.resizingId === column.id || undefined}
      className={cn("dt-th group/th", pinClass, meta?.headerClassName)}
      draggable={draggable}
      onDragStart={(e) => {
        // A drag that began on the resize handle is a resize, not a move.
        if (ui.isResizing() || (e.target as HTMLElement).closest(".dt-resizer")) {
          e.preventDefault()
          return
        }
        e.dataTransfer.setData("text/plain", label)
        e.dataTransfer.effectAllowed = "move"
        ui.setDrag(column.id)
      }}
      onDragOver={(e) => {
        if (!ui.dragId || ui.dragId === column.id || synthetic) return
        e.preventDefault()
        e.dataTransfer.dropEffect = "move"
        const rect = e.currentTarget.getBoundingClientRect()
        const side = e.clientX < rect.left + rect.width / 2 ? "before" : "after"
        if (ui.dropTarget?.id !== column.id || ui.dropTarget.side !== side) {
          ui.setDropTarget({ id: column.id, side })
        }
      }}
      onDrop={(e) => {
        e.preventDefault()
        if (ui.dragId && ui.dragId !== column.id) {
          ui.moveColumn(ui.dragId, column.id, drop ?? "before")
        }
        ui.setDrag(null)
        ui.setDropTarget(null)
      }}
      onDragEnd={() => {
        ui.setDrag(null)
        ui.setDropTarget(null)
      }}
    >
      {header.isPlaceholder ? null : synthetic ? (
        <div className="dt-th-inner justify-center">{flexRender(def.header, header.getContext())}</div>
      ) : (
        <div className={cn("dt-th-inner", align === "right" && "justify-end", align === "center" && "justify-center")}>
          {custom ? (
            <span className="dt-th-label min-w-0">{flexRender(def.header, header.getContext())}</span>
          ) : sortable ? (
            <button
              type="button"
              className="dt-sort-btn"
              onClick={column.getToggleSortingHandler()}
              title={ui.table.options.enableMultiSort === false ? `Sort by ${label}` : `Sort by ${label} (Shift-click to add)`}
            >
              <span className="truncate">{label}</span>
              <SortGlyph sorted={sorted} index={column.getSortIndex()} multi={multiSort} />
            </button>
          ) : (
            <span className="dt-th-label truncate">{label}</span>
          )}
          {column.id !== "actions" && (
            <span className="dt-th-tools">
              {filterable && (
                <HeaderFilter column={column} onFilterChange={ui.onFilterChange} showCounts={ui.showFacetCounts} />
              )}
              <ColumnMenu column={column} ui={ui} label={label} sortable={sortable} />
            </span>
          )}
        </div>
      )}
      {ui.enableResizing && !synthetic && !header.isPlaceholder && column.columnDef.enableResizing !== false && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={`Resize ${label}`}
          tabIndex={0}
          className="dt-resizer"
          onPointerDown={(e) => ui.startResize(column.id, e)}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => {
            e.stopPropagation()
            ui.resetWidth(column.id)
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
              e.preventDefault()
              e.stopPropagation()
              ui.nudgeWidth(column.id, (e.key === "ArrowLeft" ? -1 : 1) * (e.shiftKey ? 48 : 12))
            }
          }}
          title="Drag to resize · double-click to fit"
        />
      )}
    </th>
  )
}

function ColumnMenu<TData>({
  column,
  ui,
  label,
  sortable,
}: {
  column: Column<TData, unknown>
  ui: HeaderUi<TData>
  label: string
  sortable: boolean
}) {
  const sorted = column.getIsSorted()
  const pinned = column.getIsPinned()
  const canPin = ui.enablePinning && column.getCanPin()
  const canGroup = ui.enableGrouping && column.getCanGroup() && Boolean(column.accessorFn)
  const order = ui.table.getAllLeafColumns().filter((c) => !isSyntheticColumn(c.id))
  const position = order.findIndex((c) => c.id === column.id)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="dt-head-icon dt-head-menu"
          aria-label={`${label} column options`}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 text-xs" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuLabel className="truncate text-[11px] uppercase tracking-wide text-muted-foreground">
          {label}
        </DropdownMenuLabel>
        {sortable && (
          <>
            <DropdownMenuItem onSelect={() => column.toggleSorting(false, false)}>
              <ArrowUp className="mr-2 h-3.5 w-3.5" /> Sort ascending
              {sorted === "asc" && <DropdownMenuShortcut>●</DropdownMenuShortcut>}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => column.toggleSorting(true, false)}>
              <ArrowDown className="mr-2 h-3.5 w-3.5" /> Sort descending
              {sorted === "desc" && <DropdownMenuShortcut>●</DropdownMenuShortcut>}
            </DropdownMenuItem>
            {sorted && (
              <DropdownMenuItem onSelect={() => column.clearSorting()}>
                <X className="mr-2 h-3.5 w-3.5" /> Clear sort
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
          </>
        )}
        {canPin && (
          <>
            {pinned !== "left" && (
              <DropdownMenuItem onSelect={() => column.pin("left")}>
                <ArrowLeftToLine className="mr-2 h-3.5 w-3.5" /> Pin to left
              </DropdownMenuItem>
            )}
            {pinned !== "right" && (
              <DropdownMenuItem onSelect={() => column.pin("right")}>
                <ArrowRightToLine className="mr-2 h-3.5 w-3.5" /> Pin to right
              </DropdownMenuItem>
            )}
            {pinned && (
              <DropdownMenuItem onSelect={() => column.pin(false)}>
                <PinOff className="mr-2 h-3.5 w-3.5" /> Unpin
              </DropdownMenuItem>
            )}
          </>
        )}
        {canGroup && (
          <DropdownMenuItem onSelect={() => column.toggleGrouping()}>
            {column.getIsGrouped() ? (
              <>
                <Ungroup className="mr-2 h-3.5 w-3.5" /> Ungroup
              </>
            ) : (
              <>
                <Group className="mr-2 h-3.5 w-3.5" /> Group by {label}
              </>
            )}
          </DropdownMenuItem>
        )}
        {ui.enableReordering && position >= 0 && !pinned && (
          <>
            <DropdownMenuItem disabled={position === 0} onSelect={() => ui.moveColumn(column.id, -1)}>
              <ChevronLeft className="mr-2 h-3.5 w-3.5" /> Move left
            </DropdownMenuItem>
            <DropdownMenuItem disabled={position === order.length - 1} onSelect={() => ui.moveColumn(column.id, 1)}>
              <ChevronRight className="mr-2 h-3.5 w-3.5" /> Move right
            </DropdownMenuItem>
          </>
        )}
        {ui.enableResizing && (
          <DropdownMenuItem onSelect={() => ui.resetWidth(column.id)}>
            <MoveHorizontal className="mr-2 h-3.5 w-3.5" /> Fit width to content
          </DropdownMenuItem>
        )}
        {isDataColumn(column) && (
          <DropdownMenuItem onSelect={() => ui.openInsights(column.id)}>
            <BarChart3 className="mr-2 h-3.5 w-3.5" /> Column insights
          </DropdownMenuItem>
        )}
        {column.getCanHide() && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => column.toggleVisibility(false)}>
              <EyeOff className="mr-2 h-3.5 w-3.5" /> Hide column
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * The sortable column header for column definitions that render their own
 * header. Sized to the dense table (h-6), so a header never outgrows its rows,
 * and shows the current direction instead of a static double arrow.
 */
export function SortableHeader({
  column,
  children,
}: {
  column: { toggleSorting: (desc: boolean) => void; getIsSorted: () => false | "asc" | "desc" }
  children: React.ReactNode
}) {
  const sorted = column.getIsSorted()
  const Icon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowUpDown
  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      className={cn(
        "-mx-1 h-6 gap-1 px-1 text-[length:inherit] font-semibold uppercase tracking-wide hover:bg-uganda-yellow/10 [&_svg]:size-3",
        sorted && "text-primary"
      )}
    >
      {children}
      <Icon className={cn("shrink-0", !sorted && "opacity-50")} />
    </Button>
  )
}
