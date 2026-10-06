"use client"

import * as React from "react"
import type {
  ColumnFiltersState,
  ColumnOrderState,
  ColumnPinningState,
  ColumnSizingState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table"

import type { Density, ScrollMode, ViewMode } from "./types"

export interface TablePreferences {
  density: Density
  view: ViewMode
  scrollMode: ScrollMode
  striped: boolean
  gridLines: boolean
  wrap: boolean
  inspector: boolean
  columnVisibility: VisibilityState
  columnOrder: ColumnOrderState
  /** null → the table's default pins (selection left, actions right). */
  columnPinning: ColumnPinningState | null
  columnSizing: ColumnSizingState
}

/** A named snapshot of how the table was being looked at. */
export interface SavedView {
  id: string
  name: string
  createdAt: number
  state: {
    sorting: SortingState
    columnFilters: ColumnFiltersState
    grouping: string[]
    globalFilter: string
    density: Density
    columnVisibility: VisibilityState
    columnOrder: ColumnOrderState
    columnPinning: ColumnPinningState | null
  }
}

interface Stored {
  prefs: Partial<TablePreferences>
  views: SavedView[]
  /** The default layout `prefs` was saved against; see useTablePreferences. */
  layoutKey?: string
}

/** The prefs that describe the columns, as opposed to how the table is viewed. */
const LAYOUT_PREFS = ["columnVisibility", "columnOrder", "columnPinning", "columnSizing"] as const

const VERSION = 1
const keyFor = (id: string) => `dt:v${VERSION}:${id}`

// Storage can be missing or throw (private windows, blocked site data); the
// table must work the same without it, just without memory.
function read(id: string): Stored | null {
  try {
    const raw = window.localStorage.getItem(keyFor(id))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Stored
    return parsed && typeof parsed === "object" ? parsed : null
  } catch {
    return null
  }
}

function write(id: string, value: Stored) {
  try {
    window.localStorage.setItem(keyFor(id), JSON.stringify(value))
  } catch {
    /* quota or blocked storage: keep working in memory */
  }
}

export const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect

type Updater<T> = T | ((prev: T) => T)

/**
 * `layoutKey` identifies the table's DEFAULT column layout. The prefs are saved
 * on first view, untouched or not, so without it a changed default would never
 * reach anyone who had already opened the table. When the key differs from the
 * one the prefs were saved against, the saved column layout is dropped (once)
 * and the new default applies; density, view mode and saved views are kept.
 */
export function useTablePreferences(
  id: string | undefined,
  defaults: TablePreferences,
  layoutKey?: string
) {
  const defaultsRef = React.useRef(defaults)
  const [prefs, setPrefs] = React.useState<TablePreferences>(defaults)
  const [views, setViews] = React.useState<SavedView[]>([])
  const loadedRef = React.useRef(false)

  // Read after hydration (before paint) so server and client markup agree.
  useIsomorphicLayoutEffect(() => {
    loadedRef.current = true
    if (!id) return
    const stored = read(id)
    if (!stored) return
    const saved = { ...stored.prefs }
    if (layoutKey !== undefined && stored.layoutKey !== layoutKey) {
      for (const key of LAYOUT_PREFS) delete saved[key]
    }
    setPrefs((prev) => ({ ...prev, ...saved }))
    setViews(Array.isArray(stored.views) ? stored.views : [])
    // layoutKey is fixed for a table's lifetime (derived from its defaults).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Debounced write: a column drag-resize fires dozens of updates a second.
  React.useEffect(() => {
    if (!id || !loadedRef.current) return
    const handle = setTimeout(() => write(id, { prefs, views, layoutKey }), 250)
    return () => clearTimeout(handle)
  }, [id, prefs, views, layoutKey])

  const setPref = React.useCallback(
    <K extends keyof TablePreferences>(key: K, value: Updater<TablePreferences[K]>) => {
      setPrefs((prev) => {
        const next =
          typeof value === "function"
            ? (value as (p: TablePreferences[K]) => TablePreferences[K])(prev[key])
            : value
        return Object.is(prev[key], next) ? prev : { ...prev, [key]: next }
      })
    },
    []
  )

  const resetLayout = React.useCallback(() => {
    setPrefs(defaultsRef.current)
  }, [])

  const saveView = React.useCallback((name: string, state: SavedView["state"]) => {
    const view: SavedView = {
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim() || "Untitled view",
      createdAt: Date.now(),
      state,
    }
    setViews((prev) => [...prev.filter((v) => v.name !== view.name), view])
    return view
  }, [])

  const deleteView = React.useCallback((viewId: string) => {
    setViews((prev) => prev.filter((v) => v.id !== viewId))
  }, [])

  return { prefs, setPref, setPrefs, resetLayout, views, saveView, deleteView, persistent: Boolean(id) }
}
