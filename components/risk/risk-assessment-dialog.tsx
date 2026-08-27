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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { altCode } from "@/lib/alt-code";
import { AuthService } from "@/lib/auth";
import { getClientApiBaseUrl } from "@/lib/api-config";
import {
	RISK_ACTION,
	RISK_BADGE_CLASS,
	RISK_QUESTIONS,
	deriveRiskLevel,
	normalizeRiskLevel,
} from "@/lib/alert-risk";
import { Loader2, ShieldAlert } from "lucide-react";

const API_BASE_URL = getClientApiBaseUrl();

type Answers = { severe?: boolean; spread?: boolean; control?: boolean };

/**
 * Risk assessment — EBS step 4.
 *
 * The level is DERIVED from three yes/no answers, never picked directly: two
 * assessors giving the same answers must land on the same level. The derived
 * level and the response it mandates are previewed live, so the assessor sees
 * what their answers commit the team to before saving — for a Very High event
 * that is a response outside normal working hours.
 */
export function RiskAssessmentDialog({
	open,
	onOpenChange,
	alertId,
	current,
	onAssessed,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	alertId: number | null;
	current?: {
		riskSevere?: boolean | null;
		riskSpread?: boolean | null;
		riskControl?: boolean | null;
		riskLevel?: string | null;
	};
	onAssessed?: () => void;
}) {
	const [answers, setAnswers] = useState<Answers>({});
	const [note, setNote] = useState("");
	const [saving, setSaving] = useState(false);

	// Re-seed each time the dialog opens so a re-assessment starts from the
	// recorded answers rather than the previous alert's.
	useEffect(() => {
		if (!open) return;
		setAnswers({
			severe: current?.riskSevere ?? undefined,
			spread: current?.riskSpread ?? undefined,
			control: current?.riskControl ?? undefined,
		});
		setNote("");
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, current?.riskSevere, current?.riskSpread, current?.riskControl]);

	const complete =
		answers.severe !== undefined &&
		answers.spread !== undefined &&
		answers.control !== undefined;

	// Preview the level, but only once all three are answered — a partial answer
	// set has no defined level, and guessing at one would misinform the assessor.
	const level = useMemo(
		() =>
			complete
				? deriveRiskLevel(answers.severe!, answers.spread!, answers.control!)
				: null,
		[complete, answers.severe, answers.spread, answers.control]
	);

	const submit = useCallback(async () => {
		if (!alertId || !complete) return;
		setSaving(true);
		try {
			const response = await AuthService.makeAuthenticatedRequest(
				`${API_BASE_URL}/alerts/${alertId}/risk-assessment`,
				{
					method: "POST",
					body: JSON.stringify({
						severe: answers.severe,
						spread: answers.spread,
						control: answers.control,
						note: note.trim() || undefined,
					}),
				}
			);
			if (!response.ok) {
				const data = await response.json().catch(() => ({}));
				throw new Error(data.error || "Failed to record risk assessment");
			}
			const data = await response.json();
			hotToast.success(
				`${altCode(alertId)} assessed ${data.riskAssessment?.level ?? level}`
			);
			onAssessed?.();
			onOpenChange(false);
		} catch (e) {
			hotToast.error(
				e instanceof Error ? e.message : "Failed to record risk assessment"
			);
		} finally {
			setSaving(false);
		}
	}, [alertId, complete, answers, note, level, onAssessed, onOpenChange]);

	const reassessing = Boolean(normalizeRiskLevel(current?.riskLevel));

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-base">
						<ShieldAlert className="h-4 w-4 text-uganda-red" />
						{reassessing ? "Re-assess risk" : "Risk assessment"} —{" "}
						{altCode(alertId)}
					</DialogTitle>
					<DialogDescription className="text-xs">
						Answer all three questions. The risk level is calculated from your
						answers using the national algorithm — it is not chosen directly.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3">
					{RISK_QUESTIONS.map((q, index) => {
						const value = answers[q.key];
						return (
							<div
								key={q.key}
								className="rounded-lg border border-gray-200 p-3"
							>
								<p className="text-sm font-medium">
									<span className="mr-1 text-muted-foreground">
										{index + 1}.
									</span>
									{q.question}
								</p>
								<p className="mt-0.5 text-xs text-muted-foreground">{q.hint}</p>
								<div className="mt-2 flex gap-2">
									{[
										{ label: "Yes", val: true },
										{ label: "No", val: false },
									].map((opt) => (
										<button
											key={opt.label}
											type="button"
											aria-pressed={value === opt.val}
											onClick={() =>
												setAnswers((prev) => ({ ...prev, [q.key]: opt.val }))
											}
											className={cn(
												"rounded-md border px-4 py-1 text-xs font-semibold transition-colors",
												value === opt.val
													? "border-uganda-red bg-uganda-red text-white"
													: "border-gray-200 hover:bg-gray-50"
											)}
										>
											{opt.label}
										</button>
									))}
								</div>
							</div>
						);
					})}

					{/* The consequence of the answers, shown before saving. */}
					<div
						className={cn(
							"rounded-lg border p-3",
							level ? RISK_BADGE_CLASS[level] : "border-gray-200 bg-gray-50"
						)}
					>
						{level ? (
							<>
								<p className="text-xs font-semibold uppercase tracking-wide opacity-80">
									Calculated risk level
								</p>
								<p className="text-lg font-bold leading-tight">{level}</p>
								<p className="mt-1 text-xs">{RISK_ACTION[level]}</p>
							</>
						) : (
							<p className="text-xs text-muted-foreground">
								Answer all three questions to see the calculated risk level and
								the response it requires.
							</p>
						)}
					</div>

					<div className="space-y-1">
						<Label htmlFor="risk-note" className="text-xs">
							Assessment notes{" "}
							<span className="text-muted-foreground">(optional)</span>
						</Label>
						<Textarea
							id="risk-note"
							value={note}
							onChange={(e) => setNote(e.target.value)}
							placeholder="e.g. no vaccine stock in district; border sub-county with daily crossings"
							className="min-h-[64px] text-xs"
						/>
						<p className="text-[11px] text-muted-foreground">
							Kept on the signal&apos;s traceability timeline, so a later
							re-assessment does not erase the original reasoning.
						</p>
					</div>
				</div>

				<div className="flex justify-end gap-2">
					<Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button size="sm" onClick={submit} disabled={!complete || saving}>
						{saving && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
						{reassessing ? "Update assessment" : "Record assessment"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
