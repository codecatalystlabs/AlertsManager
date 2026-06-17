"use client";

import type React from "react";
import { useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
	CalendarIcon,
	UserIcon,
	MapPinIcon,
	AlertTriangleIcon,
	HeartIcon,
	LogIn,
	Home,
	Download,
} from "lucide-react";
import { AuthService } from "@/lib/auth";
import { getClientApiBaseUrl } from "@/lib/api-config";
import {
	downloadAlertConfirmationPdf,
	type AlertPdfData,
} from "@/lib/alert-pdf";
import Link from "next/link";
import {
	alertResponse,
	alertSource,
	alertEntryStatus,
	signsAndSymptoms,
} from "@/constants";
import { CaseLocationSelect } from "@/components/case-location-select";
import { SearchableSelect, MultiSelect } from "@/components/searchable-select";
import { CHANNEL_OF_REPORTING_OPTIONS } from "@/lib/channel-of-reporting";
import {
	getLocalDateString,
	getLocalDateTimeIsoString,
	getLocalTimeString,
} from "@/lib/utils";
import { MohLogo } from "@/components/moh-logo";
import { useIsAuthenticated } from "@/hooks/use-auth-status";

export default function PublicAddAlertPage() {
	const [formData, setFormData] = useState({
		date: "",
		callTime: getLocalTimeString(),
		call_taker: "",
		// cif_no: "",
		alertReportedBefore: "",
		nameOfPersonReporting: "",
		numberOfPersonReporting: "",
		status: "",
		response: "",
		region: "",
		district: "",
		subcounty: "",
		village: "",
		parish: "",
		sourceOfAlert: "",
		channelOfReporting: "",
		caseAlertDescription: "",
		caseName: "",
		caseAge: "",
		caseSex: "",
		labSamplesCollected: "",
		nameOfNextOfKin: "",
		nextOfKinPhoneNumber: "",
		narrative: "",
		signsAndSymptoms: [] as string[],
	});

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitStatus, setSubmitStatus] = useState<{
		type: "success" | "error" | null;
		message: string;
	}>({ type: null, message: "" });
	// Snapshot of the just-submitted alert, kept so the reporter can download
	// a PDF copy after the form has been reset.
	const [submittedAlert, setSubmittedAlert] = useState<AlertPdfData | null>(
		null
	);
	const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
	const [pdfError, setPdfError] = useState("");
	const isAuthenticated = useIsAuthenticated();

	const handleInputChange = (field: string, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleSymptomsChange = (symptom: string, checked: boolean) => {
		setFormData((prev) => ({
			...prev,
			signsAndSymptoms: checked
				? [...prev.signsAndSymptoms, symptom]
				: prev.signsAndSymptoms.filter((s) => s !== symptom),
		}));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		setSubmitStatus({ type: null, message: "" });
		setSubmittedAlert(null);
		setPdfError("");

		try {
			// Validate required fields
			if (
				!formData.date ||
				!formData.callTime ||
				// !formData.cif_no ||
				!formData.status ||
				!formData.nameOfPersonReporting ||
				!formData.numberOfPersonReporting ||
				!formData.sourceOfAlert ||
				!formData.region ||
				!formData.district ||
				!formData.subcounty ||
				!formData.caseName ||
				!formData.caseAge ||
				!formData.caseSex ||
				!formData.caseAlertDescription
			) {
				throw new Error("Please fill in all required fields");
			}

			if (formData.signsAndSymptoms.length === 0) {
				throw new Error(
					"Please select at least one sign or symptom"
				);
			}

			// Prepare the data to match the API structure
			const alertData = {
				date: formData.date
					? new Date(formData.date).toISOString()
					: new Date().toISOString(),
				time: getLocalDateTimeIsoString(
					formData.date,
					formData.callTime
				),
				// cifNo: formData.cif_no || "",
				alertReportedBefore:
					formData.alertReportedBefore === "yes" ? "Yes" : "No",
				personReporting: formData.nameOfPersonReporting,
				village: formData.village || "",
				contactNumber: formData.numberOfPersonReporting,
				status: formData.status || "Pending",
				response: formData.response || "Routine",
				region: formData.region,
				alertCaseDistrict: formData.district,
				subCounty: formData.subcounty || "",
				alertCaseVillage: formData.village || "",
				alertCaseSubCounty: formData.subcounty || "",
				alertCaseParish: formData.parish || "",
				alertCaseNationality: "Ugandan",
				sourceOfAlert: formData.sourceOfAlert,
				channelOfReporting: formData.channelOfReporting || "",
				callTaker: formData.call_taker || "",
				history: formData.caseAlertDescription,
				alertCaseName: formData.caseName,
				alertCaseAge: parseInt(formData.caseAge) || 0,
				alertCaseSex: formData.caseSex,
				labSamplesCollected: formData.labSamplesCollected || "",
				pointOfContactName: formData.nameOfNextOfKin || "",
				pointOfContactRelationship: "Family",
				pointOfContactPhone: formData.nextOfKinPhoneNumber || "",
				healthFacilityVisit: "No",
				traditionalHealerVisit: "No",
				actions: "Alert reported",
				narrative: formData.narrative || "",
				symptoms: formData.signsAndSymptoms.join(", "),
				isHighlighted: false,
				isVerified: false,
			};


			let createdAlertId: number | null = null;
			if (isAuthenticated) {
				// Use the new createAlert method for authenticated users
				const created = await AuthService.createAlert(alertData);
				createdAlertId = created?.id ?? null;
			} else {
				// Use public endpoint if not authenticated
				const response = await fetch(
					`${getClientApiBaseUrl()}/alerts/create`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify(alertData),
					}
				);

				if (!response.ok) {
					let errorMessage =
						"Failed to submit alert. Please try again.";
					try {
						const errorData = await response.json();
						errorMessage =
							errorData.message ||
							errorData.error ||
							errorMessage;
					} catch (e) {
						// Use default error message
					}
					throw new Error(errorMessage);
				}

				try {
					const created = await response.json();
					createdAlertId = created?.id ?? null;
				} catch (e) {
					// Created successfully, but no/invalid body — leave id null.
				}
			}

			// Capture a snapshot for the downloadable PDF copy before the
			// form is reset below.
			const responseName = formData.response
				? alertResponse.find((d) => d.code === formData.response)
						?.name ?? formData.response
				: "";
			setSubmittedAlert({
				referenceId: createdAlertId,
				submittedAt: new Date(),
				date: formData.date,
				time: formData.callTime,
				status: formData.status,
				callTaker: formData.call_taker,
				alertReportedBefore:
					formData.alertReportedBefore === "yes"
						? "Yes"
						: formData.alertReportedBefore === "no"
						? "No"
						: "",
				personReporting: formData.nameOfPersonReporting,
				contactNumber: formData.numberOfPersonReporting,
				sourceOfAlert: formData.sourceOfAlert,
				response: responseName,
				region: formData.region,
				district: formData.district,
				subCounty: formData.subcounty,
				village: formData.village,
				parish: formData.parish,
				caseName: formData.caseName,
				caseAge: formData.caseAge,
				caseSex: formData.caseSex,
				nextOfKinName: formData.nameOfNextOfKin,
				nextOfKinPhone: formData.nextOfKinPhoneNumber,
				caseDescription: formData.caseAlertDescription,
				narrative: formData.narrative,
				symptoms: formData.signsAndSymptoms,
			});

			setSubmitStatus({
				type: "success",
				message: "Alert submitted successfully! Thank you for reporting this health alert. The relevant authorities have been notified.",
			});

			// Reset form after successful submission
			setFormData({
				date: "",
				callTime: getLocalTimeString(),
				call_taker: "",
				// cif_no: "",
				alertReportedBefore: "",
				nameOfPersonReporting: "",
				numberOfPersonReporting: "",
				status: "",
				response: "",
				region: "",
				district: "",
				subcounty: "",
				village: "",
				parish: "",
				sourceOfAlert: "",
				channelOfReporting: "",
				caseAlertDescription: "",
				caseName: "",
				caseAge: "",
				caseSex: "",
				labSamplesCollected: "",
				nameOfNextOfKin: "",
				nextOfKinPhoneNumber: "",
				narrative: "",
				signsAndSymptoms: [],
			});
		} catch (err) {
			setSubmitStatus({
				type: "error",
				message:
					err instanceof Error
						? err.message
						: "An error occurred while submitting the alert. Please try again.",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDownloadPdf = async () => {
		if (!submittedAlert) return;
		setIsDownloadingPdf(true);
		setPdfError("");
		try {
			await downloadAlertConfirmationPdf(submittedAlert);
		} catch (err) {
			setPdfError(
				err instanceof Error
					? err.message
					: "Could not generate the PDF. Please try again."
			);
		} finally {
			setIsDownloadingPdf(false);
		}
	};

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<div className="bg-gradient-to-r from-uganda-red to-uganda-yellow text-white shadow-lg">
				<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex min-w-0 items-center space-x-3">
							<MohLogo />
							<div className="min-w-0">
								<h1 className="text-xl font-bold">
									Uganda Health Alert System
								</h1>
								<p className="text-sm text-white/90">
									Ministry of Health Uganda
								</p>
							</div>
						</div>
						<div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
							{isAuthenticated ? (
								<>
									<Link href="/dashboard">
										<Button
											variant="secondary"
											className="bg-white/20 text-white border-white/30 hover:bg-white/30"
										>
											<Home className="w-4 h-4 mr-2" />
											Dashboard
										</Button>
									</Link>
									<Button
										variant="secondary"
										className="bg-white/20 text-white border-white/30 hover:bg-white/30"
										onClick={async () => {
											try {
												await AuthService.logout();
												window.location.href =
													"/add-alert";
											} catch (error) {
												console.error(
													"Logout error:",
													error
												);
												window.location.href =
													"/add-alert";
											}
										}}
									>
										<LogIn className="w-4 h-4 mr-2 rotate-180" />
										Logout
									</Button>
								</>
							) : (
								<>
									<Link
										href="/evd-definition"
										target="_blank"
									>
										<Button
											variant="secondary"
											className="bg-white/20 text-white border-white/30 hover:bg-white/30"
										>
											<Home className="w-4 h-4 mr-2" />
											EVD Definition
										</Button>
									</Link>
									<Link href="/login">
										<Button
											variant="secondary"
											className="bg-white/20 text-white border-white/30 hover:bg-white/30"
										>
											<LogIn className="w-4 h-4 mr-2" />
											Login
										</Button>
									</Link>
								</>
							)}
						</div>
					</div>
				</div>
			</div>

			<div className="mx-auto max-w-[1440px] px-4 py-5 pb-28 sm:px-6 lg:px-8">
				{/* Main Form */}
				<Card className="border-0 shadow-xl">
					<CardHeader className="rounded-t-lg bg-gradient-to-r from-uganda-red to-uganda-yellow px-5 py-4 text-white sm:px-6">
						<CardTitle className="flex items-center gap-3 text-2xl font-bold">
							<AlertTriangleIcon className="h-7 w-7" />
							Report Health Alert
						</CardTitle>
						<p className="text-sm text-white/90">
							{isAuthenticated
								? "Submit a health alert to the Ministry of Health surveillance system"
								: "Anyone can report a health alert. Help us protect public health by reporting suspected cases."}
						</p>
					</CardHeader>
					<CardContent className="p-4 sm:p-5 lg:p-6">
						<form
							id="health-alert-form"
							onSubmit={handleSubmit}
							className="space-y-5"
						>
							{/* Basic Information */}
							<div className="space-y-4">
								<div className="flex items-center gap-2">
									<CalendarIcon className="h-5 w-5 text-uganda-red" />
									<h3 className="text-lg font-semibold text-uganda-black">
										Basic Information
									</h3>
								</div>

								<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
									<div className="space-y-2">
										<Label
											htmlFor="date"
											className="text-sm font-medium text-gray-700"
										>
											Date *
										</Label>
										<Input
											id="date"
											type="date"
											max={getLocalDateString()}
											value={formData.date}
											onChange={(e) =>
												handleInputChange(
													"date",
													e.target.value
												)
											}
											required
											className="border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow/20"
										/>
									</div>
									<div className="space-y-2">
										<Label
											htmlFor="callTime"
											className="text-sm font-medium text-gray-700"
										>
											Time *
										</Label>
										<Input
											id="callTime"
											type="time"
											value={formData.callTime}
											onChange={(e) =>
												handleInputChange(
													"callTime",
													e.target.value
												)
											}
											required
											className="border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow/20"
										/>
									</div>

									<div className="space-y-2">
										<Label
											htmlFor="status"
											className="text-sm font-medium"
										>
											Alert Status *
										</Label>
										<Select
											onValueChange={(value) =>
												handleInputChange(
													"status",
													value
												)
											}
											value={formData.status}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select alert status" />
											</SelectTrigger>
											<SelectContent>
												{alertEntryStatus?.map(
													(status) => (
														<SelectItem
															key={
																status.name
															}
															value={
																status.name
															}
														>
															{
																status.name
															}
														</SelectItem>
													)
												)}
											</SelectContent>
										</Select>
									</div>
										<div className="space-y-2">
										<Label
											htmlFor="call_taker"
											className="text-sm font-medium text-gray-600"
										>
											Call Taker Name{" "}
											<span className="font-normal text-gray-400">
												(optional)
											</span>
										</Label>
										<Input
											id="call_taker"
											value={
												formData.call_taker
											}
											onChange={(e) =>
												handleInputChange(
													"call_taker",
													e.target.value
												)
											}
											placeholder="Enter call taker's name"
											className="border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow/20"
										/>
									</div>
									<div className="space-y-2">
										<Label className="text-sm font-medium text-gray-600">
											Alert reported before?{" "}
											<span className="font-normal text-gray-400">
												(optional)
											</span>
										</Label>
										<RadioGroup
											value={
												formData.alertReportedBefore
											}
											onValueChange={(value) =>
												handleInputChange(
													"alertReportedBefore",
													value
												)
											}
											className="flex min-h-10 items-center gap-4"
										>
											<div className="flex items-center space-x-2">
												<RadioGroupItem
													value="yes"
													id="yes"
													className="border-uganda-red text-uganda-red"
												/>
												<Label
													htmlFor="yes"
													className="text-sm"
												>
													Yes
												</Label>
											</div>
											<div className="flex items-center space-x-2">
												<RadioGroupItem
													value="no"
													id="no"
													className="border-uganda-red text-uganda-red"
												/>
												<Label
													htmlFor="no"
													className="text-sm"
												>
													No
												</Label>
											</div>
										</RadioGroup>
									</div>
								</div>
							</div>

							<Separator />

							{/* Reporter Information */}
							<div className="space-y-4">
								<div className="flex items-center gap-2">
									<UserIcon className="h-5 w-5 text-uganda-red" />
									<h3 className="text-lg font-semibold text-uganda-black">
										Reporter Information
									</h3>
								</div>

								<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
									<div className="space-y-2">
										<Label
											htmlFor="nameOfPersonReporting"
											className="text-sm font-medium text-gray-700"
										>
											Your Name *
										</Label>
										<Input
											id="nameOfPersonReporting"
											value={
												formData.nameOfPersonReporting
											}
											onChange={(e) =>
												handleInputChange(
													"nameOfPersonReporting",
													e.target.value
												)
											}
											required
											placeholder="Enter your full name"
											className="border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow/20"
										/>
									</div>
									<div className="space-y-2">
										<Label
											htmlFor="numberOfPersonReporting"
											className="text-sm font-medium text-gray-700"
										>
											Your Phone Number *
										</Label>
										<Input
											id="numberOfPersonReporting"
											value={
												formData.numberOfPersonReporting
											}
											onChange={(e) =>
												handleInputChange(
													"numberOfPersonReporting",
													e.target.value
												)
											}
											required
											placeholder="e.g., 0701234567"
											className="border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow/20"
										/>
									</div>
									<div className="space-y-2">
										<Label
											htmlFor="sourceOfAlert"
											className="text-sm font-medium text-gray-700"
										>
											Source of Alert *
										</Label>
										<MultiSelect
											id="sourceOfAlert"
											options={alertSource.map(
												(source) => ({
													value: source.name,
													label: source.name,
												})
											)}
											values={
												formData.sourceOfAlert
													? formData.sourceOfAlert
															.split(",")
															.map((s) =>
																s.trim()
															)
															.filter(Boolean)
													: []
											}
											onChange={(vals) =>
												handleInputChange(
													"sourceOfAlert",
													vals.join(", ")
												)
											}
											placeholder="How did you learn about this case?"
											searchPlaceholder="Search sources..."
											className="border-gray-300 focus-visible:ring-uganda-yellow/20"
										/>
									</div>

									<div className="space-y-2">
											<Label
												htmlFor="channelOfReporting"
												className="text-sm font-medium text-gray-700"
											>
												Channel of Reporting
											</Label>
											<Select
												value={
													formData.channelOfReporting
												}
												onValueChange={(value) =>
													handleInputChange(
														"channelOfReporting",
														value
													)
												}
											>
												<SelectTrigger
													id="channelOfReporting"
													className="border-gray-300 focus:ring-uganda-yellow/20"
												>
													<SelectValue placeholder="How was this alert reported?" />
												</SelectTrigger>
												<SelectContent>
													{CHANNEL_OF_REPORTING_OPTIONS.map(
														(channel) => (
															<SelectItem
																key={channel}
																value={channel}
															>
																{channel}
															</SelectItem>
														)
													)}
												</SelectContent>
											</Select>
										</div>

										{/* Response */}
									<div className="space-y-2">
										<Label
											htmlFor="response"
											className="text-sm font-medium text-gray-600"
										>
											Response{" "}
											<span className="font-normal text-gray-400">
												(optional)
											</span>
										</Label>
										<SearchableSelect
											id="response"
											options={alertResponse.map(
												(disease) => ({
													value: disease.code,
													label: disease.name,
												})
											)}
											value={formData.response}
											onChange={(value) =>
												handleInputChange(
													"response",
													value
												)
											}
											placeholder="Select disease"
											searchPlaceholder="Search diseases..."
										/>
									</div>
								</div>
							</div>

							<Separator />

							{/* Location Information */}
							<div className="space-y-4">
								<div className="flex items-center gap-2">
									<MapPinIcon className="h-5 w-5 text-uganda-red" />
									<h3 className="text-lg font-semibold text-uganda-black">
										Case Location
									</h3>
								</div>

								<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
									<CaseLocationSelect
										value={{
											region: formData.region,
											district: formData.district,
											subcounty: formData.subcounty,
										}}
										onChange={(loc) =>
											setFormData((prev) => ({
												...prev,
												region: loc.region,
												district: loc.district,
												subcounty: loc.subcounty,
											}))
										}
										triggerClassName="border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow/20"
									/>
									<div className="space-y-2">
										<Label
											htmlFor="village"
											className="text-sm font-medium text-gray-600"
										>
											Village{" "}
											<span className="font-normal text-gray-400">
												(optional)
											</span>
										</Label>
										<Input
											id="village"
											value={formData.village}
											onChange={(e) =>
												handleInputChange(
													"village",
													e.target.value
												)
											}
											placeholder="Enter village name"
											className="border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow/20"
										/>
									</div>
									<div className="space-y-2">
										<Label
											htmlFor="parish"
											className="text-sm font-medium text-gray-600"
										>
											Parish{" "}
											<span className="font-normal text-gray-400">
												(optional)
											</span>
										</Label>
										<Input
											id="parish"
											value={formData.parish}
											onChange={(e) =>
												handleInputChange(
													"parish",
													e.target.value
												)
											}
											placeholder="Enter parish name"
											className="border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow/20"
										/>
									</div>
								</div>
							</div>

							<Separator />

							{/* Case Information */}
							<div className="space-y-4">
								<div className="flex items-center gap-2">
									<AlertTriangleIcon className="h-5 w-5 text-uganda-red" />
									<h3 className="text-lg font-semibold text-uganda-black">
										Case Information
									</h3>
								</div>

								<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
									<div className="space-y-2">
										<Label
											htmlFor="caseName"
											className="text-sm font-medium text-gray-700"
										>
											Patient Name *
										</Label>
										<Input
											id="caseName"
											value={formData.caseName}
											onChange={(e) =>
												handleInputChange(
													"caseName",
													e.target.value
												)
											}
											required
											placeholder="Patient's full name"
											className="border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow/20"
										/>
									</div>
									<div className="space-y-2">
										<Label
											htmlFor="caseAge"
											className="text-sm font-medium text-gray-700"
										>
											Patient Age *
										</Label>
										<Input
											id="caseAge"
											type="number"
											value={formData.caseAge}
											onChange={(e) =>
												handleInputChange(
													"caseAge",
													e.target.value
												)
											}
											required
											placeholder="Age in years"
											min="0"
											max="150"
											className="border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow/20"
										/>
									</div>
									<div className="space-y-2">
										<Label className="text-sm font-medium text-gray-700">
											Patient Sex *
										</Label>
										<RadioGroup
											value={formData.caseSex}
											onValueChange={(value) =>
												handleInputChange(
													"caseSex",
													value
												)
											}
											className="flex min-h-10 items-center gap-4"
										>
											<div className="flex items-center space-x-2">
												<RadioGroupItem
													value="Male"
													id="male"
													className="border-uganda-red text-uganda-red"
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
													className="border-uganda-red text-uganda-red"
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
									<div className="space-y-2">
										<Label
											htmlFor="nameOfNextOfKin"
											className="text-sm font-medium text-gray-600"
										>
											Next of Kin Name{" "}
											<span className="font-normal text-gray-400">
												(optional)
											</span>
										</Label>
										<Input
											id="nameOfNextOfKin"
											value={
												formData.nameOfNextOfKin
											}
											onChange={(e) =>
												handleInputChange(
													"nameOfNextOfKin",
													e.target.value
												)
											}
											placeholder="Next of kin's full name"
											className="border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow/20"
										/>
									</div>
									<div className="space-y-2">
										<Label
											htmlFor="nextOfKinPhoneNumber"
											className="text-sm font-medium text-gray-600"
										>
											Next of Kin Phone{" "}
											<span className="font-normal text-gray-400">
												(optional)
											</span>
										</Label>
										<Input
											id="nextOfKinPhoneNumber"
											value={
												formData.nextOfKinPhoneNumber
											}
											onChange={(e) =>
												handleInputChange(
													"nextOfKinPhoneNumber",
													e.target.value
												)
											}
											placeholder="e.g., 0701234567"
											className="border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow/20"
										/>
									</div>
								</div>

								<div className="space-y-2">
									<Label className="text-sm font-medium text-gray-700">
										Were laboratory samples collected?
									</Label>
									<RadioGroup
										value={formData.labSamplesCollected}
										onValueChange={(value) =>
											handleInputChange(
												"labSamplesCollected",
												value
											)
										}
										className="flex gap-4 mt-2"
									>
										<div className="flex items-center space-x-2">
											<RadioGroupItem
												value="Yes"
												id="labSamplesYes"
											/>
											<Label
												htmlFor="labSamplesYes"
												className="text-sm"
											>
												Yes
											</Label>
										</div>
										<div className="flex items-center space-x-2">
											<RadioGroupItem
												value="No"
												id="labSamplesNo"
											/>
											<Label
												htmlFor="labSamplesNo"
												className="text-sm"
											>
												No
											</Label>
										</div>
									</RadioGroup>
								</div>

								<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
									<div className="space-y-2">
										<Label
											htmlFor="caseAlertDescription"
											className="text-sm font-medium text-gray-700"
										>
											Case Description *
										</Label>
										<Textarea
											id="caseAlertDescription"
											value={
												formData.caseAlertDescription
											}
											onChange={(e) =>
												handleInputChange(
													"caseAlertDescription",
													e.target.value
												)
											}
											required
											rows={3}
											placeholder="Describe what happened, when it started, and any relevant details"
											className="min-h-24 border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow/20"
										/>
									</div>

									<div className="space-y-2">
										<Label
											htmlFor="narrative"
											className="text-sm font-medium text-gray-600"
										>
											Additional Notes{" "}
											<span className="font-normal text-gray-400">
												(optional)
											</span>
										</Label>
										<Textarea
											id="narrative"
											placeholder="Any additional information that might be helpful"
											value={formData.narrative}
											onChange={(e) =>
												handleInputChange(
													"narrative",
													e.target.value
												)
											}
											maxLength={250}
											rows={3}
											className="min-h-24 border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow/20"
										/>
										<div className="flex justify-between text-xs text-gray-500">
											<span>
												Maximum 250 characters
											</span>
											<span>
												{
													formData.narrative
														.length
												}
												/250
											</span>
										</div>
									</div>
								</div>
							</div>

							<Separator />

							{/* Signs and Symptoms */}
							<div className="space-y-4">
								<div className="flex items-center gap-2">
									<HeartIcon className="h-5 w-5 text-uganda-red" />
									<h3 className="text-lg font-semibold text-uganda-black">
										Signs and Symptoms{" "}
										<span className="text-uganda-red">
											*
										</span>
									</h3>
								</div>

								<div className="rounded-lg bg-gray-50 p-3 sm:p-4">
									<p className="mb-3 text-sm text-gray-600">
										Select all symptoms that apply
										to this case (at least one is
										required):
									</p>
									<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
										{signsAndSymptoms.map(
											(symptom) => (
												<div
													key={symptom}
													className="flex min-h-10 items-center space-x-2 rounded border border-gray-200 bg-white px-3 py-2 transition-colors hover:border-uganda-yellow/50"
												>
													<Checkbox
														id={
															symptom
														}
														checked={formData.signsAndSymptoms.includes(
															symptom
														)}
														onCheckedChange={(
															checked
														) =>
															handleSymptomsChange(
																symptom,
																checked as boolean
															)
														}
														className="border-uganda-red data-[state=checked]:bg-uganda-red data-[state=checked]:border-uganda-red"
													/>
													<Label
														htmlFor={
															symptom
														}
														className="cursor-pointer text-sm font-medium leading-tight"
													>
														{symptom}
													</Label>
												</div>
											)
										)}
									</div>
									{formData.signsAndSymptoms.length >
										0 && (
										<div className="mt-3">
											<p className="mb-2 text-sm font-medium text-gray-700">
												Selected symptoms:
											</p>
											<div className="flex flex-wrap gap-2">
												{formData.signsAndSymptoms.map(
													(symptom) => (
														<Badge
															key={
																symptom
															}
															variant="secondary"
															className="bg-uganda-yellow/20 text-uganda-black"
														>
															{
																symptom
															}
														</Badge>
													)
												)}
											</div>
										</div>
									)}
								</div>
							</div>

						</form>

						{/* Status Messages */}
						{submitStatus.type && (
							<div className="mt-5">
								<Alert
									className={
										submitStatus.type ===
										"success"
											? "border-green-200 bg-green-50"
											: "border-red-200 bg-red-50"
									}
								>
									<AlertTriangleIcon
										className={`h-4 w-4 ${
											submitStatus.type ===
											"success"
												? "text-green-600"
												: "text-red-600"
										}`}
									/>
									<AlertDescription
										className={
											submitStatus.type ===
											"success"
												? "text-green-700"
												: "text-red-700"
										}
									>
										{submitStatus.message}
									</AlertDescription>
								</Alert>

								{submitStatus.type === "success" &&
									submittedAlert && (
										<div className="mt-3 flex flex-col gap-2 rounded-lg border border-green-200 bg-green-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
											<p className="text-sm text-green-800">
												Would you like a copy for
												your records? Download a PDF
												of the alert you just
												submitted.
											</p>
											<Button
												type="button"
												onClick={handleDownloadPdf}
												disabled={isDownloadingPdf}
												className="bg-uganda-red font-semibold text-white hover:bg-uganda-red/90"
											>
												<Download className="mr-2 h-4 w-4" />
												{isDownloadingPdf
													? "Preparing PDF..."
													: "Download PDF copy"}
											</Button>
										</div>
									)}

								{pdfError && (
									<p className="mt-2 text-sm text-red-600">
										{pdfError}
									</p>
								)}
							</div>
						)}
					</CardContent>
				</Card>

				{/* Emergency Contact */}
				<Alert className="mt-4 border-red-200 bg-red-50">
					<AlertTriangleIcon className="h-4 w-4 text-red-700" />
					<AlertDescription className="text-sm text-red-800">
						<strong>Emergency Contact:</strong>{" "}
						For immediate medical emergencies, please call{" "}
						<strong>0800-100-066</strong>, SMS <strong>6767</strong>, or visit
						the nearest health facility. This form is for reporting suspected
						disease outbreaks and public health concerns.
					</AlertDescription>
				</Alert>
			</div>

			<div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur">
				<div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
					<p className="text-xs text-gray-600">
						Required fields are marked with{" "}
						<span className="font-semibold text-uganda-red">*</span>.
					</p>
					<Button
						type="submit"
						form="health-alert-form"
						disabled={isSubmitting}
						className="w-full bg-gradient-to-r from-uganda-red to-uganda-yellow px-8 font-semibold text-white hover:from-uganda-red/90 hover:to-uganda-yellow/90 sm:w-auto"
					>
						{isSubmitting
							? "Submitting Alert..."
							: "Submit Health Alert"}
					</Button>
				</div>
			</div>
		</div>
	);
}
