"use client";

import { altCode } from "@/lib/alt-code";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
	Siren,
	Info,
	CircleUser,
	MapPin,
	Stethoscope,
	Phone,
	Calendar,
	Clock,
	Activity,
	ShieldCheck,
	ShieldQuestion,
	History,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Alert } from "@/lib/auth";
import { alertResponse } from "@/constants";
import { SignalTimeline } from "@/components/alerts/signal-timeline";
import { SignalStateBadge, StageRail } from "@/components/pipeline";
import { signalTitle } from "@/lib/signal-state";
import { formatDateTime } from "@/lib/format-date";
import { PriorityBadge, TriageBadge } from "@/components/triage";
import { signalSummary } from "@/lib/ebs-signals";
import { RiskBadge } from "@/components/risk";
import {
	RISK_ACTION,
	normalizeRiskLevel,
	riskWorksheetComplete,
} from "@/lib/alert-risk";

/**
 * Render a tri-state risk answer. "Not recorded" is distinct from "No": an
 * unanswered question is a gap in the assessment, not a negative finding.
 */
function yesNo(value?: boolean | null): string {
	if (value === true) return "Yes";
	if (value === false) return "No";
	return "Not recorded";
}

interface AlertDetailsDialogProps {
	isOpen: boolean;
	onClose: () => void;
	alert: Alert;
}

/** Resolve a response code (e.g. "ViralHemorrhagicFever") to its display name. */
function responseDisplayName(code?: string | null): string | undefined {
	if (!code) return undefined;
	return alertResponse.find((d) => d.code === code)?.name ?? code;
}

/** A labelled section header: small consistent lucide icon + uppercase title. */
function SectionHeader({
	icon: Icon,
	title,
	className,
}: {
	icon: LucideIcon;
	title: string;
	className?: string;
}) {
	return (
		<div className="flex items-center gap-1.5">
			<Icon className={cn("h-4 w-4 text-uganda-red", className)} />
			<h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">
				{title}
			</h3>
		</div>
	);
}

/** Compact label/value pair. */
function Field({
	label,
	value,
	children,
}: {
	label: string;
	value?: string | number | null;
	children?: ReactNode;
}) {
	return (
		<div className="min-w-0">
			<p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
				{label}
			</p>
			{children ?? (
				<p className="truncate text-sm text-foreground">
					{value === undefined || value === null || value === ""
						? "—"
						: value}
				</p>
			)}
		</div>
	);
}

