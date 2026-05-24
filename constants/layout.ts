/**
 * Shared layout & typography tokens for the editorial design system.
 * Keep all page-level spacing/typography decisions in here so the
 * surveillance dashboard stays visually consistent.
 */
export const LAYOUT = {
	// Vertical rhythm between major page sections.
	pageGap: "space-y-12",
	// Page titles use Instrument Serif, never uppercase.
	pageTitle: "serif text-4xl md:text-5xl font-medium tracking-tight text-foreground",
	pageSubtitle: "mt-3 text-sm md:text-base text-muted-foreground max-w-2xl leading-relaxed",
	pageEyebrow:
		"mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground",
	card: "editorial-card",
	cardHeader: "px-5 pt-5 pb-3",
	cardTitle: "serif text-xl font-medium tracking-tight text-foreground",
	cardContent: "px-5 pb-5",
	statsGrid: "grid grid-cols-2 lg:grid-cols-4 gap-px bg-border/40 border border-border/40 rounded-sm overflow-hidden",
	filtersGrid: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end",
} as const;
