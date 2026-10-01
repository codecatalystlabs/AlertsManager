"use client"

import * as React from "react"
import type { Column } from "@tanstack/react-table"
import { Check, ListFilter, Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

import {
  hasFilterValue,
  isDateRangeFilterValue,
  isNumberRangeFilterValue,
} from "./filters"
import type { DateRangeFilterValue, HeaderFilterOption, HeaderFilterVariant, NumberRangeFilterValue } from "./types"
import { formatNumber, getColumnLabel, localDateStamp, stringifyValue } from "./utils"

export function canHeaderFilter<TData>(column: Column<TData, unknown>): boolean {
  return column.getCanFilter() && column.columnDef.meta?.enableHeaderFilter !== false
}

/** The variant a column filters with (declared, or "text"). */
export function variantOf<TData>(column: Column<TData, unknown>): HeaderFilterVariant {
  return column.columnDef.meta?.filterVariant ?? "text"
}

/**
 * Choices for a select / multi-select filter: the declared options, or every
 * distinct value in the loaded rows (most frequent first) with its count.
 */
export function useFilterOptions<TData>(
  column: Column<TData, unknown>,
  open: boolean,
  withCounts: boolean
): Array<HeaderFilterOption & { count?: number }> {
  const declared = column.columnDef.meta?.filterOptions
  const facets = open ? column.getFacetedUniqueValues() : undefined
  return React.useMemo(() => {
    if (declared) {
      if (!withCounts || !facets) return declared
      const counts = new Map<string, number>()
      facets.forEach((count, key) => {
        const k = stringifyValue(key).toLowerCase()
        counts.set(k, (counts.get(k) ?? 0) + count)
      })
      return declared.map((o) => ({ ...o, count: counts.get(o.value.toLowerCase()) ?? 0 }))
    }
    if (!facets) return []
    const merged = new Map<string, number>()
    facets.forEach((count, key) => {
      const values = Array.isArray(key) ? key : [key]
      for (const v of values) {
        const text = stringifyValue(v)
        if (!text) continue
        merged.set(text, (merged.get(text) ?? 0) + count)
      }
    })
    return Array.from(merged.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 300)
      .map(([value, count]) => ({ value, label: value, count: withCounts ? count : undefined }))
  }, [declared, facets, withCounts])
}

/** One-line description of an active filter, for chips. */
export function describeFilter<TData>(column: Column<TData, unknown>, value: unknown): string {
  const options = column.columnDef.meta?.filterOptions
  const labelOf = (v: string) => options?.find((o) => o.value === v)?.label ?? v
  if (isNumberRangeFilterValue(value)) {
    const [min, max] = value
    if (min !== undefined && max !== undefined) return min === max ? `= ${formatNumber(min)}` : `${formatNumber(min)} – ${formatNumber(max)}`
    return min !== undefined ? `≥ ${formatNumber(min)}` : `≤ ${formatNumber(max as number)}`
  }
  if (Array.isArray(value)) {
    const labels = value.map((v) => labelOf(String(v)))
    return labels.length > 2 ? `${labels.slice(0, 2).join(", ")} +${labels.length - 2}` : labels.join(", ")
  }
  if (isDateRangeFilterValue(value)) {
    if (value.from && value.to) return value.from === value.to ? value.from : `${value.from} → ${value.to}`
    return value.from ? `from ${value.from}` : `until ${value.to}`
  }
  if (variantOf(column) === "boolean") return value === "true" ? "Yes" : "No"
  return labelOf(String(value))
}

export function HeaderFilter<TData>({
  column,
  onFilterChange,
  showCounts,
}: {
  column: Column<TData, unknown>
  onFilterChange: () => void
  showCounts: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const filterValue = column.getFilterValue()
  const isActive = hasFilterValue(filterValue)
  const label = getColumnLabel(column)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "dt-head-icon relative",
            isActive ? "text-primary opacity-100" : "text-muted-foreground"
          )}
          aria-label={`Filter ${label}`}
          title={`Filter ${label}`}
          data-active={isActive || undefined}
          onClick={(e) => e.stopPropagation()}
        >
          <ListFilter className="h-3 w-3" />
          {isActive && <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-primary" />}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-72 p-0"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Filter · <span className="text-foreground">{label}</span>
          </p>
          {isActive && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-1.5 text-xs text-muted-foreground [&_svg]:size-3"
              onClick={() => {
                column.setFilterValue(undefined)
                onFilterChange()
              }}
            >
              <X /> Clear
            </Button>
          )}
        </div>
        <div className="p-3">
          <FilterInput
            column={column}
            label={label}
            open={open}
            showCounts={showCounts}
            onFilterChange={onFilterChange}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}

