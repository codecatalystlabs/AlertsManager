import React, { memo } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	REGISTER_VIEWS,
	isRegisterView,
	type RegisterView,
} from "@/lib/register-view";

interface CallLogsRegisterTabsProps {
	value: RegisterView;
	onChange: (value: RegisterView) => void;
}

/**
 * The register's four views, in pipeline order: All, Untriaged, Triaged,
 * Verified.
 *
 * Each tab holds rows whose next action is the same one, which is what makes
 * the list workable — Triage every row on the Untriaged tab, Verify every row
 * on the Triaged tab. The step after that (the feedback queue) is a sidebar
 * destination, "Risk Assessed", not a tab. See lib/register-view.ts for what
 * each selects.
 */
export const CallLogsRegisterTabs = memo<CallLogsRegisterTabsProps>(
	({ value, onChange }) => {
		const selectedValue = isRegisterView(value) ? value : REGISTER_VIEWS[0].value;
		const active = REGISTER_VIEWS.find((tab) => tab.value === selectedValue);

		return (
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				{/* The hint is rendered, not hovered: which slice of the register
				    you are looking at decides what the rows mean, and a tooltip
				    nobody opens is not an explanation. */}
				<div className="min-w-0">
					<span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
						Show signals
					</span>
					{active && (
						<p className="text-[11px] text-muted-foreground">{active.hint}</p>
					)}
				</div>
				<Tabs
					value={selectedValue}
					onValueChange={(nextValue) => {
						if (isRegisterView(nextValue)) {
							onChange(nextValue);
						}
					}}
					className="w-full sm:w-auto"
				>
					<TabsList className="grid h-9 w-full grid-cols-4 bg-muted p-1 sm:w-auto">
						{REGISTER_VIEWS.map((tab) => (
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

CallLogsRegisterTabs.displayName = "CallLogsRegisterTabs";
