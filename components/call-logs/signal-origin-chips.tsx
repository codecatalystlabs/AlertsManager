import React, { memo } from "react";
import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { signalOriginIcon } from "@/components/signal-origin-badge";
import {
	ORIGIN_6767,
	SIGNAL_ORIGINS,
	type SignalOriginFilter,
} from "@/lib/signal-origin";
import type { AlertOriginCounts } from "@/lib/fetch-alerts";

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
		const chips: {
			value: SignalOriginFilter;
			label: string;
			hint: string;
			count: number | null;
			Icon: React.ComponentType<{ className?: string }>;
		}[] = [
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
			})),
		];

		return (
			<div
				role="group"
				aria-label="Filter by how the signal came in"
				className="flex flex-wrap items-center gap-1.5"
			>
				<span className="mr-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
					Came in via
				</span>
				{chips.map(({ value: chip, label, hint, count, Icon }) => {
					const active = value === chip;
					// An empty origin stays visible (so the zero is information) but
					// is not offered as a click, unless it is the active one — which
					// must stay clickable so the user can see where they are.
					const empty = count === 0 && !active && chip !== "all";
					return (
						<button
							key={chip}
							type="button"
							aria-pressed={active}
							disabled={empty}
							title={hint}
							onClick={() => onChange(active && chip !== "all" ? "all" : chip)}
							className={cn(
								"inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors",
								"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
								active
									? chip === ORIGIN_6767
										? "border-sky-600 bg-sky-600 text-white"
										: "border-foreground bg-foreground text-background"
									: "border-border bg-background text-foreground hover:bg-muted",
								empty && "cursor-default opacity-50 hover:bg-background"
							)}
						>
							<Icon className="h-3.5 w-3.5" />
							{label}
							{count != null && (
								<span
									className={cn(
										"tabular-nums",
										active ? "opacity-90" : "text-muted-foreground"
									)}
								>
									{count.toLocaleString()}
								</span>
							)}
						</button>
					);
				})}
			</div>
		);
	}
);

SignalOriginChips.displayName = "SignalOriginChips";
