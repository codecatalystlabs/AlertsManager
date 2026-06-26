"use client";

import { memo, useEffect, useState } from "react";
import {
	CheckCircle2,
	CloudDownload,
	Database,
	Link2,
	Loader2,
	X,
	XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
	deriveSyncView,
	type RawSyncProgress,
	type SyncStatus,
	type SyncStepState,
} from "@/lib/sync-progress";

interface SyncProgressPanelProps {
	/** Friendly remote-source name, e.g. "NDW" or "EIDSR". */
	source: string;
	/** Whether a sync is currently in flight (hook's `isSyncing`). */
	isSyncing: boolean;
	/** Latest raw progress poll, or null before the first poll. */
	progress?: RawSyncProgress | null;
	/** Human summary shown when a sync finishes successfully. */
	summaryMessage?: string | null;
	/** Optional side effect when the user dismisses a finished panel. */
	onDismiss?: () => void;
	className?: string;
}

const STEP_ICONS = {
	connect: Link2,
	download: CloudDownload,
	import: Database,
	finish: CheckCircle2,
} as const;

/** Maps the overall status to the tinted card surface + accent colour. */
function surfaceFor(status: SyncStatus): string {
	switch (status) {
		case "success":
			return "surface-success";
		case "error":
			return "surface-danger";
		default:
			return "surface-info";
	}
}

function StatusPill({ status }: { status: SyncStatus }) {
	const map: Record<string, { label: string; cls: string }> = {
		connecting: {
			label: "Connecting",
			cls: "bg-primary/10 text-primary",
		},
		running: { label: "In progress", cls: "bg-primary/10 text-primary" },
		success: { label: "Success", cls: "bg-success/15 text-success" },
		error: { label: "Failed", cls: "bg-destructive/15 text-destructive" },
		idle: { label: "Idle", cls: "bg-muted text-muted-foreground" },
	};
	const { label, cls } = map[status] ?? map.idle;
	return (
		<span
			className={cn(
				"inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
				cls
			)}
		>
			{label}
		</span>
	);
}

/** The leading icon for a single step, animated per its state. */
function StepNode({ step }: { step: SyncStepState }) {
	if (step.state === "done") {
		return <CheckCircle2 className="h-5 w-5 text-success" />;
	}
	if (step.state === "error") {
		return <XCircle className="h-5 w-5 text-destructive" />;
	}
	if (step.state === "active") {
		const Icon = STEP_ICONS[step.key];
		return (
			<span className="relative flex h-5 w-5 items-center justify-center">
				<Loader2 className="absolute h-5 w-5 animate-spin text-primary/40" />
				<Icon className="h-3 w-3 text-primary" />
			</span>
		);
	}
	// pending
	return (
		<span className="flex h-5 w-5 items-center justify-center">
			<span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
		</span>
	);
}

/** A small coloured count chip used in the live tally row. */
function StatChip({
	label,
	value,
	tone,
}: {
	label: string;
	value: number;
	tone: "neutral" | "success" | "primary" | "muted" | "warning";
}) {
	const tones: Record<string, string> = {
		neutral: "bg-secondary text-secondary-foreground",
		success: "bg-success/10 text-success",
		primary: "bg-primary/10 text-primary",
		muted: "bg-muted text-muted-foreground",
		warning: "bg-warning/15 text-warning",
	};
	return (
		<div
			className={cn(
				"flex items-baseline gap-1.5 rounded-md px-2.5 py-1",
				tones[tone]
			)}
		>
			<span className="mono text-sm font-semibold tabular-nums">
				{value.toLocaleString()}
			</span>
			<span className="text-[11px] uppercase tracking-wide opacity-80">
				{label}
			</span>
		</div>
	);
}

/** Determinate or indeterminate progress track, coloured by status. */
function ProgressTrack({
	pct,
	status,
}: {
	pct: number | null;
	status: SyncStatus;
}) {
	const barColor =
		status === "success"
			? "bg-success"
			: status === "error"
				? "bg-destructive"
				: "bg-primary";

	if (pct === null) {
		// Unknown total → animated indeterminate sweep.
		return (
			<div className="sync-bar-track h-2 w-full overflow-hidden rounded-full bg-muted">
				<div
					className={cn("sync-bar-indeterminate rounded-full", barColor)}
				/>
			</div>
		);
	}
	return (
		<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
			<div
				className={cn("h-full rounded-full transition-all duration-500", barColor)}
				style={{ width: `${pct}%` }}
			/>
		</div>
	);
}

