/**
 * The one data table. Everything a list screen needs — server or client data,
 * pages or endless (virtualized) scrolling, table or card layout, three
 * densities, column resize / reorder / pin / hide, header filters with value
 * counts, grouping with aggregates, row selection with bulk actions, a
 * details panel, a context menu, export, saved views, and keyboard control.
 *
 * `components/ui/data-table.tsx` re-exports this module so the long-standing
 * import path keeps working.
 */
export { DataTable } from "./data-table"
export { SortableHeader } from "./column-header"
export { TextSummaryCell, WhenCell } from "./cells"
export {
  booleanFilter,
  dateRangeFilter,
  exactStringFilter,
  multiSelectFilter,
  numberRangeFilter,
  textIncludesFilter,
} from "./filters"
export type {
  AggregateKind,
  BulkActionContext,
  DataTableInitialState,
  DataTableProps,
  DateRangeFilterValue,
  Density,
  HeaderFilterOption,
  HeaderFilterVariant,
  NumberRangeFilterValue,
  ScrollMode,
  ViewMode,
} from "./types"