function FilterInput<TData>({
  column,
  label,
  open,
  showCounts,
  onFilterChange,
}: {
  column: Column<TData, unknown>
  label: string
  open: boolean
  showCounts: boolean
  onFilterChange: () => void
}) {
  const variant = variantOf(column)
  const value = column.getFilterValue()
  const set = (next: unknown) => {
    column.setFilterValue(hasFilterValue(next) ? next : undefined)
    onFilterChange()
  }

  if (variant === "select" || variant === "multiSelect") {
    return (
      <OptionList
        column={column}
        open={open}
        multi={variant === "multiSelect"}
        showCounts={showCounts}
        value={value}
        onChange={set}
      />
    )
  }

  if (variant === "dateRange") {
    return <DateRangeInput label={label} value={isDateRangeFilterValue(value) ? value : {}} onChange={set} />
  }

  if (variant === "numberRange") {
    const minMax = open ? column.getFacetedMinMaxValues() : undefined
    return (
      <NumberRangeInput
        value={isNumberRangeFilterValue(value) ? value : [undefined, undefined]}
        bounds={minMax as [number, number] | undefined}
        onChange={set}
      />
    )
  }

  if (variant === "boolean") {
    return (
      <div className="grid grid-cols-3 gap-1 rounded-md bg-muted p-0.5">
        {[
          { v: undefined, l: "All" },
          { v: "true", l: "Yes" },
          { v: "false", l: "No" },
        ].map((o) => (
          <button
            key={o.l}
            type="button"
            onClick={() => set(o.v)}
            className={cn(
              "h-7 rounded text-xs font-medium transition-colors",
              value === o.v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {o.l}
          </button>
        ))}
      </div>
    )
  }

  return (
    <DebouncedInput
      autoFocus
      value={typeof value === "string" ? value : ""}
      placeholder={column.columnDef.meta?.filterPlaceholder ?? `Contains…`}
      onCommit={(next) => set(next)}
    />
  )
}

function OptionList<TData>({
  column,
  open,
  multi,
  showCounts,
  value,
  onChange,
}: {
  column: Column<TData, unknown>
  open: boolean
  multi: boolean
  showCounts: boolean
  value: unknown
  onChange: (next: unknown) => void
}) {
  const options = useFilterOptions(column, open, showCounts)
  const [query, setQuery] = React.useState("")
  const selected = React.useMemo(() => {
    if (multi) return new Set(Array.isArray(value) ? value.map(String) : [])
    return new Set(typeof value === "string" && value ? [value] : [])
  }, [multi, value])
  const visible = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options
  const maxCount = Math.max(1, ...options.map((o) => o.count ?? 0))

  const toggle = (v: string) => {
    if (!multi) {
      onChange(selected.has(v) ? undefined : v)
      return
    }
    const next = new Set(selected)
    if (next.has(v)) next.delete(v)
    else next.add(v)
    onChange(Array.from(next))
  }

  if (options.length === 0) {
    return <p className="py-2 text-center text-xs text-muted-foreground">No values to choose from.</p>
  }

  return (
    <div className="space-y-2">
      {options.length > 7 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a value…"
            className="h-8 pl-7 text-xs"
          />
        </div>
      )}
      <div className="-mx-1 max-h-60 overflow-y-auto" role="listbox" aria-multiselectable={multi}>
        {visible.map((o) => {
          const on = selected.has(o.value)
          return (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={on}
              onClick={() => toggle(o.value)}
              className={cn(
                "relative flex w-full items-center gap-2 overflow-hidden rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent",
                on && "font-medium"
              )}
            >
              {o.count !== undefined && (
                // Share of the loaded rows, drawn behind the label.
                <span
                  aria-hidden
                  className="absolute inset-y-1 left-0 rounded-r bg-action/10"
                  style={{ width: `${(o.count / maxCount) * 100}%` }}
                />
              )}
              <span
                className={cn(
                  "relative flex h-3.5 w-3.5 shrink-0 items-center justify-center border",
                  multi ? "rounded-sm" : "rounded-full",
                  on ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
                )}
              >
                {on && <Check className="h-2.5 w-2.5" />}
              </span>
              <span className="relative min-w-0 flex-1 truncate">{o.label}</span>
              {o.count !== undefined && (
                <span className="relative shrink-0 tabular-nums text-muted-foreground">{formatNumber(o.count)}</span>
              )}
            </button>
          )
        })}
        {visible.length === 0 && <p className="py-2 text-center text-xs text-muted-foreground">No match.</p>}
      </div>
      {multi && selected.size > 0 && (
        <p className="text-[11px] text-muted-foreground">{selected.size} selected</p>
      )}
    </div>
  )
}

function shiftDays(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return localDateStamp(d)
}

function DateRangeInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: DateRangeFilterValue
  onChange: (next: DateRangeFilterValue) => void
}) {
  const today = localDateStamp()
  const monthStart = localDateStamp(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const presets = [
    { label: "Today", from: today, to: today },
    { label: "7 days", from: shiftDays(-6), to: today },
    { label: "30 days", from: shiftDays(-29), to: today },
    { label: "This month", from: monthStart, to: today },
  ]
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {presets.map((p) => {
          const on = value.from === p.from && value.to === p.to
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange(on ? {} : { from: p.from, to: p.to })}
              className={cn(
                "h-6 rounded-full border px-2 text-[11px] transition-colors",
                on ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent"
              )}
            >
              {p.label}
            </button>
          )
        })}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">From</span>
          <Input
            type="date"
            value={value.from ?? ""}
            max={value.to || undefined}
            onChange={(e) => onChange({ ...value, from: e.target.value || undefined })}
            className="h-8 text-xs"
            aria-label={`${label} from`}
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">To</span>
          <Input
            type="date"
            value={value.to ?? ""}
            min={value.from || undefined}
            onChange={(e) => onChange({ ...value, to: e.target.value || undefined })}
            className="h-8 text-xs"
            aria-label={`${label} to`}
          />
        </label>
      </div>
    </div>
  )
}

