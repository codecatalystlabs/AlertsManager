import { AuthService } from "@/lib/auth";
import { getClientApiBaseUrl } from "@/lib/api-config";

/**
 * The EBS steps as the UI navigates it.
 *
 * The guideline (§3) is a sequence of gates — detection → triage → verification
 * → risk assessment → alert → feedback — and this file is the one place the
 * front end knows that. Stage keys match `services.Stage*` in the Go backend,
 * which uses the SAME predicate to count a stage and to filter its queue. So a
 * tile reading 6,010 links to a list holding exactly 6,010 rows, by
 * construction rather than by two definitions happening to agree.
 *
 * Each gate has two keys, because there are two questions about it. The QUEUE
 * keys (triage, verification, risk) hold what is still waiting — that is what
 * the register's tabs and the sidebar open. The DONE keys (triaged, verified,
 * assessed) hold what has cleared it, and those are what the pipeline strip
 * headlines.
 */

export const STAGE_INTAKE = "intake";
export const STAGE_TRIAGE = "triage";
export const STAGE_VERIFICATION = "verification";
export const STAGE_RISK = "risk";
export const STAGE_ALERT = "alert";
export const STAGE_FEEDBACK = "feedback";
export const STAGE_OFF_PIPELINE = "offpipeline";
/**
 * Not a gate — the archive of everything the pipeline closed WITHOUT an
 * event, at whichever gate closed it. Twin of services.StageDiscarded.
 */
export const STAGE_DISCARDED = "discarded";

/** What has CLEARED each gate — the strip's headline numbers. */
export const STAGE_TRIAGED = "triaged";
export const STAGE_VERIFIED = "verified";
export const STAGE_ASSESSED = "assessed";

export type StageKey =
	| typeof STAGE_INTAKE
	| typeof STAGE_TRIAGE
	| typeof STAGE_VERIFICATION
	| typeof STAGE_RISK
	| typeof STAGE_ALERT
	| typeof STAGE_FEEDBACK
	| typeof STAGE_OFF_PIPELINE
	| typeof STAGE_DISCARDED
	| typeof STAGE_TRIAGED
	| typeof STAGE_VERIFIED
	| typeof STAGE_ASSESSED;

/** One gate's live queue, as the backend reports it. */
export interface PipelineStage {
	key: StageKey;
	label: string;
	count: number;
	/** Still standing at the gate, behind the headline. */
	pending: number;
	/** Of those pending, how many are past the national deadline. -1 when the stage has no clock. */
	overdue: number;
	/** False when the system cannot record this stage yet (step 5). */
	available: boolean;
	note?: string;
}

export interface PipelineSnapshot {
	stages: PipelineStage[];
	total: number;
}

/**
 * Which EBS step each stage is, for the strip's numbering. Steps 5 (alert) and
 * 6 (feedback) are not on the strip — alert issuance has no timestamp this
 * system records, and feedback is its own sidebar destination.
 */
export const STAGE_STEP: Partial<Record<StageKey, number>> = {
	[STAGE_INTAKE]: 1,
	[STAGE_TRIAGED]: 2,
	[STAGE_VERIFIED]: 3,
	[STAGE_ASSESSED]: 4,
};

/** One line on what each gate decides, shown on hover over the pipeline strip. */
export const STAGE_DESCRIPTION: Record<StageKey, string> = {
	[STAGE_INTAKE]: "Every signal reported into the system, whatever its source.",
	[STAGE_TRIAGE]:
		"New signals only — not triaged, not verified, not risk-assessed. Triage is due within 24 hours of receipt.",
	[STAGE_VERIFICATION]:
		"Confirming a forwarded signal represents a real event. Due within the deadline its priority sets — 12h High, 24h Medium, 48h Low.",
	[STAGE_RISK]:
		"Scoring a confirmed event to select the response. Due within 24h of verification.",
	[STAGE_ALERT]:
		"The formal output — SpotRep, bulletin, IHR notification. Not yet recorded by this system.",
	[STAGE_FEEDBACK]:
		"Telling the reporter what happened to their signal. Not optional, and not decorative.",
	[STAGE_OFF_PIPELINE]:
		"Signals triage discarded as already reported, or logged as no public-health threat. Recorded, never deleted.",
	[STAGE_DISCARDED]:
		"Every signal closed without becoming an event, at whichever gate closed it. Recorded, never deleted.",
	[STAGE_TRIAGED]:
		"Signals that have been through the triage gate — a decision was taken and recorded, whichever way it went.",
	[STAGE_VERIFIED]:
		"Signals verification has adjudicated: an outcome someone recorded, confirmed or discarded.",
	[STAGE_ASSESSED]:
		"Confirmed events carrying a risk level — the level that selects the response the guideline mandates.",
};

/**
 * Where a stage's queue lives. Intake is the whole register, which the register
 * asks for explicitly (?view=all) — a bare /dashboard/signal-logs opens on the
 * untriaged view, so this card must say it wants everything or its count and its
 * list would disagree.
 */
export function stageHref(key: StageKey): string {
	return key === STAGE_INTAKE
		? "/dashboard/signal-logs?view=all"
		: `/dashboard/signal-logs?stage=${key}`;
}

/** Human label for a stage key, for page headings driven by ?stage=. */
export function stageLabel(key: string | null | undefined): string | null {
	switch (key) {
		case STAGE_TRIAGE:
			return "Awaiting triage";
		case STAGE_VERIFICATION:
			return "Awaiting verification";
		case STAGE_RISK:
			return "Awaiting risk assessment";
		case STAGE_FEEDBACK:
			return "Feedback due";
		case STAGE_TRIAGED:
			return "Triaged";
		case STAGE_VERIFIED:
			return "Verified";
		case STAGE_ASSESSED:
			return "Risk assessed";
		case STAGE_OFF_PIPELINE:
			// Named for what it holds rather than for where it sits, because the
			// sidebar sends people here looking for "Discarded Events" and a
			// heading reading "Off pipeline" would not answer them.
			return "Discarded events";
		case STAGE_DISCARDED:
			return "Discarded";
		default:
			return null;
	}
}

/** Stage keys that name a real queue (so an unknown ?stage= is ignored, not empty). */
export function isQueueStage(key: string | null | undefined): key is StageKey {
	return (
		key === STAGE_TRIAGE ||
		key === STAGE_VERIFICATION ||
		key === STAGE_RISK ||
		key === STAGE_FEEDBACK ||
		key === STAGE_OFF_PIPELINE ||
		key === STAGE_DISCARDED ||
		key === STAGE_TRIAGED ||
		key === STAGE_VERIFIED ||
		key === STAGE_ASSESSED
	);
}

/**
 * Fetch the live snapshot. Extra params (district, region, dates) are passed
 * straight through, so the strip follows whatever the page is filtered to
 * rather than always showing a national total beside a district list.
 */
export async function fetchPipeline(
	params: Record<string, string | undefined> = {}
): Promise<PipelineSnapshot> {
	const search = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value && value !== "all") search.set(key, value);
	}
	const query = search.toString();
	const response = await AuthService.makeAuthenticatedRequest(
		`${getClientApiBaseUrl()}/alerts/pipeline${query ? `?${query}` : ""}`,
		{ method: "GET" }
	);
	if (!response.ok) throw new Error("Failed to load the pipeline");
	return response.json();
}
