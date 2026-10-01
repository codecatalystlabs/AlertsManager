"use client"

import * as React from "react"
import type { Column, ColumnSizingState, Table } from "@tanstack/react-table"

import { useIsomorphicLayoutEffect } from "./use-table-preferences"
import { ACTIONS_COLUMN_ID, cssSafe, isSyntheticColumn } from "./utils"

/**
 * Column widths without jitter.
 *
 * A table that sizes itself to its content (table-layout: auto) looks right
 * but cannot be virtualized — every scroll brings different rows and every
 * column re-flows — and it gives resizing and sticky pinning nothing stable to
 * work from. A fixed-width table is stable but needs widths nobody declared.
 *
 * So the table is laid out in two passes, both before the browser paints:
 *   1. "measure": render auto, max-content; read each header's natural width.
 *   2. "fixed":   lock those widths (capped, and stretched to fill the
 *                 container) into a <colgroup> with table-layout: fixed.
 * Widths live in CSS variables and <col> elements, so dragging a resize handle
 * or resizing the window re-lays the columns without re-rendering a single row.
 *
 * A re-measure runs when the columns, the density, the wrap mode or the data
 * change — never on scroll.
 */

export type LayoutPhase = "measure" | "fixed"

const DEFAULT_MIN = 56
const DEFAULT_MAX = 420
const SHRINK_TOLERANCE = 72
const SHRINK_FLOOR = 110

