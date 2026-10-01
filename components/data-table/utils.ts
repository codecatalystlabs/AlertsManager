import type { Column, Row } from "@tanstack/react-table"

import { toDateTime } from "./filters"

/** Synthetic columns the table adds itself (selection, expander, row number). */
export const SELECT_COLUMN_ID = "__select"
export const EXPAND_COLUMN_ID = "__expand"
export const ROW_NUMBER_COLUMN_ID = "__rownum"
export const ACTIONS_COLUMN_ID = "actions"

export function isSyntheticColumn(id: string): boolean {
  return id.startsWith("__")
}

/** Columns that hold data (not checkboxes, expanders or row actions). */
export function isDataColumn<TData>(column: Column<TData, unknown>): boolean {
  if (isSyntheticColumn(column.id) || column.id === ACTIONS_COLUMN_ID) return false
  return Boolean(column.accessorFn || column.columnDef.meta?.exportValue)
}

/** "alertCaseName" → "Alert Case Name", "signal_code" → "Signal Code". */
export function humanize(id: string): string {
  return id
    .replace(/[_.-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase())
}

/** The human name of a column, for menus, cards, the inspector and exports. */
export function getColumnLabel<TData>(column: Column<TData, unknown>): string {
  const meta = column.columnDef.meta
  if (meta?.label) return meta.label
  if (meta?.filterLabel) return meta.filterLabel
  const header = column.columnDef.header
  if (typeof header === "string" && header.trim()) return header
  if (column.id === ROW_NUMBER_COLUMN_ID) return "Row #"
  if (column.id === SELECT_COLUMN_ID) return "Select"
  if (column.id === EXPAND_COLUMN_ID) return "Expand"
  return humanize(column.id)
}

/** The value a column contributes to exports, copies and insights. */
export function getExportValue<TData>(row: Row<TData>, column: Column<TData, unknown>): unknown {
  const exportValue = column.columnDef.meta?.exportValue
  if (exportValue) return exportValue(row.original)
  if (!column.accessorFn) return undefined
  return row.getValue(column.id)
}

/** A plain-text rendering of any cell value. */
export function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? "" : value.toISOString()
  if (Array.isArray(value)) return value.map(stringifyValue).filter(Boolean).join(", ")
  if (typeof value === "object") {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 })
export function formatNumber(value: number): string {
  return numberFormat.format(value)
}

/** Local YYYY-MM-DD (never toISOString, which shifts the day east of UTC). */
export function localDateStamp(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function looksLikeDate(value: unknown): boolean {
  if (value instanceof Date) return true
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value) && toDateTime(value) !== null
}

export function cssSafe(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "_")
}

/* ── export ─────────────────────────────────────────────────────────────── */

export interface ExportMatrix {
  headers: string[]
  body: unknown[][]
}

export function buildExportMatrix<TData>(
  rows: Row<TData>[],
  columns: Column<TData, unknown>[]
): ExportMatrix {
  const exportable = columns.filter(
    (c) => isDataColumn(c) && c.columnDef.meta?.exportable !== false
  )
  return {
    headers: exportable.map((c) => getColumnLabel(c)),
    body: rows
      .filter((r) => !r.getIsGrouped())
      .map((r) =>
        exportable.map((c) => {
          const v = getExportValue(r, c)
          return typeof v === "number" || typeof v === "boolean" ? v : stringifyValue(v)
        })
      ),
  }
}

/**
 * Spreadsheet apps execute a cell that starts with = + - @ (or a tab / CR) as
 * a formula. Prefix those with an apostrophe so an exported value that came
 * from user input can never run as one (CSV injection).
 */
function neutralizeFormula(text: string): string {
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
}

function csvCell(value: unknown): string {
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  const text = neutralizeFormula(stringifyValue(value))
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv({ headers, body }: ExportMatrix): string {
  return [headers, ...body].map((line) => line.map(csvCell).join(",")).join("\r\n")
}

/** Tab-separated, which pastes straight into a spreadsheet grid. */
export function toTsv({ headers, body }: ExportMatrix, withHeaders = true): string {
  const clean = (v: unknown) => stringifyValue(v).replace(/[\t\r\n]+/g, " ")
  const lines = withHeaders ? [headers, ...body] : body
  return lines.map((line) => line.map(clean).join("\t")).join("\n")
}

export function toJson({ headers, body }: ExportMatrix): string {
  return JSON.stringify(
    body.map((line) => Object.fromEntries(headers.map((h, i) => [h, line[i]]))),
    null,
    2
  )
}

export function downloadBlob(content: BlobPart, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export type ExportFormat = "csv" | "xlsx" | "json"

export async function exportMatrix(matrix: ExportMatrix, baseName: string, format: ExportFormat) {
  const filename = `${baseName}_${localDateStamp()}`
  if (format === "csv") {
    // BOM so Excel opens UTF-8 (district names, reporter names) correctly.
    downloadBlob("﻿" + toCsv(matrix), `${filename}.csv`, "text/csv;charset=utf-8")
    return
  }
  if (format === "json") {
    downloadBlob(toJson(matrix), `${filename}.json`, "application/json")
    return
  }
  const XLSX = await import("xlsx")
  const safe = matrix.body.map((line) =>
    line.map((v) => (typeof v === "string" ? neutralizeFormula(v) : v))
  )
  const sheet = XLSX.utils.aoa_to_sheet([matrix.headers, ...safe])
  sheet["!cols"] = matrix.headers.map((h, i) => ({
    wch: Math.min(
      60,
      Math.max(h.length, ...safe.slice(0, 200).map((line) => stringifyValue(line[i]).length)) + 2
    ),
  }))
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, "Data")
  XLSX.writeFile(book, `${filename}.xlsx`)
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Clipboard API refused (insecure origin, no permission): legacy path.
    const area = document.createElement("textarea")
    area.value = text
    area.style.position = "fixed"
    area.style.opacity = "0"
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand("copy")
    area.remove()
    return ok
  }
}
