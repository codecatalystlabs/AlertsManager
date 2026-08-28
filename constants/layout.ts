/**
 * Shared compact spacing for dashboard pages.
 *
 * Card padding is NOT here any more — it lives in the `Card*` primitives
 * (components/ui/card.tsx), so a card is the same size wherever it is used.
 * `cardHeader`/`cardContent`/`cardTitle` stay as empty pass-throughs only so
 * existing `cn(LAYOUT.cardHeader, …)` call sites keep reading the same; add
 * spacing to the primitive, never back into these.
 */
export const LAYOUT = {
	pageGap: "space-y-2.5",
	pageTitle: "text-lg font-semibold text-uganda-black",
	pageSubtitle: "text-xs text-muted-foreground",
	card: "shadow-sm",
	cardHeader: "",
	cardTitle: "",
	cardContent: "",
	statsGrid: "grid grid-cols-2 lg:grid-cols-4 gap-2 min-w-0",
	filtersGrid:
		"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-2 items-end min-w-0",
} as const;
