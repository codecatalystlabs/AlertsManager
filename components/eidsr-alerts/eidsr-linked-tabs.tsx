import React, { memo } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type EidsrLinkedTab = "all" | "linked" | "unlinked";

interface EidsrLinkedTabsProps {
	value: EidsrLinkedTab;
	onChange: (value: EidsrLinkedTab) => void;
}

const LINKED_TABS: Array<{ value: EidsrLinkedTab; label: string }> = [
	{ value: "all", label: "All" },
	{ value: "unlinked", label: "Not linked" },
	{ value: "linked", label: "Linked" },
];

export const EidsrLinkedTabs = memo<EidsrLinkedTabsProps>(
	({ value, onChange }) => (
		<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			<span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
				Show 6767 events
			</span>
			<Tabs
				value={value}
				onValueChange={(nextValue) => {
					if (
						nextValue === "all" ||
						nextValue === "linked" ||
						nextValue === "unlinked"
					) {
						onChange(nextValue);
					}
				}}
				className="w-full sm:w-auto"
			>
				<TabsList className="grid h-9 w-full grid-cols-3 bg-muted p-1 sm:w-auto">
					{LINKED_TABS.map((tab) => (
						<TabsTrigger
							key={tab.value}
							value={tab.value}
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

EidsrLinkedTabs.displayName = "EidsrLinkedTabs";
