"use client";

import { useState } from "react";
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
	ArrowLeft,
} from "lucide-react";
import { AuthService } from "@/lib/auth";
import Link from "next/link";

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

export default function DashboardAddAlertPage() {
	const router = useRouter();
	const [formData, setFormData] = useState({
		date: "",
		time: "",
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

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitStatus, setSubmitStatus] = useState<{
		type: "success" | "error" | null;
		message: string;
	}>({ type: null, message: "" });

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
		console.log("Symptoms updated:", formData.symptoms); // Debug log
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		setIsSubmitting(true);
		setSubmitStatus({ type: null, message: "" });

		try {
			// Validate required fields
			if (
				!formData.date ||
				!formData.time ||
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

				return new Date().toISOString();
			};

			// Prepare the data to match the API structure
			const alertData = {
				date: formData.date
					? new Date(formData.date).toISOString()
					: new Date().toISOString(),
				time: formatTime(formData.time),
				alertReportedBefore:
					formData.alertReportedBefore === "yes" ? "Yes" : "No",
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
				isHighlighted: false,
				isVerified: false,
			};

			await AuthService.createAlert(alertData);

			setSubmitStatus({
				type: "success",
				message: "Alert created successfully! The alert has been added to the system.",
			});

			// Reset form after successful submission
			setFormData({
				date: "",
				time: "",
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
				symptoms: [],
			});

			setTimeout(() => {
				router.push("/dashboard/alerts");
			}, 2000);
		} catch (err) {
			setSubmitStatus({
				type: "error",
				message:
					err instanceof Error
						? err.message
						: "An error occurred while creating the alert. Please try again.",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="max-w-6xl mx-auto space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center space-x-4">
					<Link href="/dashboard/alerts">
						<Button
							variant="outline"
							size="sm"
						>
							<ArrowLeft className="w-4 h-4 mr-2" />
							Back to Alerts
						</Button>
					</Link>
					<div>
						<h1 className="text-2xl font-bold text-uganda-black">
							Create New Alert
						</h1>
						<p className="text-gray-600">
							Add a new health alert to the system
						</p>
					</div>
				</div>
			</div>

			{/* Status Messages */}
			{submitStatus.type && (
				<Alert
					className={
						submitStatus.type === "success"
							? "border-green-200 bg-green-50"
							: "border-red-200 bg-red-50"
					}
				>
					<AlertTriangleIcon
						className={`h-4 w-4 ${
							submitStatus.type === "success"
								? "text-green-600"
								: "text-red-600"
						}`}
					/>
					<AlertDescription
						className={
							submitStatus.type === "success"
								? "text-green-700"
								: "text-red-700"
						}
					>
						{submitStatus.message}
					</AlertDescription>
				</Alert>
			)}

			{/* Main Form */}
			<Card className="shadow-lg border-0">
				<CardHeader className="bg-gradient-to-r from-uganda-red to-uganda-yellow text-white">
					<CardTitle className="text-xl font-bold flex items-center gap-3">
						<AlertTriangleIcon className="h-6 w-6" />
						Alert Information
					</CardTitle>
				</CardHeader>
				<CardContent className="p-6">
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
										value={
											formData.alertCaseDistrict
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
										value={
											formData.alertCaseVillage
										}
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
										value={
											formData.alertCaseParish
										}
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
										value={
											formData.pointOfContactName
										}
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
										{formData.narrative.length}
										/250
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
									Select all symptoms that apply to
									this case:
								</p>
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
									{signsAndSymptoms.map(
										(symptom) => (
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
													htmlFor={
														symptom
													}
													className="text-sm font-medium cursor-pointer"
												>
													{symptom}
												</Label>
											</div>
										)
									)}
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
														key={
															symptom
														}
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

						{/* Submit Section */}
						<div className="flex justify-end space-x-4 pt-6 border-t">
							<Button
								type="button"
								variant="outline"
								onClick={() =>
									router.push("/dashboard/alerts")
								}
							>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={isSubmitting}
								className="bg-gradient-to-r from-uganda-red to-uganda-yellow hover:from-uganda-red/90 hover:to-uganda-yellow/90 text-white px-6"
							>
								{isSubmitting
									? "Creating Alert..."
									: "Create Alert"}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
