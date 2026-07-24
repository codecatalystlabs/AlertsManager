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
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { altCode } from "@/lib/alt-code";
import { AuthService } from "@/lib/auth";
import { getClientApiBaseUrl } from "@/lib/api-config";
import {
	RISK_ACTION,
	RISK_BADGE_CLASS,
	RISK_QUESTIONS,
	RISK_LIKELIHOODS,
	RISK_IMPACTS,
	RISK_TIERS,
	deriveRiskLevel,
	normalizeRiskLevel,
	riskWorksheetComplete,
} from "@/lib/alert-risk";
import { Loader2, ShieldAlert } from "lucide-react";

const API_BASE_URL = getClientApiBaseUrl();

type Answers = { severe?: boolean; spread?: boolean; control?: boolean };

/** The worksheet fields — optional, and measured rather than enforced. */
type Worksheet = {
	likelihood: string;
	impact: string;
	hazardNote: string;
	exposureNote: string;
	contextNote: string;
	teamLead: string;
	teamMembers: string;
};

const EMPTY_WORKSHEET: Worksheet = {
	likelihood: "",
	impact: "",
	hazardNote: "",
	exposureNote: "",
	contextNote: "",
	teamLead: "",
	teamMembers: "",
};

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
		riskLikelihood?: string | null;
		riskImpact?: string | null;
		riskHazardNote?: string | null;
		riskExposureNote?: string | null;
		riskContextNote?: string | null;
		riskTeamLead?: string | null;
		riskTeamMembers?: string | null;
	};
	onAssessed?: () => void;
}) {
	const [answers, setAnswers] = useState<Answers>({});
	const [sheet, setSheet] = useState<Worksheet>(EMPTY_WORKSHEET);
	const [note, setNote] = useState("");
	const [saving, setSaving] = useState(false);
	const setField = (key: keyof Worksheet, value: string) =>
		setSheet((prev) => ({ ...prev, [key]: value }));

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
		setSheet({
			likelihood: current?.riskLikelihood ?? "",
			impact: current?.riskImpact ?? "",
			hazardNote: current?.riskHazardNote ?? "",
			exposureNote: current?.riskExposureNote ?? "",
			contextNote: current?.riskContextNote ?? "",
			teamLead: current?.riskTeamLead ?? "",
			teamMembers: current?.riskTeamMembers ?? "",
		});
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
						...sheet,
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
	}, [alertId, complete, answers, note, sheet, level, onAssessed, onOpenChange]);

	const reassessing = Boolean(normalizeRiskLevel(current?.riskLevel));
	const sheetComplete = riskWorksheetComplete({
		riskHazardNote: sheet.hazardNote,
		riskExposureNote: sheet.exposureNote,
		riskContextNote: sheet.contextNote,
		riskLikelihood: sheet.likelihood,
		riskImpact: sheet.impact,
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-xl max-h-[88vh] overflow-y-auto">
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

					{/* The worksheet §10 requires: the two matrix axes and the three
					    tiers of analysis that justify the level. Optional by design —
					    an RRT working an outbreak must be able to record a level in
					    seconds, so completeness is measured, not enforced. */}
					<div className="space-y-3 rounded-lg border border-dashed border-gray-300 p-3">
						<div className="flex items-center justify-between gap-2">
							<p className="text-xs font-semibold uppercase tracking-wide">
								Risk assessment worksheet
							</p>
							<span
								className={cn(
									"rounded px-1.5 py-0.5 text-[10px] font-semibold",
									sheetComplete
										? "bg-emerald-100 text-emerald-800"
										: "bg-gray-100 text-gray-600"
								)}
							>
								{sheetComplete ? "Complete" : "Optional — not complete"}
							</span>
						</div>

						{/* Matrix axes. Recorded for the record; the LEVEL above always
						    comes from the algorithm, never from this pair. */}
						<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
							<div className="space-y-1">
								<Label className="text-xs">Likelihood</Label>
								<select
									value={sheet.likelihood}
									onChange={(e) => setField("likelihood", e.target.value)}
									className="h-8 w-full rounded-md border border-gray-200 bg-white px-2 text-xs"
								>
									<option value="">Not recorded</option>
									{RISK_LIKELIHOODS.map((l) => (
										<option key={l.value} value={l.value}>
											{l.value} ({l.probability})
										</option>
									))}
								</select>
							</div>
							<div className="space-y-1">
								<Label className="text-xs">Impact</Label>
								<select
									value={sheet.impact}
									onChange={(e) => setField("impact", e.target.value)}
									className="h-8 w-full rounded-md border border-gray-200 bg-white px-2 text-xs"
								>
									<option value="">Not recorded</option>
									{RISK_IMPACTS.map((i) => (
										<option key={i.value} value={i.value}>
											{i.value}
										</option>
									))}
								</select>
							</div>
						</div>
						{sheet.impact && (
							<p className="text-[11px] text-muted-foreground">
								{RISK_IMPACTS.find((i) => i.value === sheet.impact)?.meaning}
							</p>
						)}

						{/* The three tiers of analysis (§2 step 4). */}
						{RISK_TIERS.map((tier) => (
							<div key={tier.key} className="space-y-1">
								<Label htmlFor={`risk-${tier.key}`} className="text-xs">
									{tier.label} assessment
								</Label>
								<p className="text-[11px] text-muted-foreground">{tier.prompt}</p>
								<Textarea
									id={`risk-${tier.key}`}
									value={sheet[tier.key]}
									onChange={(e) => setField(tier.key, e.target.value)}
									className="min-h-[52px] text-xs"
								/>
							</div>
						))}

						{/* The RRT. The guideline names a TEAM led by the DHO, not an
						    individual assessor. */}
						<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
							<div className="space-y-1">
								<Label htmlFor="risk-team-lead" className="text-xs">
									RRT lead
								</Label>
								<Input
									id="risk-team-lead"
									value={sheet.teamLead}
									onChange={(e) => setField("teamLead", e.target.value)}
									placeholder="e.g. DHO Kasese"
									className="h-8 text-xs"
								/>
							</div>
							<div className="space-y-1">
								<Label htmlFor="risk-team-members" className="text-xs">
									RRT members
								</Label>
								<Input
									id="risk-team-members"
									value={sheet.teamMembers}
									onChange={(e) => setField("teamMembers", e.target.value)}
									placeholder="e.g. surveillance, clinical, lab, vet"
									className="h-8 text-xs"
								/>
							</div>
						</div>
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
