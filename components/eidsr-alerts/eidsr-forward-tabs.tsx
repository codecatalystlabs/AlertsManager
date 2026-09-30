import React, { memo } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Has this 6767 signal been logged into Raw Information yet?
 *
 * Since 2026-09-29 a sync logs every new signal into Raw Information by itself,
 * so this page is no longer a to-do list of moves — it is the feed, newest sync
 * first, and the default tab is All so a sync's arrivals are what you see. "Not
 * logged" is what is left for a person: signals older than the auto-log window
 * (and history from before it existed), moved in by hand if they still matter.
 *
 * It replaced a second strip that asked linked/unlinked. That was a real second
 * question only while "verify into alerts" was a separate route into the
 * register; now linked and logged are the same answer, and two strips could
 * only disagree.
 */
export type EidsrForwardTab = "not_moved" | "moved" | "all";

/** The feed, newest sync first — where a sync's arrivals land. */
export const DEFAULT_EIDSR_FORWARD_TAB: EidsrForwardTab = "all";

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
		value: "all",
		label: "All",
		hint: "Every 6767 signal, newest sync first. New signals are logged into Raw Information as they arrive.",
	},
	{
		value: "moved",
		label: "In Raw Information",
		hint: "Logged into Raw Information — automatically on sync, or moved in by hand — with the alert id and district each was given.",
	},
	{
		value: "not_moved",
		label: "Not logged",
		hint: "Not in Raw Information: older signals the sync does not log automatically. Move one in from its row menu if it still matters.",
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
				Logged into Raw Information?
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
