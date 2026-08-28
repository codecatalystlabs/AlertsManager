"use client";

import { useMemo } from "react";

import { cn } from "@/lib/utils";

/** One read-only fact about the signal being worked. */
interface SummaryItem {
	label: string;
	value: string;
}

function text(value: unknown): string {
	if (value == null) return "";
	const s = String(value).trim();
	// "0" is how an unset numeric field arrives from the API — a count of zero
	// affected people is not a fact worth a row.
	return s === "0" ? "" : s;
}

/**
 * The read-only facts of a signal, in the order someone reads them: who, where,
 * from whom, and what was actually reported.
 *
 * Empty fields are dropped rather than shown blank, so the block is short on a
 * thin SMS report and long on a full one.
 */
export function buildSignalSummary(alert: unknown): SummaryItem[] {
	if (!alert) return [];
	const a = alert as Record<string, unknown>;

	const place = [
		text(a.alertCaseVillage) || text(a.village),
		text(a.alertCaseSubCounty) || text(a.subCounty),
		text(a.alertCaseDistrict),
	]
		.filter(Boolean)
		.join(", ");

	const reporter = [text(a.personReporting), text(a.contactNumber)]
		.filter(Boolean)
		.join(" · ");

	const items: SummaryItem[] = [
		{ label: "Signal", value: text(a.signalReported).replaceAll("_", " ") },
		{ label: "Case", value: text(a.alertCaseName) },
		{ label: "Location", value: place },
		{ label: "Reported by", value: reporter },
		{ label: "Source", value: text(a.sourceOfAlert) },
		{ label: "Number affected", value: text(a.numberAffected) },
		{ label: "Symptoms", value: text(a.symptoms) },
		{
			label: "Description",
			value:
				text(a.briefDescription) || text(a.history) || text(a.narrative),
		},
		{ label: "Additional information", value: text(a.additionalInformation) },
	];

	return items.filter((i) => i.value);
}

/**
 * "The signal" card — what is being decided about, read-only.
 *
 * Every gate of the pipeline is a judgement about a report, so the report has
 * to be legible without leaving the dialog. Nothing here is editable: correcting
 * case data is the edit dialog's job, and conflating the two is what turned the
 * verification form into a case investigation in the first place.
 *
 * Shared by the verification and triage dialogs so the two gates show the same
 * facts in the same order — an operator moving between them is reading one
 * report, not learning two layouts.
 */
export function SignalSummaryCard({
	alert,
	className,
}: {
	alert: unknown;
	className?: string;
}) {
	const items = useMemo(() => buildSignalSummary(alert), [alert]);
	if (items.length === 0) return null;

	return (
		<div className={cn("rounded-lg border bg-muted/40 p-3", className)}>
			<h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
				The signal
			</h3>
			<dl className="mt-2 space-y-1.5 text-sm">
				{items.map((item) => (
					<div
						key={item.label}
						className="grid grid-cols-[9rem_1fr] gap-2"
					>
						<dt className="text-xs uppercase tracking-wide text-muted-foreground">
							{item.label}
						</dt>
						<dd className="break-words">{item.value}</dd>
					</div>
				))}
			</dl>
		</div>
	);
}
