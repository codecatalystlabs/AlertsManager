import {
	normalizeTriageDecision,
	TRIAGE_DISCARDED,
	TRIAGE_LOGGED,
	isTriaged,
} from "@/lib/alert-triage";

/**
 * What this signal needs next.
 *
 * The row menu used to offer every action at once — triage, verify, assess
 * risk, record feedback — and the server rejected the ones that were not legal
 * yet. That put the pipeline's rules in the backend and left the UI guessing,
 * which is exactly backwards: the person doing the work should be able to see
 * what comes next without clicking to find out.
 *
 * So the pipeline order is stated once, here, and the row renders the single
 * action that is actually available. Everything else stays in the overflow
 * menu for the cases that need it (re-triage, re-assess, view details).
 *
 * Order follows the guideline (§3): triage → verification → risk assessment →
 * alert → feedback. A signal triage took off the pipeline has no next action at
 * all until someone re-triages it.
 */

export type NextActionKey =
	| "triage"
	| "verify"
	| "assess-risk"
	| "feedback"
	| "retriage"
	| "none";

export interface NextAction {
	key: NextActionKey;
	/** Button label. Short: it sits in a table row. */
	label: string;
	/** Why this is next, for the tooltip. */
	hint: string;
	/** True when this is real work waiting, so the row can emphasise it. */
	actionable: boolean;
}

/** The subset of a signal the pipeline order depends on. */
export interface PipelineSignal {
	priority?: string | null;
	triageDecision?: string | null;
	verificationOutcome?: string | null;
	riskLevel?: string | null;
	feedbackGivenAt?: string | null;
	isVerified?: boolean;
}

const NONE: NextAction = {
	key: "none",
	label: "",
	hint: "Nothing is waiting on this signal.",
	actionable: false,
};

export function nextAction(signal: PipelineSignal): NextAction {
	const decision = normalizeTriageDecision(signal.triageDecision);

	// Off the pipeline. Not "done" and not "blocked" — a decision was taken, and
	// the only move left is to revisit it.
	if (decision === TRIAGE_DISCARDED || decision === TRIAGE_LOGGED) {
		return {
			key: "retriage",
			label: "Re-triage",
			hint:
				decision === TRIAGE_DISCARDED
					? "Triage discarded this as already reported. Re-triage to send it forward."
					: "Triage logged this as no public-health threat. Re-triage to send it forward.",
			actionable: false,
		};
	}

	const outcome = (signal.verificationOutcome ?? "").trim();

	// Steps 2 and 3 only apply while the signal is still UNADJUDICATED. A row
	// that already carries a verification outcome has passed both gates —
	// thousands predate triage entirely — and sending it back to triage would
	// walk the pipeline backwards over work already done. The mandatory gate
	// governs what may be verified next, not what was verified in the past.
	if (!outcome) {
		// Step 2. Nothing reaches verification without passing the gate, so an
		// untriaged signal has exactly one available move. Rows carrying a
		// priority but no decision were triaged before the decision column
		// existed, and a priority was only ever given to a signal that proceeded.
		if (!decision && !isTriaged(signal.priority)) {
			return {
				key: "triage",
				label: "Triage",
				hint: "Not yet triaged. Triage is mandatory before verification.",
				actionable: true,
			};
		}

		// Step 3. Forwarded and not yet adjudicated.
		return {
			key: "verify",
			label: "Verify",
			hint: "Forwarded by triage and awaiting a verification outcome.",
			actionable: true,
		};
	}

	// Step 4. Only a CONFIRMED event is scored — a discarded signal is not an
	// event, and the risk level drives the response.
	if (outcome === "Confirmed" && !(signal.riskLevel ?? "").trim()) {
		return {
			key: "assess-risk",
			label: "Assess risk",
			hint: "Confirmed event with no risk level. Due within 24h of verification.",
			actionable: true,
		};
	}

	// Step 6. Concluded, and the reporter has not been told.
	if (!signal.feedbackGivenAt) {
		return {
			key: "feedback",
			label: "Give feedback",
			hint: "Concluded, but the reporter has not been told what happened to their signal.",
			actionable: true,
		};
	}

	return NONE;
}
