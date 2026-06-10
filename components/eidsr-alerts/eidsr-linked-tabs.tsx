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
		<div className="flex flex-col gap-2 rounded-md border border-uganda-red/20 bg-uganda-red/5 p-2 shadow-sm sm:flex-row sm:items-center sm:justify-between">
			<span className="text-sm font-semibold text-foreground">
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
				<TabsList className="grid h-11 w-full grid-cols-3 border border-border bg-background p-1 sm:w-auto">
					{LINKED_TABS.map((tab) => (
						<TabsTrigger
							key={tab.value}
							value={tab.value}
							className="h-9 px-4 text-sm font-semibold data-[state=active]:bg-uganda-red data-[state=active]:text-white data-[state=active]:shadow"
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
