"use client"

import * as React from "react"
import { type Row, flexRender } from "@tanstack/react-table"
import { ChevronDown, ChevronUp, Copy, EyeOff, PanelRightClose, Search } from "lucide-react"
import toast from "react-hot-toast"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

import { copyText, getColumnLabel, getExportValue, isSyntheticColumn, stringifyValue } from "./utils"

/**
 * Every field of one row, including columns hidden from the grid — for wide
 * tables where the grid shows a dozen columns out of forty. Follows the
 * active row, so arrowing through the grid walks through records.
 */
export function RowInspector<TData>({
  row,
  position,
  total,
  onPrev,
  onNext,
  onClose,
  style,
}: {
  style?: React.CSSProperties
  row: Row<TData> | null
  position: number
  total: number
  onPrev: () => void
  onNext: () => void
  onClose: () => void
}) {
  const [query, setQuery] = React.useState("")
  const cells = row
    ? row.getAllCells().filter((c) => !isSyntheticColumn(c.column.id) && c.column.id !== "actions")
    : []
  const shown = query
    ? cells.filter((c) => {
        const q = query.toLowerCase()
        return (
          getColumnLabel(c.column).toLowerCase().includes(q) ||
          stringifyValue(getExportValue(row!, c.column)).toLowerCase().includes(q)
        )
      })
    : cells
  const actions = row?.getAllCells().find((c) => c.column.id === "actions")

  return (
    <aside
      className="dt-inspector flex min-h-0 flex-col border-l bg-card"
      style={style}
      aria-label="Row details"
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-1 border-b px-2 py-1.5">
        <p className="min-w-0 flex-1 truncate text-xs font-semibold">
          {row ? `Record ${position + 1} of ${total.toLocaleString()}` : "No row selected"}
        </p>
        {actions && row && <div className="shrink-0">{flexRender(actions.column.columnDef.cell, actions.getContext())}</div>}
        <Button variant="ghost" size="icon" className="h-6 w-6 [&_svg]:size-3.5" onClick={onPrev} disabled={!row || position <= 0} aria-label="Previous row">
          <ChevronUp />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 [&_svg]:size-3.5" onClick={onNext} disabled={!row || position >= total - 1} aria-label="Next row">
          <ChevronDown />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 [&_svg]:size-3.5" onClick={onClose} aria-label="Close details panel">
          <PanelRightClose />
        </Button>
      </div>
      {row ? (
        <>
          <div className="relative border-b p-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a field…"
              className="h-7 pl-7 text-xs"
            />
          </div>
          <dl className="min-h-0 flex-1 divide-y overflow-y-auto">
            {shown.map((cell) => {
              const hidden = !cell.column.getIsVisible()
              const raw = stringifyValue(getExportValue(row, cell.column))
              return (
                <div key={cell.id} className="group px-3 py-1.5">
                  <dt className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    <span className="truncate">{getColumnLabel(cell.column)}</span>
                    {hidden && <EyeOff className="h-2.5 w-2.5 shrink-0" aria-label="Hidden in the grid" />}
                    {raw && (
                      <button
                        type="button"
                        className="ml-auto opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                        aria-label={`Copy ${getColumnLabel(cell.column)}`}
                        onClick={async () => {
                          if (await copyText(raw)) toast.success("Copied")
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    )}
                  </dt>
                  <dd className={cn("mt-0.5 break-words text-[13px]", !raw && "text-muted-foreground")} data-dt-cell>
                    {cell.column.accessorFn || cell.column.columnDef.cell
                      ? flexRender(cell.column.columnDef.cell, cell.getContext()) ?? "—"
                      : raw || "—"}
                  </dd>
                </div>
              )
            })}
            {shown.length === 0 && <p className="p-4 text-center text-xs text-muted-foreground">No field matches.</p>}
          </dl>
        </>
      ) : (
        <p className="p-6 text-center text-xs text-muted-foreground">
          Click a row, or focus the grid and use ↑ ↓, to see all of its fields here.
        </p>
      )}
    </aside>
  )
}
