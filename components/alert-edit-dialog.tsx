"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
	MapPinIcon,
	HeartIcon,
	CalendarIcon,
} from "lucide-react";
import { AuthService } from "@/lib/auth";
import { alertResponse, alertStatus, signsAndSymptoms, ugandaDistricts } from "@/constants";

interface AlertEditDialogProps {
	isOpen: boolean;
	onClose: () => void;
	alert: any;
	onEditComplete: () => void;
}

export function AlertEditDialog({
	isOpen,
	onClose,
	alert,
	onEditComplete,
}: AlertEditDialogProps) {
	const [formData, setFormData] = useState({
		date: "",
		time: "",
		cifNo: "",
		alertReportedBefore: "",
		personReporting: "",
		contactNumber: "",
		status: "",
		response: "",
		alertCaseDistrict: "",
		subCounty: "",
		alertCaseVillage: "",
		alertCaseParish: "",
		sourceOfAlert: "",
		history: "",
		alertCaseName: "",
		alertCaseAge: "",
		alertCaseSex: "",
		pointOfContactName: "",
		pointOfContactPhone: "",
		narrative: "",
		symptoms: [] as string[],
	});

	console.log(alert, "Alert is here");

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

			// Parse symptoms string to array
			const symptomsArray = alert.symptoms
				? alert.symptoms.split(", ").filter((s: any) => s.trim())
				: [];

			setFormData({
				date: alertDate,
				time: alertTime,
				cifNo: alert.cifNo || "",
				alertReportedBefore: alert.alertReportedBefore || "",
				personReporting: alert.personReporting || "",
				contactNumber: alert.contactNumber || "",
				status: alert.status || "",
				response: alert.response || "",
				alertCaseDistrict: alert.alertCaseDistrict || "",
				subCounty: alert.subCounty || "",
				alertCaseVillage: alert.alertCaseVillage || "",
				alertCaseParish: alert.alertCaseParish || "",
				sourceOfAlert: alert.sourceOfAlert || "",
				history: alert.history || "",
				alertCaseName: alert.alertCaseName || "",
				alertCaseAge: alert.alertCaseAge
					? alert.alertCaseAge.toString()
					: "",
				alertCaseSex: alert.alertCaseSex || "",
				pointOfContactName: alert.pointOfContactName || "",
				pointOfContactPhone: alert.pointOfContactPhone || "",
				narrative: alert.narrative || "",
				symptoms: symptomsArray,
			});
			setError(null);
			setSuccess(null);
		}
	}, [isOpen, alert]);

	const handleInputChange = (field: string, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleSymptomsChange = (symptom: string, checked: boolean) => {
		setFormData((prev) => ({
			...prev,
			symptoms: checked
				? [...prev.symptoms, symptom]
				: prev.symptoms.filter((s) => s !== symptom),
		}));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		setIsSubmitting(true);
		setError(null);

		try {
			// Validate required fields
			if (
				!formData.date ||
				!formData.time ||
				!formData.cifNo ||
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

			// Prepare the data to match the API structure
			const alertData = {
				date: formData.date
					? new Date(formData.date).toISOString()
					: new Date().toISOString(),
				time: formatTime(formData.time),
				cifNo: formData.cifNo,
				alertReportedBefore:
					formData.alertReportedBefore === "Yes" ? "Yes" : "No",
				personReporting: formData.personReporting,
				contactNumber: formData.contactNumber,
				status: formData.status || "Pending",
				response: formData.response || "Routine",
				alertCaseDistrict: formData.alertCaseDistrict,
				subCounty: formData.subCounty,
				alertCaseVillage: formData.alertCaseVillage,
				alertCaseParish: formData.alertCaseParish,
				sourceOfAlert: formData.sourceOfAlert,
				history: formData.history,
				alertCaseName: formData.alertCaseName,
				alertCaseAge: parseInt(formData.alertCaseAge) || 0,
				alertCaseSex: formData.alertCaseSex,
				pointOfContactName: formData.pointOfContactName,
				pointOfContactPhone: formData.pointOfContactPhone,
				narrative: formData.narrative,
				symptoms: formData.symptoms.join(", "),
			};

			await AuthService.updateAlert(alert.id, alertData);

			setSuccess("Alert updated successfully!");
			setTimeout(() => {
				onEditComplete();
				onClose();
			}, 2000);
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "An error occurred while updating the alert. Please try again."
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog
			open={isOpen}
			onOpenChange={onClose}
		>
			<DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<AlertTriangleIcon className="h-5 w-5 text-uganda-red" />
						Edit Alert - ALT
						{String(alert?.id).padStart(3, "0")}
					</DialogTitle>
					<DialogDescription>
						Update the information for this health alert
					</DialogDescription>
				</DialogHeader>

				{/* Status Messages */}
				{error && (
					<Alert className="border-red-200 bg-red-50">
						<XCircleIcon className="h-4 w-4 text-red-600" />
						<AlertDescription className="text-red-700">
							{error}
						</AlertDescription>
					</Alert>
				)}

				{success && (
					<Alert className="border-green-200 bg-green-50">
						<CheckCircleIcon className="h-4 w-4 text-green-600" />
						<AlertDescription className="text-green-700">
							{success}
						</AlertDescription>
					</Alert>
				)}

				{/* Main Form */}
				<form
					onSubmit={handleSubmit}
					className="space-y-6"
				>
					{/* Basic Information */}
					<div className="space-y-4">
						<div className="flex items-center gap-3 mb-4">
							<CalendarIcon className="h-5 w-5 text-uganda-red" />
							<h3 className="text-lg font-semibold text-uganda-black">
								Basic Information
							</h3>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div className="space-y-2">
								<Label
									htmlFor="date"
									className="text-sm font-medium"
								>
									Date *
								</Label>
								<Input
									id="date"
									type="date"
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
							<div className="space-y-2">
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
									required
									placeholder="Enter CIF number"
								/>
							</div>
						</div>

						<div className="grid grid-cols-1 gap-4">
							<div className="space-y-2">
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
									className="flex gap-4 mt-2"
								>
									<div className="flex items-center space-x-2">
										<RadioGroupItem
											value="yes"
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
											value="no"
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
					<div className="space-y-4">
						<div className="flex items-center gap-3 mb-4">
							<UserIcon className="h-5 w-5 text-uganda-red" />
							<h3 className="text-lg font-semibold text-uganda-black">
								Reporter Information
							</h3>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="space-y-2">
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
									placeholder="e.g., 0701234567"
								/>
							</div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label
									htmlFor="sourceOfAlert"
									className="text-sm font-medium"
								>
									Source of Alert *
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
										<SelectValue placeholder="Select alert source" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="Community">
											Community Member
										</SelectItem>
										<SelectItem value="VHT">
											VHT (Village Health Team)
										</SelectItem>
										<SelectItem value="Facility">
											Health Facility
										</SelectItem>
										<SelectItem value="Health Worker">
											Health Worker
										</SelectItem>
										<SelectItem value="Other">
											Other
										</SelectItem>
									</SelectContent>
								</Select>
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
										
										{alertStatus?.map((status) => (
											<SelectItem
												key={status.name}
												value={status.name}
											>
												{status.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="space-y-2">
							<Label
								htmlFor="response"
								className="text-sm font-medium"
							>
								Response Type
							</Label>
							<Select
								onValueChange={(value) =>
									handleInputChange(
										"response",
										value
									)
								}
								value={formData.response}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select response type" />
								</SelectTrigger>
								<SelectContent>
									{alertResponse?.map((response) => (
										<SelectItem
											key={response.name}
											value={response.name}
										>
											{response.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<Separator />

					{/* Location Information */}
					<div className="space-y-4">
						<div className="flex items-center gap-3 mb-4">
							<MapPinIcon className="h-5 w-5 text-uganda-red" />
							<h3 className="text-lg font-semibold text-uganda-black">
								Case Location
							</h3>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label
									htmlFor="alertCaseDistrict"
									className="text-sm font-medium"
								>
									District *
								</Label>
								<Select
									onValueChange={(value) =>
										handleInputChange(
											"alertCaseDistrict",
											value
										)
									}
									value={formData.alertCaseDistrict}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select District" />
									</SelectTrigger>
									<SelectContent>
										{ugandaDistricts.map(
											(district) => (
												<SelectItem
													key={district}
													value={
														district
													}
												>
													{district}
												</SelectItem>
											)
										)}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label
									htmlFor="subCounty"
									className="text-sm font-medium"
								>
									Subcounty/Division
								</Label>
								<Input
									id="subCounty"
									value={formData.subCounty}
									onChange={(e) =>
										handleInputChange(
											"subCounty",
											e.target.value
										)
									}
									placeholder="Enter subcounty or division"
								/>
							</div>
							<div className="space-y-2">
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
							<div className="space-y-2">
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
					<div className="space-y-4">
						<div className="flex items-center gap-3 mb-4">
							<AlertTriangleIcon className="h-5 w-5 text-uganda-red" />
							<h3 className="text-lg font-semibold text-uganda-black">
								Case Information
							</h3>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
									placeholder="Patient's full name"
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
											e.target.value
										)
									}
									required
									placeholder="Age in years"
									min="0"
									max="150"
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
									className="flex gap-4 mt-2"
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

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="space-y-2">
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
							<div className="space-y-2">
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
								required
								rows={3}
								placeholder="Describe what happened, when it started, and any relevant details"
							/>
						</div>

						<div className="space-y-2">
							<Label
								htmlFor="narrative"
								className="text-sm font-medium"
							>
								Additional Notes
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
							/>
							<div className="flex justify-between text-xs text-gray-500">
								<span>Maximum 250 characters</span>
								<span>
									{formData.narrative.length}/250
								</span>
							</div>
						</div>
					</div>

					<Separator />

					{/* Signs and Symptoms */}
					<div className="space-y-4">
						<div className="flex items-center gap-3 mb-4">
							<HeartIcon className="h-5 w-5 text-uganda-red" />
							<h3 className="text-lg font-semibold text-uganda-black">
								Signs and Symptoms
							</h3>
						</div>

						<div className="bg-gray-50 p-4 rounded-lg">
							<p className="text-sm text-gray-600 mb-4">
								Select all symptoms that apply to this
								case:
							</p>
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
								{signsAndSymptoms.map((symptom) => (
									<div
										key={symptom}
										className="flex items-center space-x-3 p-2 bg-white rounded border hover:border-uganda-yellow/50 transition-colors"
									>
										<Checkbox
											id={symptom}
											checked={formData.symptoms.includes(
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
										/>
										<Label
											htmlFor={symptom}
											className="text-sm font-medium cursor-pointer"
										>
											{symptom}
										</Label>
									</div>
								))}
							</div>
							{formData.symptoms.length > 0 && (
								<div className="mt-4">
									<p className="text-sm font-medium text-gray-700 mb-2">
										Selected symptoms:
									</p>
									<div className="flex flex-wrap gap-2">
										{formData.symptoms.map(
											(symptom) => (
												<Badge
													key={symptom}
													variant="secondary"
													className="bg-uganda-yellow/20 text-uganda-black"
												>
													{symptom}
												</Badge>
											)
										)}
									</div>
								</div>
							)}
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
