import React, { memo } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type VerificationTab = "all" | "pending" | "verified";

interface CallLogsVerificationTabsProps {
	value: string;
	onChange: (value: VerificationTab) => void;
}

const VERIFICATION_TABS: Array<{ value: VerificationTab; label: string }> = [
	{ value: "all", label: "All" },
	{ value: "pending", label: "Pending" },
	{ value: "verified", label: "Verified" },
];

function isVerificationTab(value: string): value is VerificationTab {
	return value === "all" || value === "pending" || value === "verified";
}

export const CallLogsVerificationTabs = memo<CallLogsVerificationTabsProps>(
	({ value, onChange }) => {
		const selectedValue = isVerificationTab(value) ? value : "all";

		return (
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
					Show alerts
				</span>
				<Tabs
					value={selectedValue}
					onValueChange={(nextValue) => {
						if (isVerificationTab(nextValue)) {
							onChange(nextValue);
						}
					}}
					className="w-full sm:w-auto"
				>
					<TabsList className="grid h-9 w-full grid-cols-3 bg-muted p-1 sm:w-auto">
						{VERIFICATION_TABS.map((tab) => (
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
		);
	}
);

CallLogsVerificationTabs.displayName = "CallLogsVerificationTabs";
