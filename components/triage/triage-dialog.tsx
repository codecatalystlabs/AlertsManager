"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import hotToast from "react-hot-toast";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { altCode } from "@/lib/alt-code";
import { AuthService } from "@/lib/auth";
import { getClientApiBaseUrl } from "@/lib/api-config";
import {
	PRIORITY_GUIDANCE,
	TRIAGE_DECISION_GUIDANCE,
	TRIAGE_PRIORITIES,
	deriveTriageDecision,
	formatDeadline,
	normalizePriority,
	normalizeTriageDecision,
	triageDecisionLabel,
	TRIAGE_DISCARDED,
	TRIAGE_FORWARDED,
	TRIAGE_LOGGED,
	type AlertPriority,
} from "@/lib/alert-triage";
import { ArrowRight, CircleSlash, Loader2, ShieldQuestion } from "lucide-react";

const API_BASE_URL = getClientApiBaseUrl();

/**
 * Triage — step 2 of the EBS pipeline, as the guideline actually specifies it.
 *
 * Triage is a GATE, not a labelling exercise. It asks two questions in order,
 * and each has its own exit:
 *
 *   1. Reported before and already under investigation?  → discard AND record
 *   2. A genuine or potential public-health threat?      → no: log and monitor
 *                                                          yes: forward to
 *                                                               verification
 *
 * The dialog asks them one at a time, in order, and shows where the answer
 * leads before it is committed — because the operator needs to see that
 * "already reported" removes a signal from the pipeline, not from the record.
 * Question 2 only appears once question 1 is answered "no": for a duplicate the
 * exit is taken whatever the threat answer would have been.
 *
 * The priority appears only on the forward path, where it means something: it
 * IS the verification deadline.
 */
