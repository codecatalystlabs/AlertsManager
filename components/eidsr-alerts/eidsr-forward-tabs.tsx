import React, { memo } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Has this 6767 signal been moved into the Signal Register yet?
 *
 * This is the page's primary worklist split, not a filter. The 6767 list is
 * where somebody decides which of ~24,000 mirrored SMS signals should enter the
 * EBS pipeline, and a signal that has already been moved has nothing left to
 * decide — leaving it in the list makes the work look larger than it is and
 * invites a second, duplicate forward. So "Not forwarded" IS the list, and the
 * moved ones get a tab of their own where they can still be traced.
 *
 * It replaced a second strip that asked linked/unlinked. That was a real second
 * question only while "verify into alerts" was a separate route into the
 * register; now that moving is the one way in, linked and moved are the same
 * answer, and two strips could only disagree.
 */
export type EidsrForwardTab = "not_moved" | "moved" | "all";

/** The list opens on the work that has not been done. */
export const DEFAULT_EIDSR_FORWARD_TAB: EidsrForwardTab = "not_moved";

interface EidsrForwardTabsProps {
	value: EidsrForwardTab;
	onChange: (value: EidsrForwardTab) => void;
	/** Rows in the current tab, shown beside it so the queue size is legible. */
	count?: number;
}

const FORWARD_TABS: Array<{
	value: EidsrForwardTab;
	label: string;
	hint: string;
}> = [
	{
		value: "not_moved",
		label: "Not moved",
		hint: "Still to be moved into the Signal Register — this is the work.",
	},
	{
		value: "moved",
		label: "In the register",
		hint: "Already in the Signal Register, with the alert id and district each was given.",
	},
	{
		value: "all",
		label: "All",
		hint: "Every 6767 signal, moved or not.",
	},
];

function isForwardTab(value: string): value is EidsrForwardTab {
	return (
		value === "not_moved" || value === "moved" || value === "all"
	);
}

export const EidsrForwardTabs = memo<EidsrForwardTabsProps>(
	({ value, onChange, count }) => (
		<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			<span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
				Signal register
				{typeof count === "number" && (
					<span className="ml-2 font-normal normal-case tracking-normal">
						{count.toLocaleString()}{" "}
						{count === 1 ? "signal" : "signals"}
					</span>
				)}
			</span>
			<Tabs
				value={value}
				onValueChange={(next) => {
					if (isForwardTab(next)) onChange(next);
				}}
				className="w-full sm:w-auto"
			>
				<TabsList className="grid h-9 w-full grid-cols-3 bg-muted p-1 sm:w-auto">
					{FORWARD_TABS.map((tab) => (
						<TabsTrigger
							key={tab.value}
							value={tab.value}
							title={tab.hint}
							className="h-7 px-5 text-sm font-medium text-muted-foreground transition-colors data-[state=active]:bg-background data-[state=active]:text-uganda-red data-[state=active]:shadow-sm"
						>
							{tab.label}
						</TabsTrigger>
					))}
				</TabsList>
			</Tabs>
		</div>
	)
);

EidsrForwardTabs.displayName = "EidsrForwardTabs";