function NumberRangeInput({
  value,
  bounds,
  onChange,
}: {
  value: NumberRangeFilterValue
  bounds?: [number, number]
  onChange: (next: NumberRangeFilterValue) => void
}) {
  const parse = (s: string) => (s.trim() === "" || Number.isNaN(Number(s)) ? undefined : Number(s))
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-2 gap-2">
        <DebouncedInput
          type="number"
          value={value[0] === undefined ? "" : String(value[0])}
          placeholder={bounds ? `Min ${formatNumber(bounds[0])}` : "Min"}
          onCommit={(s) => onChange([parse(s), value[1]])}
        />
        <DebouncedInput
          type="number"
          value={value[1] === undefined ? "" : String(value[1])}
          placeholder={bounds ? `Max ${formatNumber(bounds[1])}` : "Max"}
          onCommit={(s) => onChange([value[0], parse(s)])}
        />
      </div>
      {bounds && (
        <p className="text-[11px] text-muted-foreground">
          Loaded rows range {formatNumber(bounds[0])} – {formatNumber(bounds[1])}
        </p>
      )}
    </div>
  )
}

/**
 * Keeps keystrokes local and commits after a pause (or on Enter) — with
 * server filtering that is one request per thought, not per character.
 */
export function DebouncedInput({
  value,
  onCommit,
  delay = 350,
  className,
  ref,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  value: string
  onCommit: (value: string) => void
  delay?: number
  ref?: React.Ref<HTMLInputElement>
}) {
  const [local, setLocal] = React.useState(value)
  const commitRef = React.useRef(onCommit)
  commitRef.current = onCommit

  React.useEffect(() => {
    setLocal(value)
  }, [value])

  React.useEffect(() => {
    if (local === value) return
    const id = setTimeout(() => commitRef.current(local), delay)
    return () => clearTimeout(id)
  }, [local, value, delay])

  return (
    <Input
      {...props}
      ref={ref}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && local !== value) commitRef.current(local)
        props.onKeyDown?.(e)
      }}
      className={cn("h-8 text-xs", className)}
    />
  )
}
