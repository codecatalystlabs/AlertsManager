import React, { memo } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TRIAGED_SPLITS, type TriagedSplit } from "@/lib/register-view";

interface TriagedSplitTabsProps {
	value: TriagedSplit;
	onChange: (value: TriagedSplit) => void;
	/** Rows in the half currently shown, so the split reads as a count, not a guess. */
	count?: number;
}

/**
 * The Triaged tab's two halves: Not discarded, and Discarded.
 *
 * Rendered UNDER the register tabs and visibly narrower than them, because it is
 * a second-level choice: it refines which triaged signals you are looking at,
 * it does not move you to a different stage of the pipeline.
 *
 * The two halves are opposite kinds of list on purpose. "Not discarded" is a
 * queue — every row has a verification due on it. "Discarded" is an archive —
 * nothing is due on any row, and what each row instead has to say is WHICH gate
 * threw it out, which the list shows in its own column. See lib/register-view.ts
 * for what each half selects, and lib/discard-level.ts for the levels.
 */
export const TriagedSplitTabs = memo<TriagedSplitTabsProps>(
	({ value, onChange, count }) => {
		const active = TRIAGED_SPLITS.find((tab) => tab.value === value);

		return (
			<div className="flex flex-col gap-2 rounded-md border border-dashed bg-muted/30 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
				<Tabs
					value={value}
					onValueChange={(next) => {
						const match = TRIAGED_SPLITS.find((tab) => tab.value === next);
						if (match) onChange(match.value);
					}}
					className="w-full sm:w-auto"
				>
					<TabsList className="grid h-8 w-full grid-cols-2 bg-background p-1 sm:w-auto">
						{TRIAGED_SPLITS.map((tab) => (
							<TabsTrigger
								key={tab.value}
								value={tab.value}
								className="h-6 px-4 text-xs font-medium text-muted-foreground transition-colors data-[state=active]:bg-muted data-[state=active]:text-uganda-red data-[state=active]:shadow-sm"
							>
								{tab.label}
							</TabsTrigger>
						))}
					</TabsList>
				</Tabs>
				{/* Same reasoning as the register tabs above: the hint is rendered
				    rather than hidden behind a hover, because which half you are
				    on decides whether the rows are work or a record. */}
				{active && (
					<p className="min-w-0 text-[11px] text-muted-foreground sm:text-right">
						{typeof count === "number" && (
							<span className="font-semibold text-foreground">
								{count.toLocaleString()}{" "}
							</span>
						)}
						{active.hint}
					</p>
				)}
			</div>
		);
	}
);

TriagedSplitTabs.displayName = "TriagedSplitTabs";
