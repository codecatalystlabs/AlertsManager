"use client";

import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	AlertTriangleIcon,
	CheckCircleIcon,
	XCircleIcon,
	Loader2,
	UserIcon,
	HeartIcon,
} from "lucide-react";
import { AuthService } from "@/lib/auth";
import { verifyEidsrMessage } from "@/lib/fetch-eidsr-messages";
import { buildEidsrVerifyPayload } from "@/lib/eidsr-verify-payload";
import { CaseLocationSelect } from "@/components/case-location-select";
import {
	DESK_VERIFICATION_OPTIONS,
	FIELD_VERIFICATION_OPTIONS,
	FIELD_CASE_VERIFICATION,
	hasDeskAction,
	toggleDeskAction,
} from "@/lib/verification-options";
import { useToast } from "@/hooks/use-toast";
import { alertResponse, alertSource } from "@/constants";
import { resolveAlertResponseCode } from "@/lib/resolve-alert-response";
import { getLocalDateString } from "@/lib/utils";

/** Current local time as HH:MM, for capping the verification time picker. */
function currentLocalTime(): string {
	return new Date().toTimeString().slice(0, 5);
}

interface AlertVerificationDialogProps {
	isOpen: boolean;
	onClose: () => void;
	alert: any;
	onVerificationComplete: () => void;
	/** When `eidsr`, verifies via POST /eidsr/local/messages/:id/verify (JWT only, no body token). */
	verificationMode?: "alert" | "eidsr";
	eidsrMessageId?: number;
	/** Local event id for POST /eidsr/local/events/:id/verify */
	eidsrEventLocalId?: number;
	onEidsrVerified?: (alertId: number | null) => void;
	onVerifyingChange?: (verifying: boolean) => void;
}

const signsAndSymptoms = [
	"Fever (≥38°C)",
	"Headache",
	"General Weakness",
	"Skin/Body Rash",
	"Sore Throat",
	"Vomiting",
	"Bleeding",
	"Abdominal Pain",
	"Aching Muscles/Pain",
	"Difficulty Swallowing",
	"Difficulty Breathing",
	"Lethargy/Weakness",
];

const DEFAULT_CREATE_ACTION = "Alert reported";

function resolveInitialDeskAction(alert: {
	actions?: string;
	caseVerificationDesk?: string;
}): string {
	const desk = alert.caseVerificationDesk?.trim();
	if (desk) return desk;

	const actions = alert.actions?.trim();
	if (actions && actions !== DEFAULT_CREATE_ACTION) return actions;

	return "";
}

