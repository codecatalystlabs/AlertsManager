"use client"

import * as React from "react"
import type { Table } from "@tanstack/react-table"
import {
  Bookmark,
  BookmarkPlus,
  Braces,
  ClipboardCopy,
  Columns3,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  Grid3x3,
  GripVertical,
  Hash,
  Infinity as InfinityIcon,
  Keyboard,
  Layers,
  LayoutGrid,
  Maximize2,
  Minimize2,
  PanelRight,
  Pin,
  RefreshCw,
  Rows2,
  Rows3,
  Rows4,
  Search,
  SlidersHorizontal,
  Table2,
  Trash2,
  WrapText,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

import { hasFilterValue } from "./filters"
import { DebouncedInput, describeFilter } from "./header-filter"
import type { Density, ScrollMode, ViewMode } from "./types"
import type { SavedView, TablePreferences } from "./use-table-preferences"
import type { ExportFormat } from "./utils"
import { formatNumber, getColumnLabel, isSyntheticColumn } from "./utils"

export type ExportScope = "all" | "page" | "selected"

export interface TableController<TData> {
  table: Table<TData>
  prefs: TablePreferences
  setPref: <K extends keyof TablePreferences>(key: K, value: TablePreferences[K]) => void
  resetLayout: () => void
  persistent: boolean
  views: SavedView[]
  saveView: (name: string) => void
  applyView: (view: SavedView) => void
  deleteView: (id: string) => void
  canVirtual: boolean
  canGroup: boolean
  canInspector: boolean
  canExport: boolean
  canReorder: boolean
  isMobile: boolean
  fullscreen: boolean
  toggleFullscreen: () => void
  exportRows: (format: ExportFormat, scope: ExportScope) => void
  copyRows: (scope: ExportScope) => void
  scopeCounts: Record<ExportScope, number>
  allScopeLabel: string
  openShortcuts: () => void
  onRefresh?: () => void
  isLoading: boolean
  onFilterChange: () => void
  moveColumn: (id: string, target: string | number, side?: "before" | "after") => void
}

/* ── small pieces ───────────────────────────────────────────────────────── */

export function IconButton({
  label,
  active,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }) {
  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={label}
      title={label}
      className={cn("h-8 w-8 shrink-0 [&_svg]:size-3.5", active && "border-primary/40 bg-primary/5 text-primary", className)}
      {...props}
    >
      {children}
    </Button>
  )
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: Array<{ value: T; label: string; icon: React.ComponentType<{ className?: string }> }>
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-0.5 rounded-md bg-muted p-0.5">
      {options.map((o) => {
        const on = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex h-7 items-center justify-center gap-1.5 rounded px-2 text-xs font-medium transition-colors",
              on ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <o.icon className="h-3.5 w-3.5" />
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function ToggleRow({
  icon: Icon,
  label,
  checked,
  onChange,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  hint?: string
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-xs hover:bg-accent">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="flex-1">
        {label}
        {hint && <span className="ml-1 text-[10px] text-muted-foreground">{hint}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} className="scale-75" />
    </label>
  )
}

const sectionLabel = "mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"

/* ── search ─────────────────────────────────────────────────────────────── */

export function SearchBox({
  value,
  onCommit,
  placeholder,
  inputRef,
}: {
  value: string
  onCommit: (value: string) => void
  placeholder: string
  inputRef: React.RefObject<HTMLInputElement | null>
}) {
  return (
    <div className="relative w-full sm:w-64 lg:w-72">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <DebouncedInput
        ref={inputRef}
        value={value}
        onCommit={onCommit}
        delay={250}
        placeholder={placeholder}
        aria-label={placeholder}
        className="pl-8 pr-14"
        onKeyDown={(e) => {
          if (e.key === "Escape" && value) {
            e.preventDefault()
            onCommit("")
          }
        }}
      />
      <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
        {value ? (
          <button
            type="button"
            onClick={() => onCommit("")}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <kbd className="hidden rounded border bg-muted px-1 font-sans text-[10px] text-muted-foreground sm:inline">/</kbd>
        )}
      </span>
    </div>
  )
}

/* ── active filter chips ────────────────────────────────────────────────── */

export function FilterChips<TData>({
  table,
  onChange,
  extra,
}: {
  table: Table<TData>
  onChange: () => void
  extra?: React.ReactNode
}) {
  const filters = table.getState().columnFilters.filter((f) => hasFilterValue(f.value))
  const grouping = table.getState().grouping
  if (filters.length === 0 && grouping.length === 0 && !extra) return null
  return (
    <div className="flex flex-wrap items-center gap-1">
      {grouping.map((id) => {
        const column = table.getColumn(id)
        if (!column) return null
        return (
          <Chip key={`g-${id}`} tone="action" icon={Layers} onRemove={() => column.toggleGrouping()}>
            Grouped by <b className="font-semibold">{getColumnLabel(column)}</b>
          </Chip>
        )
      })}
      {filters.map((f) => {
        const column = table.getColumn(f.id)
        if (!column) return null
        return (
          <Chip
            key={f.id}
            onRemove={() => {
              column.setFilterValue(undefined)
              onChange()
            }}
          >
            <span className="text-muted-foreground">{getColumnLabel(column)}:</span>{" "}
            <b className="font-semibold">{describeFilter(column, f.value)}</b>
          </Chip>
        )
      })}
      {extra}
      {filters.length > 1 && (
        <button
          type="button"
          className="px-1 text-[11px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          onClick={() => {
            table.resetColumnFilters(true)
            onChange()
          }}
        >
          Clear all
        </button>
      )}
    </div>
  )
}

function Chip({
  children,
  onRemove,
  tone = "primary",
  icon: Icon,
}: {
  children: React.ReactNode
  onRemove: () => void
  tone?: "primary" | "action"
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 max-w-[16rem] items-center gap-1 rounded-full border pl-2 pr-0.5 text-[11px] animate-in fade-in zoom-in-95",
        tone === "primary" ? "border-primary/25 bg-primary/5" : "border-action/25 bg-action/5"
      )}
    >
      {Icon && <Icon className="h-3 w-3 shrink-0 text-action" />}
      <span className="truncate">{children}</span>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
        aria-label="Remove"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}

/* ── view options ───────────────────────────────────────────────────────── */

export function ViewOptionsButton<TData>({ c }: { c: TableController<TData> }) {
  const { prefs, setPref } = c
  return (
    <Popover>
      <PopoverTrigger asChild>
        <IconButton label="View options">
          <SlidersHorizontal />
        </IconButton>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3 p-3">
        {!c.isMobile && (
          <div>
            <p className={sectionLabel}>Layout</p>
            <Segmented<ViewMode>
              label="Layout"
              value={prefs.view}
              onChange={(v) => setPref("view", v)}
              options={[
                { value: "table", label: "Table", icon: Table2 },
                { value: "cards", label: "Cards", icon: LayoutGrid },
              ]}
            />
          </div>
        )}
        {c.canVirtual && (
          <div>
            <p className={sectionLabel}>Scrolling</p>
            <Segmented<ScrollMode>
              label="Scrolling"
              value={prefs.scrollMode}
              onChange={(v) => setPref("scrollMode", v)}
              options={[
                { value: "paginated", label: "Pages", icon: Rows3 },
                { value: "virtual", label: "Endless", icon: InfinityIcon },
              ]}
            />
          </div>
        )}
        <div>
          <p className={sectionLabel}>Density</p>
          <Segmented<Density>
            label="Density"
            value={prefs.density}
            onChange={(v) => setPref("density", v)}
            options={[
              { value: "compact", label: "Compact", icon: Rows4 },
              { value: "cozy", label: "Cozy", icon: Rows3 },
              { value: "comfortable", label: "Roomy", icon: Rows2 },
            ]}
          />
        </div>
        <div className="-mx-1 space-y-0.5 border-t pt-2">
          <ToggleRow icon={Rows3} label="Striped rows" checked={prefs.striped} onChange={(v) => setPref("striped", v)} />
          <ToggleRow icon={Grid3x3} label="Grid lines" checked={prefs.gridLines} onChange={(v) => setPref("gridLines", v)} />
          <ToggleRow icon={WrapText} label="Wrap long text" checked={prefs.wrap} onChange={(v) => setPref("wrap", v)} />
          <ToggleRow
            icon={Hash}
            label="Row numbers"
            checked={c.table.getColumn("__rownum")?.getIsVisible() ?? false}
            onChange={(v) => c.table.getColumn("__rownum")?.toggleVisibility(v)}
          />
          {c.canInspector && (
            <ToggleRow
              icon={PanelRight}
              label="Details panel"
              hint="(i)"
              checked={prefs.inspector}
              onChange={(v) => setPref("inspector", v)}
            />
          )}
        </div>
        <div className="flex items-center justify-between border-t pt-2">
          <button type="button" onClick={c.openShortcuts} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
            <Keyboard className="h-3 w-3" /> Shortcuts <kbd className="rounded border bg-muted px-1 font-sans text-[10px]">?</kbd>
          </button>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={c.resetLayout}>
            Reset layout
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

/* ── columns manager ────────────────────────────────────────────────────── */

export function ColumnsButton<TData>({ c }: { c: TableController<TData> }) {
  const { table } = c
  const [query, setQuery] = React.useState("")
  const [dragId, setDragId] = React.useState<string | null>(null)
  const [overId, setOverId] = React.useState<string | null>(null)
  const columns = table.getAllLeafColumns().filter((col) => !isSyntheticColumn(col.id))
  const hideable = columns.filter((col) => col.getCanHide())
  const hiddenCount = hideable.filter((col) => !col.getIsVisible()).length
  const shown = query
    ? columns.filter((col) => getColumnLabel(col).toLowerCase().includes(query.toLowerCase()))
    : columns

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 shrink-0 gap-1.5 px-2.5 text-xs [&_svg]:size-3.5">
          <Columns3 />
          <span className="hidden sm:inline">Columns</span>
          {hiddenCount > 0 && (
            <span className="rounded-full bg-muted px-1.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
              {columns.length - hiddenCount}/{columns.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-0">
        <div className="border-b p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a column…"
              className="h-7 pl-7 text-xs"
            />
          </div>
        </div>
        <ul className="max-h-72 overflow-y-auto p-1">
          {shown.map((col) => {
            const pinned = col.getIsPinned()
            return (
              <li
                key={col.id}
                draggable={c.canReorder && !query}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move"
                  e.dataTransfer.setData("text/plain", col.id)
                  setDragId(col.id)
                }}
                onDragOver={(e) => {
                  if (!dragId || dragId === col.id) return
                  e.preventDefault()
                  setOverId(col.id)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  if (dragId && dragId !== col.id) c.moveColumn(dragId, col.id, "before")
                  setDragId(null)
                  setOverId(null)
                }}
                onDragEnd={() => {
                  setDragId(null)
                  setOverId(null)
                }}
                className={cn(
                  "group flex items-center gap-1.5 rounded px-1 py-1 text-xs hover:bg-accent",
                  overId === col.id && "shadow-[inset_0_2px_0_hsl(var(--primary))]",
                  dragId === col.id && "opacity-50"
                )}
              >
                {c.canReorder && !query && (
                  <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-muted-foreground/60 group-hover:text-muted-foreground" />
                )}
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-[hsl(var(--primary))]"
                    checked={col.getIsVisible()}
                    disabled={!col.getCanHide()}
                    onChange={(e) => col.toggleVisibility(e.target.checked)}
                  />
                  <span className={cn("truncate", !col.getIsVisible() && "text-muted-foreground")}>{getColumnLabel(col)}</span>
                </label>
                {pinned && <Pin className="h-3 w-3 shrink-0 text-action" aria-label={`Pinned ${pinned}`} />}
              </li>
            )
          })}
        </ul>
        <div className="flex items-center justify-between gap-1 border-t p-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-2 text-[11px] [&_svg]:size-3"
            onClick={() => table.toggleAllColumnsVisible(true)}
          >
            <Eye /> Show all
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-2 text-[11px] [&_svg]:size-3"
            onClick={() => {
              // Keep the first data column so the grid never goes blank.
              const keep = hideable[0]?.id
              table.setColumnVisibility((prev) => ({
                ...prev,
                ...Object.fromEntries(hideable.map((col) => [col.id, col.id === keep])),
              }))
            }}
          >
            <EyeOff /> Hide all
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[11px]"
            onClick={() => {
              table.resetColumnOrder(true)
              table.resetColumnSizing(true)
              table.resetColumnPinning()
              table.resetColumnVisibility()
            }}
          >
            Reset
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

/* ── export ─────────────────────────────────────────────────────────────── */

export function ExportButton<TData>({ c }: { c: TableController<TData> }) {
  const [scope, setScope] = React.useState<ExportScope>("all")
  const counts = c.scopeCounts
  const effective: ExportScope = counts[scope] > 0 ? scope : "all"
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton label="Export">
          <Download />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 text-xs">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">Rows to export</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={effective} onValueChange={(v) => setScope(v as ExportScope)}>
          <DropdownMenuRadioItem value="all" onSelect={(e) => e.preventDefault()}>
            {c.allScopeLabel}
            <span className="ml-auto pl-2 tabular-nums text-muted-foreground">{formatNumber(counts.all)}</span>
          </DropdownMenuRadioItem>
          {counts.page !== counts.all && (
            <DropdownMenuRadioItem value="page" onSelect={(e) => e.preventDefault()}>
              This page
              <span className="ml-auto pl-2 tabular-nums text-muted-foreground">{formatNumber(counts.page)}</span>
            </DropdownMenuRadioItem>
          )}
          <DropdownMenuRadioItem value="selected" disabled={counts.selected === 0} onSelect={(e) => e.preventDefault()}>
            Selected rows
            <span className="ml-auto pl-2 tabular-nums text-muted-foreground">{formatNumber(counts.selected)}</span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => c.exportRows("csv", effective)}>
          <FileText className="mr-2 h-3.5 w-3.5" /> CSV
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => c.exportRows("xlsx", effective)}>
          <FileSpreadsheet className="mr-2 h-3.5 w-3.5" /> Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => c.exportRows("json", effective)}>
          <Braces className="mr-2 h-3.5 w-3.5" /> JSON
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => c.copyRows(effective)}>
          <ClipboardCopy className="mr-2 h-3.5 w-3.5" /> Copy for a spreadsheet
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/* ── saved views ────────────────────────────────────────────────────────── */

export function SavedViewsButton<TData>({ c }: { c: TableController<TData> }) {
  const [name, setName] = React.useState("")
  const [open, setOpen] = React.useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <IconButton label="Saved views" active={c.views.length > 0 && open}>
          <Bookmark />
        </IconButton>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-0">
        <div className="border-b px-3 py-2">
          <p className="text-xs font-semibold">Saved views</p>
          <p className="text-[11px] text-muted-foreground">Filters, sorting, grouping and columns — one click away.</p>
        </div>
        <ul className="max-h-56 overflow-y-auto p-1">
          {c.views.length === 0 && (
            <li className="px-2 py-3 text-center text-[11px] text-muted-foreground">No saved views yet.</li>
          )}
          {c.views.map((v) => (
            <li key={v.id} className="group flex items-center gap-1 rounded hover:bg-accent">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left text-xs"
                onClick={() => {
                  c.applyView(v)
                  setOpen(false)
                }}
              >
                <Bookmark className="h-3 w-3 shrink-0 text-action" />
                <span className="truncate">{v.name}</span>
              </button>
              <button
                type="button"
                aria-label={`Delete view ${v.name}`}
                className="mr-1 rounded p-1 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
                onClick={() => c.deleteView(v.id)}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
        <form
          className="flex gap-1 border-t p-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (!name.trim()) return
            c.saveView(name)
            setName("")
          }}
        >
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name this view…" className="h-7 text-xs" />
          <Button type="submit" size="sm" className="h-7 gap-1 px-2 text-xs [&_svg]:size-3" disabled={!name.trim()}>
            <BookmarkPlus /> Save
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  )
}

/* ── the control cluster ────────────────────────────────────────────────── */

export function ToolbarControls<TData>({ c }: { c: TableController<TData> }) {
  return (
    <div className="flex items-center gap-1">
      {c.onRefresh && (
        <IconButton label="Refresh" onClick={c.onRefresh} disabled={c.isLoading}>
          <RefreshCw className={cn(c.isLoading && "animate-spin")} />
        </IconButton>
      )}
      {c.persistent && <SavedViewsButton c={c} />}
      {c.canExport && <ExportButton c={c} />}
      <ColumnsButton c={c} />
      <ViewOptionsButton c={c} />
      <IconButton
        label={c.fullscreen ? "Exit full screen (Esc)" : "Full screen"}
        onClick={c.toggleFullscreen}
        active={c.fullscreen}
      >
        {c.fullscreen ? <Minimize2 /> : <Maximize2 />}
      </IconButton>
    </div>
  )
}

/* ── keyboard shortcuts ─────────────────────────────────────────────────── */

const SHORTCUTS: Array<[string[], string]> = [
  [["↑", "↓"], "Move between rows (or j / k)"],
  [["Home", "End"], "First / last row"],
  [["PgUp", "PgDn"], "Jump ten rows (pages turn at the edge)"],
  [["Enter"], "Open the row"],
  [["Space"], "Select / deselect the row"],
  [["Shift", "↑↓"], "Extend the selection"],
  [["Ctrl", "A"], "Select every row"],
  [["Ctrl", "C"], "Copy selected rows for a spreadsheet"],
  [["→", "←"], "Expand / collapse a row or group"],
  [["i"], "Toggle the details panel"],
  [["f"], "Toggle full screen"],
  [["/"], "Search"],
  [["Esc"], "Clear selection · leave full screen"],
]

export function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-3 p-4">
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Keyboard className="h-4 w-4" /> Table shortcuts
          </DialogTitle>
          <DialogDescription className="text-xs">Click into the table first, then:</DialogDescription>
        </DialogHeader>
        <ul className="space-y-1.5">
          {SHORTCUTS.map(([keys, what]) => (
            <li key={what} className="flex items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground">{what}</span>
              <span className="flex shrink-0 gap-1">
                {keys.map((k) => (
                  <kbd key={k} className="min-w-[1.5rem] rounded border bg-muted px-1.5 py-0.5 text-center font-sans text-[10px] font-medium">
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