export const SyncProgressPanel = memo<SyncProgressPanelProps>(
	({ source, isSyncing, progress, summaryMessage, onDismiss, className }) => {
		const view = deriveSyncView(progress, isSyncing, source);
		const running = view.status === "connecting" || view.status === "running";

		// Auto-reveal on each new run; allow dismissing a finished panel.
		const [dismissed, setDismissed] = useState(false);
		useEffect(() => {
			if (running) setDismissed(false);
		}, [running]);

		if (dismissed) return null;
		if (view.status === "idle" && !summaryMessage) return null;

		// Rare fallback: a sync couldn't start (no progress object), so we only
		// have a one-line message. Show a compact, non-animated notice.
		if (view.status === "idle") {
			return (
				<div
					className={cn(
						"flex items-start gap-3 rounded-lg border p-3 text-sm shadow-sm",
						surfaceFor(view.status),
						className
					)}
					role="status"
				>
					<CloudDownload className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
					<p className="flex-1 text-foreground">{summaryMessage}</p>
					<button
						type="button"
						onClick={() => {
							setDismissed(true);
							onDismiss?.();
						}}
						className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
						aria-label="Dismiss"
					>
						<X className="h-4 w-4" />
					</button>
				</div>
			);
		}

		const HeaderIcon =
			view.status === "success"
				? CheckCircle2
				: view.status === "error"
					? XCircle
					: CloudDownload;
		const headerTint =
			view.status === "success"
				? "text-success"
				: view.status === "error"
					? "text-destructive"
					: "text-primary";

		const title =
			view.status === "success"
				? "Sync complete"
				: view.status === "error"
					? "Sync failed"
					: view.status === "connecting"
						? `Connecting to ${source}…`
						: `Syncing from ${source}`;

		const subtitle =
			view.status === "success"
				? summaryMessage || view.message || "Records are up to date."
				: view.status === "error"
					? view.error || view.message || "The sync did not finish."
					: `${view.incremental ? "Incremental update" : "Full re-scan"} · pulling the latest records`;

		return (
			<div
				className={cn(
					"rounded-lg border p-4 shadow-sm transition-colors",
					surfaceFor(view.status),
					className
				)}
				role="status"
				aria-live="polite"
			>
				{/* Header */}
				<div className="flex items-start gap-3">
					<HeaderIcon
						className={cn(
							"mt-0.5 h-5 w-5 shrink-0",
							headerTint,
							running && "animate-pulse"
						)}
					/>
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-2">
							<p className="truncate text-sm font-semibold text-foreground">
								{title}
							</p>
							<StatusPill status={view.status} />
						</div>
						<p
							className={cn(
								"mt-0.5 text-xs",
								view.status === "error"
									? "text-destructive"
									: "text-muted-foreground"
							)}
						>
							{subtitle}
						</p>
					</div>
					{!running && (
						<button
							type="button"
							onClick={() => {
								setDismissed(true);
								onDismiss?.();
							}}
							className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
							aria-label="Dismiss"
						>
							<X className="h-4 w-4" />
						</button>
					)}
				</div>

				{/* Progress bar */}
				<div className="mt-3">
					<ProgressTrack pct={view.pct} status={view.status} />
				</div>

				{/* Step timeline */}
				<ol className="mt-3 space-y-2">
					{view.steps.map((step, i) => (
						<li key={step.key} className="flex items-start gap-3">
							<div className="flex flex-col items-center">
								<StepNode step={step} />
								{i < view.steps.length - 1 && (
									<span
										className={cn(
											"mt-0.5 h-4 w-px",
											step.state === "done"
												? "bg-success/40"
												: "bg-border"
										)}
									/>
								)}
							</div>
							<div className="min-w-0 flex-1 pb-0.5">
								<p
									className={cn(
										"text-sm font-medium leading-5",
										step.state === "pending"
											? "text-muted-foreground"
											: step.state === "error"
												? "text-destructive"
												: "text-foreground"
									)}
								>
									{step.label}
								</p>
								<p className="truncate text-xs text-muted-foreground">
									{step.detail}
								</p>
							</div>
						</li>
					))}
				</ol>

				{/* Live tally */}
				{(view.scanned > 0 ||
					view.imported > 0 ||
					view.updated > 0 ||
					view.skipped > 0 ||
					view.excluded > 0) && (
					<div className="mt-3 flex flex-wrap gap-1.5">
						{view.scanned > 0 && (
							<StatChip label="scanned" value={view.scanned} tone="neutral" />
						)}
						<StatChip label="new" value={view.imported} tone="success" />
						{view.updated > 0 && (
							<StatChip label="updated" value={view.updated} tone="primary" />
						)}
						{view.skipped > 0 && (
							<StatChip label="unchanged" value={view.skipped} tone="muted" />
						)}
						{view.excluded > 0 && (
							<StatChip label="excluded" value={view.excluded} tone="warning" />
						)}
					</div>
				)}
			</div>
		);
	}
);
SyncProgressPanel.displayName = "SyncProgressPanel";
