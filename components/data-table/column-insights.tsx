"use client"

import * as React from "react"
import type { Column, Row } from "@tanstack/react-table"
import { BarChart3 } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

import { toDateTime, toNumber } from "./filters"
import { formatNumber, getColumnLabel, getExportValue, looksLikeDate, localDateStamp, stringifyValue } from "./utils"

/**
 * What is in a column, at a glance: how full it is, how varied, and — for
 * numbers and dates — its spread; for everything else its most common values.
 * Computed on open over the rows in view (all filtered rows, or the loaded
 * page for server tables). One series, one hue: the bars are magnitude only.
 */

interface Summary {
  total: number
  empty: number
  unique: number
  kind: "number" | "date" | "text"
  top: Array<{ value: string; count: number }>
  others: number
  stats?: { min: number; max: number; mean: number; median: number; sum: number }
  bins?: Array<{ from: number; to: number; count: number }>
}

const BIN_COUNT = 16

function summarize<TData>(column: Column<TData, unknown>, rows: Row<TData>[]): Summary {
  const values: unknown[] = []
  for (const row of rows) {
    if (row.getIsGrouped()) continue
    values.push(getExportValue(row, column))
  }
  const filled = values.filter((v) => v !== null && v !== undefined && v !== "")
  const numbers = filled.map(toNumber).filter((n): n is number => n !== null)
  const meta = column.columnDef.meta
  const dateLike =
    meta?.filterVariant === "dateRange" ||
    (filled.length > 0 && filled.slice(0, 50).filter(looksLikeDate).length / Math.min(50, filled.length) > 0.8)
  const numeric =
    !dateLike && (meta?.numeric || (filled.length > 0 && numbers.length / filled.length > 0.9))

  const counts = new Map<string, number>()
  for (const v of filled) {
    const key = dateLike ? stringifyValue(v).slice(0, 10) : stringifyValue(v)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
  const top = sorted.slice(0, 10).map(([value, count]) => ({ value, count }))
  const others = sorted.slice(10).reduce((s, [, c]) => s + c, 0)

  const summary: Summary = {
    total: values.length,
    empty: values.length - filled.length,
    unique: counts.size,
    kind: numeric ? "number" : dateLike ? "date" : "text",
    top,
    others,
  }

  const series = numeric
    ? numbers
    : dateLike
      ? filled.map(toDateTime).filter((n): n is number => n !== null)
      : []
  if (series.length > 0) {
    const ordered = [...series].sort((a, b) => a - b)
    const min = ordered[0]
    const max = ordered[ordered.length - 1]
    const sum = ordered.reduce((s, n) => s + n, 0)
    const mid = Math.floor(ordered.length / 2)
    summary.stats = {
      min,
      max,
      sum,
      mean: sum / ordered.length,
      median: ordered.length % 2 ? ordered[mid] : (ordered[mid - 1] + ordered[mid]) / 2,
    }
    const span = max - min
    const binCount = span === 0 ? 1 : BIN_COUNT
    const width = span === 0 ? 1 : span / binCount
    const bins = Array.from({ length: binCount }, (_, i) => ({ from: min + i * width, to: min + (i + 1) * width, count: 0 }))
    for (const n of ordered) {
      const i = span === 0 ? 0 : Math.min(binCount - 1, Math.floor((n - min) / width))
      bins[i].count++
    }
    summary.bins = bins
  }
  return summary
}

function fmt(kind: Summary["kind"], n: number) {
  return kind === "date" ? localDateStamp(new Date(n)) : formatNumber(n)
}

export function ColumnInsightsDialog<TData>({
  column,
  rows,
  scopeLabel,
  onOpenChange,
  onFilterValue,
}: {
  column: Column<TData, unknown> | null
  rows: Row<TData>[]
  scopeLabel: string
  onOpenChange: (open: boolean) => void
  onFilterValue?: (column: Column<TData, unknown>, value: string) => void
}) {
  const summary = React.useMemo(() => (column ? summarize(column, rows) : null), [column, rows])
  const label = column ? getColumnLabel(column) : ""

  return (
    <Dialog open={Boolean(column)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-3 p-4">
        <DialogHeader className="space-y-0.5 text-left">
          <DialogTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-action" /> {label}
          </DialogTitle>
          <DialogDescription className="text-xs">Across {scopeLabel}.</DialogDescription>
        </DialogHeader>
        {summary && column && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Values" value={formatNumber(summary.total - summary.empty)} />
              <Stat
                label="Empty"
                value={formatNumber(summary.empty)}
                hint={summary.total ? `${Math.round((summary.empty / summary.total) * 100)}%` : undefined}
              />
              <Stat label="Distinct" value={formatNumber(summary.unique)} />
            </div>

            {summary.stats && (
              <div className="grid grid-cols-4 gap-2">
                <Stat label={summary.kind === "date" ? "Earliest" : "Min"} value={fmt(summary.kind, summary.stats.min)} />
                <Stat label="Median" value={fmt(summary.kind, summary.stats.median)} />
                <Stat label={summary.kind === "date" ? "Latest" : "Max"} value={fmt(summary.kind, summary.stats.max)} />
                {summary.kind === "number" ? (
                  <Stat label="Sum" value={formatNumber(summary.stats.sum)} />
                ) : (
                  <Stat label="Mean" value={fmt(summary.kind, summary.stats.mean)} />
                )}
              </div>
            )}

            {summary.bins && summary.bins.length > 1 && <Histogram bins={summary.bins} kind={summary.kind} />}

            {summary.kind !== "number" && summary.top.length > 0 && (
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Most common{onFilterValue ? " · click to filter" : ""}
                </p>
                <TopValues
                  top={summary.top}
                  total={summary.total - summary.empty}
                  others={summary.others}
                  onPick={onFilterValue ? (v) => onFilterValue(column, v) : undefined}
                />
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-md border bg-muted/30 px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-semibold tabular-nums">
        {value}
        {hint && <span className="ml-1 text-[11px] font-normal text-muted-foreground">{hint}</span>}
      </p>
    </div>
  )
}

function Histogram({ bins, kind }: { bins: NonNullable<Summary["bins"]>; kind: Summary["kind"] }) {
  const max = Math.max(1, ...bins.map((b) => b.count))
  const [hover, setHover] = React.useState<number | null>(null)
  const shown = hover !== null ? bins[hover] : null
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
        <span className="font-semibold">Distribution</span>
        <span className="normal-case tabular-nums tracking-normal text-foreground">
          {shown ? `${fmt(kind, shown.from)} – ${fmt(kind, shown.to)}: ${formatNumber(shown.count)}` : " "}
        </span>
      </div>
      <div className="flex h-20 items-end gap-[2px] border-b" onMouseLeave={() => setHover(null)}>
        {bins.map((b, i) => (
          <div
            key={i}
            className="flex h-full flex-1 items-end"
            onMouseEnter={() => setHover(i)}
            title={`${fmt(kind, b.from)} – ${fmt(kind, b.to)}: ${formatNumber(b.count)}`}
          >
            <div
              className={cn("w-full rounded-t bg-action/70 transition-colors", hover === i && "bg-action")}
              style={{ height: `${(b.count / max) * 100}%`, minHeight: b.count ? 2 : 0 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-0.5 flex justify-between text-[10px] tabular-nums text-muted-foreground">
        <span>{fmt(kind, bins[0].from)}</span>
        <span>{fmt(kind, bins[bins.length - 1].to)}</span>
      </div>
    </div>
  )
}

function TopValues({
  top,
  total,
  others,
  onPick,
}: {
  top: Summary["top"]
  total: number
  others: number
  onPick?: (value: string) => void
}) {
  const max = Math.max(1, ...top.map((t) => t.count))
  return (
    <ul className="space-y-0.5">
      {top.map((t) => (
        <li key={t.value}>
          <button
            type="button"
            disabled={!onPick}
            onClick={() => onPick?.(t.value)}
            className="group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded px-1 py-0.5 text-left text-xs enabled:hover:bg-accent"
            title={`${t.value}: ${formatNumber(t.count)}`}
          >
            <span className="relative min-w-0">
              <span className="relative z-[1] block truncate">{t.value}</span>
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 rounded-r bg-action/15 group-hover:bg-action/25"
                style={{ width: `${(t.count / max) * 100}%` }}
              />
            </span>
            <span className="tabular-nums text-muted-foreground">
              {formatNumber(t.count)}
              <span className="ml-1 inline-block w-9 text-right">{total ? `${Math.round((t.count / total) * 100)}%` : ""}</span>
            </span>
          </button>
        </li>
      ))}
      {others > 0 && (
        <li className="px-1 pt-0.5 text-[11px] text-muted-foreground">+ {formatNumber(others)} in other values</li>
      )}
    </ul>
  )
}
