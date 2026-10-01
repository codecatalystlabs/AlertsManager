import { Radar } from "lucide-react";
import { DEFAULT_STAT_INK } from "@/components/ui/stat-card";
import type { NdwSegment } from "@/components/ndw-alerts/ndw-segment-tiles";
import type {
	MoreField,
	QuickChip,
} from "@/components/ndw-alerts/ndw-quick-filter-bar";
import { NDW_BLANK_FACET, type EchisFacets } from "@/lib/fetch-ndw-alerts";
import { ECHIS_SIGNALS, ECHIS_SIGNAL_ORDER, echisSignalMeta } from "@/lib/echis-signals";

export const ECHIS_ALERTS_CONFIG = {
	PAGE_TITLE: "eCHIS Signals",
	PAGE_DESCRIPTION:
		"Community signals reported by VHTs through eCHIS, synced from NDW",
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

export const ECHIS_INITIAL_NDW_FILTERS: NdwAlertsFilterState = {
	search: "",
	ndwFilters: {},
	operators: {},
	local: {},
};

/**
 * One tile per community signal type (plus All and Not specified), so the
 * page opens on "what is being reported" rather than on a list. Keys are the
 * backend's ?signal= values. A code the feed starts sending that is not in
 * ECHIS_SIGNALS still gets a tile.
 */
export function buildEchisSegments(f: EchisFacets | undefined): NdwSegment[] {
	const counts = new Map((f?.signals ?? []).map((s) => [s.value, s.count]));
	const total = f?.total;
	const countOf = (v: string) => (f ? (counts.get(v) ?? 0) : undefined);
	const share = (n?: number) =>
		n !== undefined && total ? `${Math.round((n / total) * 100)}% of signals` : undefined;
	const extra = (f?.signals ?? [])
		.map((s) => s.value)
		.filter((v) => v && !ECHIS_SIGNALS[v]);

	const tiles: NdwSegment[] = [
		{
			key: "",
			label: "All signals",
			count: total,
			icon: Radar,
			caption: "every signal type",
			hint: "Every synced eCHIS signal that matches the filters below",
		},
	];
	for (const code of [...ECHIS_SIGNAL_ORDER, ...extra, ""]) {
		const meta = echisSignalMeta(code);
		const n = countOf(code);
		tiles.push({
			key: code || NDW_BLANK_FACET,
			label: meta.label,
			count: n,
			icon: meta.icon,
			ink: { ...DEFAULT_STAT_INK, icon: meta.ink },
			caption: share(n),
			hint: code ? `Signals reported as "${meta.label}"` : "Reports that name no signal type (mostly from the older feed)",
		});
	}
	return tiles;
}

const stripDistrict = (v: string) => v.replace(/\s+District$/i, "").trim();

/** Quick-filter chips; options and their counts come from /ndw/echis/facets. */
export function buildEchisChips(f: EchisFacets | undefined): QuickChip[] {
	return [
		{
			kind: "select",
			param: "region",
			label: "Region",
			options: (f?.regions ?? []).map((o) => ({
				value: o.value || NDW_BLANK_FACET,
				label: o.value || "Not recorded",
				count: o.count,
			})),
		},
		{
			kind: "select",
			param: "district_is",
			label: "District",
			searchable: true,
			// Picking a region narrows this list before either is applied.
			groupParam: "region",
			options: (f?.districts ?? []).map((o) => ({
				value: o.value || NDW_BLANK_FACET,
				label: stripDistrict(o.value) || "Not recorded",
				count: o.count,
				group: o.group || NDW_BLANK_FACET,
			})),
		},
		{
			kind: "select",
			param: "sub_county_is",
			label: "Division",
			searchable: true,
			// Picking a district narrows this list, as region does districts.
			groupParam: "district_is",
			options: (f?.subCounties ?? []).map((o) => ({
				value: o.value || NDW_BLANK_FACET,
				label: o.value || "Not recorded",
				count: o.count,
				group: o.group || NDW_BLANK_FACET,
			})),
		},
		{ kind: "dateRange", fromParam: "from_date", toParam: "to_date", label: "Reported" },
	];
}

export const ECHIS_MORE_FIELDS: MoreField[] = [
	{ kind: "text", param: "county", label: "County", placeholder: "e.g. Kyaka South" },
	{ kind: "text", param: "health_facility", label: "Health facility", placeholder: "e.g. Kazinga HC III" },
	{ kind: "text", param: "vht_phone", label: "VHT phone", placeholder: "e.g. 0705…" },
];
