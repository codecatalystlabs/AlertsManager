"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import type { EidsrMessage } from "@/lib/eidsr-message-normalize";
import {
	verifyEidsrMessage,
	type EidsrMessageOptions,
} from "@/lib/fetch-eidsr-messages";
import { DistrictSelect } from "@/components/district-select";
import {
	DESK_VERIFICATION_OPTIONS,
	FIELD_VERIFICATION_OPTIONS,
} from "@/lib/verification-options";
import { useToast } from "@/hooks/use-toast";

interface EidsrMessageVerifyDialogProps {
	isOpen: boolean;
	onClose: () => void;
	message: EidsrMessage | null;
	options: EidsrMessageOptions;
	onVerified: (linkedAlertId: number | null) => void;
}

function pickOptionList(
	opts: EidsrMessageOptions,
	...keys: string[]
): string[] {
	for (const key of keys) {
		const v = opts[key];
		if (Array.isArray(v) && v.length > 0) return v;
	}
	return [];
}

const DEFAULT_STATUS = ["Alive", "Dead", "Unknown"];
const DEFAULT_SEX = ["Male", "Female", "Unknown"];
const DEFAULT_SOURCE = ["Community", "Health Facility", "Other"];
const DEFAULT_TRIAGE = ["High", "Medium", "Low"];
const DEFAULT_SIGNAL = ["Yes", "No", "Pending"];

function isValidDateString(value: string): boolean {
	if (!value) return true;
	return !Number.isNaN(Date.parse(value));
}

