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
	History,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Alert } from "@/lib/auth";
import { alertResponse } from "@/constants";
import { SignalTimeline } from "@/components/alerts/signal-timeline";

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
						Alert Details — {altCode(alert.id)}
					</DialogTitle>
					<DialogDescription className="text-xs">
						Complete information about this health alert
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3 px-4 py-3">
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
								label="Alert Reported Before"
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
							<Field label="Source of Alert">
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
