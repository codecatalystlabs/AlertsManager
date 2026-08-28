/**
 * Triage — step 2 of the Uganda EBS steps
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

/* -------------------------------------------------------------------------
 * The triage DECISION — the guideline's two questions and their three exits.
 *
 * The priority only ever described survivors of the gate. §2 step 2 asks two
 * questions in order, and each has its own exit:
 *
 *   1. Reported before and already under investigation?
 *        yes → DISCARD and record. Recorded, never deleted: that is what stops
 *              duplicates inflating signal counts while keeping the cluster
 *              they form visible on the register.
 *   2. A genuine or potential threat to public health?
 *        no  → LOG, monitor, refer. Leaves the EBS steps, stays on the
 *              register.
 *        yes → FORWARD to verification, against the priority's deadline.
 *
 * Mirrors internal/services/triage.go — keep the two in step.
 * ---------------------------------------------------------------------- */

export const TRIAGE_DISCARDED = "Discarded";
export const TRIAGE_LOGGED = "Logged";
export const TRIAGE_FORWARDED = "Forwarded to Verification";

export type TriageDecision =
	| typeof TRIAGE_DISCARDED
	| typeof TRIAGE_LOGGED
	| typeof TRIAGE_FORWARDED;

/** Decisions in pipeline order (display order). */
export const TRIAGE_DECISIONS: TriageDecision[] = [
	TRIAGE_FORWARDED,
	TRIAGE_LOGGED,
	TRIAGE_DISCARDED,
];

/**
 * Answer the two questions in the order the guideline asks them. A duplicate is
 * discarded as a duplicate even when it describes a genuine threat — that
 * threat is already being handled under the original signal.
 */
export function deriveTriageDecision(
	reportedBefore: boolean,
	genuineThreat: boolean
): TriageDecision {
	if (reportedBefore) return TRIAGE_DISCARDED;
	if (!genuineThreat) return TRIAGE_LOGGED;
	return TRIAGE_FORWARDED;
}

/** Fold free-text onto a canonical decision; null when absent or unrecognised. */
export function normalizeTriageDecision(
	value?: string | null
): TriageDecision | null {
	const v = (value ?? "").trim().toLowerCase();
	if (!v) return null;
	if (v.startsWith("discard") || v === "duplicate") return TRIAGE_DISCARDED;
	if (v.startsWith("log") || v.includes("monitor")) return TRIAGE_LOGGED;
	if (v.startsWith("forward") || v.includes("verif") || v === "proceed") {
		return TRIAGE_FORWARDED;
	}
	return null;
}

/** Whether this decision keeps the signal on the EBS steps. Untriaged does. */
export function triageContinuesToVerification(value?: string | null): boolean {
	const d = normalizeTriageDecision(value);
	return d !== TRIAGE_DISCARDED && d !== TRIAGE_LOGGED;
}

/**
 * Has this signal been through the triage gate at all?
 *
 * The Yes/No the register's "Is signal triaged" column answers. Mirrors
 * services.UntriagedSQL (negated) — including its concession to history: a row
 * carrying only a PRIORITY was triaged before the decision column existed, so
 * it reads Yes. Tested on the RAW values, exactly as the SQL does, so the
 * column and its server-side ?triaged= filter cannot disagree about a row.
 */
export function isSignalTriaged(signal: {
	triageDecision?: string | null;
	priority?: string | null;
}): boolean {
	return (
		(signal.triageDecision ?? "").trim() !== "" ||
		(signal.priority ?? "").trim() !== ""
	);
}

/** Short label for a possibly-absent decision. */
export function triageDecisionLabel(value?: string | null): string {
	const d = normalizeTriageDecision(value);
	if (d === TRIAGE_FORWARDED) return "Forwarded";
	return d ?? "Untriaged";
}

/**
 * What each decision means, shown at the point of choice so two focal persons
 * reading the same signal reach the same exit.
 */
export const TRIAGE_DECISION_GUIDANCE: Record<TriageDecision, string> = {
	[TRIAGE_FORWARDED]:
		"Goes forward for verification, due within 24 hours unless a priority already sets a tighter deadline.",
	[TRIAGE_LOGGED]:
		"Logged and monitored, referred for appropriate management. Leaves the EBS steps but stays on the register.",
	[TRIAGE_DISCARDED]:
		"Recorded as an already-reported duplicate — never deleted, so the reporting cluster stays visible.",
};

/** Badge styling per decision. Off-pipeline exits read as settled, not alarming. */
export const TRIAGE_DECISION_BADGE_CLASS: Record<string, string> = {
	[TRIAGE_FORWARDED]: "bg-emerald-100 text-emerald-800 border-emerald-200",
	[TRIAGE_LOGGED]: "bg-slate-100 text-slate-700 border-slate-200",
	[TRIAGE_DISCARDED]: "bg-zinc-100 text-zinc-600 border-zinc-300",
	untriaged: "bg-gray-100 text-gray-600 border-gray-200",
};

/**
 * Options for the "Is signal triaged" column filter. Sent to the server as
 * ?triaged=, which tests services.UntriagedSQL — the same test the triage queue
 * uses — so the filtered list matches what the column shows.
 */
export const TRIAGED_FILTER_OPTIONS: { value: string; label: string }[] = [
	{ value: "yes", label: "Yes — through the gate" },
	{ value: "no", label: "No — not yet triaged" },
];

/** Options for the triage-decision filter — "untriaged" is a first-class choice. */
export const TRIAGE_DECISION_FILTER_OPTIONS: {
	value: string;
	label: string;
}[] = [
		{ value: TRIAGE_FORWARDED, label: "Forwarded to verification" },
		{ value: TRIAGE_LOGGED, label: "Logged and monitored" },
		{ value: TRIAGE_DISCARDED, label: "Discarded — already reported" },
		{ value: "untriaged", label: "Untriaged — not through the gate" },
	];

/**
 * The VERIFICATION GATE, mirroring services.VerificationBlockedReason.
 *
 * Triage is mandatory — nothing reaches verification without passing through
 * the gate. Returns why this signal may not be verified, or null when it may.
 * Used to disable the Verify action with its reason, so an operator learns the
 * rule before the click rather than from a rejected request.
 *
 * The one concession is to history: rows carrying a priority but no decision
 * were triaged before the decision existed, and a priority was only ever
 * assigned to a signal that proceeded.
 */
export function verificationBlockedReason(
	decision?: string | null,
	priority?: string | null
): string | null {
	const d = normalizeTriageDecision(decision);
	if (d === TRIAGE_DISCARDED) {
		return "Triage discarded this signal as already reported and under investigation. Re-triage it to send it forward.";
	}
	if (d === TRIAGE_LOGGED) {
		return "Triage found no plausible public-health threat; the signal is logged and monitored. Re-triage it to send it forward.";
	}
	if (d === TRIAGE_FORWARDED) return null;
	if (isTriaged(priority)) return null;
	return "This signal has not been triaged. Triage is mandatory — answer the two screening questions first.";
}
