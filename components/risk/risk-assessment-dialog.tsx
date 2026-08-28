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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { FacilityPicker } from "@/components/facilities/facility-picker";
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
	deriveMatrixLevel,
	normalizeRiskLevel,
	riskWorksheetComplete,
	RISK_ACTION_PRIMARY_OPTIONS,
	RISK_ACTION_RESPONSE_OPTIONS,
	RISK_ACTION_RESPOND,
	RISK_ACTION_HINTS,
	parseRiskActions,
	riskActionPrimary,
	riskActionsNeedFacility,
} from "@/lib/alert-risk";
import {
	EMPTY_RRT_PERSON,
	formatRrtMembers,
	formatRrtPerson,
	parseRrtMembers,
	parseRrtPerson,
	type RrtPerson,
} from "@/lib/rrt-team";
import { RiskAssessmentHistory } from "./risk-assessment-history";
import { Loader2, Plus, ShieldAlert, X } from "lucide-react";

const API_BASE_URL = getClientApiBaseUrl();

type Answers = { severe?: boolean; spread?: boolean; control?: boolean };

/** The worksheet fields — optional, and measured rather than enforced. */
type Worksheet = {
	likelihood: string;
	impact: string;
	hazardNote: string;
	exposureNote: string;
	contextNote: string;
};

/**
 * A member row keeps a stable id: keying the inputs by array index makes React
 * reuse the removed row's DOM, so deleting the middle member moves the cursor
 * and the value of the one below it.
 */
type MemberRow = RrtPerson & { id: number };

let nextMemberId = 1;
const blankMember = (): MemberRow => ({ ...EMPTY_RRT_PERSON, id: nextMemberId++ });