export function AlertVerificationDialog({
	isOpen,
	onClose,
	alert,
	onVerificationComplete,
	verificationMode = "alert",
	eidsrMessageId,
	eidsrEventLocalId,
	onEidsrVerified,
	onVerifyingChange,
}: AlertVerificationDialogProps) {
	const isEidsrMode = verificationMode === "eidsr";
	const { toast } = useToast();
	const [verificationToken, setVerificationToken] = useState<string>("");
	const [isGeneratingToken, setIsGeneratingToken] = useState(false);
	const [isVerifying, setIsVerifying] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [vhfCaseCode, setVhfCaseCode] = useState<string | null>(null);
	const [showVhfForm, setShowVhfForm] = useState(false);

	const [formData, setFormData] = useState({
		status: "",
		verificationDate: getLocalDateString(),
		verificationTime: currentLocalTime(),
		cifNo: "",
		personReporting: alert?.personReporting || "",
		village: alert?.alertCaseVillage || "",
		subCounty: alert?.subCounty || "",
		contactNumber: alert?.contactNumber || "",
		sourceOfAlert: alert?.sourceOfAlert || "",
		response: "",
		alertCaseName: alert?.alertCaseName || "",
		alertCaseAge: alert?.alertCaseAge || 0,
		alertCaseSex: alert?.alertCaseSex || "",
		alertCasePregnantDuration: 0,
		alertCaseVillage: alert?.alertCaseVillage || "",
		alertCaseParish: alert?.alertCaseParish || "",
		alertCaseSubCounty: alert?.alertCaseSubCounty || "",
		alertCaseDistrict: alert?.alertCaseDistrict || "",
		region: alert?.region || "",
		alertCaseNationality: alert?.alertCaseNationality || "",
		pointOfContactName: alert?.pointOfContactName || "",
		pointOfContactRelationship: "",
		pointOfContactPhone: alert?.pointOfContactPhone || "",
		history: alert?.history || "",
		healthFacilityVisit: "",
		traditionalHealerVisit: "",
		symptoms: alert?.symptoms || "",
		actions: "",
		feedback: "",
		verifiedBy: "",
		deskVerificationActions: "",
		fieldVerificationFeedback: "",
	});

	useEffect(() => {
		if (isOpen && alert) {
			const responseCode =
				resolveAlertResponseCode(String(alert.response || "")) ||
				String(alert.response || "");
			const legacyDiseaseInCaseName =
				isEidsrMode && !responseCode && alert.alertCaseName
					? resolveAlertResponseCode(String(alert.alertCaseName))
					: "";
			const resolvedResponse =
				responseCode || legacyDiseaseInCaseName || "";
			const caseName =
				legacyDiseaseInCaseName && legacyDiseaseInCaseName === resolvedResponse
					? ""
					: String(alert.alertCaseName || "");

			// Reset form data when dialog opens
			setFormData({
				status: isEidsrMode && alert.status ? String(alert.status) : "",
				verificationDate: getLocalDateString(),
				verificationTime: currentLocalTime(),
				cifNo: "",
				personReporting: alert.personReporting || "",
				village: alert.alertCaseVillage || "",
				subCounty: alert.subCounty || "",
				contactNumber: alert.contactNumber || "",
				sourceOfAlert: alert.sourceOfAlert || "",
				response: resolvedResponse,
				alertCaseName: caseName,
				alertCaseAge: alert.alertCaseAge || 0,
				alertCaseSex: alert.alertCaseSex || "",
				alertCasePregnantDuration: 0,
				alertCaseVillage: alert.alertCaseVillage || "",
				alertCaseParish: alert.alertCaseParish || "",
				alertCaseSubCounty: alert.alertCaseSubCounty || "",
				alertCaseDistrict: alert.alertCaseDistrict || "",
				region: alert.region || "",
				alertCaseNationality: alert.alertCaseNationality || "",
				pointOfContactName: alert.pointOfContactName || "",
				pointOfContactRelationship: "",
				pointOfContactPhone: alert.pointOfContactPhone || "",
				history: alert.history || "",
				healthFacilityVisit: "",
				traditionalHealerVisit: "",
				symptoms: alert.symptoms || "",
				actions: resolveInitialDeskAction(alert),
				feedback: alert.feedback || "",
				verifiedBy: "",
				deskVerificationActions: resolveInitialDeskAction(alert),
				fieldVerificationFeedback:
					alert.fieldVerificationDecision ||
					alert.fieldVerification ||
					"",
			});
			setVerificationToken("");
			setError(null);
			setSuccess(null);

			if (isEidsrMode) {
				setVerificationToken("eidsr-jwt");
			} else {
				generateTokenAutomatically();
			}
		}
	}, [isOpen, alert, isEidsrMode]);

	// Show VHF form when Field Case Verification is one of the selected actions
	useEffect(() => {
		if (
			hasDeskAction(
				formData.deskVerificationActions,
				FIELD_CASE_VERIFICATION
			)
		) {
			setShowVhfForm(true);
		} else {
			setShowVhfForm(false);
			setVhfCaseCode(null);
		}
	}, [formData.deskVerificationActions]);

	// Keep legacy `actions` field in sync with desk verification radio selection
	useEffect(() => {
		if (!formData.deskVerificationActions) return;
		setFormData((prev) => ({
			...prev,
			actions: prev.deskVerificationActions,
		}));
	}, [formData.deskVerificationActions]);

	const generateTokenAutomatically = async () => {
		if (isEidsrMode || !alert?.id) return;

		setIsGeneratingToken(true);
		setError(null);

		try {
			const result = await AuthService.generateVerificationToken(
				alert.id
			);
			setVerificationToken(result.token);
		} catch (err) {
			const errorMessage =
				err instanceof Error
					? err.message
					: "Failed to generate token";

			// Check if it's a database schema error
			if (errorMessage.includes("Unknown column 'created_at'")) {
				const dbError =
					"Database configuration error. Please contact the system administrator to fix the database schema.";
				setError(dbError);

				// Show error toast for database issues
				toast({
					title: "🔧 Database Configuration Error",
					description:
						"Please contact the system administrator to fix the database schema.",
					variant: "destructive",
					duration: 8000,
				});
			} else {
				setError(errorMessage);

				// Show error toast for token generation
				toast({
					title: "⚠️ Token Generation Failed",
					description: errorMessage,
					variant: "destructive",
					duration: 5000,
				});
			}
		} finally {
			setIsGeneratingToken(false);
		}
	};

	const handleInputChange = (field: string, value: string | number) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	// Handle VHF form iframe messages
	const handleVhfMessage = (event: MessageEvent) => {
		// Check if the message is from the VHF form success page
		if (event.origin === "https://response.health.go.ug") {
			const url = event.data?.url || window.location.href;

			// Extract case code from success URL
			const urlParams = new URLSearchParams(url.split("?")[1]);
			const caseCode = urlParams.get("case_code");

			if (caseCode) {
				setVhfCaseCode(caseCode);
				setShowVhfForm(false);
				toast({
					title: "VHF Form Submitted Successfully",
					description: `Case Code: ${caseCode}`,
				});
			}
		}
	};

	// Listen for VHF form messages
	useEffect(() => {
		if (showVhfForm) {
			window.addEventListener("message", handleVhfMessage);
			return () =>
				window.removeEventListener("message", handleVhfMessage);
		}
	}, [showVhfForm]);

	const handleVerification = async () => {
		if (isEidsrMode) {
			if (!eidsrMessageId) {
				setError("EIDSR message ID is missing.");
				return;
			}
			if (!formData.deskVerificationActions) {
				setError("Please select a desk verification action.");
				return;
			}
			if (!formData.response) {
				setError("Please select a response type.");
				return;
			}
		} else if (!alert?.id || !verificationToken) {
			setError(
				"Verification token not available. Please close and reopen the dialog."
			);
			return;
		} else if (
			!formData.status ||
			!formData.cifNo ||
			!formData.personReporting ||
			!formData.contactNumber ||
			!formData.sourceOfAlert ||
			!formData.response ||
			!formData.alertCaseName ||
			!formData.alertCaseAge ||
			!formData.alertCaseSex ||
			!formData.history ||
			!formData.verifiedBy ||
			!formData.deskVerificationActions
		) {
			setError("Please fill in all required fields");
			return;
		}

		// An alert can't be verified in the future — reject a verification
		// date/time later than now (compared in local time).
		if (formData.verificationDate && formData.verificationTime) {
			const selectedWhen = new Date(
				`${formData.verificationDate}T${formData.verificationTime}`
			);
			if (
				!Number.isNaN(selectedWhen.getTime()) &&
				selectedWhen.getTime() > Date.now()
			) {
				setError(
					"Verification date and time cannot be in the future."
				);
				return;
			}
		}

		setIsVerifying(true);
		onVerifyingChange?.(true);
		setError(null);

		try {
			if (isEidsrMode) {
				const meta = alert?._eidsrMeta as
					| {
							signalVerified?: string;
							triage?: string;
							riskAssessmentLevel?: string;
					  }
					| undefined;
				const result = await verifyEidsrMessage(
					eidsrMessageId!,
					buildEidsrVerifyPayload(
						formData as unknown as Record<string, unknown>,
						meta
					),
					eidsrEventLocalId ?? eidsrMessageId!
				);
				const alertId =
					result.alertId ??
					result.message?.linkedAlertId ??
					null;

				setSuccess("EIDSR message verified successfully.");
				toast({
					title: "EIDSR message verified successfully.",
					description:
						alertId != null
							? `Saved as alert ALT${String(alertId).padStart(3, "0")}.`
							: "Message verified into alerts.",
					duration: 5000,
				});

				onEidsrVerified?.(alertId ?? null);
				setTimeout(() => {
					onVerificationComplete();
					onClose();
				}, 1500);
				return;
			}

			// Format dates for API
			const verificationDate = new Date(formData.verificationDate);
			const verificationTime = new Date();
			const [hours, minutes] = formData.verificationTime.split(":");
			verificationTime.setHours(
				parseInt(hours),
				parseInt(minutes),
				0,
				0
			);

			const deskAction = formData.deskVerificationActions;
			const fieldFeedback = formData.fieldVerificationFeedback;

			await AuthService.verifyAlert(alert.id, {
				token: verificationToken,
				status: formData.status,
				verificationDate: verificationDate.toISOString(),
				verificationTime: verificationTime.toISOString(),
				cifNo: formData.cifNo,
				personReporting: formData.personReporting,
				village: formData.village,
				subCounty: formData.subCounty,
				contactNumber: formData.contactNumber,
				sourceOfAlert: formData.sourceOfAlert,
				response: formData.response,
				alertCaseName: formData.alertCaseName,
				alertCaseAge: formData.alertCaseAge,
				alertCaseSex: formData.alertCaseSex,
				alertCasePregnantDuration:
					formData.alertCasePregnantDuration,
				alertCaseVillage: formData.alertCaseVillage,
				alertCaseParish: formData.alertCaseParish,
				alertCaseSubCounty: formData.alertCaseSubCounty,
				alertCaseDistrict: formData.alertCaseDistrict,
				region: formData.region,
				alertCaseNationality: formData.alertCaseNationality,
				pointOfContactName: formData.pointOfContactName,
				pointOfContactRelationship:
					formData.pointOfContactRelationship,
				pointOfContactPhone: formData.pointOfContactPhone,
				history: formData.history,
				healthFacilityVisit: formData.healthFacilityVisit,
				traditionalHealerVisit: formData.traditionalHealerVisit,
				symptoms: formData.symptoms,
				actions: deskAction,
				feedback: formData.feedback || fieldFeedback || "",
				verifiedBy: formData.verifiedBy,
				deskVerificationActions: deskAction,
				caseVerificationDesk: deskAction,
				fieldVerificationFeedback: fieldFeedback,
				fieldVerification: fieldFeedback,
				fieldVerificationDecision: fieldFeedback,
				isVerified: true,
				caseCode: vhfCaseCode || "",
			});

			setSuccess("Alert verified successfully!");

			// Show success toast
			toast({
				title: "✅ Verification Successful",
				description: `Alert ALT${String(alert.id).padStart(
					3,
					"0"
				)} has been verified successfully.`,
				duration: 5000,
			});

			setTimeout(() => {
				onVerificationComplete();
				onClose();
			}, 2000);
		} catch (err) {
			const errorMessage =
				err instanceof Error
					? err.message
					: "Failed to verify alert";

			setError(errorMessage);

			// Show error toast
			toast({
				title: "❌ Verification Failed",
				description: errorMessage,
				variant: "destructive",
				duration: 5000,
			});
		} finally {
			setIsVerifying(false);
			onVerifyingChange?.(false);
		}
	};

	const showVerificationForm =
		(verificationToken || isEidsrMode) && !isGeneratingToken;

	return (
		<Dialog
			open={isOpen}
			onOpenChange={onClose}
		>
			<DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<AlertTriangleIcon className="h-4 w-4 text-uganda-red" />
						{isEidsrMode ? (
							<>Verify 6767 SMS #{eidsrMessageId}</>
						) : (
							<>
								Verify Alert - ALT
								{String(alert?.id).padStart(3, "0")}
							</>
						)}
					</DialogTitle>
					<DialogDescription>
						{isEidsrMode
							? "Verify this SMS into the alerts table. Empty fields may be filled from the message by the server."
							: "Complete the verification process for this health alert"}
					</DialogDescription>
				</DialogHeader>

				{/* Status Messages */}
				{error && (
					<Alert className="surface-danger">
						<XCircleIcon className="h-4 w-4 text-destructive" />
						<AlertDescription className="text-destructive">
							{error}
						</AlertDescription>
					</Alert>
				)}

				{success && (
					<Alert className="surface-success">
						<CheckCircleIcon className="h-4 w-4 text-success" />
						<AlertDescription className="text-success">
							{success}
						</AlertDescription>
					</Alert>
				)}

				{/* Loading State */}
				{isGeneratingToken && (
					<div className="flex items-center justify-center p-5">
						<div className="text-center">
							<Loader2 className="h-8 w-8 animate-spin text-uganda-red mx-auto mb-4" />
							<p className="text-muted-foreground">
								Generating verification token...
							</p>
						</div>
					</div>
				)}

				{/* Verification Form */}
				{showVerificationForm && (
					<div className="space-y-3">
						{/* Basic Information */}
						<div className="space-y-3">
							<div className="flex items-center gap-3">
								<AlertTriangleIcon className="h-4 w-4 text-uganda-red" />
								<h3 className="text-sm font-semibold uppercase tracking-wide">
									Verification Details
								</h3>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
								<div className="space-y-2">
									<Label
										htmlFor="status"
										className="text-sm font-medium"
									>
										Status *
									</Label>
									<Select
										value={formData.status}
										onValueChange={(value) =>
											handleInputChange(
												"status",
												value
											)
										}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select status" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="Alive">
												Alive
											</SelectItem>
											<SelectItem value="Dead">
												Dead
											</SelectItem>
											<SelectItem value="Unknown">
												Unknown
											</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<div className="space-y-2">
									<Label
										htmlFor="cifNo"
										className="text-sm font-medium"
									>
										CIF Number *
									</Label>
									<Input
										id="cifNo"
										value={formData.cifNo}
										onChange={(e) =>
											handleInputChange(
												"cifNo",
												e.target.value
											)
										}
										placeholder="Enter CIF number"
										required
									/>
								</div>

								<div className="space-y-2">
									<Label
										htmlFor="verifiedBy"
										className="text-sm font-medium"
									>
										Verified By *
									</Label>
									<Input
										id="verifiedBy"
										value={formData.verifiedBy}
										onChange={(e) =>
											handleInputChange(
												"verifiedBy",
												e.target.value
											)
										}
										placeholder="Your name"
										required
									/>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
								<div className="space-y-2">
									<Label
										htmlFor="verificationDate"
										className="text-sm font-medium"
									>
										Verification Date
									</Label>
									<Input
										id="verificationDate"
										type="date"
										max={getLocalDateString()}
										value={
											formData.verificationDate
										}
										onChange={(e) =>
											handleInputChange(
												"verificationDate",
												e.target.value
											)
										}
									/>
								</div>
								<div className="space-y-2">
									<Label
										htmlFor="verificationTime"
										className="text-sm font-medium"
									>
										Verification Time
									</Label>
									<Input
										id="verificationTime"
										type="time"
										max={
											formData.verificationDate ===
											getLocalDateString()
												? currentLocalTime()
												: undefined
										}
										value={
											formData.verificationTime
										}
										onChange={(e) =>
											handleInputChange(
												"verificationTime",
												e.target.value
											)
										}
									/>
								</div>
							</div>
						</div>

						<Separator />

						{/* Case Information */}
						<div className="space-y-3">
							<div className="flex items-center gap-3">
								<UserIcon className="h-4 w-4 text-uganda-red" />
								<h3 className="text-sm font-semibold uppercase tracking-wide">
									Case Information
								</h3>
							</div>

							<div className="space-y-2">
								<Label
									htmlFor="response"
									className="text-sm font-medium"
								>
									Response Type *
								</Label>
								<Select
									value={formData.response || undefined}
									onValueChange={(value) =>
										handleInputChange("response", value)
									}
								>
									<SelectTrigger id="response">
										<SelectValue placeholder="Select disease" />
									</SelectTrigger>
									<SelectContent>
										{alertResponse.map((disease) => (
											<SelectItem
												key={disease.code}
												value={disease.code}
											>
												{disease.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
								<div className="space-y-2">
									<Label
										htmlFor="alertCaseName"
										className="text-sm font-medium"
									>
										Patient Name *
									</Label>
									<Input
										id="alertCaseName"
										value={formData.alertCaseName}
										onChange={(e) =>
											handleInputChange(
												"alertCaseName",
												e.target.value
											)
										}
										required
									/>
								</div>
								<div className="space-y-2">
									<Label
										htmlFor="alertCaseAge"
										className="text-sm font-medium"
									>
										Patient Age *
									</Label>
									<Input
										id="alertCaseAge"
										type="number"
										value={formData.alertCaseAge}
										onChange={(e) =>
											handleInputChange(
												"alertCaseAge",
												parseInt(
													e.target.value
												)
											)
										}
										required
									/>
								</div>
								<div className="space-y-2">
									<Label className="text-sm font-medium">
										Patient Sex *
									</Label>
									<RadioGroup
										value={formData.alertCaseSex}
										onValueChange={(value) =>
											handleInputChange(
												"alertCaseSex",
												value
											)
										}
										className="flex gap-3 mt-2"
									>
										<div className="flex items-center space-x-2">
											<RadioGroupItem
												value="Male"
												id="male"
											/>
											<Label
												htmlFor="male"
												className="text-sm"
											>
												Male
											</Label>
										</div>
										<div className="flex items-center space-x-2">
											<RadioGroupItem
												value="Female"
												id="female"
											/>
											<Label
												htmlFor="female"
												className="text-sm"
											>
												Female
											</Label>
										</div>
									</RadioGroup>
								</div>
							</div>

							<div className="space-y-2">
								<Label
									htmlFor="history"
									className="text-sm font-medium"
								>
									Case Description *
								</Label>
								<Textarea
									id="history"
									value={formData.history}
									onChange={(e) =>
										handleInputChange(
											"history",
											e.target.value
										)
									}
									rows={3}
									required
								/>
							</div>
						</div>

						<Separator />

						{/* Reporter Information */}
						<div className="space-y-3">
							<div className="flex items-center gap-3">
								<UserIcon className="h-4 w-4 text-uganda-red" />
								<h3 className="text-sm font-semibold uppercase tracking-wide">
									Reporter Information
								</h3>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
								<div className="space-y-2">
									<Label
										htmlFor="personReporting"
										className="text-sm font-medium"
									>
										Person Reporting *
									</Label>
									<Input
										id="personReporting"
										value={
											formData.personReporting
										}
										onChange={(e) =>
											handleInputChange(
												"personReporting",
												e.target.value
											)
										}
										required
									/>
								</div>
								<div className="space-y-2">
									<Label
										htmlFor="contactNumber"
										className="text-sm font-medium"
									>
										Contact Number *
									</Label>
									<Input
										id="contactNumber"
										value={formData.contactNumber}
										onChange={(e) =>
											handleInputChange(
												"contactNumber",
												e.target.value
											)
										}
										required
									/>
								</div>
								<div className="space-y-2">
									<Label
										htmlFor="sourceOfAlert"
										className="text-sm font-medium"
									>
										Source of Alert *
									</Label>
									<Select
										value={formData.sourceOfAlert}
										onValueChange={(value) =>
											handleInputChange(
												"sourceOfAlert",
												value
											)
										}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select source" />
										</SelectTrigger>
										<SelectContent>
											{alertSource?.map((source) => (
															<SelectItem
																key={source.name}
																value={source.name}
															>
																{source.name}
															</SelectItem>
														))}
										</SelectContent>
									</Select>
								</div>
							</div>
						</div>

						<Separator />

						{/* Location Information */}
						<div className="space-y-3">
							<div className="flex items-center gap-3">
								<UserIcon className="h-4 w-4 text-uganda-red" />
								<h3 className="text-sm font-semibold uppercase tracking-wide">
									Location Information
								</h3>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
								<div className="space-y-2">
									<Label htmlFor="village" className="text-sm font-medium">
										Village (Reporter)
									</Label>
									<Input
										id="village"
										value={formData.village}
										onChange={(e) => handleInputChange("village", e.target.value)}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="subCounty" className="text-sm font-medium">
										Sub County (Reporter)
									</Label>
									<Input
										id="subCounty"
										value={formData.subCounty}
										onChange={(e) => handleInputChange("subCounty", e.target.value)}
									/>
								</div>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
								<CaseLocationSelect
									value={{
										region: formData.region,
										district: formData.alertCaseDistrict,
										subcounty: formData.alertCaseSubCounty,
									}}
									onChange={(loc) =>
										setFormData((prev) => ({
											...prev,
											region: loc.region,
											alertCaseDistrict: loc.district,
											alertCaseSubCounty: loc.subcounty,
										}))
									}
									labelClassName="text-sm font-medium"
								/>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
								<div className="space-y-2">
									<Label htmlFor="alertCaseVillage" className="text-sm font-medium">
										Case Village
									</Label>
									<Input
										id="alertCaseVillage"
										value={formData.alertCaseVillage}
										onChange={(e) => handleInputChange("alertCaseVillage", e.target.value)}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="alertCaseParish" className="text-sm font-medium">
										Case Parish
									</Label>
									<Input
										id="alertCaseParish"
										value={formData.alertCaseParish}
										onChange={(e) => handleInputChange("alertCaseParish", e.target.value)}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="alertCaseNationality" className="text-sm font-medium">
										Case Nationality
									</Label>
									<Input
										id="alertCaseNationality"
										value={formData.alertCaseNationality}
										onChange={(e) => handleInputChange("alertCaseNationality", e.target.value)}
									/>
								</div>
							</div>
						</div>

						<Separator />

						{/* Point of Contact Information */}
						<div className="space-y-3">
							<div className="flex items-center gap-3">
								<UserIcon className="h-4 w-4 text-uganda-red" />
								<h3 className="text-sm font-semibold uppercase tracking-wide">
									Point of Contact Information
								</h3>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
								<div className="space-y-2">
									<Label
										htmlFor="pointOfContactName"
										className="text-sm font-medium"
									>
										Point of Contact Name
									</Label>
									<Input
										id="pointOfContactName"
										value={
											formData.pointOfContactName
										}
										onChange={(e) =>
											handleInputChange(
												"pointOfContactName",
												e.target.value
											)
										}
									/>
								</div>
								<div className="space-y-2">
									<Label
										htmlFor="pointOfContactRelationship"
										className="text-sm font-medium"
									>
										Relationship
									</Label>
									<Input
										id="pointOfContactRelationship"
										value={
											formData.pointOfContactRelationship
										}
										onChange={(e) =>
											handleInputChange(
												"pointOfContactRelationship",
												e.target.value
											)
										}
									/>
								</div>
								<div className="space-y-2">
									<Label
										htmlFor="pointOfContactPhone"
										className="text-sm font-medium"
									>
										Point of Contact Phone
									</Label>
									<Input
										id="pointOfContactPhone"
										value={
											formData.pointOfContactPhone
										}
										onChange={(e) =>
											handleInputChange(
												"pointOfContactPhone",
												e.target.value
											)
										}
									/>
								</div>
							</div>
						</div>

						<Separator />

						{/* Medical Information */}
						<div className="space-y-3">
							<div className="flex items-center gap-3">
								<HeartIcon className="h-4 w-4 text-uganda-red" />
								<h3 className="text-sm font-semibold uppercase tracking-wide">
									Medical Information
								</h3>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
								<div className="space-y-2">
									<Label
										htmlFor="alertCasePregnantDuration"
										className="text-sm font-medium"
									>
										Pregnant Duration (months)
									</Label>
									<Input
										id="alertCasePregnantDuration"
										type="number"
										value={
											formData.alertCasePregnantDuration
										}
										onChange={(e) =>
											handleInputChange(
												"alertCasePregnantDuration",
												parseInt(
													e.target.value
												) || 0
											)
										}
										min="0"
										max="9"
									/>
								</div>
								<div className="space-y-2">
									<Label
										htmlFor="symptoms"
										className="text-sm font-medium"
									>
										Symptoms
									</Label>
									<Textarea
										id="symptoms"
										value={formData.symptoms}
										onChange={(e) =>
											handleInputChange(
												"symptoms",
												e.target.value
											)
										}
										rows={2}
										placeholder="List symptoms separated by commas"
									/>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
								<div className="space-y-2">
									<Label
										htmlFor="healthFacilityVisit"
										className="text-sm font-medium"
									>
										Health Facility Visit
									</Label>
									<Textarea
										id="healthFacilityVisit"
										value={
											formData.healthFacilityVisit
										}
										onChange={(e) =>
											handleInputChange(
												"healthFacilityVisit",
												e.target.value
											)
										}
										rows={2}
										placeholder="Details about health facility visits"
									/>
								</div>
								<div className="space-y-2">
									<Label
										htmlFor="traditionalHealerVisit"
										className="text-sm font-medium"
									>
										Traditional Healer Visit
									</Label>
									<Textarea
										id="traditionalHealerVisit"
										value={
											formData.traditionalHealerVisit
										}
										onChange={(e) =>
											handleInputChange(
												"traditionalHealerVisit",
												e.target.value
											)
										}
										rows={2}
										placeholder="Details about traditional healer visits"
									/>
								</div>
							</div>
						</div>

						<Separator />

						{/* Desk Verification Actions */}
						<div className="space-y-3">
							<div className="flex items-center gap-3">
								<AlertTriangleIcon className="h-4 w-4 text-uganda-red" />
								<h3 className="text-sm font-semibold uppercase tracking-wide">
									Desk Verification Actions
								</h3>
							</div>

							<div className="bg-muted p-4 rounded-lg">
								<p className="text-xs text-muted-foreground mb-3">
									Select all actions that apply.
								</p>
								<div className="flex flex-wrap gap-3">
									{DESK_VERIFICATION_OPTIONS.map(
										(option) => {
											const id = `desk-${option
												.toLowerCase()
												.replace(
													/[^a-z0-9]/g,
													"-"
												)}`;
											return (
												<div
													key={option}
													className="flex items-center space-x-2"
												>
													<Checkbox
														id={id}
														checked={hasDeskAction(
															formData.deskVerificationActions,
															option
														)}
														onCheckedChange={(
															checked
														) =>
															handleInputChange(
																"deskVerificationActions",
																toggleDeskAction(
																	formData.deskVerificationActions,
																	option,
																	checked ===
																		true
																)
															)
														}
													/>
													<Label
														htmlFor={id}
														className="text-sm font-medium"
													>
														{option}
													</Label>
												</div>
											);
										}
									)}
								</div>
							</div>
						</div>

						{/* VHF Case Investigation Form - Only show when Field Case Verification is selected */}
						{showVhfForm && (
							<>
								<Separator />
								<div className="space-y-3">
									<div className="flex items-center gap-3">
										<AlertTriangleIcon className="h-4 w-4 text-uganda-red" />
										<h3 className="text-sm font-semibold uppercase tracking-wide">
											VHF Case Investigation
											Form
										</h3>
									</div>

									<div className="surface-info p-4 rounded-lg">
										<p className="text-sm text-foreground mb-2">
											<strong>Note:</strong>{" "}
											Complete the VHF (Viral
											Hemorrhagic Fever) Case
											Investigation Form below.
											The "Get Location" button
											in the form will capture
											your GPS coordinates
											automatically. After
											submission, the case code
											will be automatically
											captured.
										</p>
									</div>

									<div className="border rounded-lg overflow-hidden">
										<iframe
											src="https://response.health.go.ug/vhf-cif"
											className="w-full h-[600px]"
											title="VHF Case Investigation Form"
											sandbox="allow-same-origin allow-scripts allow-forms allow-navigation"
											allow="geolocation; camera; microphone"
											onLoad={() => {
												// Monitor for navigation to success page
												const iframe =
													document.querySelector(
														'iframe[title="VHF Case Investigation Form"]'
													) as HTMLIFrameElement;
												if (
													iframe?.contentWindow
												) {
													try {
														// Check iframe URL periodically for success page
														const checkUrl =
															setInterval(
																() => {
																	try {
																		const currentUrl =
																			iframe
																				.contentWindow
																				?.location
																				.href;
																		if (
																			currentUrl?.includes(
																				"/vhf-cif/success"
																			)
																		) {
																			const urlParams =
																				new URLSearchParams(
																					currentUrl.split(
																						"?"
																					)[1]
																				);
																			const caseCode =
																				urlParams.get(
																					"case_code"
																				);
																			if (
																				caseCode
																			) {
																				setVhfCaseCode(
																					caseCode
																				);
																				setShowVhfForm(
																					false
																				);
																				clearInterval(
																					checkUrl
																				);
																				toast(
																					{
																						title: "VHF Form Submitted Successfully",
																						description: `Case Code: ${caseCode}`,
																					}
																				);
																			}
																		}
																	} catch (e) {
																		// Cross-origin error - expected
																	}
																},
																1000
															);

														// Clean up interval after 10 minutes
														setTimeout(
															() =>
																clearInterval(
																	checkUrl
																),
															600000
														);
													} catch (e) {
														// Cross-origin restrictions
													}
												}
											}}
										/>
									</div>

									<div className="flex justify-between items-center">
										<Button
											type="button"
											variant="outline"
											onClick={() => {
												setShowVhfForm(
													false
												);
												handleInputChange(
													"deskVerificationActions",
													toggleDeskAction(
														formData.deskVerificationActions,
														FIELD_CASE_VERIFICATION,
														false
													)
												);
											}}
										>
											Cancel VHF Form
										</Button>
										<p className="text-sm text-muted-foreground">
											The form will close
											automatically after
											successful submission
										</p>
									</div>
								</div>
							</>
						)}

						{/* Manual Case Code Input - Show when Field Case Verification is selected */}
						{hasDeskAction(
							formData.deskVerificationActions,
							FIELD_CASE_VERIFICATION
						) && (
							<>
								<Separator />
								<div className="space-y-3">
									<div className="flex items-center gap-3">
										<UserIcon className="h-4 w-4 text-uganda-red" />
										<h3 className="text-sm font-semibold uppercase tracking-wide">
											VHF Case Code
										</h3>
									</div>

									<div className="space-y-2">
										<Label
											htmlFor="vhfCaseCode"
											className="text-sm font-medium"
										>
											Case Code{" "}
											{vhfCaseCode
												? "(Auto-captured)"
												: "(Manual Entry)"}
										</Label>
										<Input
											id="vhfCaseCode"
											type="text"
											value={vhfCaseCode || ""}
											onChange={(e) =>
												setVhfCaseCode(
													e.target.value
												)
											}
											placeholder="Enter VHF case code (e.g., VHF-20250816-8022)"
											className={
												vhfCaseCode
													? "bg-success/10 border-success"
													: ""
											}
										/>
										<p className="text-xs text-muted-foreground">
											{vhfCaseCode
												? "This code was automatically captured from the VHF form submission. You can edit it if needed."
												: "Enter the case code manually or complete the VHF form above for automatic capture."}
										</p>
									</div>
								</div>
							</>
						)}

						{/* VHF Case Code Display - Show when case code is captured */}
						{vhfCaseCode && (
							<>
								<Separator />
								<div className="space-y-3">
									<div className="flex items-center gap-3">
										<CheckCircleIcon className="h-5 w-5 text-success" />
										<h3 className="text-sm font-semibold uppercase tracking-wide text-success">
											VHF Case Investigation
											Completed
										</h3>
									</div>

									<div className="surface-success p-4 rounded-lg">
										<div className="flex items-center gap-2">
											<CheckCircleIcon className="h-5 w-5 text-success" />
											<div>
												<p className="text-sm font-medium text-success">
													VHF Case Code:{" "}
													<span className="font-mono">
														{
															vhfCaseCode
														}
													</span>
												</p>
												<p className="text-xs text-success mt-1">
													The VHF Case
													Investigation
													Form has been
													successfully
													submitted and
													linked to this
													alert.
												</p>
											</div>
										</div>
									</div>
								</div>
							</>
						)}

						{/* Field Verification Feedback - Only show when Field Case Verification is selected */}
						{hasDeskAction(
							formData.deskVerificationActions,
							FIELD_CASE_VERIFICATION
						) && (
							<>
								<Separator />
								<div className="space-y-3">
									<div className="flex items-center gap-3">
										<CheckCircleIcon className="h-4 w-4 text-uganda-red" />
										<h3 className="text-sm font-semibold uppercase tracking-wide">
											Field Verification
											Feedback
										</h3>
									</div>

									<div className="bg-muted p-4 rounded-lg">
										<RadioGroup
											value={
												formData.fieldVerificationFeedback
											}
											onValueChange={(value) =>
												handleInputChange(
													"fieldVerificationFeedback",
													value
												)
											}
											className="flex flex-wrap gap-3"
										>
											{FIELD_VERIFICATION_OPTIONS.map((option) => (
												<div
													key={option}
													className="flex items-center space-x-2"
												>
													<RadioGroupItem
														value={
															option
														}
														id={`feedback-${option
															.toLowerCase()
															.replace(
																/[^a-z0-9]/g,
																"-"
															)}`}
													/>
													<Label
														htmlFor={`feedback-${option
															.toLowerCase()
															.replace(
																/[^a-z0-9]/g,
																"-"
															)}`}
														className="text-sm font-medium"
													>
														{option}
													</Label>
												</div>
											))}
										</RadioGroup>
									</div>
								</div>
							</>
						)}

						<Separator />

						{/* Additional Information */}
						<div className="space-y-3">
							<div className="flex items-center gap-3">
								<HeartIcon className="h-4 w-4 text-uganda-red" />
								<h3 className="text-sm font-semibold uppercase tracking-wide">
									Additional Information
								</h3>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
								<div className="space-y-2">
									<Label
										htmlFor="actions"
										className="text-sm font-medium"
									>
										Actions (from desk verification)
									</Label>
									<Input
										id="actions"
										value={formData.actions}
										readOnly
										className="bg-muted/50"
									/>
									<p className="text-xs text-muted-foreground">
										Updated automatically from the desk
										verification action selected above.
									</p>
								</div>
								<div className="space-y-2">
									<Label
										htmlFor="feedback"
										className="text-sm font-medium"
									>
										Feedback
									</Label>
									<Textarea
										id="feedback"
										value={formData.feedback}
										onChange={(e) =>
											handleInputChange(
												"feedback",
												e.target.value
											)
										}
										rows={3}
										placeholder="Any additional feedback or notes"
									/>
								</div>
							</div>
						</div>
					</div>
				)}

				<DialogFooter>
					<Button
						variant="outline"
						onClick={onClose}
					>
						Cancel
					</Button>
					{showVerificationForm && (
						<Button
							onClick={handleVerification}
							disabled={isVerifying}
							className="bg-gradient-to-r from-uganda-red to-uganda-yellow hover:from-uganda-red/90 hover:to-uganda-yellow/90 text-white"
						>
							{isVerifying ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin mr-2" />
									Verifying...
								</>
							) : isEidsrMode ? (
								"Verify into alerts"
							) : (
								"Verify Alert"
							)}
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
