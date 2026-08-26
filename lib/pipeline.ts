import { AuthService } from "@/lib/auth";
import { getClientApiBaseUrl } from "@/lib/api-config";

/**
 * The EBS pipeline as the UI navigates it.
 *
 * The guideline (§3) is a sequence of gates — detection → triage → verification
 * → risk assessment → alert → feedback — and this file is the one place the
 * front end knows that. Stage keys match `services.Stage*` in the Go backend,
 * which uses the SAME predicate to count a stage and to filter its queue. So a
 * strip reading "6,022 awaiting triage" links to a list holding exactly 6,022
 * rows, by construction rather than by two definitions happening to agree.
 */

export const STAGE_INTAKE = "intake";
export const STAGE_TRIAGE = "triage";
export const STAGE_VERIFICATION = "verification";
export const STAGE_RISK = "risk";
export const STAGE_ALERT = "alert";
export const STAGE_FEEDBACK = "feedback";
export const STAGE_OFF_PIPELINE = "offpipeline";

export type StageKey =
	| typeof STAGE_INTAKE
	| typeof STAGE_TRIAGE
	| typeof STAGE_VERIFICATION
	| typeof STAGE_RISK
	| typeof STAGE_ALERT
	| typeof STAGE_FEEDBACK
	| typeof STAGE_OFF_PIPELINE;

/** One gate's live queue, as the backend reports it. */
export interface PipelineStage {
	key: StageKey;
	label: string;
	count: number;
	/** Past this stage's national deadline. -1 when the stage has no clock. */
	overdue: number;
	/** False when the system cannot record this stage yet (step 5). */
	available: boolean;
	note?: string;
}

export interface PipelineSnapshot {
	stages: PipelineStage[];
	total: number;
}

/** Which EBS step each stage is, for the strip's numbering. Off-pipeline is not a step. */
export const STAGE_STEP: Partial<Record<StageKey, number>> = {
	[STAGE_INTAKE]: 1,
	[STAGE_TRIAGE]: 2,
	[STAGE_VERIFICATION]: 3,
	[STAGE_RISK]: 4,
	[STAGE_ALERT]: 5,
	[STAGE_FEEDBACK]: 6,
};

/** One line on what each gate decides, shown on hover. */
export const STAGE_DESCRIPTION: Record<StageKey, string> = {
	[STAGE_INTAKE]: "Every signal reported into the system, whatever its source.",
	[STAGE_TRIAGE]:
		"Two questions decide whether a signal is worth the cost of verification. Due within 24h of receipt.",
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
};

/** Where a stage's queue lives. Intake is the unfiltered register. */
export function stageHref(key: StageKey): string {
	return key === STAGE_INTAKE
		? "/dashboard/signal-logs"
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
		case STAGE_OFF_PIPELINE:
			return "Off pipeline";
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
		key === STAGE_OFF_PIPELINE
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
