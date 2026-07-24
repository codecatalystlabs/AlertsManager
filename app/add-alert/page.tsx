"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangleIcon, LogIn, Home, Download } from "lucide-react";
import { AuthService } from "@/lib/auth";
import { getClientApiBaseUrl } from "@/lib/api-config";
import {
	downloadAlertConfirmationPdf,
	type AlertPdfData,
} from "@/lib/alert-pdf";
import Link from "next/link";
import { alertResponse } from "@/constants";
import {
	AddAlertForm,
	type AlertFormValues,
	type AlertPayload,
} from "@/components/add-alert-form";
import { MohLogo } from "@/components/moh-logo";
import { useIsAuthenticated } from "@/hooks/use-auth-status";

async function submitPublicAlert(
	payload: AlertPayload
): Promise<number | null> {
	const response = await fetch(`${getClientApiBaseUrl()}/alerts/create`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		let errorMessage = "Failed to submit alert. Please try again.";
		try {
			const errorData = await response.json();
			errorMessage =
				errorData.message || errorData.error || errorMessage;
		} catch (e) {
			// Use default error message
		}
		throw new Error(errorMessage);
	}

	try {
		const created = await response.json();
		return created?.id ?? null;
	} catch (e) {
		// Created successfully, but no/invalid body — leave id null.
		return null;
	}
}

function toPdfData(
	values: AlertFormValues,
	createdId: number | null
): AlertPdfData {
	return {
		referenceId: createdId,
		submittedAt: new Date(),
		date: values.date,
		time: values.time,
		status: values.status,
		callTaker: values.callTaker,
		alertReportedBefore:
			values.alertReportedBefore === "yes"
				? "Yes"
				: values.alertReportedBefore === "no"
				? "No"
				: "",
		personReporting: values.personReporting,
		contactNumber: values.contactNumber,
		sourceOfAlert: values.sourceOfAlert,
		response: values.response
			? alertResponse.find((d) => d.code === values.response)?.name ??
			  values.response
			: "",
		region: values.region,
		district: values.district,
		subCounty: values.subcounty,
		village: values.village,
		parish: values.parish,
		caseName: values.caseName,
		caseAge: values.caseAge,
		caseSex: values.caseSex,
		nextOfKinName: values.nextOfKinName,
		nextOfKinPhone: values.nextOfKinPhone,
		caseDescription: values.caseDescription,
		narrative: values.narrative,
		symptoms: values.symptoms,
	};
}

export default function PublicAddAlertPage() {
	// Snapshot of the just-submitted alert, kept so the reporter can download
	// a PDF copy after the form has been reset.
	const [submittedAlert, setSubmittedAlert] = useState<AlertPdfData | null>(
		null
	);
	const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
	const [pdfError, setPdfError] = useState("");
	const isAuthenticated = useIsAuthenticated();

	const submitAlert = async (payload: AlertPayload) => {
		if (isAuthenticated) {
			const created = await AuthService.createAlert(payload);
			return created?.id ?? null;
		}
		return submitPublicAlert(payload);
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
						<AddAlertForm
							submitAlert={submitAlert}
							successMessage="Alert submitted successfully! Thank you for reporting this health alert. The relevant authorities have been notified."
							onSubmitStart={() => {
								setSubmittedAlert(null);
								setPdfError("");
							}}
							onSuccess={(values, createdId) =>
								setSubmittedAlert(
									toPdfData(values, createdId)
								)
							}
							successExtra={
								submittedAlert && (
									<>
										<div className="mt-3 flex flex-col gap-2 rounded-lg surface-success p-4 sm:flex-row sm:items-center sm:justify-between">
											<p className="text-sm text-success">
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
										{pdfError && (
											<p className="mt-2 text-sm text-destructive">
												{pdfError}
											</p>
										)}
									</>
								)
							}
							renderActions={(isSubmitting) => (
								<div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur">
									<div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
										<p className="text-xs text-gray-600">
											Required fields are marked with{" "}
											<span className="font-semibold text-uganda-red">
												*
											</span>
											.
										</p>
										<Button
											type="submit"
											disabled={isSubmitting}
											className="w-full bg-gradient-to-r from-uganda-red to-uganda-yellow px-8 font-semibold text-white hover:from-uganda-red/90 hover:to-uganda-yellow/90 sm:w-auto"
										>
											{isSubmitting
												? "Submitting Health Alert..."
												: "Submit Health Alert"}
										</Button>
									</div>
								</div>
							)}
						/>
					</CardContent>
				</Card>

				{/* Emergency Contact */}
				<Alert className="mt-4 surface-danger">
					<AlertTriangleIcon className="h-4 w-4 text-destructive" />
					<AlertDescription className="text-sm text-destructive">
						<strong>Emergency Contact:</strong> For immediate
						medical emergencies, please call{" "}
						<strong>0800-100-066</strong>, SMS <strong>6767</strong>
						, or visit the nearest health facility. This form is for
						reporting suspected disease outbreaks and public health
						concerns.
					</AlertDescription>
				</Alert>
			</div>
		</div>
	);
}
