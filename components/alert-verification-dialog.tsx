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
	MapPinIcon,
	HeartIcon,
} from "lucide-react";
import { AuthService } from "@/lib/auth";

interface AlertVerificationDialogProps {
	isOpen: boolean;
	onClose: () => void;
	alert: any;
	onVerificationComplete: () => void;
}

const ugandaDistricts = [
	"Abim",
	"Adjumani",
	"Agago",
	"Alebtong",
	"Amolatar",
	"Amudat",
	"Amuria",
	"Amuru",
	"Apac",
	"Arua",
	"Budaka",
	"Bududa",
	"Bugiri",
	"Buhweju",
	"Buikwe",
	"Bukedea",
	"Bukomansimbi",
	"Bukwo",
	"Bulambuli",
	"Buliisa",
	"Bundibugyo",
	"Bushenyi",
	"Busia",
	"Butaleja",
	"Butambala",
	"Buvuma",
	"Buyende",
	"Dokolo",
	"Gomba",
	"Gulu",
	"Hoima",
	"Ibanda",
	"Iganga",
	"Isingiro",
	"Jinja",
	"Kaabong",
	"Kabale",
	"Kabarole",
	"Kaberamaido",
	"Kalangala",
	"Kaliro",
	"Kampala",
	"Kamuli",
	"Kamwenge",
	"Kanungu",
	"Kapchorwa",
	"Kasese",
	"Katakwi",
	"Kayunga",
	"Kibaale",
	"Kiboga",
	"Kibuku",
	"Kiruhura",
	"Kiryandongo",
	"Kisoro",
	"Kitgum",
	"Koboko",
	"Kole",
	"Kotido",
	"Kumi",
	"Kween",
	"Kyankwanzi",
	"Kyegegwa",
	"Kyenjojo",
	"Lamwo",
	"Lira",
	"Luuka",
	"Luwero",
	"Lwengo",
	"Lyantonde",
	"Manafwa",
	"Maracha",
	"Masaka",
	"Masindi",
	"Mayuge",
	"Mbale",
	"Mbarara",
	"Mitooma",
	"Mityana",
	"Mokono",
	"Moroto",
	"Moyo",
	"Mpigi",
	"Mubende",
	"Mukono",
	"Nakapiripirit",
	"Nakaseke",
	"Nakasongola",
	"Namayingo",
	"Namutumba",
	"Napak",
	"Nebbi",
	"Ngora",
	"Ntoroko",
	"Ntungamo",
	"Nwoya",
	"Otuke",
	"Oyam",
	"Pader",
	"Pallisa",
	"Rakai",
	"Rubirizi",
	"Rukungiri",
	"Sembabule",
	"Serere",
	"Sheema",
	"Sironko",
	"Soroti",
	"Tororo",
	"Wakiso",
	"Yumbe",
	"Zombo",
];

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