export function TriageDialog({
	open,
	onOpenChange,
	alertId,
	currentPriority,
	currentDecision,
	onTriaged,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	alertId: number | null;
	currentPriority?: string | null;
	currentDecision?: string | null;
	onTriaged?: () => void;
}) {
	const [reportedBefore, setReportedBefore] = useState<boolean | null>(null);
	const [genuineThreat, setGenuineThreat] = useState<boolean | null>(null);
	const [priority, setPriority] = useState<AlertPriority | null>(null);
	const [reason, setReason] = useState("");
	const [duplicateOf, setDuplicateOf] = useState("");
	const [note, setNote] = useState("");
	const [saving, setSaving] = useState(false);

	// Re-seed each time the dialog opens so a re-triage starts from a clean
	// sheet rather than the previous signal's answers. The priority is seeded
	// from the row because re-triaging a forwarded signal usually means
	// adjusting its urgency, not re-answering the gate.
	useEffect(() => {
		if (!open) return;
		setReportedBefore(null);
		setGenuineThreat(null);
		setPriority(normalizePriority(currentPriority));
		setReason("");
		setDuplicateOf("");
		setNote("");
	}, [open, currentPriority]);

	const decision = useMemo(() => {
		if (reportedBefore === null) return null;
		if (!reportedBefore && genuineThreat === null) return null;
		return deriveTriageDecision(reportedBefore, genuineThreat === true);
	}, [reportedBefore, genuineThreat]);

	const continues = decision === TRIAGE_FORWARDED;
	const reasonRequired = decision !== null && !continues;

	const canSubmit =
		decision !== null &&
		(!continues || priority !== null) &&
		(!reasonRequired || reason.trim().length > 0);

	const submit = useCallback(async () => {
		if (!alertId || decision === null || !canSubmit) return;
		setSaving(true);
		try {
			const parsedDuplicate = Number.parseInt(duplicateOf.trim(), 10);
			const response = await AuthService.makeAuthenticatedRequest(
				`${API_BASE_URL}/alerts/${alertId}/triage`,
				{
					method: "POST",
					body: JSON.stringify({
						reportedBefore,
						genuineThreat: reportedBefore ? undefined : genuineThreat,
						priority: continues ? priority : undefined,
						reason: reason.trim() || undefined,
						duplicateOf:
							decision === TRIAGE_DISCARDED &&
							Number.isFinite(parsedDuplicate) &&
							parsedDuplicate > 0
								? parsedDuplicate
								: undefined,
						note: note.trim() || undefined,
					}),
				}
			);
			if (!response.ok) {
				const data = await response.json().catch(() => ({}));
				throw new Error(data.error || "Failed to record triage");
			}
			hotToast.success(
				continues
					? `${altCode(alertId)} forwarded for verification — ${priority}, verify within ${formatDeadline(priority)}`
					: decision === TRIAGE_DISCARDED
						? `${altCode(alertId)} discarded as already reported — kept on the register`
						: `${altCode(alertId)} logged and monitored — off the EBS pipeline, kept on the register`
			);
			onTriaged?.();
			onOpenChange(false);
		} catch (e) {
			hotToast.error(e instanceof Error ? e.message : "Failed to record triage");
		} finally {
			setSaving(false);
		}
	}, [
		alertId,
		decision,
		canSubmit,
		continues,
		reportedBefore,
		genuineThreat,
		priority,
		reason,
		duplicateOf,
		note,
		onTriaged,
		onOpenChange,
	]);

	const retriage = Boolean(
		normalizeTriageDecision(currentDecision) ?? normalizePriority(currentPriority)
	);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-base">
						<ShieldQuestion className="h-4 w-4 text-uganda-red" />
						{retriage ? "Re-triage" : "Triage"} {altCode(alertId)}
					</DialogTitle>
					<DialogDescription className="text-xs">
						Two questions decide whether this signal is worth the cost of
						verification. Every outcome is recorded — a discarded signal stays
						on the register.
						{retriage && currentDecision ? (
							<>
								{" "}
								Currently:{" "}
								<span className="font-semibold">
									{triageDecisionLabel(currentDecision)}
								</span>
								.
							</>
						) : null}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<Question
						step={1}
						prompt="Has this signal been reported before, and is it already under investigation?"
						hint="Only a signal someone is already working counts. A signal reported twice that nobody has picked up is not a duplicate — it is untriaged."
						value={reportedBefore}
						onChange={(v) => {
							setReportedBefore(v);
							if (v) setGenuineThreat(null);
						}}
						yesLeadsOff
					/>

					{reportedBefore === false && (
						<Question
							step={2}
							prompt="Does it represent a genuine or potential threat to public health?"
							hint="Triage decides whether verification is warranted — not whether the report is true."
							value={genuineThreat}
							onChange={setGenuineThreat}
							noLeadsOff
						/>
					)}

					{decision !== null && (
						<div
							className={cn(
								"rounded-lg border p-3",
								continues
									? "border-emerald-200 bg-emerald-50"
									: "border-slate-200 bg-slate-50"
							)}
						>
							<p className="flex items-center gap-2 text-sm font-semibold">
								{continues ? (
									<ArrowRight className="h-4 w-4 text-emerald-700" />
								) : (
									<CircleSlash className="h-4 w-4 text-slate-500" />
								)}
								{decision === TRIAGE_FORWARDED
									? "Forward to verification"
									: decision === TRIAGE_LOGGED
										? "Log and monitor"
										: "Discard as already reported"}
							</p>
							<p className="mt-1 text-xs text-muted-foreground">
								{TRIAGE_DECISION_GUIDANCE[decision]}
							</p>
						</div>
					)}

					{decision === TRIAGE_DISCARDED && (
						<div className="space-y-1">
							<Label htmlFor="triage-duplicate-of" className="text-xs">
								Duplicate of{" "}
								<span className="text-muted-foreground">
									(optional signal ID)
								</span>
							</Label>
							<Input
								id="triage-duplicate-of"
								inputMode="numeric"
								value={duplicateOf}
								onChange={(e) => setDuplicateOf(e.target.value)}
								placeholder="e.g. 6142"
								className="h-8 text-xs"
							/>
							<p className="text-[11px] text-muted-foreground">
								Links this signal to the one it repeats, so the reporting
								cluster is visible instead of just the discard.
							</p>
						</div>
					)}

					{continues && (
						<div className="space-y-2">
							<Label className="text-xs">
								Priority — this sets the verification deadline
							</Label>
							{TRIAGE_PRIORITIES.map((option) => {
								const selected = priority === option;
								return (
									<button
										key={option}
										type="button"
										onClick={() => setPriority(option)}
										aria-pressed={selected}
										className={cn(
											"w-full rounded-lg border p-3 text-left transition-colors",
											selected
												? "border-uganda-red bg-uganda-red/5 ring-1 ring-uganda-red"
												: "border-gray-200 hover:bg-gray-50"
										)}
									>
										<div className="flex items-center justify-between gap-2">
											<span className="text-sm font-semibold">{option}</span>
											<span
												className={cn(
													"rounded px-1.5 py-0.5 text-[10px] font-semibold",
													selected
														? "bg-uganda-red text-white"
														: "bg-gray-100 text-gray-600"
												)}
											>
												verify within {formatDeadline(option)}
											</span>
										</div>
										<p className="mt-1 text-xs text-muted-foreground">
											{PRIORITY_GUIDANCE[option]}
										</p>
									</button>
								);
							})}
						</div>
					)}

					{decision !== null && (
						<div className="space-y-1">
							<Label htmlFor="triage-reason" className="text-xs">
								{reasonRequired ? (
									<>
										Why is this signal leaving the pipeline?{" "}
										<span className="text-uganda-red">*</span>
									</>
								) : (
									<>
										Why this priority?{" "}
										<span className="text-muted-foreground">(optional)</span>
									</>
								)}
							</Label>
							<Textarea
								id="triage-reason"
								value={reasonRequired ? reason : note}
								onChange={(e) =>
									reasonRequired
										? setReason(e.target.value)
										: setNote(e.target.value)
								}
								placeholder={
									reasonRequired
										? "e.g. same cluster as ALT6142, RRT already deployed"
										: "e.g. cluster of 3 in one village, bleeding reported"
								}
								className="min-h-[64px] text-xs"
							/>
							<p className="text-[11px] text-muted-foreground">
								{reasonRequired
									? "Required. Without a stated reason a discard is indistinguishable from a signal nobody looked at."
									: "Kept on the signal's traceability timeline, so a later re-triage does not erase the original reasoning."}
							</p>
						</div>
					)}
				</div>

				<div className="flex justify-end gap-2">
					<Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button size="sm" onClick={submit} disabled={!canSubmit || saving}>
						{saving && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
						{continues ? "Forward for verification" : "Record decision"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

/**
 * One triage question. The answer that takes the signal OFF the pipeline is
 * marked, so an operator can see the consequence before choosing rather than
 * after.
 */
function Question({
	step,
	prompt,
	hint,
	value,
	onChange,
	yesLeadsOff,
	noLeadsOff,
}: {
	step: number;
	prompt: string;
	hint: string;
	value: boolean | null;
	onChange: (value: boolean) => void;
	yesLeadsOff?: boolean;
	noLeadsOff?: boolean;
}) {
	return (
		<div className="space-y-2">
			<p className="text-sm font-medium">
				<span className="mr-1.5 font-mono text-xs text-muted-foreground">
					{step}.
				</span>
				{prompt}
			</p>
			<div className="flex gap-2">
				{[
					{ label: "Yes", answer: true, off: Boolean(yesLeadsOff) },
					{ label: "No", answer: false, off: Boolean(noLeadsOff) },
				].map((option) => {
					const selected = value === option.answer;
					return (
						<button
							key={option.label}
							type="button"
							onClick={() => onChange(option.answer)}
							aria-pressed={selected}
							className={cn(
								"flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors",
								selected
									? option.off
										? "border-slate-400 bg-slate-100 text-slate-800 ring-1 ring-slate-400"
										: "border-uganda-red bg-uganda-red/5 text-uganda-black ring-1 ring-uganda-red"
									: "border-gray-200 hover:bg-gray-50"
							)}
						>
							{option.label}
							{option.off && (
								<span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
									leaves pipeline
								</span>
							)}
						</button>
					);
				})}
			</div>
			<p className="text-[11px] text-muted-foreground">{hint}</p>
		</div>
	);
}
