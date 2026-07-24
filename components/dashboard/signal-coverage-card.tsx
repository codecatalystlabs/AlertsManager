"use client";

import useSWR from "swr";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LAYOUT } from "@/constants/layout";
import { cn } from "@/lib/utils";
import { AuthService } from "@/lib/auth";
import { getClientApiBaseUrl } from "@/lib/api-config";
import { AlertTriangle, Inbox } from "lucide-react";

const API_BASE_URL = getClientApiBaseUrl();

interface FeedCoverage {
	key: string;
	label: string;
	totalRecords: number;
	signalEligible: number;
	inPipeline: number;
	backlog: number;
	coveragePercent: number;
	eligibilityNote: string;
	urgentBacklog: number;
	urgentNote?: string;
}

interface CoverageReport {
	feeds: FeedCoverage[];
	alertsInPipeline: number;
	totalBacklog: number;
}

async function fetchCoverage(): Promise<CoverageReport> {
	const response = await AuthService.makeAuthenticatedRequest(
		`${API_BASE_URL}/dashboard/signal-coverage`,
		{ method: "GET" }
	);
	if (!response.ok) throw new Error("Failed to load signal coverage");
	return response.json();
}

/**
 * Signal coverage — what the rest of this dashboard is NOT counting.
 *
 * Every other metric on the page is computed over the alerts table alone. The
 * 6767, eCHIS and Points-of-Entry feeds land in their own tables and only join
 * the pipeline when somebody links or forwards them, so without this card the
 * dashboard reads as though it covers the country's whole signal load.
 *
 * The eligible/held distinction is shown explicitly because it is the difference
 * between a useful number and an alarming one: ~99k people were screened at
 * points of entry and almost all were well, so the backlog that matters is the
 * few hundred with symptoms or an elevated risk band — not the 99k.
 */
export function SignalCoverageCard() {
	const { data, error, isLoading } = useSWR("dashboard:signal-coverage", fetchCoverage, {
		revalidateOnFocus: false,
	});

	if (error) return null;

	return (
		<Card className={LAYOUT.card}>
			<CardHeader className={cn(LAYOUT.cardHeader, "flex-row items-center justify-between gap-2 space-y-0")}>
				<CardTitle className={cn(LAYOUT.cardTitle, "flex items-center gap-2")}>
					<Inbox className="h-4 w-4 text-muted-foreground" />
					Signal coverage
					<span className="font-normal text-muted-foreground">
						— what the metrics above do not include
					</span>
				</CardTitle>
				{data && data.totalBacklog > 0 && (
					<Badge variant="secondary" className="bg-amber-100 text-[11px] font-semibold text-amber-900">
						{data.totalBacklog.toLocaleString()} signals outside the pipeline
					</Badge>
				)}
			</CardHeader>
			<CardContent className={LAYOUT.cardContent}>
				{isLoading || !data ? (
					<p className="text-xs text-muted-foreground">Loading coverage…</p>
				) : (
					<div className="space-y-2">
						<p className="text-xs text-muted-foreground">
							Every other figure on this page counts only the{" "}
							<strong>{data.alertsInPipeline.toLocaleString()}</strong> signals
							that reached the alert pipeline. These feeds hold signals that
							have not — they carry no triage, no verification clock and no
							outcome until someone forwards them in.
						</p>

						<div className="overflow-x-auto">
							<table className="w-full min-w-[560px] text-xs">
								<thead>
									<tr className="border-b text-left text-[10px] uppercase tracking-wide text-muted-foreground">
										<th className="py-1.5 pr-3 font-semibold">Feed</th>
										<th className="py-1.5 pr-3 text-right font-semibold">Records held</th>
										<th className="py-1.5 pr-3 text-right font-semibold">Signals</th>
										<th className="py-1.5 pr-3 text-right font-semibold">In pipeline</th>
										<th className="py-1.5 text-right font-semibold">Backlog</th>
									</tr>
								</thead>
								<tbody>
									{data.feeds.map((feed) => (
										<tr key={feed.key} className="border-b last:border-0 align-top">
											<td className="py-2 pr-3">
												<div className="font-medium">{feed.label}</div>
												<div className="mt-0.5 max-w-[280px] text-[11px] leading-snug text-muted-foreground">
													{feed.eligibilityNote}
												</div>
												{feed.urgentBacklog > 0 && (
													<div className="mt-1 flex items-start gap-1 text-[11px] font-semibold text-red-700">
														<AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
														<span>
															{feed.urgentBacklog} urgent — {feed.urgentNote}
														</span>
													</div>
												)}
											</td>
											<td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">
												{feed.totalRecords.toLocaleString()}
											</td>
											<td className="py-2 pr-3 text-right tabular-nums font-medium">
												{feed.signalEligible.toLocaleString()}
											</td>
											<td className="py-2 pr-3 text-right tabular-nums">
												{feed.inPipeline.toLocaleString()}
												<span className="ml-1 text-muted-foreground">
													{feed.coveragePercent < 0
														? "(n/a)"
														: `(${feed.coveragePercent}%)`}
												</span>
											</td>
											<td
												className={cn(
													"py-2 text-right tabular-nums font-semibold",
													feed.backlog > 0 ? "text-amber-700" : "text-muted-foreground"
												)}
											>
												{feed.backlog.toLocaleString()}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
