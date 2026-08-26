import { nextAction, type PipelineSignal } from "@/lib/next-action";
import {
	normalizeTriageDecision,
	isTriaged,
	TRIAGE_DISCARDED,
	TRIAGE_LOGGED,
	verificationDeadlineMinutes,
} from "@/lib/alert-triage";

/**
 * Where one signal stands in the EBS pipeline, as data.
 *
 * Pure and presentation-free so it can be tested directly: the rail's substance
 * is which state each gate is in, and that is a state machine, not a layout.
 * `StageRail` in components/pipeline renders what this returns.
 *
 * Three things it deliberately does NOT do:
 *
 *   - It does not invent a state for stages the guideline has no record of. A
 *     signal verified before triage existed shows triage as SKIPPED, not passed.
 *   - It does not mark step 5 reachable. The system cannot record an issued
 *     alert, so the rail locks there rather than implying the work ends at risk
 *     assessment.
 *   - It does not show a clock on a signal triage took off the pipeline. A
 *     discarded duplicate is not overdue; it is decided.
 */

export type StageState = "done" | "current" | "pending" | "skipped" | "blocked" | "locked";

export interface RailStage {
	step: number | null;
	label: string;
	state: StageState;
	/** Sub-line: a timestamp, a deadline, or why the stage will never happen. */
	detail?: string;
}

/** The fields the rail reads. A superset of what nextAction needs. */
export interface RailSignal extends PipelineSignal {
	date?: string | null;
	time?: string | null;
	triagedAt?: string | null;
	verificationTime?: string | null;
	riskAssessedAt?: string | null;
	feedbackGivenAt?: string | null;
}

function shortDate(value?: string | null): string | undefined {
	if (!value) return undefined;
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return undefined;
	return d.toLocaleDateString(undefined, {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
}

/** Hours elapsed since `value`, or null when it is missing or unparseable. */
function hoursSince(value?: string | null): number | null {
	if (!value) return null;
	const then = new Date(value).getTime();
	if (Number.isNaN(then)) return null;
	const hours = (Date.now() - then) / 3_600_000;
	return hours < 0 ? 0 : hours;
}

/** "18h of 12h" — elapsed against the deadline, so lateness is legible at a glance. */
function clockLabel(elapsed: number | null, deadlineHours: number): string {
	if (elapsed == null) return `${deadlineHours}h deadline`;
	const shown = elapsed < 1 ? "<1" : Math.floor(elapsed).toLocaleString();
	return `${shown}h of ${deadlineHours}h`;
}

function isOverdue(elapsed: number | null, deadlineHours: number): boolean {
	return elapsed != null && elapsed > deadlineHours;
}

export function buildRail(signal: RailSignal): RailStage[] {
	const decision = normalizeTriageDecision(signal.triageDecision);
	const offPipeline = decision === TRIAGE_DISCARDED || decision === TRIAGE_LOGGED;
	const triaged = Boolean(decision) || isTriaged(signal.priority);
	const outcome = (signal.verificationOutcome ?? "").trim();
	const confirmed = outcome === "Confirmed";
	const next = nextAction(signal);

	// Detection is complete by definition — the signal exists.
	const stages: RailStage[] = [
		{
			step: 1,
			label: "Detected",
			state: "done",
			detail: shortDate(signal.date),
		},
	];

	// --- Triage ------------------------------------------------------------
	if (offPipeline) {
		stages.push({
			step: 2,
			label: "Triaged",
			state: "done",
			detail:
				decision === TRIAGE_DISCARDED
					? "discarded — already reported"
					: "logged and monitored",
		});
	} else if (triaged) {
		stages.push({
			step: 2,
			label: "Triaged",
			state: "done",
			detail: shortDate(signal.triagedAt) ?? "forwarded",
		});
	} else if (outcome) {
		// Verified before triage existed. Marking this "done" would claim a
		// decision nobody made; the honest state is that the gate was skipped.
		stages.push({
			step: 2,
			label: "Triaged",
			state: "skipped",
			detail: "no triage recorded",
		});
	} else {
		const elapsed = hoursSince(signal.date);
		stages.push({
			step: 2,
			label: "Triage",
			state: "current",
			detail: clockLabel(elapsed, 24) + (isOverdue(elapsed, 24) ? " — overdue" : ""),
		});
	}

	// --- Verification ------------------------------------------------------
	if (offPipeline) {
		stages.push({
			step: 3,
			label: "Verification",
			state: "blocked",
			detail: "not on the pipeline",
		});
	} else if (outcome) {
		stages.push({
			step: 3,
			label: "Verified",
			state: "done",
			detail: outcome.toLowerCase(),
		});
	} else if (next.key === "verify") {
		const deadlineHours = verificationDeadlineMinutes(signal.priority) / 60;
		const elapsed = hoursSince(signal.date);
		stages.push({
			step: 3,
			label: "Verification",
			state: "current",
			detail:
				clockLabel(elapsed, deadlineHours) +
				(isOverdue(elapsed, deadlineHours) ? " — overdue" : ""),
		});
	} else {
		stages.push({ step: 3, label: "Verification", state: "pending" });
	}

	// --- Risk assessment ---------------------------------------------------
	// Only a confirmed event is scored, so a discarded signal shows this stage
	// as not applicable rather than as work still owed.
	if (signal.riskLevel) {
		stages.push({
			step: 4,
			label: "Risk assessed",
			state: "done",
			detail: signal.riskLevel,
		});
	} else if (offPipeline) {
		stages.push({ step: 4, label: "Risk assessment", state: "blocked", detail: "not on the pipeline" });
	} else if (outcome && !confirmed) {
		stages.push({
			step: 4,
			label: "Risk assessment",
			state: "blocked",
			detail: `not scored — ${outcome.toLowerCase()}`,
		});
	} else if (next.key === "assess-risk") {
		const elapsed = hoursSince(signal.verificationTime);
		stages.push({
			step: 4,
			label: "Risk assessment",
			state: "current",
			detail: clockLabel(elapsed, 24) + (isOverdue(elapsed, 24) ? " — overdue" : ""),
		});
	} else {
		stages.push({ step: 4, label: "Risk assessment", state: "pending" });
	}

	// --- Alert (step 5, not implemented) -----------------------------------
	stages.push({
		step: 5,
		label: "Alert issued",
		state: "locked",
		detail: "not recorded by this system",
	});

	// --- Feedback ----------------------------------------------------------
	if (signal.feedbackGivenAt) {
		stages.push({
			step: 6,
			label: "Feedback given",
			state: "done",
			detail: shortDate(signal.feedbackGivenAt),
		});
	} else if (next.key === "feedback") {
		stages.push({ step: 6, label: "Feedback", state: "current", detail: "reporter not yet told" });
	} else if (offPipeline) {
		stages.push({ step: 6, label: "Feedback", state: "blocked", detail: "not on the pipeline" });
	} else {
		stages.push({ step: 6, label: "Feedback", state: "pending" });
	}

	return stages;
}
