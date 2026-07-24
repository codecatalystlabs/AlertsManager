/**
 * Triage — step 2 of the Uganda EBS pipeline
 * (detection → TRIAGE → verification → risk assessment → alert → response → feedback).
 *
 * Triage screens a raw signal on two questions — has it been reported already,
 * and does it plausibly threaten public health — and assigns a priority. The
 * priority is not a label: it sets the signal's verification deadline, which is
 * what makes the national verification-timeliness KPI measurable.
 *
 * Go twin: alertsMIS/backend/internal/services/triage.go — the deadlines and the
 * untriaged→Medium fallback must stay identical in both, or a row's colour will
 * depend on whether it was computed client-side or by the server's SQL filter.
 */

export const PRIORITY_HIGH = "High";
export const PRIORITY_MEDIUM = "Medium";
export const PRIORITY_LOW = "Low";

export type AlertPriority =
	| typeof PRIORITY_HIGH
	| typeof PRIORITY_MEDIUM
	| typeof PRIORITY_LOW;

/** Valid priorities, highest first (display order). */
export const TRIAGE_PRIORITIES: AlertPriority[] = [
	PRIORITY_HIGH,
	PRIORITY_MEDIUM,
	PRIORITY_LOW,
];

/**
 * Verification deadlines by priority, in minutes (EBS Guidelines Table 3).
 *
 * Note the source guideline contradicts itself here: the Step 3 narrative gives
 * a flat 12 hours for everything, while Table 3 tiers it. We implement the
 * TIERED version — it is the one carried into the M&E KPI framework
 * (indicator #4) and the one that lets a focal person ration limited RRT
 * capacity.
 */
export const VERIFY_DEADLINE_MINUTES: Record<AlertPriority, number> = {
	[PRIORITY_HIGH]: 12 * 60,
	[PRIORITY_MEDIUM]: 24 * 60,
	[PRIORITY_LOW]: 48 * 60,
};

/** Triage itself must be completed within 24h of signal receipt (KPI #3). */
export const TRIAGE_DEADLINE_MINUTES = 24 * 60;

/** What each priority means, shown in the triage dialog so the choice is consistent. */
export const PRIORITY_GUIDANCE: Record<AlertPriority, string> = {
	[PRIORITY_HIGH]:
		"Plausible outbreak-prone disease, death, bleeding, or a cluster of cases. Verify within 12 hours.",
	[PRIORITY_MEDIUM]:
		"Possible public-health threat needing follow-up, but no immediate danger signal. Verify within 24 hours.",
	[PRIORITY_LOW]:
		"Unlikely to threaten public health, or already known and being managed. Verify within 48 hours.",
};

/**
 * Fold free-text onto a canonical priority; returns null when absent or
 * unrecognised. A typo is rejected rather than coerced — a wrong priority sets
 * a wrong clinical deadline.
 */
export function normalizePriority(value?: string | null): AlertPriority | null {
	switch ((value ?? "").trim().toLowerCase()) {
		case "high":
			return PRIORITY_HIGH;
		case "medium":
		case "med":
			return PRIORITY_MEDIUM;
		case "low":
			return PRIORITY_LOW;
		default:
			return null;
	}
}

/** Whether a priority value represents a completed triage. */
export function isTriaged(value?: string | null): boolean {
	return normalizePriority(value) !== null;
}

/**
 * How long this priority has to be verified.
 *
 * An untriaged signal falls back to the MEDIUM deadline. That is a display and
 * measurement fallback only — nothing is stored on the row. Medium is the
 * deliberate choice: scoring untriaged as High would flood the breach list with
 * signals nobody has assessed, while scoring them as Low would let a genuinely
 * urgent un-triaged signal sit for two days looking healthy.
 */
export function verificationDeadlineMinutes(priority?: string | null): number {
	const p = normalizePriority(priority);
	return p ? VERIFY_DEADLINE_MINUTES[p] : VERIFY_DEADLINE_MINUTES[PRIORITY_MEDIUM];
}

/** Badge styling per priority; untriaged gets a deliberately plain, unalarming look. */
export const PRIORITY_BADGE_CLASS: Record<string, string> = {
	[PRIORITY_HIGH]: "bg-red-100 text-red-800 border-red-200",
	[PRIORITY_MEDIUM]: "bg-amber-100 text-amber-900 border-amber-200",
	[PRIORITY_LOW]: "bg-sky-100 text-sky-800 border-sky-200",
	untriaged: "bg-gray-100 text-gray-600 border-gray-200",
};

/** Label for a possibly-absent priority. */
export function priorityLabel(value?: string | null): string {
	return normalizePriority(value) ?? "Untriaged";
}

/** Options for the priority filter — "untriaged" is a first-class choice. */
export const PRIORITY_FILTER_OPTIONS: { value: string; label: string }[] = [
	{ value: PRIORITY_HIGH, label: "High — verify within 12h" },
	{ value: PRIORITY_MEDIUM, label: "Medium — verify within 24h" },
	{ value: PRIORITY_LOW, label: "Low — verify within 48h" },
	{ value: "untriaged", label: "Untriaged — no priority assigned" },
];

/** "12h" / "24h" / "48h" — the deadline as a short human label. */
export function formatDeadline(priority?: string | null): string {
	return `${verificationDeadlineMinutes(priority) / 60}h`;
}
