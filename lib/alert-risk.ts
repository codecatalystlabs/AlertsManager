/**
 * Risk assessment — step 4 of the Uganda EBS pipeline
 * (detection → triage → verification → RISK ASSESSMENT → alert → response → feedback).
 *
 * Once a signal is verified as a real event, a multidisciplinary team scores it
 * and assigns a risk level. The level is not a label: it selects the response
 * the guidelines mandate, up to standing up command-and-control outside normal
 * working hours for a Very High event. Due within 24 hours of verification.
 *
 * Go twin: alertsMIS/backend/internal/services/risk_assessment.go — the decision
 * table must stay identical in both, because the UI previews the level the
 * assessor's answers will produce and the server derives the level it stores.
 * A drift means the preview lies.
 */

export const RISK_LOW = "Low";
export const RISK_MODERATE = "Moderate";
export const RISK_HIGH = "High";
export const RISK_VERY_HIGH = "Very High";

export type RiskLevel =
	| typeof RISK_LOW
	| typeof RISK_MODERATE
	| typeof RISK_HIGH
	| typeof RISK_VERY_HIGH;

/** Levels in escalating order. */
export const RISK_LEVELS: RiskLevel[] = [
	RISK_LOW,
	RISK_MODERATE,
	RISK_HIGH,
	RISK_VERY_HIGH,
];

/** Risk assessment is due within 24h of verification (EBS Guidelines §12). */
export const RISK_ASSESSMENT_DEADLINE_MINUTES = 24 * 60;

/** The three questions, in the order the guideline asks them. */
export const RISK_QUESTIONS = [
	{
		key: "severe" as const,
		question: "Is the threat likely to cause severe morbidity or mortality in humans?",
		hint: "Consider case-fatality, severity of illness, and vulnerable groups exposed.",
	},
	{
		key: "spread" as const,
		question: "Is there a high probability of spread within or to other areas?",
		hint: "Consider transmission route, population movement, and cross-border proximity.",
	},
	{
		key: "control" as const,
		question: "Are effective treatments or control measures available?",
		hint: "Consider vaccine/therapeutic availability, and local capacity to deliver them.",
	},
];

/**
 * The guideline's three-question risk algorithm (§6), transcribed exactly.
 *
 *   severe  spread  control  → level
 *     Y       Y        N       Very High
 *     Y       Y        Y       High
 *     Y       N        N       High
 *     Y       N        Y       Moderate
 *     N       Y        N       High
 *     N       Y        Y       Moderate
 *     N       N        N       Moderate
 *     N       N        Y       Low
 *
 * The only route to Very High is severe + spreading + no control; the only route
 * to Low is none of the three. A lack of control measures escalates every row it
 * touches. Written as an explicit table rather than boolean arithmetic so it can
 * be read straight against the published one.
 */
export function deriveRiskLevel(
	severe: boolean,
	spread: boolean,
	control: boolean
): RiskLevel {
	if (severe && spread && !control) return RISK_VERY_HIGH;
	if (severe && spread && control) return RISK_HIGH;
	if (severe && !spread && !control) return RISK_HIGH;
	if (severe && !spread && control) return RISK_MODERATE;
	if (!severe && spread && !control) return RISK_HIGH;
	if (!severe && spread && control) return RISK_MODERATE;
	if (!severe && !spread && !control) return RISK_MODERATE;
	return RISK_LOW;
}

/**
 * The response the guidelines mandate for a level (§6). Shown next to the level
 * so the assessor sees what their answers commit the team to BEFORE they save.
 */
export const RISK_ACTION: Record<RiskLevel, string> = {
	[RISK_LOW]: "Standard response protocols; routine control and monitoring.",
	[RISK_MODERATE]:
		"Assign named roles and responsibilities; specific measures such as enhanced surveillance or targeted vaccination.",
	[RISK_HIGH]:
		"Senior management attention; may require a command-and-control structure and multiple additional control measures.",
	[RISK_VERY_HIGH]:
		"Immediate response even outside normal working hours; command and control stood up within hours; serious-consequence control measures likely.",
};

/* -------------------------------------------------------------------------
 * The risk MATRIX (§6). The guidelines say Uganda's ePHEM runs BOTH the matrix
 * and the algorithm, so both are captured.
 *
 * Only the BANDS are published as text. The 5x5 grid mapping a likelihood/impact
 * pair onto a level is a shaded figure, so nothing here derives a level from
 * them — likelihood and impact are recorded for the record and for reporting,
 * and the LEVEL always comes from the algorithm above. Inventing the grid would
 * produce confident, wrong risk levels.
 * ---------------------------------------------------------------------- */

