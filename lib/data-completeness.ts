import type { DashboardCountItem, DashboardSummary } from "@/lib/fetch-dashboard";

/**
 * How complete the record is, field by field, and the one rule for telling a
 * MISSING value from a real one in any breakdown.
 *
 * The audit behind this (2026-09-29, 17,667 signals): the largest bar in
 * "Conditions reported" was "Unspecified" (6,476 — 37%), the largest detection
 * "level" was "Transport recorded, level not" (7,552 — 43%), and the tallest
 * age column was "Unknown" (5,309). Ranking a missing value among real ones
 * makes the chart answer a question nobody asked; reporting how much is
 * missing, once, next to the charts, answers the one that matters — how far
 * to trust them.
 */

const MISSING_LABEL =
	/^(unknown|unknown \/ pending|not recorded|unspecified|transport recorded, level not|n\/a|none|district not recorded|unmatched location|disease not recorded)$/i;

/** Whether a breakdown bucket records the ABSENCE of a value. */
export function isMissingLabel(label: string): boolean {
	return MISSING_LABEL.test(label.trim());
}

/** A breakdown split into its real buckets and the count of missing ones. */
export function splitMissing(items: DashboardCountItem[]): { named: DashboardCountItem[]; missing: number } {
	const named: DashboardCountItem[] = [];
	let missing = 0;
	for (const it of items) {
		if (isMissingLabel(it.label)) missing += it.count;
		else named.push(it);
	}
	return { named, missing };
}

export interface CompletenessField {
	key: string;
	label: string;
	/** Share carrying a usable value, 0–100; null when nothing is in scope. */
	percent: number | null;
	missing: number;
	/** "with no disease recorded" — completes "6,476 …". */
	missingLabel: string;
	hint: string;
}

function field(
	key: string,
	label: string,
	base: number,
	missing: number,
	missingLabel: string,
	hint: string
): CompletenessField {
	const m = Math.max(0, Math.min(missing, base));
	return {
		key,
		label,
		percent: base > 0 ? Math.round(((base - m) / base) * 100) : null,
		missing: m,
		missingLabel,
		hint,
	};
}

function missingIn(items: DashboardCountItem[] | undefined): number {
	return splitMissing(items ?? []).missing;
}

/** The completeness meters, from the counts the summary already carries. */
export function buildCompleteness(summary: DashboardSummary | undefined): CompletenessField[] {
	const total = summary?.total ?? 0;
	const ind = summary?.indicators;
	const triaged = ind?.signalsTriaged ?? 0;
	const triagedVerified = ind?.triagedVerified ?? ind?.signalsVerified ?? 0;
	return [
		field(
			"disease",
			"Disease recorded",
			total,
			missingIn(summary?.diseases),
			"with no disease",
			"Signals whose suspected disease or condition is recorded. Most blanks arrive from the eCHIS feed."
		),
		field(
			"region",
			"District → region",
			total,
			missingIn(summary?.reportedByRegion),
			"not placed in a region",
			"Signals whose case district matches an official district, and so a region."
		),
		field(
			"level",
			"Detection level",
			total,
			missingIn(summary?.signalLevels),
			"transport only or blank",
			"Signals whose source names the level it was detected at (KPI 1), not only how it travelled."
		),
		field("age", "Case age", total, missingIn(summary?.age), "with no age", "Signals with the case's age recorded."),
		field("sex", "Case sex", total, missingIn(summary?.sex), "with no sex", "Signals with the case's sex recorded."),
		field(
			"status",
			"Case alive/dead",
			total,
			missingIn(summary?.status),
			"status unknown",
			"Signals recording whether the case was alive or dead when reported."
		),
		field(
			"triage-time",
			"Triage time (of triaged)",
			triaged,
			triaged - (ind?.triageTimed ?? triaged),
			"triaged, no time",
			"Triaged signals carrying the time they were triaged — the start of the 24h triage clock."
		),
		field(
			"verification-time",
			"Verification time (of verified)",
			triagedVerified,
			triagedVerified - (ind?.verificationTimed ?? triagedVerified),
			"verified, no time",
			"Triaged and verified signals carrying the time they were verified."
		),
	];
}
