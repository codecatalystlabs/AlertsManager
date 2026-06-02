/** Shared compact spacing for dashboard pages */
export const LAYOUT = {
	pageGap: "space-y-3",
	pageTitle: "text-xl font-semibold text-uganda-black",
	pageSubtitle: "text-sm text-muted-foreground",
	card: "shadow-sm",
	cardHeader: "p-3 pb-2",
	cardTitle: "text-sm font-semibold",
	cardContent: "p-3 pt-0",
	statsGrid: "grid grid-cols-2 lg:grid-cols-4 gap-3 min-w-0",
	filtersGrid:
		"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 items-end min-w-0",
} as const;
