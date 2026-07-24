import { deriveAlertOutcome, OUTCOME_NOT_RECORDED, type OutcomeSource } from "@/lib/alert-outcome";

/**
 * Alert SLA colours — how long a signal has been "in the system".
 *
 * The clock STARTS when the signal was logged and STOPS when the alert is
 * verified. A pending alert therefore keeps ageing until someone acts on it (and
 * will eventually go red), while a verified alert freezes at the colour it
 * earned: its colour is a permanent record of how long it took to verify.
 *
 *   green  : <= 1h
 *   orange : 1h – 6h
 *   red    : > 6h   (no upper bound — 13 hours and 3 weeks are both red)
 *
 * Kept in sync with the Go twin (alertsMIS/backend/internal/services/alert_sla.go),
 * which applies the same bands in SQL for the server-side sla filter.
 */
export const SLA_GREEN_MAX_MINUTES = 60;
export const SLA_ORANGE_MAX_MINUTES = 6 * 60;

export type AlertSlaColor = "green" | "orange" | "red";

/** The subset of alert fields the SLA is computed from. */
export interface SlaSource extends OutcomeSource {
	/** Signal day. Its time-of-day is a junk import artifact — ignored. */
	date?: string | null;
	/** Signal time-of-day (the real clock time). */
	time?: string | null;
	/** When the alert was verified: a full timestamp (unlike verificationDate). */
	verificationTime?: string | null;
	updatedAt?: string | null;
	createdAt?: string | null;
}

export interface AlertSla {
	color: AlertSlaColor;
	elapsedMinutes: number;
	/** True while the clock is still running, i.e. the alert is not yet verified. */
	running: boolean;
}

/** The dropdown options for the "Time in system" filter. */
export const SLA_FILTER_OPTIONS: { value: AlertSlaColor; label: string }[] = [
	{ value: "green", label: "Green — within 1 hour" },
	{ value: "orange", label: "Orange — 1 to 6 hours" },
	{ value: "red", label: "Red — over 6 hours" },
];

/** Legend/filter swatch for each colour. */
export const SLA_DOT_CLASS: Record<AlertSlaColor, string> = {
	green: "bg-emerald-500",
	orange: "bg-orange-500",
	red: "bg-red-500",
};

/**
 * Row tints. Soft enough to keep text readable and to not fight the hover/selected
 * states, and paired with a left border so the colour still reads for anyone who
 * can't distinguish the fills.
 */
const SLA_ROW_CLASS: Record<AlertSlaColor, string> = {
	green:
		"border-l-4 border-l-emerald-500 bg-emerald-50/60 hover:bg-emerald-50 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30",
	orange:
		"border-l-4 border-l-orange-500 bg-orange-50/60 hover:bg-orange-50 dark:bg-orange-950/20 dark:hover:bg-orange-950/30",
	red: "border-l-4 border-l-red-500 bg-red-50/60 hover:bg-red-50 dark:bg-red-950/20 dark:hover:bg-red-950/30",
};

/** Bucket an elapsed time (in minutes) into its colour. */
export function slaColorForMinutes(elapsed: number): AlertSlaColor {
	if (elapsed <= SLA_GREEN_MAX_MINUTES) return "green";
	if (elapsed <= SLA_ORANGE_MAX_MINUTES) return "orange";
	return "red";
}

function parseDate(value?: string | null): Date | null {
	if (!value) return null;
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * The moment the clock starts: the signal's own timestamp — the calendar day
 * from date combined with the time-of-day from time. date carries a junk
 * time-of-day (a constant import/timezone artifact) while time carries the real
 * clock time, so we take the day from one and the clock from the other. Mirrors
 * the SQL TIMESTAMP(DATE(date), TIME(time)).
 */
export function alertSignalTimestamp(alert: SlaSource): Date | null {
	const day = parseDate(alert.date);
	if (!day) return null;

	const clock = parseDate(alert.time);
	if (!clock) return day;

	return new Date(
		day.getFullYear(),
		day.getMonth(),
		day.getDate(),
		clock.getHours(),
		clock.getMinutes(),
		clock.getSeconds()
	);
}

/**
 * The moment the clock stops: the verification timestamp for a verified alert,
 * or now for one still pending (it is still ageing).
 *
 * Uses verificationTime — NOT verificationDate, which is a date-only column
 * carrying a junk/off-by-one day (rows verified minutes after being logged
 * routinely claim a verificationDate one day EARLIER than the signal).
 * updatedAt/createdAt are last-resort fallbacks for the few verified rows that
 * predate verification-timestamp enforcement.
 */
function slaStopTimestamp(alert: SlaSource, now: Date): { stop: Date; running: boolean } {
	const verified = deriveAlertOutcome(alert) !== OUTCOME_NOT_RECORDED;
	if (!verified) return { stop: now, running: true };

	const stop =
		parseDate(alert.verificationTime) ??
		parseDate(alert.updatedAt) ??
		parseDate(alert.createdAt) ??
		now;
	return { stop, running: false };
}

/**
 * How long the alert has been (or was) in the system, and the colour that earns.
 * Returns null when the signal has no usable timestamp, so callers can leave the
 * row untinted rather than inventing a colour.
 */
export function computeAlertSla(alert: SlaSource, now: Date = new Date()): AlertSla | null {
	const start = alertSignalTimestamp(alert);
	if (!start) return null;

	const { stop, running } = slaStopTimestamp(alert, now);
	// Clamp: a handful of rows carry a signal timestamp in the future (dirty
	// data). Treat them as just-logged rather than letting the elapsed go negative.
	const elapsedMinutes = Math.max(0, Math.floor((stop.getTime() - start.getTime()) / 60_000));

	return { color: slaColorForMinutes(elapsedMinutes), elapsedMinutes, running };
}

/** The row tint for an alert, or undefined when the SLA can't be computed. */
export function alertSlaRowClass(alert: SlaSource, now?: Date): string | undefined {
	const sla = computeAlertSla(alert, now);
	return sla ? SLA_ROW_CLASS[sla.color] : undefined;
}

/** "1h 25m" / "3d 4h" — the elapsed time, for tooltips and labels. */
export function formatSlaElapsed(elapsedMinutes: number): string {
	if (elapsedMinutes < 60) return ${elapsedMinutes}m;

	const hours = Math.floor(elapsedMinutes / 60);
	if (hours < 24) {
		const minutes = elapsedMinutes % 60;
		return minutes ? ${hours}h ${minutes}m : ${hours}h;
	}

	const days = Math.floor(hours / 24);
	const remainingHours = hours % 24;
	return remainingHours ? ${days}d ${remainingHours}h : ${days}d;
}
