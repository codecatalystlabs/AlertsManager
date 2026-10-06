import React from "react";
import { cn } from "@/lib/utils";

export interface FilterChip<T extends string> {
	value: T;
	label: string;
	hint: string;
	/** Rows under this chip in the current view; null while loading. */
	count: number | null;
	Icon: React.ComponentType<{ className?: string }>;
	/** Fill for the chip while it is selected; defaults to the foreground colour. */
	activeClassName?: string;
}

interface FilterChipGroupProps<T extends string> {
	/** Visible caption before the chips, e.g. "Came in via". */
	label: string;
	/** Accessible name for the group. */
	ariaLabel: string;
	chips: FilterChip<T>[];
	value: T;
	/** The "no filter" chip: never disabled, and where a second click returns to. */
	allValue: T;
	onChange: (value: T) => void;
}

/**
 * A row of one-click filter chips above the register, each carrying its count in
 * the current view so the breakdown is on the page before anyone clicks. Shared
 * by the "Came in via" and "Discarded at" rows.
 */
export function FilterChipGroup<T extends string>({
	label,
	ariaLabel,
	chips,
	value,
	allValue,
	onChange,
}: FilterChipGroupProps<T>) {
	return (
		<div
			role="group"
			aria-label={ariaLabel}
			className="flex flex-wrap items-center gap-1.5"
		>
			<span className="mr-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
				{label}
			</span>
			{chips.map(({ value: chip, label: chipLabel, hint, count, Icon, activeClassName }) => {
				const active = value === chip;
				// An empty chip stays visible (so the zero is information) but is not
				// offered as a click, unless it is the active one — which must stay
				// clickable so the user can see where they are.
				const empty = count === 0 && !active && chip !== allValue;
				return (
					<button
						key={chip}
						type="button"
						aria-pressed={active}
						disabled={empty}
						title={hint}
						onClick={() => onChange(active && chip !== allValue ? allValue : chip)}
						className={cn(
							"inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors",
							"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
							active
								? (activeClassName ?? "border-foreground bg-foreground text-background")
								: "border-border bg-background text-foreground hover:bg-muted",
							empty && "cursor-default opacity-50 hover:bg-background"
						)}
					>
						<Icon className="h-3.5 w-3.5" />
						{chipLabel}
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
