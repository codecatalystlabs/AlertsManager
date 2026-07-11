import type { MultiSelectOption } from "@/components/ui/multi-select";

/**
 * Verification-outcome buckets offered by the Signals Map filter. The `value`
 * strings MUST match the backend's OutcomeFilterBucket exactly (services/
 * alert_outcome.go) — the map sends them comma-joined as `?outcome=…` and the
 * backend derives each alert's outcome and matches against these buckets. The
 * five named buckets mirror the dashboard's "Verification Outcomes" chart, plus
 * "Others" (a recorded outcome that isn't one of the named ones) and "Pending"
 * (no verification outcome recorded yet).
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
