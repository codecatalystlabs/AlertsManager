/**
 * Shared, source-agnostic view model for the "pull data from a remote source"
 * syncs (NDW eCHIS, NDW POE, EIDSR 6767). The backend emits the same lifecycle
 * for all of them — phase `starting → fetching → done | error` plus running
 * counters — so a single normalizer feeds one animated progress panel.
 */

/**
 * Lifecycle phase as reported by the Go backend sync runners. "logging" is the
 * 6767 sync's extra step: offering the events it imported to Raw Information.
 */
export type SyncPhase =
	| "idle"
	| "starting"
	| "fetching"
	| "logging"
	| "done"
	| "error";

/**
 * What a sync did with the events it imported, once each was offered to Raw
 * Information (mirrors Go services.AutoLogReport). Every imported event lands
 * in exactly one bucket: logged, alreadyInRegister, tooOld, notASignal, failed.
 */
export interface AutoLogReport {
	/** False when auto-logging is switched off on the server. */
	enabled: boolean;
	/** Events reported longer ago than this are not logged. */
	maxAgeDays: number;
	considered: number;
	logged: number;
	/** Logged, but the org unit named no district — set one before triage. */
	noDistrict: number;
	alreadyInRegister: number;
	tooOld: number;
	notASignal: number;
	failed: number;
	/** The ALT ids this run created, first and last. */
	firstAlertId?: number;
	lastAlertId?: number;
}

/**
 * Loose shape covering both NdwSyncProgress and EidsrSyncProgress. Every field
 * is optional so the normalizer tolerates partial/early polls.
 */
export interface RawSyncProgress {
	running?: boolean;
	phase?: string;
	source?: string;
	incremental?: boolean;
	page?: number;
	pageCount?: number;
	remoteTotal?: number;
	scanned?: number;
	imported?: number;
	updated?: number;
	skipped?: number;
	excluded?: number;
	/** Present only on a sync that logs into Raw Information (6767). */
	autoLog?: AutoLogReport | null;
	error?: string;
	message?: string;
}

/** High-level status that drives the panel's colour + animation. */
export type SyncStatus = "idle" | "connecting" | "running" | "success" | "error";

/** A single step of the visualised process. */
export interface SyncStepState {
	key: "connect" | "download" | "import" | "log" | "finish";
	label: string;
	detail: string;
	/** pending → not reached, active → currently running, done/error → resolved. */
	state: "pending" | "active" | "done" | "error";
}

export interface SyncView {
	status: SyncStatus;
	phase: SyncPhase;
	/** 0–100 when known, or null for an indeterminate (animated) bar. */
	pct: number | null;
	incremental: boolean;
	page: number;
	pageCount: number;
	remoteTotal: number;
	scanned: number;
	imported: number;
	updated: number;
	skipped: number;
	excluded: number;
	/** The Raw Information step's outcome, when the sync has one. */
	autoLog: AutoLogReport | null;
	error?: string;
	message?: string;
	steps: SyncStepState[];
}

