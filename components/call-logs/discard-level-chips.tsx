import React, { memo } from "react";
import { Archive, Building2, Filter, MapPin } from "lucide-react";
import {
	DISCARD_AT_TRIAGE,
	DISCARD_AT_DESK,
	DISCARD_AT_FIELD,
	DISCARD_LEVELS,
	type DiscardLevel,
	type DiscardLevelFilter,
} from "@/lib/discard-level";
import type { AlertDiscardLevelCounts } from "@/lib/fetch-alerts";
import { FilterChipGroup, type FilterChip } from "./filter-chip-group";

interface DiscardLevelChipsProps {
	value: DiscardLevelFilter;
	onChange: (value: DiscardLevelFilter) => void;
	/** Per-level counts in the current view; null while loading. */
	counts: AlertDiscardLevelCounts | null;
}

const LEVEL_ICONS: Record<DiscardLevel, React.ComponentType<{ className?: string }>> = {
	[DISCARD_AT_TRIAGE]: Filter,
	[DISCARD_AT_DESK]: Building2,
	[DISCARD_AT_FIELD]: MapPin,
};

/**
 * "Discarded at" — the Discarded Events list split by the level that threw each
 * signal out. The same count means different things at each level (a triage
 * pile is a reporting-quality problem, a field pile is response capacity spent
 * on nothing), so the split is on the page rather than behind a filter.
 */
export const DiscardLevelChips = memo<DiscardLevelChipsProps>(
	({ value, onChange, counts }) => {
		const chips: FilterChip<DiscardLevelFilter>[] = [
			{
				value: "all",
				label: "All levels",
				hint: "Every discarded signal in this view, whichever level discarded it.",
				count: counts?.total ?? null,
				Icon: Archive,
			},
			...DISCARD_LEVELS.map((l) => ({
				value: l.value,
				label: l.label,
				hint: l.hint,
				count: counts ? (counts.levels[l.value] ?? 0) : null,
				Icon: LEVEL_ICONS[l.value],
			})),
		];

		return (
			<FilterChipGroup
				label="Discarded at"
				ariaLabel="Filter by the level that discarded the signal"
				chips={chips}
				value={value}
				allValue="all"
				onChange={onChange}
			/>
		);
	}
);

DiscardLevelChips.displayName = "DiscardLevelChips";