const EMPTY_WORKSHEET: Worksheet = {
	likelihood: "",
	impact: "",
	hazardNote: "",
	exposureNote: "",
	contextNote: "",
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
		riskActionTaken?: string | null;
		riskEvacuationFacility?: string | null;
		riskEvacuationFacilityUid?: string | null;
		/** The alert's own district, used to seed the evacuation picker. */
		alertCaseDistrict?: string | null;
	};
	onAssessed?: () => void;
}) {
	const [answers, setAnswers] = useState<Answers>({});
	const [sheet, setSheet] = useState<Worksheet>(EMPTY_WORKSHEET);
	// The RRT is structured here and flattened on save — see lib/rrt-team.ts
	// for the encoding and why it stays in the two existing text columns.
	const [lead, setLead] = useState<RrtPerson>(EMPTY_RRT_PERSON);
	// "What action have you taken?" — the last question on the form, in two
	// levels: ONE stance, and (under Respond only) any number of the sub-actions
	// saying how that response was mounted. Held apart so choosing a stance that
	// is not a response cannot leave orphaned sub-actions behind.
	const [stance, setStance] = useState("");
	const [subActions, setSubActions] = useState<string[]>([]);
	const [evacFacility, setEvacFacility] = useState("");
	const [evacFacilityUid, setEvacFacilityUid] = useState("");
	const [members, setMembers] = useState<MemberRow[]>([blankMember()]);

	const setMember = useCallback((id: number, patch: Partial<RrtPerson>) => {
		setMembers((rows) =>
			rows.map((row) => (row.id === id ? { ...row, ...patch } : row))
		);
	}, []);
	// Removing the last row leaves a blank one behind rather than an empty
	// section with no way back to an input.
	const removeMember = useCallback((id: number) => {
		setMembers((rows) => {
			const left = rows.filter((row) => row.id !== id);
			return left.length > 0 ? left : [blankMember()];
		});
	}, []);
	const addMember = useCallback(
		() => setMembers((rows) => [...rows, blankMember()]),
		[]
	);
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
		});
		// Seeded from the stored column. Rows written before the question became
		// two-level can carry a bare "EMS Evacuation" with no stance; those adopt
		// Respond, because that is what a sub-action already meant. Without the
		// heal the checkboxes would not render and a re-assessment would silently
		// drop the evacuation it inherited.
		const stored = parseRiskActions(current?.riskActionTaken);
		const storedSubs = stored.filter((a) =>
			(RISK_ACTION_RESPONSE_OPTIONS as readonly string[]).includes(a)
		);
		setStance(
			riskActionPrimary(stored) ||
			(storedSubs.length > 0 ? RISK_ACTION_RESPOND : "")
		);
		setSubActions(storedSubs);
		setEvacFacility(current?.riskEvacuationFacility ?? "");
		setEvacFacilityUid(current?.riskEvacuationFacilityUid ?? "");
		setLead(parseRrtPerson(current?.riskTeamLead));
		setMembers(
			parseRrtMembers(current?.riskTeamMembers).map((person) => ({
				...person,
				id: nextMemberId++,
			}))
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, current?.riskSevere, current?.riskSpread, current?.riskControl]);

	// With the algorithm questions hidden, the MATRIX carries the level: both
	// bands together, and the server derives the same level from the same grid.
	const level = useMemo(
		() => deriveMatrixLevel(sheet.likelihood, sheet.impact),
		[sheet.likelihood, sheet.impact]
	);

	// A half-placed event has no level — preview nothing and save nothing until
	// both bands are chosen, rather than guessing at the missing axis.
	const complete = level !== null;

	// Sub-actions only count under Respond — the server refuses them under any
	// other stance, so the form must not send what a stale checkbox left behind.
	const responding = stance === RISK_ACTION_RESPOND;
	const actions = useMemo(
		() =>
			parseRiskActions(
				[stance, ...(responding ? subActions : [])].join(",")
			),
		[stance, responding, subActions]
	);

	// EMS Evacuation is the one action that needs a destination: an evacuation
	// with nowhere recorded cannot say where to follow the patient up, so the
	// form blocks on it rather than saving a half-record the API would reject.
	const needsFacility = riskActionsNeedFacility(actions);
	const blockedOnFacility = needsFacility && !evacFacility.trim();

	// Picking a stance is a decision about the whole question: leaving Respond
	// must not leave "Monitor" carrying an evacuation nobody can see any more.
	const chooseStance = useCallback((next: string) => {
		setStance(next);
		if (next !== RISK_ACTION_RESPOND) {
			setSubActions([]);
			setEvacFacility("");
			setEvacFacilityUid("");
		}
	}, []);

	const toggleSubAction = useCallback((option: string, on: boolean) => {
		setSubActions((prev) =>
			on ? [...prev, option] : prev.filter((a) => a !== option)
		);
	}, []);

	const submit = useCallback(async () => {
		if (!alertId || !complete || blockedOnFacility) return;
		setSaving(true);
		try {
			const response = await AuthService.makeAuthenticatedRequest(
				`${API_BASE_URL}/alerts/${alertId}/risk-assessment`,
				{
					method: "POST",
					// The three algorithm answers are deliberately NOT sent while the
					// questions are hidden: sending the seeded values would have the
					// server derive an algorithm level that contradicts the matrix
					// level previewed above. Answers already on the alert are left
					// untouched rather than blanked.
					body: JSON.stringify({
						note: note.trim() || undefined,
						...sheet,
						teamLead: formatRrtPerson(lead),
						teamMembers: formatRrtMembers(members),
						actionTaken: actions.join(", "),
						evacuationFacility: needsFacility ? evacFacility : "",
						evacuationFacilityUid: needsFacility ? evacFacilityUid : "",
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
	}, [
		alertId,
		complete,
		blockedOnFacility,
		needsFacility,
		note,
		sheet,
		lead,
		members,
		actions,
		evacFacility,
		evacFacilityUid,
		level,
		onAssessed,
		onOpenChange,
	]);

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
			<DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-base">
						<ShieldAlert className="h-4 w-4 text-uganda-red" />
						{reassessing ? "Re-assess risk" : "Risk assessment"} —{" "}
						{altCode(alertId)}
					</DialogTitle>
					<DialogDescription className="text-xs">
						Place the event on the risk matrix. The risk level is calculated from
						the likelihood and impact you select — it is not chosen directly.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3">
					{/* Risk algorithm questions — temporarily commented out.
					    The three yes/no answers are the only input to deriveRiskLevel,
					    so while this block is hidden no level can be calculated and
					    "Record assessment" stays disabled. Uncomment to restore.
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
					*/}

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
								{sheetComplete ? "Complete" : "Analysis notes optional"}
							</span>
						</div>

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

						{/* Matrix axes — Figure 4. These two now CARRY the level, so unlike
						    the rest of the worksheet they are required: the save is gated on
						    both being chosen. */}
						<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
							<div className="space-y-1">
								<Label className="text-xs">
									Likelihood <span className="text-uganda-red">*</span>
								</Label>
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
								<Label className="text-xs">
									Impact <span className="text-uganda-red">*</span>
								</Label>
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

						{/* The consequence of the two bands, colour-coded and shown the
						    moment both are chosen — the assessor sees what the placement
						    commits the team to BEFORE saving. For a Very High event that is
						    a response outside normal working hours, so Very High is the one
						    band that reads as an emergency rather than as a tint. */}
						{level ? (
							<div
								className={cn(
									"rounded-md border p-3",
									RISK_BADGE_CLASS[level]
								)}
							>
								<p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
									Calculated risk level · {sheet.likelihood} × {sheet.impact}
								</p>
								<p className="text-lg font-bold leading-tight">{level}</p>
								<p className="mt-1 text-xs leading-snug">{RISK_ACTION[level]}</p>
							</div>
						) : (
							<p className="text-[11px] text-muted-foreground">
								Select both a likelihood and an impact to calculate the risk level
								and the response it requires.
							</p>
						)}

						{/* The RRT. The guideline names a TEAM led by the DHO, not an
						    individual assessor — and a team that has to be REACHABLE
						    while the response runs, which is why every person carries a
						    phone number rather than a job title alone. */}
						<div className="space-y-3">
							<div className="space-y-1">
								<Label htmlFor="risk-team-lead" className="text-xs">
									RRT lead
								</Label>
								<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
									<Input
										id="risk-team-lead"
										value={lead.name}
										onChange={(e) =>
											setLead((p) => ({ ...p, name: e.target.value }))
										}
										placeholder="Name — e.g. DHO Kasese"
										className="h-8 text-xs"
									/>
									<Input
										id="risk-team-lead-phone"
										type="tel"
										inputMode="tel"
										value={lead.phone}
										onChange={(e) =>
											setLead((p) => ({ ...p, phone: e.target.value }))
										}
										placeholder="Phone — e.g. 0772 123 456"
										className="h-8 text-xs"
									/>
								</div>
							</div>

							<div className="space-y-2">
								{/* Not a <Label>: it names the group, and each input
								    carries its own aria-label — a label element bound to
								    nothing is worse for a screen reader than none. */}
								<p className="text-xs font-medium leading-none">RRT members</p>
								<div className="space-y-2">
									{members.map((member, index) => (
										<div key={member.id} className="flex items-center gap-2">
											<Input
												value={member.name}
												onChange={(e) =>
													setMember(member.id, { name: e.target.value })
												}
												placeholder="Name — e.g. surveillance focal person"
												aria-label={`Member ${index + 1} name`}
												className="h-8 min-w-0 flex-1 text-xs"
											/>
											<Input
												type="tel"
												inputMode="tel"
												value={member.phone}
												onChange={(e) =>
													setMember(member.id, { phone: e.target.value })
												}
												placeholder="Phone"
												aria-label={`Member ${index + 1} phone`}
												className="h-8 w-28 shrink-0 text-xs sm:w-40"
											/>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												onClick={() => removeMember(member.id)}
												aria-label={`Remove member ${index + 1}`}
												className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
											>
												<X />
											</Button>
										</div>
									))}
								</div>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={addMember}
									className="h-7 gap-1 text-xs"
								>
									<Plus />
									Add member
								</Button>
								<p className="text-[11px] text-muted-foreground">
									One row per person. Blank rows are dropped when the
									assessment is saved.
								</p>
							</div>
						</div>
					</div>

					{/* The series so far. An event is re-assessed as it develops, and
					    the alert's own columns only hold the latest — the reasoning a
					    re-assessment is about to overwrite is here and nowhere else,
					    so it belongs in front of the person overwriting it. Renders
					    nothing on a first assessment. */}
					<RiskAssessmentHistory
						alertId={alertId ?? undefined}
						enabled={open}
						skipLatest
						title="Earlier assessments"
					/>

					{/* The reasoning behind the level, kept with the ASSESSMENT it
					    explains rather than after the action taken. The form reads as
					    one thought that way — score the event, say why — and leaves
					    "what have you done about it?" as the closing question. */}
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

					{/* The last question: what was actually DONE. A risk level with
					    no action recorded against it is a score nobody acted on, and
					    the RRT that assessed the event is the team that knows.

					    TWO LEVELS: one stance (Respond / Monitor / No Investigation),
					    and under Respond only, any number of sub-actions saying how
					    the response was mounted — a team can sample, evacuate and bury
					    from the same event, so those are checkboxes, not alternatives.

					    Stored in its own column, NOT alerts.response_actions — that
					    one is desk verification's record, and writing it from here
					    would let an assessment silently overwrite the desk. */}
					<div className="space-y-2 rounded-md border border-gray-200 p-3">
						<div className="flex items-start justify-between gap-2">
							<div>
								<p className="text-xs font-medium leading-none">
									What action have you taken?{" "}
									<span className="font-normal text-muted-foreground">
										(optional)
									</span>
								</p>
								<p className="mt-1 text-[11px] text-muted-foreground">
									Leave blank if nothing has been done yet; that is a real
									state, and guessing one would be worse.
								</p>
							</div>
							{/* A radio group cannot be un-picked, and this question is
							    optional — without this, a mis-click is permanent. */}
							{stance && (
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="h-6 shrink-0 px-2 text-[11px]"
									onClick={() => chooseStance("")}
								>
									Clear
								</Button>
							)}
						</div>

						<RadioGroup
							value={stance}
							onValueChange={chooseStance}
							className="grid gap-1.5"
						>
							{RISK_ACTION_PRIMARY_OPTIONS.map((option) => (
								<div key={option}>
									<label className="flex cursor-pointer items-start gap-2 rounded px-1 py-1 hover:bg-gray-50">
										<RadioGroupItem value={option} className="mt-0.5" />
										<span className="min-w-0">
											<span className="block text-xs font-medium leading-none">
												{option}
											</span>
											<span className="mt-0.5 block text-[11px] text-muted-foreground">
												{RISK_ACTION_HINTS[option]}
											</span>
										</span>
									</label>

									{/* Nested under Respond, and only there: each of these
									    IS a response, so recording one without Respond
									    would read as an event nobody responded to. */}
									{option === RISK_ACTION_RESPOND && responding && (
										<div className="ml-6 mt-1 space-y-1.5 border-l-2 border-gray-200 pl-3">
											<p className="text-[11px] font-medium text-muted-foreground">
												What did the response involve?{" "}
												<span className="font-normal">
													(optional — tick any that apply)
												</span>
											</p>
											<div className="grid gap-1.5 sm:grid-cols-2">
												{RISK_ACTION_RESPONSE_OPTIONS.map((sub) => (
													<label
														key={sub}
														className="flex cursor-pointer items-start gap-2 rounded px-1 py-1 hover:bg-gray-50"
													>
														<Checkbox
															checked={subActions.includes(sub)}
															onCheckedChange={(checked) =>
																toggleSubAction(sub, checked === true)
															}
															className="mt-0.5"
														/>
														<span className="min-w-0">
															<span className="block text-xs font-medium leading-none">
																{sub}
															</span>
															<span className="mt-0.5 block text-[11px] text-muted-foreground">
																{RISK_ACTION_HINTS[sub]}
															</span>
														</span>
													</label>
												))}
											</div>
										</div>
									)}
								</div>
							))}
						</RadioGroup>

						{/* Only asked when it applies — the destination is meaningless
						    for any other action, and a picker that is always on screen
						    invites filling it in when nobody was evacuated. */}
						{needsFacility && (
							<div className="space-y-2 rounded-md border border-uganda-red/30 bg-uganda-red/5 p-2.5">
								<FacilityPicker
									label="Evacuated to *"
									value={evacFacility}
									onChange={(name, uid) => {
										setEvacFacility(name);
										setEvacFacilityUid(uid);
									}}
									defaultDistrict={current?.alertCaseDistrict ?? undefined}
									placeholder="Search the facility the patient was taken to…"
								/>
								{blockedOnFacility && (
									<p className="text-[11px] font-medium text-destructive">
										Select the destination facility to record the
										evacuation.
									</p>
								)}
							</div>
						)}
					</div>
				</div>

				<div className="flex justify-end gap-2">
					<Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						size="sm"
						onClick={submit}
						disabled={!complete || saving || blockedOnFacility}
					>
						{saving && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
						{reassessing ? "Update assessment" : "Record assessment"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