function num(v: number | undefined): number {
	return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/**
 * Collapse a raw progress poll (plus the hook's `isSyncing` flag) into the
 * view model the panel renders. Pure — safe to call on every render.
 */
export function deriveSyncView(
	progress: RawSyncProgress | null | undefined,
	isSyncing: boolean,
	source: string
): SyncView {
	const rawPhase = (progress?.phase as SyncPhase | undefined) ?? undefined;
	const phase: SyncPhase =
		rawPhase ?? (isSyncing ? "starting" : "idle");

	const page = num(progress?.page);
	const pageCount = num(progress?.pageCount);
	const remoteTotal = num(progress?.remoteTotal);
	const scanned = num(progress?.scanned);
	const imported = num(progress?.imported);
	const updated = num(progress?.updated);
	const skipped = num(progress?.skipped);
	const excluded = num(progress?.excluded);
	const saved = imported + updated + skipped;

	// A sync that logs into Raw Information has a fourth step. Shown from the
	// start (not only once it is reached) so the panel does not grow a row
	// halfway through, and only when the server reported the step is on.
	const autoLog = progress?.autoLog ?? null;
	const logsIntoRegister = autoLog != null;

	let status: SyncStatus;
	if (phase === "error") status = "error";
	else if (phase === "done") status = "success";
	else if (phase === "fetching" || phase === "logging") status = "running";
	else if (phase === "starting") status = "connecting";
	else if (isSyncing) status = "connecting";
	else status = "idle";

	// Progress fraction — prefer scanned/total, fall back to page/pageCount.
	let pct: number | null;
	if (status === "success") {
		pct = 100;
	} else if (remoteTotal > 0) {
		pct = Math.min(100, Math.round((scanned / remoteTotal) * 100));
	} else if (pageCount > 0) {
		pct = Math.min(100, Math.round((page / pageCount) * 100));
	} else {
		pct = null;
	}

	// Which step is the focus right now (0 connect, 1 download, 2 import).
	// -1 keeps every step pending (idle: nothing is actually running).
	let current: number;
	if (status === "connecting") current = 0;
	else if (phase === "logging") current = 3;
	else if (status === "running") current = saved > 0 ? 2 : 1;
	else if (status === "success") current = logsIntoRegister ? 4 : 3;
	else if (status === "error")
		current = page > 0 || scanned > 0 ? (saved > 0 ? 2 : 1) : 0;
	else current = -1;

	const pagesLabel =
		pageCount > 0
			? `page ${page.toLocaleString()} / ${pageCount.toLocaleString()}`
			: page > 0
				? `page ${page.toLocaleString()}`
				: "";
	const scanLabel = remoteTotal
		? `${scanned.toLocaleString()} of ${remoteTotal.toLocaleString()} scanned`
		: scanned
			? `${scanned.toLocaleString()} scanned`
			: "";
	const downloadDetail =
		[pagesLabel, scanLabel].filter(Boolean).join(" · ") || "Streaming records…";
	const savedParts = [
		imported ? `${imported.toLocaleString()} new` : "",
		updated ? `${updated.toLocaleString()} updated` : "",
		skipped ? `${skipped.toLocaleString()} unchanged` : "",
	].filter(Boolean);
	const importDetail = savedParts.length ? savedParts.join(" · ") : "Writing to database…";

	const stepState = (index: number): SyncStepState["state"] => {
		if (status === "success") return "done";
		if (status === "error") {
			if (index < current) return "done";
			if (index === current) return "error";
			return "pending";
		}
		if (index < current) return "done";
		if (index === current) return "active";
		return "pending";
	};

	const logDetail = describeAutoLog(autoLog);

	const steps: SyncStepState[] = [
		{
			key: "connect",
			label: `Connect to ${source}`,
			detail:
				stepState(0) === "done"
					? "Connected"
					: progress?.incremental ?? true
						? "Authenticating · incremental"
						: "Authenticating · full re-scan",
			state: stepState(0),
		},
		{
			key: "download",
			label: "Download records",
			detail: stepState(1) === "pending" ? "Waiting…" : downloadDetail,
			state: stepState(1),
		},
		{
			key: "import",
			label: "Import to database",
			detail: stepState(2) === "pending" ? "Waiting…" : importDetail,
			state: stepState(2),
		},
	];
	if (logsIntoRegister) {
		steps.push({
			key: "log",
			label: "Log into Raw Information",
			detail: stepState(3) === "pending" ? "Waiting…" : logDetail,
			state: stepState(3),
		});
	}

	return {
		status,
		phase,
		pct,
		incremental: progress?.incremental ?? true,
		page,
		pageCount,
		remoteTotal,
		scanned,
		imported,
		updated,
		skipped,
		excluded,
		autoLog,
		error: progress?.error,
		message: progress?.message,
		steps,
	};
}

/**
 * One line for the Raw Information step: how many were logged, and why any
 * were not. The reasons matter more than the count — "3 older than 30 days"
 * tells the user where those three still are.
 */
export function describeAutoLog(report: AutoLogReport | null): string {
	if (!report) return "";
	if (!report.enabled) return "Automatic logging is off — move signals in by hand";
	if (report.considered === 0) return "Nothing new to log";
	const parts: string[] = [];
	parts.push(
		report.logged === 0
			? "None logged"
			: `${report.logged.toLocaleString()} logged as untriaged signals`
	);
	if (report.noDistrict > 0) {
		parts.push(`${report.noDistrict.toLocaleString()} need a district`);
	}
	if (report.alreadyInRegister > 0) {
		parts.push(`${report.alreadyInRegister.toLocaleString()} already moved in`);
	}
	if (report.tooOld > 0) {
		parts.push(
			`${report.tooOld.toLocaleString()} older than ${report.maxAgeDays} days left to move by hand`
		);
	}
	if (report.failed > 0) {
		parts.push(`${report.failed.toLocaleString()} failed — move by hand`);
	}
	return parts.join(" · ");
}
