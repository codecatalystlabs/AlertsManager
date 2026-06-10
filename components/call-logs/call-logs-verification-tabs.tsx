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
			<div className="flex flex-col gap-2 rounded-md border border-uganda-red/20 bg-uganda-red/5 p-2 shadow-sm sm:flex-row sm:items-center sm:justify-between">
				<span className="text-sm font-semibold text-foreground">
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
					<TabsList className="grid h-11 w-full grid-cols-3 border border-border bg-background p-1 sm:w-auto">
						{VERIFICATION_TABS.map((tab) => (
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
		);
	}
);

CallLogsVerificationTabs.displayName = "CallLogsVerificationTabs";
