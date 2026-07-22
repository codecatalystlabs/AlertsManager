import { useMemo } from "react";
import type { SortingState } from "@tanstack/react-table";

/** Server-side sort descriptor shared by the alerts and call-logs tables. */
export interface ServerSort {
	/** Sort column key understood by the API; "" = server default. */
	by: string;
	order: "asc" | "desc";
}

/**
 * Bridges TanStack's `SortingState` to the API's `{ by, order }` sort for
 * manual (server-side) sorting. Both the Alerts and Call-Logs tables carried a
 * byte-identical copy of this; the only per-table input is the column-id ↔
 * sort-key mapping. Toggling a header that the server can't sort on is ignored.
 */
export function useServerSort<S extends ServerSort>(
	/** Table column id → API sort key (the sortable-column whitelist). */
	columnToSortKey: Record<string, string>,
	/** API sort key → table column id (inverse of the above). */
	sortKeyToColumn: Record<string, string>,
	sort: S,
	onSortChange: (sort: S) => void,
): { sortingState: SortingState; handleSortingChange: (next: SortingState) => void } {
	const sortingState = useMemo<SortingState>(() => {
		const columnId = sort.by ? sortKeyToColumn[sort.by] : undefined;
		return columnId ? [{ id: columnId, desc: sort.order === "desc" }] : [];
	}, [sort, sortKeyToColumn]);

	const handleSortingChange = useMemo(
		() => (next: SortingState) => {
			const first = next[0];
			if (!first) {
				onSortChange({ by: "", order: "desc" } as S);
				return;
			}
			const key = columnToSortKey[first.id];
			// Ignore sort toggles on columns the server can't sort on.
			if (!key) return;
			onSortChange({ by: key, order: first.desc ? "desc" : "asc" } as S);
		},
		[onSortChange, columnToSortKey]
	);

	return { sortingState, handleSortingChange };
}
