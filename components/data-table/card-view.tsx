"use client"

import * as React from "react"
import { type Cell, type Row, flexRender } from "@tanstack/react-table"
import { useVirtualizer } from "@tanstack/react-virtual"
import { ChevronDown, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

import type { DisplayItem, VirtualApi } from "./table-rows"
import {
  ACTIONS_COLUMN_ID,
  SELECT_COLUMN_ID,
  formatNumber,
  getColumnLabel,
  isSyntheticColumn,
} from "./utils"

const CARD_MIN_WIDTH = 280
const GAP = 8
const FIELD_LIMIT = 8

interface CardProps<TData> {
  row: Row<TData>
  cells: Cell<TData, unknown>[]
  domId: string
  selected: boolean
  active: boolean
  expanded: boolean
  clickable: boolean
  className?: string
  renderCard?: (row: Row<TData>) => React.ReactNode
  renderSubComponent?: (row: Row<TData>) => React.ReactNode
}

function RowCardImpl<TData>({
  row,
  cells,
  domId,
  selected,
  active,
  expanded,
  clickable,
  className,
  renderCard,
  renderSubComponent,
}: CardProps<TData>) {
  const [showAll, setShowAll] = React.useState(false)
  const byId = new Map(cells.map((c) => [c.column.id, c]))
  const select = byId.get(SELECT_COLUMN_ID)
  const actions = byId.get(ACTIONS_COLUMN_ID)
  const fields = cells.filter(
    (c) => !isSyntheticColumn(c.column.id) && c.column.id !== ACTIONS_COLUMN_ID && !c.column.columnDef.meta?.hideInCard
  )
  const titleCell = fields.find((c) => c.column.columnDef.meta?.cardTitle) ?? fields[0]
  const rest = fields.filter((c) => c !== titleCell)
  const shown = showAll ? rest : rest.slice(0, FIELD_LIMIT)

  return (
    <div
      id={domId}
      data-row-id={row.id}
      data-state={selected ? "selected" : undefined}
      data-active={active || undefined}
      data-clickable={clickable || undefined}
      className={cn("dt-card", className)}
    >
      {renderCard ? (
        renderCard(row)
      ) : (
        <>
          <div className="flex items-start gap-2">
            {select && <div className="pt-0.5">{flexRender(select.column.columnDef.cell, select.getContext())}</div>}
            {titleCell && (
              <div className="min-w-0 flex-1 text-sm font-semibold" data-dt-cell>
                {flexRender(titleCell.column.columnDef.cell, titleCell.getContext())}
              </div>
            )}
            {actions && <div className="-mr-1 -mt-0.5 shrink-0">{flexRender(actions.column.columnDef.cell, actions.getContext())}</div>}
          </div>
          {shown.length > 0 && (
            <dl className="mt-2 grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-3 gap-y-1">
              {shown.map((cell) => (
                <React.Fragment key={cell.id}>
                  <dt className="truncate text-[10px] font-medium uppercase leading-5 tracking-wide text-muted-foreground">
                    {getColumnLabel(cell.column)}
                  </dt>
                  <dd className="min-w-0 truncate text-[13px] leading-5" data-dt-cell>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </dd>
                </React.Fragment>
              ))}
            </dl>
          )}
          {rest.length > FIELD_LIMIT && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-action hover:underline"
            >
              {showAll ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {showAll ? "Fewer fields" : `${rest.length - FIELD_LIMIT} more fields`}
            </button>
          )}
          {expanded && renderSubComponent && <div className="mt-2 border-t pt-2">{renderSubComponent(row)}</div>}
        </>
      )}
    </div>
  )
}

export const RowCard = React.memo(RowCardImpl) as typeof RowCardImpl

type RenderCard<TData> = (item: DisplayItem<TData>) => React.ReactNode

export function GroupCardHeader<TData>({ row, expanded }: { row: Row<TData>; expanded: boolean }) {
  const groupedCell = row.getAllCells().find((c) => c.getIsGrouped())
  return (
    <button
      type="button"
      onClick={row.getToggleExpandedHandler()}
      className="flex w-full items-center gap-2 rounded-md border bg-muted/60 px-3 py-1.5 text-left text-xs"
      style={{ marginLeft: row.depth * 12 }}
    >
      <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", expanded && "rotate-90")} />
      {groupedCell && (
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{getColumnLabel(groupedCell.column)}</span>
      )}
      <span className="truncate font-medium">{String(groupedCell?.getValue() ?? "—") || "—"}</span>
      <span className="ml-auto rounded-full bg-action/10 px-1.5 text-[10px] font-semibold tabular-nums text-action">
        {formatNumber(row.getLeafRows().length)}
      </span>
    </button>
  )
}

/** Cards laid out in lines of as many as fit the width. */
function useLanes(ref: React.RefObject<HTMLDivElement | null>, forceSingle: boolean) {
  const [lanes, setLanes] = React.useState(1)
  React.useEffect(() => {
    const el = ref.current
    if (!el || forceSingle || typeof ResizeObserver === "undefined") {
      setLanes(1)
      return
    }
    const update = () => {
      const w = el.clientWidth - 16
      setLanes(Math.max(1, Math.floor((w + GAP) / (CARD_MIN_WIDTH + GAP))))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref, forceSingle])
  return lanes
}

type Line<TData> = { key: string; items: DisplayItem<TData>[]; group: boolean }

function toLines<TData>(items: DisplayItem<TData>[], lanes: number): Line<TData>[] {
  const lines: Line<TData>[] = []
  let current: DisplayItem<TData>[] = []
  const flush = () => {
    if (current.length) lines.push({ key: current.map((i) => i.key).join("+"), items: current, group: false })
    current = []
  }
  for (const item of items) {
    if (item.kind === "detail") continue
    if (item.kind === "group") {
      flush()
      lines.push({ key: item.key, items: [item], group: true })
      continue
    }
    current.push(item)
    if (current.length === lanes) flush()
  }
  flush()
  return lines
}

export function CardGrid<TData>({
  items,
  renderItem,
  scrollRef,
  virtual,
  single,
  estimateSize,
  apiRef,
}: {
  items: DisplayItem<TData>[]
  renderItem: RenderCard<TData>
  scrollRef: React.RefObject<HTMLDivElement | null>
  virtual: boolean
  single: boolean
  estimateSize: number
  apiRef: React.MutableRefObject<VirtualApi | null>
}) {
  const lanes = useLanes(scrollRef, single)
  const lines = React.useMemo(() => toLines(items, lanes), [items, lanes])
  const lineOf = React.useMemo(() => {
    const map = new Map<number, number>()
    let itemIndex = 0
    lines.forEach((line, li) => {
      for (const _ of line.items) map.set(itemIndex++, li)
    })
    return map
  }, [lines])

  const virtualizer = useVirtualizer({
    count: lines.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateSize,
    overscan: 4,
    getItemKey: (i) => lines[i]?.key ?? i,
    enabled: virtual,
  })

  apiRef.current = {
    scrollToIndex: (index) => {
      const line = lineOf.get(index) ?? 0
      if (virtual) virtualizer.scrollToIndex(line, { align: "auto" })
    },
    scrollToTop: () => (virtual ? virtualizer.scrollToOffset(0) : scrollRef.current?.scrollTo({ top: 0 })),
  }

  const gridStyle = { gridTemplateColumns: `repeat(${lanes}, minmax(0, 1fr))` }

  if (!virtual) {
    return (
      <div className="space-y-2">
        {lines.map((line) =>
          line.group ? (
            <div key={line.key}>{renderItem(line.items[0])}</div>
          ) : (
            <div key={line.key} className="grid gap-2" style={gridStyle}>
              {line.items.map((item) => (
                <React.Fragment key={item.key}>{renderItem(item)}</React.Fragment>
              ))}
            </div>
          )
        )}
      </div>
    )
  }

  const virtualItems = virtualizer.getVirtualItems()
  return (
    <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
      {virtualItems.map((vi) => {
        const line = lines[vi.index]
        return (
          <div
            key={vi.key}
            ref={virtualizer.measureElement}
            data-index={vi.index}
            className="absolute inset-x-0 pb-2"
            style={{ transform: `translateY(${vi.start}px)` }}
          >
            {line.group ? (
              renderItem(line.items[0])
            ) : (
              <div className="grid gap-2" style={gridStyle}>
                {line.items.map((item) => (
                  <React.Fragment key={item.key}>{renderItem(item)}</React.Fragment>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
