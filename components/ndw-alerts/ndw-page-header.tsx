"use client";

import { memo, useEffect, useState } from "react";
import { CloudDownload, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LAYOUT } from "@/constants/layout";
import { feedActions, type Feed } from "@/lib/access";
import { useCurrentUser } from "@/hooks/use-current-user";
import { formatDateTime, formatTimeAgo } from "@/lib/format-date";
import type { NdwSyncProgress, NdwSyncSummary } from "@/lib/fetch-ndw-alerts";
import { cn } from "@/lib/utils";

const HOUR = 3_600_000;

/** Re-render every minute so "12 min ago" does not freeze. */
function useMinuteClock(): number {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const t = setInterval(() => setNow(Date.now()), 60_000);
		return () => clearInterval(t);
	}, []);
	return now;
}

type Freshness = "syncing" | "failed" | "fresh" | "stale" | "old";

/**
 * How much to trust the mirror: a feed not pulled for two days is shown in the
 * brand red, the way the page asks for attention, because every count on the
 * screen is that old too.
 */
function freshnessOf(
	sync: NdwSyncSummary | null | undefined,
	isSyncing: boolean,
	now: number
): Freshness {
	if (isSyncing) return "syncing";
	if (sync?.lastError) return "failed";
	const ended = sync?.lastSyncEndedAt ? Date.parse(sync.lastSyncEndedAt) : NaN;
	if (Number.isNaN(ended)) return "old";
	const age = now - ended;
	if (age < 6 * HOUR) return "fresh";
	if (age < 48 * HOUR) return "stale";
	return "old";
}

const PILL_TONE: Record<Freshness, string> = {
	syncing: "border-primary/30 bg-primary/5",
	failed: "border-destructive/40 bg-destructive/5",
	fresh: "border-border bg-card",
	stale: "border-amber-300 bg-amber-50",
	old: "border-primary/40 bg-primary/5",
};

const DOT_TONE: Record<Freshness, string> = {
	syncing: "bg-primary animate-pulse",
	failed: "bg-destructive",
	fresh: "bg-emerald-500",
	stale: "bg-amber-500",
	old: "bg-primary",
};

function progressLine(p: NdwSyncProgress | null | undefined): string {
	if (!p) return "Connecting…";
	if (p.pageCount > 0) return `Page ${p.page} of ${p.pageCount} · ${p.imported} new so far`;
	if (p.scanned > 0) return `${p.scanned.toLocaleString()} scanned · ${p.imported} new so far`;
	return "Connecting…";
}

interface NdwSyncPillProps {
	feed: Feed;
	sync: NdwSyncSummary | null | undefined;
	isSyncing: boolean;
	progress?: NdwSyncProgress | null;
	onSync: () => void;
}

/**
 * "When was this feed last pulled, and did it bring anything" in one glance,
 * with the Sync button beside it for roles that may sync.
 */
export const NdwSyncPill = memo<NdwSyncPillProps>(
	({ feed, sync, isSyncing, progress, onSync }) => {
		const canSync = feedActions(useCurrentUser(), feed).sync;
		const now = useMinuteClock();
		const state = freshnessOf(sync, isSyncing, now);
		const ended = sync?.lastSyncEndedAt ?? null;
		const added = sync?.addedInLastSync ?? 0;

		let headline: string;
		let detail: string;
		switch (state) {
			case "syncing":
				headline = "NDW · syncing…";
				detail = progressLine(progress);
				break;
			case "failed":
				headline = "NDW · last sync failed";
				detail = ended ? `Last good pull ${formatTimeAgo(ended, "", now)}` : "Try again";
				break;
			default:
				if (!ended) {
					headline = "NDW · never synced";
					detail = "Sync to pull records";
					break;
				}
				headline =
					added > 0
						? `NDW · ${added.toLocaleString()} new in last pull`
						: "NDW · no new records in last pull";
				detail = `Last synced ${formatTimeAgo(ended, "", now)}`;
		}

		return (
			<div
				className={cn(
					"flex min-w-0 items-center gap-3 rounded-md border py-1 pl-3 pr-1",
					PILL_TONE[state]
				)}
				title={
					sync?.lastError
						? sync.lastError
						: ended
							? `Last sync finished ${formatDateTime(ended)}`
							: undefined
				}
				aria-live="polite"
			>
				<span className={cn("h-2 w-2 shrink-0 rounded-full", DOT_TONE[state])} />
				<div className="min-w-0 leading-tight">
					<p
						className={cn(
							"truncate text-xs font-semibold",
							state === "old" || state === "failed"
								? "text-primary"
								: "text-foreground"
						)}
					>
						{headline}
					</p>
					<p className="truncate text-[11px] text-muted-foreground">{detail}</p>
				</div>
				{canSync ? (
					<Button
						size="sm"
						className="h-7 shrink-0 gap-1.5 px-2.5 text-xs"
						onClick={onSync}
						disabled={isSyncing}
					>
						{isSyncing ? (
							<Loader2 className="h-3.5 w-3.5 animate-spin" />
						) : (
							<CloudDownload className="h-3.5 w-3.5" />
						)}
						{isSyncing ? "Syncing" : state === "failed" ? "Retry sync" : "Sync now"}
					</Button>
				) : (
					<span className="w-2" />
				)}
			</div>
		);
	}
);
NdwSyncPill.displayName = "NdwSyncPill";

interface NdwPageHeaderProps extends NdwSyncPillProps {
	title: string;
	description: string;
	onRefresh: () => void;
	isRefreshing?: boolean;
}

/**
 * Title + Refresh + sync pill for an NDW feed screen (eCHIS / POE).
 * Replaces NdwSyncHeader: the sync button now lives in the pill that says how
 * fresh the data is, so the decision to sync is made with that in view.
 */
export const NdwPageHeader = memo<NdwPageHeaderProps>(
	({ title, description, onRefresh, isRefreshing, ...pill }) => (
		<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			<div className="min-w-0">
				<h1 className={LAYOUT.pageTitle}>{title}</h1>
				<p className={LAYOUT.pageSubtitle}>{description}</p>
			</div>
			<div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
				<Button
					onClick={onRefresh}
					variant="outline"
					size="sm"
					className="h-8 gap-1.5"
					disabled={isRefreshing || pill.isSyncing}
				>
					<RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
					{isRefreshing ? "Refreshing…" : "Refresh"}
				</Button>
				<NdwSyncPill {...pill} />
			</div>
		</div>
	)
);
NdwPageHeader.displayName = "NdwPageHeader";