/** Likelihood bands with their published probability ranges, most likely first. */
export const RISK_LIKELIHOODS: { value: string; probability: string }[] = [
	{ value: "Almost certain", probability: "≥95%" },
	{ value: "Highly likely", probability: "70–94%" },
	{ value: "Likely", probability: "30–69%" },
	{ value: "Unlikely", probability: "5–29%" },
	{ value: "Very unlikely", probability: "<5%" },
];

/** Impact bands with their published (condensed) meanings, most severe first. */
export const RISK_IMPACTS: { value: string; meaning: string }[] = [
	{ value: "Severe", meaning: "Severe disruption, extensive control measures, serious cost increase" },
	{ value: "Major", meaning: "Significant disruption, large number of added control measures, significant cost" },
	{ value: "Moderate", meaning: "Larger at-risk group, moderate disruption, moderate added cost/measures" },
	{ value: "Minor", meaning: "Small at-risk group, limited disruption, minimal extra control measures" },
	{ value: "Minimal", meaning: "Routine response adequate, negligible extra cost" },
];

/**
 * The three tiers of analysis that justify the level (§2 step 4: "systematically
 * score hazard, exposure and context"). Prompts are the guideline's own wording,
 * so an assessor is answering the question that was actually asked.
 */
export const RISK_TIERS = [
	{
		key: "hazardNote" as const,
		label: "Hazard",
		prompt: "Nature, severity and likelihood of the threat itself.",
	},
	{
		key: "exposureNote" as const,
		label: "Exposure",
		prompt:
			"Who is at risk: vulnerable groups, geographic hotspots, transmission routes, mobility patterns.",
	},
	{
		key: "contextNote" as const,
		label: "Context",
		prompt:
			"Governance capacity, healthcare infrastructure, cultural practices, population resilience.",
	},
];

/**
 * Whether an assessment carries the full §6 analysis — the three tiers plus both
 * matrix axes — rather than just the algorithm answers that produced the level.
 * Measured, never enforced: an RRT working an outbreak must be able to record a
 * level in seconds.
 */
export function riskWorksheetComplete(a: {
	riskHazardNote?: string | null;
	riskExposureNote?: string | null;
	riskContextNote?: string | null;
	riskLikelihood?: string | null;
	riskImpact?: string | null;
}): boolean {
	return Boolean(
		(a.riskHazardNote ?? "").trim() &&
			(a.riskExposureNote ?? "").trim() &&
			(a.riskContextNote ?? "").trim() &&
			(a.riskLikelihood ?? "").trim() &&
			(a.riskImpact ?? "").trim()
	);
}

/** Fold free text onto a canonical level; null when unrecognised. */
export function normalizeRiskLevel(value?: string | null): RiskLevel | null {
	switch ((value ?? "").trim().toLowerCase()) {
		case "low":
			return RISK_LOW;
		case "moderate":
		case "medium":
			return RISK_MODERATE;
		case "high":
			return RISK_HIGH;
		case "very high":
		case "veryhigh":
		case "very-high":
			return RISK_VERY_HIGH;
		default:
			return null;
	}
}

export function isRiskAssessed(value?: string | null): boolean {
	return normalizeRiskLevel(value) !== null;
}

/** Label for a possibly-absent level. */
export function riskLabel(value?: string | null): string {
	return normalizeRiskLevel(value) ?? "Not assessed";
}

/**
 * Badge styling. The escalation is deliberately legible at a glance — Very High
 * is the only one that demands an out-of-hours response, so it is the only one
 * that reads as an emergency.
 */
export const RISK_BADGE_CLASS: Record<string, string> = {
	[RISK_LOW]: "bg-emerald-100 text-emerald-800 border-emerald-200",
	[RISK_MODERATE]: "bg-amber-100 text-amber-900 border-amber-200",
	[RISK_HIGH]: "bg-orange-100 text-orange-900 border-orange-200",
	[RISK_VERY_HIGH]: "bg-red-600 text-white border-red-700",
	unassessed: "bg-gray-100 text-gray-600 border-gray-200",
};

/** Options for the risk filter — "unassessed" is a first-class choice. */
export const RISK_FILTER_OPTIONS: { value: string; label: string }[] = [
	...RISK_LEVELS.map((l) => ({ value: l, label: l })),
	{ value: "unassessed", label: "Not assessed" },
];