export function AlertDetailsDialog({
	isOpen,
	onClose,
	alert,
}: AlertDetailsDialogProps) {
	if (!alert) return null;

	const hasVerificationInfo = Boolean(
		alert.isVerified ||
			alert.verifiedBy ||
			alert.verificationDate ||
			alert.verificationTime ||
			alert.actions ||
			alert.feedback ||
			alert.caseVerificationDesk ||
			alert.fieldVerification ||
			alert.fieldVerificationDecision
	);

	const formatDate = (dateString: string) =>
		new Date(dateString).toLocaleDateString();
	const formatTime = (timeString: string) =>
		new Date(timeString).toLocaleTimeString();

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-2xl max-h-[88vh] gap-0 overflow-y-auto p-0">
				<DialogHeader className="border-b px-4 py-3">
					<DialogTitle className="flex items-center gap-2 text-base">
						<Siren className="h-4 w-4 text-uganda-red" />
						{/* Named by what it currently IS. The guideline renames
						    the object at each gate, and a confirmed signal that
						    still reads "alert" is how the three terms collapse
						    into one in conversation. */}
						{signalTitle(alert, altCode(alert.id))}
						<SignalStateBadge record={alert} />
					</DialogTitle>
					<DialogDescription className="text-xs">
						Everything recorded about this record, and where it stands
						in the EBS pipeline.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3 px-4 py-3">
					{/* Where this signal stands in the EBS pipeline. First,
					    because "which gate is it at?" frames everything below
					    it — the fields only mean something once you know
					    whether they are still being established. */}
					<StageRail signal={alert} />

					{/* Status and verification */}
					<div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted px-3 py-2">
						<div className="flex items-center gap-1.5">
							<Badge
								className={cn(
									"text-[11px]",
									alert.status === "Alive"
										? "bg-success/15 text-success"
										: "bg-destructive/15 text-destructive"
								)}
							>
								{alert.status || "Pending"}
							</Badge>
							<Badge
								className={cn(
									"text-[11px]",
									alert.isVerified
										? "bg-success/15 text-success"
										: "bg-warning/15 text-warning"
								)}
							>
								{alert.isVerified
									? "Verified"
									: "Pending Verification"}
							</Badge>
						</div>
						<div className="flex items-center gap-1 text-xs text-muted-foreground">
							<Calendar className="h-3.5 w-3.5" />
							{formatDate(alert.date)}
							<Clock className="ml-1.5 h-3.5 w-3.5" />
							{formatTime(alert.time)}
						</div>
					</div>

					{/* Basic information */}
					<section className="space-y-2">
						<SectionHeader icon={Info} title="Basic Information" />
						<div className="grid grid-cols-2 gap-x-6 gap-y-2">
							<Field
								label="Reported Before"
								value={alert.alertReportedBefore}
							/>
							<Field
								label="Response Type"
								value={responseDisplayName(alert.response)}
							/>
						</div>
					</section>

					<Separator />

					{/* Reporter information */}
					<section className="space-y-2">
						<SectionHeader
							icon={CircleUser}
							title="Reporter Information"
						/>
						<div className="grid grid-cols-2 gap-x-6 gap-y-2">
							<Field
								label="Reporter Name"
								value={alert.personReporting}
							/>
							<Field label="Contact Number">
								<p className="flex items-center gap-1.5 truncate text-sm">
									<Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
									{alert.contactNumber || "Not provided"}
								</p>
							</Field>
							<Field label="Source of signal">
								<Badge variant="outline" className="text-[11px]">
									{alert.sourceOfAlert || "Not specified"}
								</Badge>
							</Field>
							<Field
								label="Channel of Reporting"
								value={alert.channelOfReporting}
							/>
						</div>
					</section>

					<Separator />

					{/* Location information */}
					<section className="space-y-2">
						<SectionHeader
							icon={MapPin}
							title="Location Information"
						/>
						<div className="grid grid-cols-2 gap-x-6 gap-y-2">
							<Field
								label="District"
								value={alert.alertCaseDistrict}
							/>
							<Field
								label="Subcounty/Division"
								value={alert.subCounty}
							/>
							<Field
								label="Village"
								value={alert.alertCaseVillage}
							/>
							<Field
								label="Parish"
								value={alert.alertCaseParish}
							/>
						</div>
					</section>

					<Separator />

					{/* Case information */}
					<section className="space-y-2">
						<SectionHeader
							icon={Stethoscope}
							title="Case Information"
						/>
						<div className="grid grid-cols-3 gap-x-6 gap-y-2">
							<Field
								label="Patient Name"
								value={alert.alertCaseName}
							/>
							<Field
								label="Patient Age"
								value={
									alert.alertCaseAge
										? `${alert.alertCaseAge} years`
										: null
								}
							/>
							<Field
								label="Patient Sex"
								value={alert.alertCaseSex}
							/>
							{/* Minimum dataset item 4. Rendered even when 0,
							    because "nobody affected any more" is a real
							    answer — only an absent value shows as blank. */}
							<Field
								label="Number Affected"
								value={
									alert.numberAffected != null
										? alert.numberAffected.toLocaleString()
										: null
								}
							/>
							<Field
								label="Next of Kin Name"
								value={alert.pointOfContactName}
							/>
							<Field
								label="Next of Kin Phone"
								value={alert.pointOfContactPhone}
							/>
							<Field
								label="Lab Samples Collected"
								value={alert.labSamplesCollected}
							/>
						</div>

						<div>
							<p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
								Case Description
							</p>
							<p className="mt-1 rounded-md bg-muted px-3 py-2 text-sm">
								{alert.history || "No description provided"}
							</p>
						</div>

						{alert.narrative && (
							<div>
								<p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
									Additional Notes
								</p>
								<p className="mt-1 rounded-md bg-muted px-3 py-2 text-sm">
									{alert.narrative}
								</p>
							</div>
						)}
					</section>

					{/* Symptoms */}
					{alert.symptoms && (
						<>
							<Separator />
							<section className="space-y-2">
								<SectionHeader
									icon={Activity}
									title="Signs and Symptoms"
								/>
								<div className="flex flex-wrap gap-1.5">
									{alert.symptoms
										.split(", ")
										.map((symptom: string, index: number) => (
											<Badge
												key={index}
												variant="secondary"
												className="bg-uganda-yellow/20 text-[11px] text-uganda-black"
											>
												{symptom}
											</Badge>
										))}
								</div>
							</section>
						</>
					)}

					{/* EBS pipeline decisions — triage (step 2), risk assessment
					    (step 4) and reporter feedback (step 7). Shown together
					    because they are the three judgements that decide how fast
					    a signal is handled, how hard the response is, and whether
					    the loop was closed — and each was previously invisible on
					    this dialog even once recorded. */}
					{(alert.priority ||
						alert.signalCode ||
						alert.riskLevel ||
						alert.feedbackGivenAt ||
						alert.verificationOutcome) && (
						<>
							<Separator />
							<section className="space-y-2">
								<SectionHeader
									icon={ShieldQuestion}
									title="Signal Handling"
								/>
								<div className="flex flex-wrap items-center gap-2">
									<TriageBadge decision={alert.triageDecision} />
									<PriorityBadge priority={alert.priority} showDeadline />
									<RiskBadge level={alert.riskLevel} />
									{alert.verificationOutcome && (
										<Badge
											variant="outline"
											className="text-[10px] font-semibold"
										>
											{alert.verificationOutcome}
										</Badge>
									)}
								</div>

								<div className="grid grid-cols-2 gap-x-6 gap-y-2">
									{/* The Annex I / Annex II entry this report was classified
									    as — the vocabulary the signal registers are kept in,
									    so it is shown in full rather than as a bare code. */}
									{signalSummary(alert.signalCode) && (
										<div className="col-span-2">
											<Field label="EBS Signal">
												<p className="text-sm text-foreground">
													{signalSummary(alert.signalCode)}
												</p>
											</Field>
										</div>
									)}
									{alert.triagedBy && (
										<Field label="Triaged By" value={alert.triagedBy} />
									)}
									{alert.triagedAt && (
										<Field
											label="Triaged At"
											value={formatDateTime(alert.triagedAt)}
										/>
									)}
									{/* For a signal triage took OFF the pipeline this is
									    the only record of why nobody verified it. */}
									{alert.triageReason && (
										<Field
											label="Triage Reason"
											value={alert.triageReason}
										/>
									)}
									{alert.triageDuplicateOf ? (
										<Field
											label="Duplicate Of"
											value={altCode(alert.triageDuplicateOf)}
										/>
									) : null}
									{alert.riskAssessedBy && (
										<Field
											label="Risk Assessed By"
											value={alert.riskAssessedBy}
										/>
									)}
									{alert.riskAssessedAt && (
										<Field
											label="Risk Assessed At"
											value={formatDateTime(alert.riskAssessedAt)}
										/>
									)}
								</div>

								{/* The three answers behind the risk level, so the
								    judgement is auditable and not just a label. */}
								{alert.riskLevel && (
									<div className="rounded-md bg-muted px-3 py-2">
										<p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
											Risk answers
										</p>
										<p className="mt-1 text-sm">
											Severe: <strong>{yesNo(alert.riskSevere)}</strong>
											{" · "}Spread: <strong>{yesNo(alert.riskSpread)}</strong>
											{" · "}Control measures:{" "}
											<strong>{yesNo(alert.riskControl)}</strong>
										</p>
										{normalizeRiskLevel(alert.riskLevel) && (
											<p className="mt-1 text-xs text-muted-foreground">
												{RISK_ACTION[normalizeRiskLevel(alert.riskLevel)!]}
											</p>
										)}
									</div>
								)}

								{/* The completed risk-assessment worksheet §10 requires
								    per verified event: the matrix axes, the three tiers of
								    analysis, and the RRT. Shown only once something was
								    recorded, and flagged when the analysis is missing —
								    a Very High level with no justification behind it is
								    exactly what a supervisor needs to see. */}
								{alert.riskLevel && (
									<div className="rounded-md border border-dashed border-gray-300 px-3 py-2">
										<div className="flex items-center justify-between gap-2">
											<p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
												Risk Assessment Worksheet
											</p>
											<span
												className={cn(
													"rounded px-1.5 py-0.5 text-[10px] font-semibold",
													riskWorksheetComplete(alert)
														? "bg-emerald-100 text-emerald-800"
														: "bg-amber-100 text-amber-900"
												)}
											>
												{riskWorksheetComplete(alert)
													? "Complete"
													: "Incomplete"}
											</span>
										</div>
										<div className="mt-1 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
											<span>
												<span className="text-muted-foreground">Likelihood: </span>
												{alert.riskLikelihood || "Not recorded"}
											</span>
											<span>
												<span className="text-muted-foreground">Impact: </span>
												{alert.riskImpact || "Not recorded"}
											</span>
										</div>
										{[
											["Hazard", alert.riskHazardNote],
											["Exposure", alert.riskExposureNote],
											["Context", alert.riskContextNote],
										].map(([label, value]) => (
											<p key={label as string} className="mt-1 text-sm">
												<span className="text-muted-foreground">
													{label}:{" "}
												</span>
												{value || (
													<span className="italic text-muted-foreground">
														not documented
													</span>
												)}
											</p>
										))}
										{(alert.riskTeamLead || alert.riskTeamMembers) && (
											<p className="mt-1 text-sm">
												<span className="text-muted-foreground">RRT: </span>
												{alert.riskTeamLead && (
													<>led by {alert.riskTeamLead}</>
												)}
												{alert.riskTeamMembers && (
													<> · {alert.riskTeamMembers}</>
												)}
											</p>
										)}
									</div>
								)}

								{alert.responseActions && (
									<div>
										<p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
											Response Actions
										</p>
										<p className="mt-1 rounded-md bg-muted px-3 py-2 text-sm">
											{alert.responseActions}
										</p>
									</div>
								)}

								{/* Reporter feedback — EBS step 7. Rendered as an
								    explicit state either way: "still owed" is the
								    number KPI #10 measures, so it must not simply
								    be an absent row. */}
								<div
									className={cn(
										"rounded-md px-3 py-2",
										alert.feedbackGivenAt
											? "bg-teal-50 border border-teal-200"
											: "bg-amber-50 border border-amber-200"
									)}
								>
									<p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
										Reporter Feedback
									</p>
									{alert.feedbackGivenAt ? (
										<p className="mt-1 text-sm">
											Given via <strong>{alert.feedbackChannel}</strong>
											{alert.feedbackBy && <> by {alert.feedbackBy}</>} on{" "}
											{formatDateTime(alert.feedbackGivenAt)}
										</p>
									) : (
										<p className="mt-1 text-sm text-amber-900">
											Not yet given — the reporter has not been told the
											outcome.
										</p>
									)}
								</div>
							</section>
						</>
					)}

					{/* Verification information */}
					{hasVerificationInfo && (
						<>
							<Separator />
							<section className="space-y-2">
								<SectionHeader
									icon={ShieldCheck}
									title="Verification Information"
									className="text-success"
								/>
								<div className="grid grid-cols-2 gap-x-6 gap-y-2">
									<Field
										label="Verified By"
										value={alert.verifiedBy}
									/>
									<Field label="CIF Number" value={alert.cifNo} />
									{alert.verificationDate && (
										<Field
											label="Verification Date"
											value={formatDate(
												alert.verificationDate
											)}
										/>
									)}
									{alert.verificationTime && (
										<Field
											label="Verification Time"
											value={formatTime(
												alert.verificationTime
											)}
										/>
									)}
								</div>

								{alert.actions && (
									<div>
										<p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
											Actions Taken
										</p>
										<p className="mt-1 rounded-md bg-muted px-3 py-2 text-sm">
											{alert.actions}
										</p>
									</div>
								)}

								{alert.feedback && (
									<div>
										<p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
											Feedback
										</p>
										<p className="mt-1 rounded-md bg-muted px-3 py-2 text-sm">
											{alert.feedback}
										</p>
									</div>
								)}
							</section>
						</>
					)}

					{/* Signal traceability — full lifecycle audit trail */}
					<Separator />
					<section className="space-y-2">
						<SectionHeader icon={History} title="Signal Traceability" />
						<SignalTimeline alertId={alert.id} enabled={isOpen} />
					</section>

					{/* System information */}
					<Separator />
					<section className="space-y-2">
						<SectionHeader icon={Clock} title="System Information" />
						<div className="grid grid-cols-2 gap-x-6 gap-y-2">
							<Field
								label="Created At"
								value={
									alert.createdAt
										? formatDate(alert.createdAt)
										: "Not available"
								}
							/>
							<Field
								label="Last Updated"
								value={
									alert.updatedAt
										? formatDate(alert.updatedAt)
										: "Not available"
								}
							/>
						</div>
					</section>
				</div>
			</DialogContent>
		</Dialog>
	);
}
