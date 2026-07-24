"use client";

import { useMemo } from "react";
import { TrendingUp, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { GeoFeatureCollection } from "@/lib/fetch-geo";

interface TopDistrictsCardProps {
	/** District-level FeatureCollection (already scoped by the map's filters). */
	districts: GeoFeatureCollection | undefined;
	loading?: boolean;
	limit?: number;
	className?: string;
	/** When set, renders a close control that hides the panel. */
	onClose?: () => void;
}

/**
 * Ranked list of the districts with the most signals under the map's active
 * filters — the same counts the choropleth shades, so the leaderboard always
 * reconciles with the map beside it.
 */
export function TopDistrictsCard({
	districts,
	loading,
	limit = 5,
	className,
	onClose,
}: TopDistrictsCardProps) {
	const { top, total } = useMemo(() => {
		const feats = districts?.features ?? [];
		const ranked = feats
			.filter((f) => f.properties.count > 0)
			.sort(
				(a, b) =>
					b.properties.count - a.properties.count ||
					a.properties.name.localeCompare(b.properties.name)
			)
			.slice(0, limit)
			.map((f) => ({ name: f.properties.name, count: f.properties.count }));
		const sum = feats.reduce((s, f) => s + f.properties.count, 0);
		return { top: ranked, total: sum };
	}, [districts, limit]);

	const max = top[0]?.count ?? 0;

	return (
		<Card className={cn("flex flex-col", className)}>
			<CardHeader className="pb-2">
				<CardTitle className="flex items-center gap-2 text-sm">
					<TrendingUp className="h-4 w-4 text-uganda-red" />
					<span className="flex-1">Top {limit} districts</span>
					{onClose && (
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="-my-1 h-6 w-6 text-muted-foreground"
							onClick={onClose}
							title="Hide the top districts panel"
							aria-label="Hide the top districts panel"
						>
							<X className="h-3.5 w-3.5" />
						</Button>
					)}
				</CardTitle>
			</CardHeader>
			<CardContent className="flex-1 space-y-3 pt-0">
				{loading && !districts ? (
					<div className="space-y-2.5">
						{Array.from({ length: limit }, (_, i) => (
							<div key={i} className="h-8 animate-pulse rounded bg-muted/60" />
						))}
					</div>
				) : top.length === 0 ? (
					<p className="py-6 text-center text-xs text-muted-foreground">
						No signals match the current filters.
					</p>
				) : (
					<>
						<ol className="space-y-2.5">
							{top.map((d, i) => (
								<li key={d.name}>
									<div className="mb-0.5 flex items-baseline justify-between gap-2 text-xs">
										<span className="truncate">
											<span className="mr-1.5 inline-block w-4 text-right font-semibold tabular-nums text-muted-foreground">
												{i + 1}.
											</span>
											{d.name}
										</span>
										<span className="shrink-0 font-semibold tabular-nums">
											{d.count.toLocaleString()}
											{total > 0 && (
												<span className="ml-1 font-normal text-muted-foreground">
													({Math.round((d.count / total) * 100)}%)
												</span>
											)}
										</span>
									</div>
									<div className="h-1.5 overflow-hidden rounded-full bg-muted">
										<div
											className="h-full rounded-full bg-uganda-red"
											style={{
												width: `${max > 0 ? (d.count / max) * 100 : 0}%`,
											}}
										/>
									</div>
								</li>
							))}
						</ol>
						<p className="text-[11px] text-muted-foreground">
							Share of the {total.toLocaleString()} signals plotted under the
							current filters.
						</p>
					</>
				)}
			</CardContent>
		</Card>
	);
}
