"use client";

import { altCode } from "@/lib/alt-code";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	AlertTriangleIcon,
	CheckCircleIcon,
	XCircleIcon,
	Loader2,
	UserIcon,
	MapPinIcon,
	CalendarIcon,
} from "lucide-react";
import { AuthService, type Alert as ApiAlert } from "@/lib/auth";
import { getLocalDateString } from "@/lib/utils";
import { alertStatus } from "@/constants";
import { CaseLocationSelect } from "@/components/case-location-select";
import { parseNumberAffected } from "@/components/add-alert-form";
import {
	useChannelOfReportingOptions,
	useSourceOfAlertOptions,
} from "@/hooks/use-lookup-options";
import { useToast } from "@/hooks/use-toast";

interface AlertEditDialogProps {
	isOpen: boolean;
	onClose: () => void;
	alert: ApiAlert;
	onEditComplete: () => void;
}

export function AlertEditDialog({
	isOpen,
	onClose,
	alert,
	onEditComplete,
}: AlertEditDialogProps) {
	const { toast } = useToast();
	// Admin-managed lists (Administration -> Dropdown Options).
	const sourceOptions = useSourceOfAlertOptions();
	const channelOptions = useChannelOfReportingOptions();
	// EXACTLY the fields the add-alert form collects, and nothing else.
	//
	// Editing a signal means correcting what was REPORTED — a misheard phone
	// number, the wrong subcounty, a name spelt wrong. Everything a signal
	// acquires afterwards (triage, verification, risk assessment, feedback) is
	// the output of a stage, recorded by the person who did that stage on the
	// form built for it, with its own audit entry and its own timestamps. This
	// dialog used to carry all of it — CIF number, response type, lab samples,
	// symptoms, and a whole Verification & Lab section — which meant anyone with
	// edit rights could rewrite a verification decision without going through
	// verification, and nothing recorded that they had.
	//
	// Keep this list in step with AlertFormValues in add-alert-form.tsx.
	const [formData, setFormData] = useState({
		date: "",
		time: "",
		callTaker: "",
		alertReportedBefore: "",
		personReporting: "",
		contactNumber: "",
		status: "",
		region: "",
		alertCaseDistrict: "",
		subCounty: "",
		alertCaseVillage: "",
		alertCaseParish: "",
		sourceOfAlert: "",
		channelOfReporting: "",
		alertCaseName: "",
		alertCaseAge: "",
		numberAffected: "",
		alertCaseSex: "",
		pointOfContactName: "",
		pointOfContactPhone: "",
		history: "",
	});

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	// Initialize form data when alert changes
	useEffect(() => {
		if (isOpen && alert) {
			// Format date and time for input fields
			const alertDate = alert.date
				? new Date(alert.date).toISOString().split("T")[0]
				: "";
			const alertTime = alert.time
				? new Date(alert.time).toTimeString().slice(0, 5)
				: "";

			setFormData({
				date: alertDate,
				time: alertTime,
				callTaker: alert.callTaker || "",
				alertReportedBefore: alert.alertReportedBefore || "",
				personReporting: alert.personReporting || "",
				contactNumber: alert.contactNumber || "",
				status: alert.status || "",
				region: alert.region || "",
				alertCaseDistrict: alert.alertCaseDistrict || "",
				subCounty: alert.subCounty || "",
				alertCaseVillage: alert.alertCaseVillage || "",
				alertCaseParish: alert.alertCaseParish || "",
				sourceOfAlert: alert.sourceOfAlert || "",
				channelOfReporting: alert.channelOfReporting || "",
				alertCaseName: alert.alertCaseName || "",
				alertCaseAge:
					alert.alertCaseAge != null
						? alert.alertCaseAge.toString()
						: "",
				// Blank stays blank: "nobody recorded a number" and "zero people
				// are affected" are different answers, and only one means the
				// event is over.
				numberAffected:
					alert.numberAffected != null
						? String(alert.numberAffected)
						: "",
				alertCaseSex: alert.alertCaseSex || "",
				pointOfContactName: alert.pointOfContactName || "",
				pointOfContactPhone: alert.pointOfContactPhone || "",
				history: alert.history || "",
			});
			setError(null);
			setSuccess(null);
		}
	}, [isOpen, alert]);

	const handleInputChange = (field: string, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		setIsSubmitting(true);
		setError(null);

		try {
			// The FIELDS match the add-alert form; the required set deliberately
			// does NOT adopt its geography rules.
			//
			// The add form requires region, district and subcounty of a NEW
			// signal, which is right at intake. Applying that to edits would
			// strand the records already here: 3,030 of 6,039 live alerts carry
			// no region and 3,928 no subcounty, so more than half the register
			// would refuse to save a corrected phone number until somebody
			// invented geography for a signal logged years ago. An edit is a
			// correction of what exists, not a re-creation of it.
			//
			// Status is required because nothing is missing one, so it costs
			// nothing and the label already says so.
			if (
				!formData.date ||
				!formData.time ||
				!formData.status ||
				!formData.personReporting ||
				!formData.contactNumber ||
				!formData.sourceOfAlert ||
				!formData.alertCaseName ||
				!formData.alertCaseAge ||
				!formData.alertCaseSex ||
				!formData.history
			) {
				throw new Error("Please fill in all required fields");
			}

			// Helper function to format time properly
			const formatTime = (timeString: string): string => {
				if (!timeString) return new Date().toISOString();

				// If it's in HH:MM format, create a proper date with today's date
				if (timeString.match(/^\d{2}:\d{2}$/)) {
					const today = new Date();
					const [hours, minutes] = timeString.split(":");
					today.setHours(
						parseInt(hours, 10),
						parseInt(minutes, 10),
						0,
						0
					);
					return today.toISOString();
				}

				// Fallback to current time
				return new Date().toISOString();
			};

			// ONLY the intake fields go up. Nothing is spread from `alert` first:
			// PUT /alerts/:id loads the row and parses the body ON TOP of it, so
			// a field the body omits keeps its stored value, while a field sent
			// as null would overwrite it. Spreading the whole alert object would
			// therefore push every stage's output back to the server on every
			// edit — and any of them the list response had dropped would be
			// written back as null.
			const alertData: Partial<ApiAlert> = {
				date: formData.date
					? new Date(formData.date).toISOString()
					: alert.date || new Date().toISOString(),
				time: formatTime(formData.time),
				callTaker: formData.callTaker,
				alertReportedBefore:
					formData.alertReportedBefore === "Yes" ? "Yes" : "No",
				personReporting: formData.personReporting,
				contactNumber: formData.contactNumber,
				status: formData.status || "Pending",
				region: formData.region,
				alertCaseDistrict: formData.alertCaseDistrict,
				subCounty: formData.subCounty,
				alertCaseVillage: formData.alertCaseVillage,
				alertCaseSubCounty: formData.subCounty,
				alertCaseParish: formData.alertCaseParish,
				sourceOfAlert: formData.sourceOfAlert,
				channelOfReporting: formData.channelOfReporting,
				alertCaseName: formData.alertCaseName,
				alertCaseAge: parseInt(formData.alertCaseAge) || 0,
				numberAffected: parseNumberAffected(formData.numberAffected),
				alertCaseSex: formData.alertCaseSex,
				pointOfContactName: formData.pointOfContactName,
				pointOfContactPhone: formData.pointOfContactPhone,
				history: formData.history,
			};

			await AuthService.updateAlert(alert.id as number, alertData);

			setSuccess("Alert updated successfully!");

			
			toast({
				title: "✅ Alert Updated Successfully",
				description: `Alert ${altCode(alert.id)} has been updated successfully.`,
				duration: 5000,
			});

			setTimeout(() => {
				onEditComplete();
				onClose();
			}, 2000);
		} catch (err) {
			const errorMessage =
				err instanceof Error
					? err.message
					: "An error occurred while updating the alert. Please try again.";

			setError(errorMessage);

			// Show error toast
			toast({
				title: "❌ Update Failed",
				description: errorMessage,
				variant: "destructive",
				duration: 5000,
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog
			open={isOpen}
			onOpenChange={onClose}
		>
			<DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<AlertTriangleIcon className="h-4 w-4 text-uganda-red" />
						Edit Alert - ALT
						{String(alert?.id).padStart(3, "0")}
					</DialogTitle>
					<DialogDescription>
						Correct what was reported for this signal. Triage,
						verification, risk assessment and feedback are recorded
						on their own forms as the signal moves through the
						pipeline — they are not edited here.
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

				{/* Main Form */}
				<form
					onSubmit={handleSubmit}
					className="space-y-3 [&_input]:h-8 [&_input]:text-sm [&_label]:text-xs [&_[role=combobox]]:h-8 [&_[role=combobox]]:text-sm [&_textarea]:text-sm"
				>
					{/* Basic Information */}
					<div className="space-y-2.5">
						<div className="flex items-center gap-2 mb-1">
							<CalendarIcon className="h-4 w-4 text-uganda-red" />
							<h3 className="text-sm font-semibold text-uganda-black">
								Basic Information
							</h3>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
							<div className="space-y-1">
								<Label
									htmlFor="date"
									className="text-sm font-medium"
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
								/>
							</div>
							<div className="space-y-1">
								<Label
									htmlFor="time"
									className="text-sm font-medium"
								>
									Time *
								</Label>
								<Input
									id="time"
									type="time"
									value={formData.time}
									onChange={(e) =>
										handleInputChange(
											"time",
											e.target.value
										)
									}
									required
								/>
							</div>
							<div className="space-y-1">
								<Label
									htmlFor="callTaker"
									className="text-sm font-medium"
								>
									Call Taker Name
								</Label>
								<Input
									id="callTaker"
									value={formData.callTaker}
									onChange={(e) =>
										handleInputChange(
											"callTaker",
											e.target.value
										)
									}
									placeholder="Enter call taker's name"
								/>
							</div>
						</div>

						<div className="grid grid-cols-1 gap-3">
							<div className="space-y-1">
								<Label className="text-sm font-medium">
									Alert reported before? *
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
									className="flex gap-3 mt-2"
								>
									<div className="flex items-center space-x-2">
										<RadioGroupItem
											value="Yes"
											id="yes"
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
											value="No"
											id="no"
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
					<div className="space-y-2.5">
						<div className="flex items-center gap-2 mb-1">
							<UserIcon className="h-4 w-4 text-uganda-red" />
							<h3 className="text-sm font-semibold text-uganda-black">
								Person Reporting the Signal
							</h3>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
							<div className="space-y-1">
								<Label
									htmlFor="personReporting"
									className="text-sm font-medium"
								>
									Reporter Name *
								</Label>
								<Input
									id="personReporting"
									value={formData.personReporting}
									onChange={(e) =>
										handleInputChange(
											"personReporting",
											e.target.value
										)
									}
									required
									placeholder="Enter reporter's full name"
								/>
							</div>
							<div className="space-y-1">
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
									placeholder="e.g., 0701234567"
								/>
							</div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
							<div className="space-y-1">
								<Label
									htmlFor="sourceOfAlert"
									className="text-sm font-medium"
								>
									Source of signal *
								</Label>
								<Select
									onValueChange={(value) =>
										handleInputChange(
											"sourceOfAlert",
											value
										)
									}
									value={formData.sourceOfAlert}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select signal source" />
									</SelectTrigger>
									<SelectContent>
										{sourceOptions.map((source) => (
															<SelectItem
																key={source}
																value={source}
															>
																{source}
															</SelectItem>
														))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-1">
								<Label
									htmlFor="channelOfReporting"
									className="text-sm font-medium"
								>
									Channel of Reporting
								</Label>
								<Select
									onValueChange={(value) =>
										handleInputChange(
											"channelOfReporting",
											value
										)
									}
									value={formData.channelOfReporting}
								>
									<SelectTrigger id="channelOfReporting">
										<SelectValue placeholder="Select channel of reporting" />
									</SelectTrigger>
									<SelectContent>
										{channelOptions.map(
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
							<div className="space-y-1">
								<Label
									htmlFor="status"
									className="text-sm font-medium"
								>
									Signal Status *
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
										<SelectValue placeholder="Select signal status" />
									</SelectTrigger>
									<SelectContent>
										{alertStatus?.map(
											(status) => (
												<SelectItem
													key={
														status.name
													}
													value={
														status.name
													}
												>
													{status.name}
												</SelectItem>
											)
										)}
									</SelectContent>
								</Select>
							</div>
						</div>

					</div>

					<Separator />

					{/* Location Information */}
					<div className="space-y-2.5">
						<div className="flex items-center gap-2 mb-1">
							<MapPinIcon className="h-4 w-4 text-uganda-red" />
							<h3 className="text-sm font-semibold text-uganda-black">
								Signal Location
							</h3>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
							<CaseLocationSelect
								value={{
									region: formData.region,
									district: formData.alertCaseDistrict,
									subcounty: formData.subCounty,
								}}
								onChange={(loc) =>
									setFormData((prev) => ({
										...prev,
										region: loc.region,
										alertCaseDistrict: loc.district,
										subCounty: loc.subcounty,
									}))
								}
								labelClassName="text-sm font-medium"
							/>
							<div className="space-y-1">
								<Label
									htmlFor="alertCaseVillage"
									className="text-sm font-medium"
								>
									Village
								</Label>
								<Input
									id="alertCaseVillage"
									value={formData.alertCaseVillage}
									onChange={(e) =>
										handleInputChange(
											"alertCaseVillage",
											e.target.value
										)
									}
									placeholder="Enter village name"
								/>
							</div>
							<div className="space-y-1">
								<Label
									htmlFor="alertCaseParish"
									className="text-sm font-medium"
								>
									Parish
								</Label>
								<Input
									id="alertCaseParish"
									value={formData.alertCaseParish}
									onChange={(e) =>
										handleInputChange(
											"alertCaseParish",
											e.target.value
										)
									}
									placeholder="Enter parish name"
								/>
							</div>
						</div>
					</div>

					<Separator />

					{/* Case Information */}
					<div className="space-y-2.5">
						<div className="flex items-center gap-2 mb-1">
							<AlertTriangleIcon className="h-4 w-4 text-uganda-red" />
							<h3 className="text-sm font-semibold text-uganda-black">
								Signal Information
							</h3>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
							<div className="space-y-1">
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
									placeholder="Patient's full name"
								/>
							</div>
							<div className="space-y-1">
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
											e.target.value
										)
									}
									required
									placeholder="Age in years"
									min="0"
									max="150"
								/>
							</div>
							<div className="space-y-1">
								<Label
									htmlFor="numberAffected"
									className="text-sm font-medium"
								>
									Number Affected
								</Label>
								<Input
									id="numberAffected"
									type="number"
									value={formData.numberAffected}
									onChange={(e) =>
										handleInputChange(
											"numberAffected",
											e.target.value
										)
									}
									placeholder="e.g. 3"
									min="0"
									max="1000000"
								/>
							</div>
							<div className="space-y-1">
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

						<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
							<div className="space-y-1">
								<Label
									htmlFor="pointOfContactName"
									className="text-sm font-medium"
								>
									Next of Kin Name
								</Label>
								<Input
									id="pointOfContactName"
									value={formData.pointOfContactName}
									onChange={(e) =>
										handleInputChange(
											"pointOfContactName",
											e.target.value
										)
									}
									placeholder="Next of kin's full name"
								/>
							</div>
							<div className="space-y-1">
								<Label
									htmlFor="pointOfContactPhone"
									className="text-sm font-medium"
								>
									Next of Kin Phone
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
									placeholder="e.g., 0701234567"
								/>
							</div>
						</div>

						<div className="space-y-1">
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
								required
								rows={2}
								placeholder="Describe what happened, when it started, and any relevant details"
							/>
						</div>

					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={onClose}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={isSubmitting}
							className="bg-gradient-to-r from-uganda-red to-uganda-yellow hover:from-uganda-red/90 hover:to-uganda-yellow/90 text-white"
						>
							{isSubmitting ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin mr-2" />
									Updating Alert...
								</>
							) : (
								"Update Alert"
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
