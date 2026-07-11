import type { MultiSelectOption } from "@/components/ui/multi-select";

/**
 * Verification-outcome buckets offered by the Signals Map filter. The `value`
 * strings MUST match the backend's OutcomeFilterBucket exactly (services/
 * alert_outcome.go) — the map sends them comma-joined as `?outcome=…` and the
 * backend derives each alert's outcome and matches against these buckets.
 *
 * Each alert falls into exactly ONE bucket: the backend derives a single outcome
 * via DeriveAlertOutcome (field → desk → actions → narrative precedence) — the
 * same derivation behind the dashboard's headline KPIs / signal funnel
 * (pending → discarded → alert), so the map's filtered totals reconcile with
 * those KPIs. (This is deliberately NOT the dashboard's desk-only "Verification
 * Outcomes" bar chart, which reads only case_verification_desk and is
 * multi-select, so an alert can land in several of its bars.) The five named
 * buckets are DeskVerificationOptions, plus "Others" (a recorded outcome that
 * isn't one of the named ones) and "Pending" (no outcome recorded yet).
 */
export const GEO_OUTCOME_FILTER_OPTIONS: MultiSelectOption[] = [
	{ value: "Field Case Verification", label: "Field Case Verification" },
	{ value: "Sample Collected", label: "Sample Collected" },
	{ value: "Validated for EMS Evacuation", label: "Validated for EMS Evacuation" },
	{
		value: "Mortality Surveillance/Supervised Burial",
		label: "Mortality Surveillance / Supervised Burial",
	},
	{ value: "Discarded", label: "Discarded" },
	{ value: "Others", label: "Others (recorded)" },
	{ value: "Pending", label: "Pending (not verified)" },
];
