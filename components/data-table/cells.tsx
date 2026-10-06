import * as React from "react"

import { cn } from "@/lib/utils"
import { formatTableDate, formatTableDateTime, formatTimeAgo } from "@/lib/format-date"

/**
 * A "when" cell in the one table date format ("30 Sep 2026, 22:14"), with the
 * full timestamp and how long ago in the tooltip. `hasTime={false}` shows the
 * date alone — for values that only ever recorded a day.
 */
export function WhenCell({
  value,
  hasTime = true,
  className,
}: {
  value: string | Date | null | undefined
  hasTime?: boolean
  className?: string
}) {
  if (!value) return <span className="text-muted-foreground">—</span>
  const text = hasTime ? formatTableDateTime(value) : formatTableDate(value)
  const iso = value instanceof Date ? value.toISOString() : value
  const title = hasTime
    ? `${text} · ${formatTimeAgo(iso)}`
    : `${text} · no time recorded`
  return (
    <span className={cn("whitespace-nowrap tabular-nums", className)} title={title}>
      {text}
    </span>
  )
}

/**
 * One line of free text — a message, a description — cut to the column and
 * shown whole on hover, so a long report never makes its row taller than the
 * rest. An optional leading badge carries a code that classifies the text.
 */
export function TextSummaryCell({
  text,
  badge,
  badgeTitle,
  maxWidthClass = "max-w-[22rem]",
  lines,
}: {
  text: string | null | undefined
  badge?: string | null
  badgeTitle?: string
  maxWidthClass?: string
  /**
   * Wrap the text over up to this many lines instead of cutting it to one
   * (pair with the column's `meta.wrap`). The full text stays on hover.
   */
  lines?: number
}) {
  const body = (text ?? "").trim()
  if (!body && !badge) return <span className="text-muted-foreground">—</span>
  const wrapped = !!lines && lines > 1
  return (
    <span
      className={cn("flex min-w-0 gap-1.5", wrapped ? "items-start" : "items-center", maxWidthClass)}
      title={[badgeTitle, body].filter(Boolean).join("\n") || undefined}
    >
      {badge && (
        <span className="shrink-0 rounded border border-primary/30 bg-primary/5 px-1 py-px text-[10px] font-semibold text-primary">
          {badge}
        </span>
      )}
      {body &&
        (wrapped ? (
          <span
            className="min-w-0 whitespace-normal break-words leading-snug"
            style={{
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: lines,
              overflow: "hidden",
            }}
          >
            {body}
          </span>
        ) : (
          <span className="truncate">{body}</span>
        ))}
    </span>
  )
}
