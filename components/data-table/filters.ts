import type { FilterFn, Row } from "@tanstack/react-table"

import type {
  DateRangeFilterValue,
  HeaderFilterVariant,
  NumberRangeFilterValue,
} from "./types"

/**
 * Column filter functions. Each returns true (keep the row) for an empty
 * filter value, so a cleared filter never hides anything.
 */

export function isDateRangeFilterValue(value: unknown): value is DateRangeFilterValue {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

export function isNumberRangeFilterValue(value: unknown): value is NumberRangeFilterValue {
  return Array.isArray(value) && value.length === 2 && value.every((v) => v === undefined || typeof v === "number")
}

/** True when a filter value would actually narrow the rows. */
export function hasFilterValue(value: unknown): boolean {
  if (value === undefined || value === null) return false
  if (typeof value === "string") return value.trim().length > 0
  if (isNumberRangeFilterValue(value)) return value[0] !== undefined || value[1] !== undefined
  if (Array.isArray(value)) return value.length > 0
  if (isDateRangeFilterValue(value)) return Boolean(value.from || value.to)
  return true
}

export function toDateTime(value: unknown): number | null {
  if (value instanceof Date) {
    const time = value.getTime()
    return Number.isNaN(time) ? null : time
  }
  if (typeof value !== "string" && typeof value !== "number") return null
  if (typeof value === "string" && value.trim() === "") return null
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? null : time
}

export function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

export function dateRangeFilter<TData>(
  row: Row<TData>,
  columnId: string,
  filterValue: unknown
): boolean {
  if (!isDateRangeFilterValue(filterValue) || !hasFilterValue(filterValue)) {
    return true
  }
  const rowTime = toDateTime(row.getValue(columnId))
  if (rowTime === null) return false

  const fromTime = filterValue.from ? toDateTime(filterValue.from) : null
  const toTime = filterValue.to ? toDateTime(`${filterValue.to}T23:59:59`) : null

  if (fromTime !== null && rowTime < fromTime) return false
  if (toTime !== null && rowTime > toTime) return false
  return true
}

export function exactStringFilter<TData>(
  row: Row<TData>,
  columnId: string,
  filterValue: unknown
): boolean {
  if (typeof filterValue !== "string" || filterValue.trim() === "") return true
  return String(row.getValue(columnId) ?? "").toLowerCase() === filterValue.toLowerCase()
}

export function textIncludesFilter<TData>(
  row: Row<TData>,
  columnId: string,
  filterValue: unknown
): boolean {
  if (typeof filterValue !== "string" || filterValue.trim() === "") return true
  return String(row.getValue(columnId) ?? "")
    .toLowerCase()
    .includes(filterValue.toLowerCase())
}

/** Keeps a row whose value is any of the chosen values. */
export function multiSelectFilter<TData>(
  row: Row<TData>,
  columnId: string,
  filterValue: unknown
): boolean {
  if (!Array.isArray(filterValue) || filterValue.length === 0) return true
  const value = row.getValue(columnId)
  const values = Array.isArray(value) ? value : [value]
  const wanted = new Set(filterValue.map((v) => String(v).toLowerCase()))
  return values.some((v) => wanted.has(String(v ?? "").toLowerCase()))
}

export function numberRangeFilter<TData>(
  row: Row<TData>,
  columnId: string,
  filterValue: unknown
): boolean {
  if (!isNumberRangeFilterValue(filterValue) || !hasFilterValue(filterValue)) return true
  const n = toNumber(row.getValue(columnId))
  if (n === null) return false
  const [min, max] = filterValue
  if (min !== undefined && n < min) return false
  if (max !== undefined && n > max) return false
  return true
}

/** Filter value "true" / "false" against a truthy / falsy cell. */
export function booleanFilter<TData>(
  row: Row<TData>,
  columnId: string,
  filterValue: unknown
): boolean {
  if (filterValue !== "true" && filterValue !== "false") return true
  const raw = row.getValue(columnId)
  const truthy =
    typeof raw === "string"
      ? ["true", "yes", "1", "y"].includes(raw.trim().toLowerCase())
      : Boolean(raw)
  return filterValue === "true" ? truthy : !truthy
}

/** The filter function a header-filter variant implies when a column names none. */
export function filterFnForVariant<TData>(
  variant: HeaderFilterVariant | undefined
): FilterFn<TData> | undefined {
  switch (variant) {
    case "select":
      return exactStringFilter as FilterFn<TData>
    case "multiSelect":
      return multiSelectFilter as FilterFn<TData>
    case "dateRange":
      return dateRangeFilter as FilterFn<TData>
    case "numberRange":
      return numberRangeFilter as FilterFn<TData>
    case "boolean":
      return booleanFilter as FilterFn<TData>
    case "text":
      return textIncludesFilter as FilterFn<TData>
    default:
      return undefined
  }
}

/**
 * Global search. The haystack for a row (every searchable value, lowercased) is
 * built once per row object and cached, so each keystroke over 100k rows is a
 * single `includes` per row rather than one per cell.
 */
const haystackCache = new WeakMap<object, string>()

export function buildGlobalSearchFilter<TData>(
  searchableColumnIds: () => string[]
): FilterFn<TData> {
  return (row, _columnId, filterValue) => {
    if (typeof filterValue !== "string") return true
    const needle = filterValue.trim().toLowerCase()
    if (!needle) return true
    let haystack = haystackCache.get(row)
    if (haystack === undefined) {
      const parts: string[] = []
      for (const id of searchableColumnIds()) {
        const v = row.getValue(id)
        if (v === null || v === undefined || v === "") continue
        parts.push(v instanceof Date ? v.toISOString() : typeof v === "object" ? JSON.stringify(v) : String(v))
      }
      haystack = parts.join("\u0001").toLowerCase()
      haystackCache.set(row, haystack)
    }
    // Every whitespace-separated term must match somewhere in the row.
    return needle.split(/\s+/).every((term) => haystack!.includes(term))
  }
}