export function useColumnLayout<TData>({
  table,
  scrollRef,
  active,
  measureKey,
  sizing,
}: {
  table: Table<TData>
  scrollRef: React.RefObject<HTMLDivElement | null>
  active: boolean
  measureKey: string
  sizing: ColumnSizingState
}) {
  const headerEls = React.useRef(new Map<string, HTMLElement>())
  const refCallbacks = React.useRef(new Map<string, (el: HTMLElement | null) => void>())
  const [natural, setNatural] = React.useState<Record<string, number>>({})
  const [phase, setPhase] = React.useState<LayoutPhase>("measure")
  const [containerWidth, setContainerWidth] = React.useState(0)
  // Widths measured in a fallback font are wrong once the web font lands.
  const [fontsTick, setFontsTick] = React.useState(0)

  React.useEffect(() => {
    const fonts = typeof document !== "undefined" ? document.fonts : undefined
    if (!fonts) return
    let alive = true
    const bump = () => alive && setFontsTick((t) => t + 1)
    fonts.ready.then(bump)
    fonts.addEventListener?.("loadingdone", bump)
    return () => {
      alive = false
      fonts.removeEventListener?.("loadingdone", bump)
    }
  }, [])

  const registerHeader = React.useCallback((id: string) => {
    let cb = refCallbacks.current.get(id)
    if (!cb) {
      cb = (el: HTMLElement | null) => {
        if (el) headerEls.current.set(id, el)
        else headerEls.current.delete(id)
      }
      refCallbacks.current.set(id, cb)
    }
    return cb
  }, [])

  // Anything that changes natural widths sends the table back to pass 1.
  useIsomorphicLayoutEffect(() => {
    setPhase("measure")
  }, [measureKey, active, fontsTick])

  useIsomorphicLayoutEffect(() => {
    if (!active || phase !== "measure") return
    const scroller = scrollRef.current
    if (!scroller) return
    const width = scroller.clientWidth
    // Hidden (an inactive tab, a collapsed panel): wait for the observer.
    if (width === 0) return
    const next: Record<string, number> = {}
    let measured = false
    headerEls.current.forEach((el, id) => {
      const w = el.getBoundingClientRect().width
      if (w > 0) {
        // +1: sub-pixel text must not tip into an ellipsis.
        next[id] = Math.ceil(w) + 1
        measured = true
      }
    })
    if (!measured) return
    setContainerWidth(width)
    setNatural((prev) => ({ ...prev, ...next }))
    setPhase("fixed")
  }, [active, phase, containerWidth, measureKey])

  React.useEffect(() => {
    const scroller = scrollRef.current
    if (!active || !scroller || typeof ResizeObserver === "undefined") return
    let frame = 0
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const w = scroller.clientWidth
        setContainerWidth((prev) => (Math.abs(prev - w) >= 1 ? w : prev))
      })
    })
    observer.observe(scroller)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [active, scrollRef])

  // Header groups and row cells both render left pins, then the centre, then
  // right pins — getVisibleLeafColumns() alone ignores pinning order.
  const leftColumns = table.getLeftVisibleLeafColumns()
  const centerColumns = table.getCenterVisibleLeafColumns()
  const rightColumns = table.getRightVisibleLeafColumns()
  const displayColumns = React.useMemo(
    () => [...leftColumns, ...centerColumns, ...rightColumns] as Column<TData, unknown>[],
    [leftColumns, centerColumns, rightColumns]
  )

  const layout = React.useMemo(() => {
    const widths: Record<string, number> = {}
    let total = 0
    let flexBase = 0
    const flexIds: string[] = []
    for (const column of displayColumns) {
      const def = column.columnDef
      const meta = def.meta
      const min = meta?.minWidth ?? (isSyntheticColumn(column.id) ? 24 : DEFAULT_MIN)
      const max = Math.max(min, meta?.maxWidth ?? DEFAULT_MAX)
      const user = sizing[column.id]
      let width: number
      if (user !== undefined) {
        width = Math.max(min, user)
      } else if (def.size !== undefined) {
        width = def.size
      } else {
        width = Math.min(max, Math.max(min, natural[column.id] ?? 140))
        if (!isSyntheticColumn(column.id) && column.id !== ACTIONS_COLUMN_ID) {
          flexIds.push(column.id)
          flexBase += width
        }
      }
      widths[column.id] = width
      total += width
    }
    // Share spare room among the content columns in proportion to their width,
    // so a narrow table still spans its card the way an auto table would.
    const available = containerWidth - 2
    if (phase === "fixed" && available > total && flexBase > 0) {
      const extra = available - total
      let given = 0
      flexIds.forEach((id, i) => {
        const add =
          i === flexIds.length - 1 ? extra - given : Math.floor((extra * widths[id]) / flexBase)
        widths[id] += add
        given += add
      })
      total = available
    } else if (phase === "fixed" && total > available && total - available <= SHRINK_TOLERANCE) {
      // Only just too wide: a scrollbar for a few pixels is worse than
      // trimming the widest content columns a little (they ellipsize).
      let deficit = total - available
      const shrinkable = flexIds.filter((id) => widths[id] > SHRINK_FLOOR).sort((a, b) => widths[b] - widths[a])
      const room = shrinkable.reduce((sum, id) => sum + (widths[id] - SHRINK_FLOOR), 0)
      if (room >= deficit) {
        // Shares of the original deficit (the running one would shrink each
        // later share and leave pixels over); capped by what is still owed.
        const need = deficit
        for (const id of shrinkable) {
          const share = Math.ceil((need * (widths[id] - SHRINK_FLOOR)) / room)
          const take = Math.min(widths[id] - SHRINK_FLOOR, share, deficit)
          widths[id] -= take
          total -= take
          deficit -= take
          if (deficit <= 0) break
        }
      }
    }

    const offsets: Record<string, { side: "left" | "right"; offset: number; edge: boolean }> = {}
    let acc = 0
    leftColumns.forEach((column, i) => {
      offsets[column.id] = { side: "left", offset: acc, edge: i === leftColumns.length - 1 }
      acc += widths[column.id] ?? 0
    })
    acc = 0
    for (let i = rightColumns.length - 1; i >= 0; i--) {
      const column = rightColumns[i]
      offsets[column.id] = { side: "right", offset: acc, edge: i === 0 }
      acc += widths[column.id] ?? 0
    }

    const cssVars: Record<string, string> = {}
    for (const [id, pin] of Object.entries(offsets)) {
      cssVars[`--dt-p${pin.side === "left" ? "l" : "r"}-${cssSafe(id)}`] = `${pin.offset}px`
    }
    return { widths, total, offsets, cssVars }
  }, [displayColumns, leftColumns, rightColumns, sizing, natural, containerWidth, phase])

  /** The width a column is drawn at right now (for starting a drag-resize). */
  const currentWidth = React.useCallback(
    (id: string) => layout.widths[id] ?? headerEls.current.get(id)?.getBoundingClientRect().width ?? 140,
    [layout.widths]
  )

  return { phase, registerHeader, currentWidth, containerWidth, displayColumns, ...layout }
}

/** Stable-string signature of pin placement, so memoized rows notice re-pins. */
export function pinSignature(
  offsets: Record<string, { side: "left" | "right"; edge: boolean }>
): string {
  return Object.entries(offsets)
    .map(([id, p]) => `${id}:${p.side}${p.edge ? "!" : ""}`)
    .join("|")
}
