import { memo } from "react";

interface NdwAlertsStatsProps {
	total: number;
	filtered: number;
	/** Optional data-source label; when omitted the "Local mirror · …" segment is hidden. */
	label?: string;
	live?: boolean;
	note?: string;
}

export const NdwAlertsStats = memo<NdwAlertsStatsProps>(
	({ total, filtered, label, live, note }) => (
		<div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border bg-card px-3 py-1.5 text-xs">
			<span>
				<span className="text-muted-foreground">Stored locally </span>
				<span className="font-semibold">{total.toLocaleString()}</span>
			</span>
			<span className="text-muted-foreground/40">·</span>
			<span>
				<span className="text-muted-foreground">
					{live ? "NDW live results " : "In current view "}
				</span>
				<span className="font-semibold">{filtered.toLocaleString()}</span>
			</span>
			{label ? (
				<>
					<span className="text-muted-foreground/40">·</span>
					<span className="text-muted-foreground">
						{live ? "Live NDW" : "Local mirror"} · {label}
					</span>
				</>
			) : null}
			{note ? (
				<span className="hidden lg:inline text-[10px] text-muted-foreground/80">
					{note}
				</span>
			) : null}
		</div>
	)
);
NdwAlertsStats.displayName = "NdwAlertsStats";
