import { BellDot, Biohazard, CheckCheck, Thermometer, UsersRound } from "lucide-react";
import {
	accentInk,
	DEFAULT_STAT_INK,
	tintedInk,
} from "@/components/ui/stat-card";
import type { NdwSegment } from "@/components/ndw-alerts/ndw-segment-tiles";
import type {
	MoreField,
	QuickChip,
} from "@/components/ndw-alerts/ndw-quick-filter-bar";
import { NDW_BLANK_FACET, type PoeFacets } from "@/lib/fetch-ndw-alerts";
import { shortPortName } from "@/lib/poe-screening";

export const POE_ALERTS_CONFIG = {
	PAGE_TITLE: "POE Signals",
	PAGE_DESCRIPTION:
		"Traveller health declarations from Uganda's points of entry, synced from NDW",
	ITEMS_PER_PAGE: 10,
	AUTO_REFRESH_INTERVAL_MS: 60_000,
} as const;

export type NdwAlertsFilterState = {
	search: string;
	ndwFilters: Record<string, string>;
	operators: Record<string, string>;
	/** Quick filters over locally synced rows (backend query params → value). */
	local: Record<string, string>;
};

export const POE_INITIAL_NDW_FILTERS: NdwAlertsFilterState = {
	search: "",
	ndwFilters: {},
	operators: {},
	local: {},
};

export const POE_RISK_LEVEL_OPTIONS = ["high", "medium", "low"] as const;

/**
 * The segment tiles, in the order an officer works them: the follow-up queue
 * first. Keys are the backend's ?segment= values (handlers/ndw_filters.go).
 */
export function buildPoeSegments(f: PoeFacets | undefined, filtered: boolean): NdwSegment[] {
	const followUp = f?.segments.follow_up;
	return [
		{
			key: "",
			label: "All travellers",
			count: f?.total,
			icon: UsersRound,
			caption: filtered ? "matching the filters" : "synced from NDW",
			hint: "Every synced traveller record that matches the filters below",
		},
		{
			key: "follow_up",
			label: "Needs follow-up",
			count: followUp,
			icon: BellDot,
			ink: (followUp ?? 0) > 0 ? accentInk("primary") : tintedInk("primary"),
			caption: "declared, not yet actioned",
			hint: "Declared at least one symptom or exposure, and not yet forwarded to a district or verified into alerts",
		},
		{
			key: "symptomatic",
			label: "Symptomatic",
			count: f?.segments.symptomatic,
			icon: Thermometer,
			ink: tintedInk("destructive"),
			caption: "declared a symptom",
			hint: "Declared at least one symptom on arrival",
		},
		{
			key: "exposed",
			label: "Exposure reported",
			count: f?.segments.exposed,
			icon: Biohazard,
			ink: { ...DEFAULT_STAT_INK, icon: "text-amber-600" },
			caption: "funeral, bushmeat, sick contact…",
			hint: "Answered yes to an exposure question: funeral, bushmeat, contact with a sick person, or a health facility",
		},
		{
			key: "actioned",
			label: "Actioned",
			count: f?.segments.actioned,
			icon: CheckCheck,
			ink: tintedInk("success"),
			caption: "forwarded or verified",
			hint: "Forwarded to a district or verified into alerts",
		},
	];
}

/** Quick-filter chips; options and their counts come from /ndw/poe/facets. */
export function buildPoeChips(f: PoeFacets | undefined): QuickChip[] {
	return [
		{
			kind: "select",
			param: "port_is",
			label: "Port",
			options: (f?.ports ?? []).map((o) => ({
				value: o.value || NDW_BLANK_FACET,
				label: shortPortName(o.value) || "Not recorded",
				count: o.count,
			})),
		},
		{
			kind: "select",
			param: "nation_is",
			label: "Nationality",
			searchable: true,
			options: (f?.nationalities ?? []).map((o) => ({
				value: o.value || NDW_BLANK_FACET,
				label: o.value || "Not recorded",
				count: o.count,
			})),
		},
		{ kind: "dateRange", fromParam: "from_date", toParam: "to_date", label: "Created" },
	];
}

export const POE_MORE_FIELDS: MoreField[] = [
	{ kind: "dateRange", fromParam: "arrival_from", toParam: "arrival_to", label: "Arrival date" },
	{
		kind: "select",
		param: "risk",
		label: "NDW risk level",
		options: POE_RISK_LEVEL_OPTIONS.map((r) => ({
			value: r,
			label: r.charAt(0).toUpperCase() + r.slice(1),
		})),
	},
];
