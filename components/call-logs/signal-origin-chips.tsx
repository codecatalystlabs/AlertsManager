import React, { memo } from "react";
import { Layers } from "lucide-react";
import { signalOriginIcon } from "@/components/signal-origin-badge";
import {
	ORIGIN_6767,
	SIGNAL_ORIGINS,
	type SignalOriginFilter,
} from "@/lib/signal-origin";
import type { AlertOriginCounts } from "@/lib/fetch-alerts";
import { FilterChipGroup, type FilterChip } from "./filter-chip-group";

interface SignalOriginChipsProps {
	value: SignalOriginFilter;
	onChange: (value: SignalOriginFilter) => void;
	/** Per-origin counts in the current view; null while loading. */
	counts: AlertOriginCounts | null;
}

/**
 * "Came in via" — one click to see only the signals that arrived by 6767 SMS
 * (or eCHIS, PoE, or logged directly), inside whatever tab and filters are
 * already set. Each chip carries its count in the current view, so the answer
 * to "how many of these came from 6767?" is on the page before anyone clicks.
 */
export const SignalOriginChips = memo<SignalOriginChipsProps>(
	({ value, onChange, counts }) => {
		const chips: FilterChip<SignalOriginFilter>[] = [
			{
				value: "all",
				label: "All",
				hint: "Every signal in this view, however it came in.",
				count: counts?.total ?? null,
				Icon: Layers,
			},
			...SIGNAL_ORIGINS.map((o) => ({
				value: o.value,
				label: o.label,
				hint: o.hint,
				count: counts ? (counts.origins[o.value] ?? 0) : null,
				Icon: signalOriginIcon(o.value),
				activeClassName:
					o.value === ORIGIN_6767 ? "border-sky-600 bg-sky-600 text-white" : undefined,
			})),
		];

		return (
			<FilterChipGroup
				label="Came in via"
				ariaLabel="Filter by how the signal came in"
				chips={chips}
				value={value}
				allValue="all"
				onChange={onChange}
			/>
		);
	}
);

SignalOriginChips.displayName = "SignalOriginChips";