export function AlertVerificationDialog({
	isOpen,
	onClose,
	alert,
	onVerificationComplete,
}: AlertVerificationDialogProps) {
	const [verificationToken, setVerificationToken] = useState<string>("");
	const [isGeneratingToken, setIsGeneratingToken] = useState(false);
	const [isVerifying, setIsVerifying] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const [formData, setFormData] = useState({
		status: "",
		verificationDate: new Date().toISOString().split("T")[0],
		verificationTime: new Date().toTimeString().slice(0, 5),
		cifNo: "",
		personReporting: alert?.personReporting || "",
		village: alert?.alertCaseVillage || "",
		subCounty: alert?.subCounty || "",
		contactNumber: alert?.contactNumber || "",
		sourceOfAlert: alert?.sourceOfAlert || "",
		alertCaseName: alert?.alertCaseName || "",
		alertCaseAge: alert?.alertCaseAge || 0,
		alertCaseSex: alert?.alertCaseSex || "",
		alertCasePregnantDuration: 0,
		alertCaseVillage: alert?.alertCaseVillage || "",
		alertCaseParish: alert?.alertCaseParish || "",
		alertCaseSubCounty: alert?.alertCaseSubCounty || "",
		alertCaseDistrict: alert?.alertCaseDistrict || "",
		alertCaseNationality: "Ugandan",
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
	});

	useEffect(() => {
		if (isOpen && alert) {
			// Reset form data when dialog opens
			setFormData({
				status: "",
				verificationDate: new Date().toISOString().split("T")[0],
				verificationTime: new Date().toTimeString().slice(0, 5),
				cifNo: "",
				personReporting: alert.personReporting || "",
				village: alert.alertCaseVillage || "",
				subCounty: alert.subCounty || "",
				contactNumber: alert.contactNumber || "",
				sourceOfAlert: alert.sourceOfAlert || "",
				alertCaseName: alert.alertCaseName || "",
				alertCaseAge: alert.alertCaseAge || 0,
				alertCaseSex: alert.alertCaseSex || "",
				alertCasePregnantDuration: 0,
				alertCaseVillage: alert.alertCaseVillage || "",
				alertCaseParish: alert.alertCaseParish || "",
				alertCaseSubCounty: alert.alertCaseSubCounty || "",
				alertCaseDistrict: alert.alertCaseDistrict || "",
				alertCaseNationality: "Ugandan",
				pointOfContactName: alert.pointOfContactName || "",
				pointOfContactRelationship: "",
				pointOfContactPhone: alert.pointOfContactPhone || "",
				history: alert.history || "",
				healthFacilityVisit: "",
				traditionalHealerVisit: "",
				symptoms: alert.symptoms || "",
				actions: "",
				feedback: "",
				verifiedBy: "",
			});
			setVerificationToken("");
			setError(null);
			setSuccess(null);
		}
	}, [isOpen, alert]);

	const handleInputChange = (field: string, value: string | number) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const generateToken = async () => {
		if (!alert?.id) return;

		setIsGeneratingToken(true);
		setError(null);

		try {
			const result = await AuthService.generateVerificationToken(
				alert.id
			);
			setVerificationToken(result.token);
			setSuccess("Verification token generated successfully!");
		} catch (err) {
			const errorMessage =
				err instanceof Error
					? err.message
					: "Failed to generate token";

			// Check if it's a database schema error
			if (errorMessage.includes("Unknown column 'created_at'")) {
				setError(
					"Database configuration error. Please contact the system administrator to fix the database schema."
				);
			} else {
				setError(errorMessage);
			}
		} finally {
			setIsGeneratingToken(false);
		}
	};

	const handleVerification = async () => {
		if (!alert?.id || !verificationToken) {
			setError("Please generate a verification token first");
			return;
		}

		// Validate required fields
		if (
			!formData.status ||
			!formData.cifNo ||
			!formData.personReporting ||
			!formData.contactNumber ||
			!formData.sourceOfAlert ||
			!formData.alertCaseName ||
			!formData.alertCaseAge ||
			!formData.alertCaseSex ||
			!formData.history ||
			!formData.verifiedBy
		) {
			setError("Please fill in all required fields");
			return;
		}

		setIsVerifying(true);
		setError(null);

		try {
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
				alertCaseName: formData.alertCaseName,
				alertCaseAge: formData.alertCaseAge,
				alertCaseSex: formData.alertCaseSex,
				alertCasePregnantDuration:
					formData.alertCasePregnantDuration,
				alertCaseVillage: formData.alertCaseVillage,
				alertCaseParish: formData.alertCaseParish,
				alertCaseSubCounty: formData.alertCaseSubCounty,
				alertCaseDistrict: formData.alertCaseDistrict,
				alertCaseNationality: formData.alertCaseNationality,
				pointOfContactName: formData.pointOfContactName,
				pointOfContactRelationship:
					formData.pointOfContactRelationship,
				pointOfContactPhone: formData.pointOfContactPhone,
				history: formData.history,
				healthFacilityVisit: formData.healthFacilityVisit,
				traditionalHealerVisit: formData.traditionalHealerVisit,
				symptoms: formData.symptoms,
				actions: formData.actions,
				feedback: formData.feedback,
				verifiedBy: formData.verifiedBy,
			});

			setSuccess("Alert verified successfully!");
			setTimeout(() => {
				onVerificationComplete();
				onClose();
			}, 2000);
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to verify alert"
			);
		} finally {
			setIsVerifying(false);
		}
	};

	return (
		<Dialog
			open={isOpen}
			onOpenChange={onClose}
		>
			<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<AlertTriangleIcon className="h-5 w-5 text-uganda-red" />
						Verify Alert - ALT
						{String(alert?.id).padStart(3, "0")}
					</DialogTitle>
					<DialogDescription>
						Complete the verification process for this health
						alert
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

				{/* Token Generation Section */}
				<div className="space-y-4">
					<div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
						<div>
							<h3 className="font-semibold">
								Verification Token
							</h3>
							<p className="text-sm text-gray-600">
								Generate a token to proceed with
								verification
							</p>
						</div>
						<div className="flex items-center gap-2">
							{verificationToken && (
								<Badge
									variant="secondary"
									className="font-mono"
								>
									{verificationToken}
								</Badge>
							)}
							<Button
								onClick={generateToken}
								disabled={isGeneratingToken}
								variant="outline"
								size="sm"
							>
								{isGeneratingToken ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									"Generate Token"
								)}
							</Button>
						</div>
					</div>
				</div>

				<Separator />

				{/* Verification Form */}
				{verificationToken && (
					<div className="space-y-6">
						{/* Basic Information */}
						<div className="space-y-4">
							<div className="flex items-center gap-3">
								<AlertTriangleIcon className="h-5 w-5 text-uganda-red" />
								<h3 className="text-lg font-semibold">
									Verification Details
								</h3>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
						<div className="space-y-4">
							<div className="flex items-center gap-3">
								<UserIcon className="h-5 w-5 text-uganda-red" />
								<h3 className="text-lg font-semibold">
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

						{/* Location Information */}
						<div className="space-y-4">
							<div className="flex items-center gap-3">
								<MapPinIcon className="h-5 w-5 text-uganda-red" />
								<h3 className="text-lg font-semibold">
									Location Information
								</h3>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label
										htmlFor="alertCaseDistrict"
										className="text-sm font-medium"
									>
										District
									</Label>
									<Select
										value={
											formData.alertCaseDistrict
										}
										onValueChange={(value) =>
											handleInputChange(
												"alertCaseDistrict",
												value
											)
										}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select District" />
										</SelectTrigger>
										<SelectContent>
											{ugandaDistricts.map(
												(district) => (
													<SelectItem
														key={
															district
														}
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
										htmlFor="alertCaseVillage"
										className="text-sm font-medium"
									>
										Village
									</Label>
									<Input
										id="alertCaseVillage"
										value={
											formData.alertCaseVillage
										}
										onChange={(e) =>
											handleInputChange(
												"alertCaseVillage",
												e.target.value
											)
										}
									/>
								</div>
							</div>
						</div>

						<Separator />

						{/* Additional Information */}
						<div className="space-y-4">
							<div className="flex items-center gap-3">
								<HeartIcon className="h-5 w-5 text-uganda-red" />
								<h3 className="text-lg font-semibold">
									Additional Information
								</h3>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label
										htmlFor="actions"
										className="text-sm font-medium"
									>
										Actions Taken
									</Label>
									<Textarea
										id="actions"
										value={formData.actions}
										onChange={(e) =>
											handleInputChange(
												"actions",
												e.target.value
											)
										}
										rows={3}
										placeholder="Describe actions taken during verification"
									/>
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
					{verificationToken && (
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