export function EidsrMessageVerifyDialog({
	isOpen,
	onClose,
	message,
	options,
	onVerified,
}: EidsrMessageVerifyDialogProps) {
	const { toast } = useToast();
	const [isVerifying, setIsVerifying] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [linkedAlertId, setLinkedAlertId] = useState<number | null>(null);

	const [form, setForm] = useState({
		status: "",
		verificationDate: new Date().toISOString().split("T")[0],
		verificationTime: new Date().toTimeString().slice(0, 5),
		personReporting: "",
		contactNumber: "",
		sourceOfAlert: "",
		alertCaseName: "",
		alertCaseAge: "",
		alertCaseSex: "",
		alertCaseDistrict: "",
		village: "",
		subCounty: "",
		symptoms: "",
		actions: "",
		feedback: "",
		verifiedBy: "",
		deskVerificationActions: "",
		fieldVerificationFeedback: "",
		caseVerificationDesk: "",
		signalVerified: "",
		triage: "",
		riskAssessmentLevel: "",
		history: "",
	});

	useEffect(() => {
		if (!isOpen || !message) return;
		const desk =
			message.caseVerificationDesk ||
			(message.actions && message.actions !== "Alert reported"
				? message.actions
				: "");
		setForm({
			status: "",
			verificationDate: new Date().toISOString().split("T")[0],
			verificationTime: new Date().toTimeString().slice(0, 5),
			personReporting: message.personReporting,
			contactNumber: message.contactNumber,
			sourceOfAlert: message.sourceOfAlert,
			alertCaseName: message.alertCaseName,
			alertCaseAge:
				message.alertCaseAge != null ? String(message.alertCaseAge) : "",
			alertCaseSex: message.alertCaseSex,
			alertCaseDistrict: message.alertCaseDistrict,
			village: message.village,
			subCounty: message.subCounty,
			symptoms: message.symptoms,
			actions: desk,
			feedback: message.feedback,
			verifiedBy: message.verifiedBy,
			deskVerificationActions: desk,
			fieldVerificationFeedback: "",
			caseVerificationDesk: desk,
			signalVerified: message.signalVerified,
			triage: message.triage,
			riskAssessmentLevel: message.riskAssessmentLevel,
			history: message.messageText,
		});
		setError(null);
		setLinkedAlertId(null);
	}, [isOpen, message]);

	useEffect(() => {
		if (!form.deskVerificationActions) return;
		setForm((prev) => ({
			...prev,
			actions: prev.deskVerificationActions,
			caseVerificationDesk: prev.deskVerificationActions,
		}));
	}, [form.deskVerificationActions]);

	const update = (field: keyof typeof form, value: string) => {
		setForm((prev) => ({ ...prev, [field]: value }));
	};

	const statusOptions =
		pickOptionList(options, "status", "statuses") || DEFAULT_STATUS;
	const sexOptions =
		pickOptionList(options, "alertCaseSex", "sex", "sexes") || DEFAULT_SEX;
	const sourceOptions =
		pickOptionList(options, "sourceOfAlert", "sourceOfAlert", "sources") ||
		DEFAULT_SOURCE;
	const triageOptions =
		pickOptionList(options, "triage", "triageLevels") || DEFAULT_TRIAGE;
	const signalOptions =
		pickOptionList(options, "signalVerified", "signal_verified") ||
		DEFAULT_SIGNAL;
	const riskOptions = pickOptionList(
		options,
		"riskAssessmentLevel",
		"risk_assessment_level",
		"riskLevels"
	);
	const feedbackOptions = pickOptionList(options, "feedback", "feedbacks");
	const deskOptions = pickOptionList(
		options,
		"caseVerificationDesk",
		"verificationDesk"
	);

	const handleVerify = async () => {
		if (!message) return;
		// Allow verify even when EIDSR status is "completed"; backend creates/updates alert.
		if (!form.deskVerificationActions) {
			setError("Please select a desk verification action.");
			return;
		}
		if (!isValidDateString(form.verificationDate)) {
			setError("Verification date is not valid.");
			return;
		}
		if (form.alertCaseAge.trim() !== "") {
			const age = Number(form.alertCaseAge);
			if (Number.isNaN(age) || age < 0) {
				setError("Case age must be a valid number.");
				return;
			}
		}

		setIsVerifying(true);
		setError(null);

		try {
			const verificationDate = new Date(form.verificationDate);
			const verificationTime = new Date();
			const [hours, minutes] = form.verificationTime.split(":");
			if (hours != null && minutes != null) {
				verificationTime.setHours(
					parseInt(hours, 10),
					parseInt(minutes, 10),
					0,
					0
				);
			}

			const desk = form.deskVerificationActions;
			const fieldFeedback = form.fieldVerificationFeedback;

			const payload: Record<string, unknown> = {
				status: form.status || undefined,
				verificationDate: verificationDate.toISOString(),
				verificationTime: verificationTime.toISOString(),
				personReporting: form.personReporting || undefined,
				contactNumber: form.contactNumber || undefined,
				sourceOfAlert: form.sourceOfAlert || undefined,
				alertCaseName: form.alertCaseName || undefined,
				alertCaseSex: form.alertCaseSex || undefined,
				alertCaseDistrict: form.alertCaseDistrict || undefined,
				village: form.village || undefined,
				subCounty: form.subCounty || undefined,
				symptoms: form.symptoms || undefined,
				actions: desk,
				feedback: form.feedback || fieldFeedback || undefined,
				verifiedBy: form.verifiedBy || undefined,
				caseVerificationDesk: desk,
				signalVerified: form.signalVerified || undefined,
				triage: form.triage || undefined,
				riskAssessmentLevel: form.riskAssessmentLevel || undefined,
				history: form.history || undefined,
				deskVerificationActions: desk,
				fieldVerificationFeedback: fieldFeedback || undefined,
				fieldVerification: fieldFeedback || undefined,
				fieldVerificationDecision: fieldFeedback || undefined,
				isVerified: true,
			};

			if (form.alertCaseAge.trim() !== "") {
				payload.alertCaseAge = Number(form.alertCaseAge);
			}

			const result = await verifyEidsrMessage(message.id, payload);
			const alertId =
				result.alertId ??
				result.message?.linkedAlertId ??
				null;

			setLinkedAlertId(alertId);

			toast({
				title: "EIDSR message verified successfully.",
				description:
					alertId != null
						? `Linked alert ALT${String(alertId).padStart(3, "0")} created.`
						: "The message has been verified.",
			});

			onVerified(alertId);
			onClose();
		} catch (err) {
			const msg =
				err instanceof Error ? err.message : "Failed to verify message";
			setError(msg);
			toast({ title: "Verification failed", description: msg, variant: "destructive" });
		} finally {
			setIsVerifying(false);
		}
	};

	if (!message) return null;

	const alreadyVerified = false;

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Verify EIDSR SMS #{message.id}</DialogTitle>
					<DialogDescription>
						Complete verification details. Empty fields may be filled from the
						SMS record by the server.
					</DialogDescription>
				</DialogHeader>

				{alreadyVerified && (
					<Alert>
						<AlertDescription>
							This message is already verified.
							{message.linkedAlertId != null && (
								<>
									{" "}
									<Link
										href="/dashboard/alerts"
										className="underline font-medium"
									>
										View alert ALT
										{String(message.linkedAlertId).padStart(3, "0")}
									</Link>
								</>
							)}
						</AlertDescription>
					</Alert>
				)}

				{error && (
					<Alert variant="destructive">
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}

				{linkedAlertId != null && (
					<Alert className="border-green-200 bg-green-50">
						<AlertDescription className="text-green-800">
							Verified — linked alert{" "}
							<Link href="/dashboard/alerts" className="underline font-medium">
								ALT{String(linkedAlertId).padStart(3, "0")}
							</Link>
						</AlertDescription>
					</Alert>
				)}

				<div className="space-y-4">
					<section>
						<h4 className="text-sm font-semibold mb-2">Reporter information</h4>
						<div className="grid gap-3 sm:grid-cols-2">
							<div className="grid gap-1.5">
								<Label>Person reporting</Label>
								<Input
									value={form.personReporting}
									onChange={(e) =>
										update("personReporting", e.target.value)
									}
								/>
							</div>
							<div className="grid gap-1.5">
								<Label>Contact number</Label>
								<Input
									value={form.contactNumber}
									onChange={(e) =>
										update("contactNumber", e.target.value)
									}
								/>
							</div>
							<div className="grid gap-1.5 sm:col-span-2">
								<Label>Source of alert</Label>
								<Select
									value={form.sourceOfAlert}
									onValueChange={(v) => update("sourceOfAlert", v)}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select source" />
									</SelectTrigger>
									<SelectContent>
										{sourceOptions.map((o) => (
											<SelectItem key={o} value={o}>
												{o}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
					</section>

					<Separator />

					<section>
						<h4 className="text-sm font-semibold mb-2">Alert / case information</h4>
						<div className="grid gap-3 sm:grid-cols-2">
							<div className="grid gap-1.5">
								<Label>Status</Label>
								<Select
									value={form.status}
									onValueChange={(v) => update("status", v)}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select status" />
									</SelectTrigger>
									<SelectContent>
										{statusOptions.map((o) => (
											<SelectItem key={o} value={o}>
												{o}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="grid gap-1.5">
								<Label>Case name</Label>
								<Input
									value={form.alertCaseName}
									onChange={(e) => update("alertCaseName", e.target.value)}
								/>
							</div>
							<div className="grid gap-1.5">
								<Label>Age</Label>
								<Input
									type="number"
									min={0}
									value={form.alertCaseAge}
									onChange={(e) => update("alertCaseAge", e.target.value)}
								/>
							</div>
							<div className="grid gap-1.5">
								<Label>Sex</Label>
								<Select
									value={form.alertCaseSex}
									onValueChange={(v) => update("alertCaseSex", v)}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select sex" />
									</SelectTrigger>
									<SelectContent>
										{sexOptions.map((o) => (
											<SelectItem key={o} value={o}>
												{o}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="grid gap-1.5 sm:col-span-2">
								<Label>History / narrative</Label>
								<Textarea
									value={form.history}
									onChange={(e) => update("history", e.target.value)}
									rows={2}
								/>
							</div>
						</div>
					</section>

					<Separator />

					<section>
						<h4 className="text-sm font-semibold mb-2">Location</h4>
						<div className="grid gap-3 sm:grid-cols-2">
							<div className="grid gap-1.5 sm:col-span-2">
								<Label>District</Label>
								<DistrictSelect
									value={form.alertCaseDistrict}
									onValueChange={(v) => update("alertCaseDistrict", v)}
								/>
							</div>
							<div className="grid gap-1.5">
								<Label>Village</Label>
								<Input
									value={form.village}
									onChange={(e) => update("village", e.target.value)}
								/>
							</div>
							<div className="grid gap-1.5">
								<Label>Sub-county</Label>
								<Input
									value={form.subCounty}
									onChange={(e) => update("subCounty", e.target.value)}
								/>
							</div>
						</div>
					</section>

					<Separator />

					<section>
						<h4 className="text-sm font-semibold mb-2">Symptoms and actions</h4>
						<div className="grid gap-3">
							<div className="grid gap-1.5">
								<Label>Symptoms</Label>
								<Textarea
									value={form.symptoms}
									onChange={(e) => update("symptoms", e.target.value)}
									rows={2}
								/>
							</div>
							<div className="grid gap-1.5">
								<Label className="mb-1">Desk verification *</Label>
								<RadioGroup
									value={form.deskVerificationActions}
									onValueChange={(v) =>
										update("deskVerificationActions", v)
									}
									className="grid gap-2"
								>
									{(deskOptions.length > 0
										? deskOptions
										: DESK_VERIFICATION_OPTIONS
									).map((opt) => (
										<div key={opt} className="flex items-center space-x-2">
											<RadioGroupItem value={opt} id={`desk-${opt}`} />
											<Label htmlFor={`desk-${opt}`} className="font-normal">
												{opt}
											</Label>
										</div>
									))}
								</RadioGroup>
							</div>
							{form.deskVerificationActions === "Field Case Verification" && (
								<div className="grid gap-1.5">
									<Label>Field verification feedback</Label>
									<RadioGroup
										value={form.fieldVerificationFeedback}
										onValueChange={(v) =>
											update("fieldVerificationFeedback", v)
										}
										className="grid gap-2"
									>
										{FIELD_VERIFICATION_OPTIONS.map((opt) => (
											<div
												key={opt}
												className="flex items-center space-x-2"
											>
												<RadioGroupItem
													value={opt}
													id={`field-${opt}`}
												/>
												<Label
													htmlFor={`field-${opt}`}
													className="font-normal"
												>
													{opt}
												</Label>
											</div>
										))}
									</RadioGroup>
								</div>
							)}
							<div className="grid gap-1.5">
								<Label>Feedback</Label>
								{feedbackOptions.length > 0 ? (
									<Select
										value={form.feedback}
										onValueChange={(v) => update("feedback", v)}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select feedback" />
										</SelectTrigger>
										<SelectContent>
											{feedbackOptions.map((o) => (
												<SelectItem key={o} value={o}>
													{o}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								) : (
									<Input
										value={form.feedback}
										onChange={(e) => update("feedback", e.target.value)}
									/>
								)}
							</div>
						</div>
					</section>

					<Separator />

					<section>
						<h4 className="text-sm font-semibold mb-2">Verification details</h4>
						<div className="grid gap-3 sm:grid-cols-2">
							<div className="grid gap-1.5">
								<Label>Verification date</Label>
								<Input
									type="date"
									value={form.verificationDate}
									onChange={(e) =>
										update("verificationDate", e.target.value)
									}
								/>
							</div>
							<div className="grid gap-1.5">
								<Label>Verification time</Label>
								<Input
									type="time"
									value={form.verificationTime}
									onChange={(e) =>
										update("verificationTime", e.target.value)
									}
								/>
							</div>
							<div className="grid gap-1.5 sm:col-span-2">
								<Label>Verified by</Label>
								<Input
									value={form.verifiedBy}
									onChange={(e) => update("verifiedBy", e.target.value)}
								/>
							</div>
							<div className="grid gap-1.5">
								<Label>Signal verified</Label>
								<Select
									value={form.signalVerified}
									onValueChange={(v) => update("signalVerified", v)}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select" />
									</SelectTrigger>
									<SelectContent>
										{signalOptions.map((o) => (
											<SelectItem key={o} value={o}>
												{o}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
					</section>

					<Separator />

					<section>
						<h4 className="text-sm font-semibold mb-2">Risk assessment / triage</h4>
						<div className="grid gap-3 sm:grid-cols-2">
							<div className="grid gap-1.5">
								<Label>Triage</Label>
								<Select
									value={form.triage}
									onValueChange={(v) => update("triage", v)}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select triage" />
									</SelectTrigger>
									<SelectContent>
										{triageOptions.map((o) => (
											<SelectItem key={o} value={o}>
												{o}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="grid gap-1.5">
								<Label>Risk assessment level</Label>
								{riskOptions.length > 0 ? (
									<Select
										value={form.riskAssessmentLevel}
										onValueChange={(v) =>
											update("riskAssessmentLevel", v)
										}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select risk" />
										</SelectTrigger>
										<SelectContent>
											{riskOptions.map((o) => (
												<SelectItem key={o} value={o}>
													{o}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								) : (
									<Select
										value={form.riskAssessmentLevel}
										onValueChange={(v) =>
											update("riskAssessmentLevel", v)
										}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select risk" />
										</SelectTrigger>
										<SelectContent>
											{DEFAULT_TRIAGE.map((o) => (
												<SelectItem key={o} value={o}>
													{o}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							</div>
						</div>
					</section>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onClose} disabled={isVerifying}>
						Cancel
					</Button>
					<Button
						onClick={handleVerify}
						disabled={isVerifying || alreadyVerified}
						className="bg-uganda-red hover:bg-uganda-red/90"
					>
						{isVerifying && (
							<Loader2 className="h-4 w-4 mr-2 animate-spin" />
						)}
						{isVerifying ? "Verifying…" : "Verify into alerts"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
