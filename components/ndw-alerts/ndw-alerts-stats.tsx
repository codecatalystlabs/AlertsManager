import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { LAYOUT } from "@/constants/layout";

interface NdwAlertsStatsProps {
	total: number;
	filtered: number;
	label?: string;
	live?: boolean;
	note?: string;
}

export const NdwAlertsStats = memo<NdwAlertsStatsProps>(
	({ total, filtered, label = "alerts", live, note }) => (
		<div className="grid grid-cols-2 md:grid-cols-3 gap-2">
			<Card className={LAYOUT.card}>
				<CardContent className="p-3">
					<p className="text-[11px] text-muted-foreground">Stored locally</p>
					<p className="text-xl font-semibold">{total.toLocaleString()}</p>
				</CardContent>
			</Card>
			<Card className={LAYOUT.card}>
				<CardContent className="p-3">
					<p className="text-[11px] text-muted-foreground">
						{live ? "NDW live results" : "In current view"}
					</p>
					<p className="text-xl font-semibold">{filtered.toLocaleString()}</p>
				</CardContent>
			</Card>
			<Card className={`${LAYOUT.card} hidden md:block`}>
				<CardContent className="p-3">
					<p className="text-[11px] text-muted-foreground">Data source</p>
					<p className="text-sm font-medium">
						{live ? "Live NDW" : "Local mirror"} · {label}
					</p>
					{note ? (
						<p className="text-[10px] text-muted-foreground mt-1 leading-snug">{note}</p>
					) : null}
				</CardContent>
			</Card>
		</div>
	)
);
NdwAlertsStats.displayName = "NdwAlertsStats";
