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

export default function PublicAddAlertPage() {
	const [formData, setFormData] = useState({
		date: "",
		callTime: "",
		alertReportedBefore: "",
		nameOfPersonReporting: "",
		numberOfPersonReporting: "",
		status: "",
		response: "",
		district: "",
		subcounty: "",
		village: "",
		parish: "",
		sourceOfAlert: "",
		caseAlertDescription: "",
		caseName: "",
		caseAge: "",
		caseSex: "",
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
	const isAuthenticated = AuthService.isAuthenticated();

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

		try {
			// Prepare the data to match the API structure
			const alertData = {
				date: formData.date,
				time: formData.callTime,
				alertReportedBefore: formData.alertReportedBefore,
				personReporting: formData.nameOfPersonReporting,
				contactNumber: formData.numberOfPersonReporting,
				status: formData.status || "Pending",
				response: formData.response || "Routine",
				alertCaseDistrict: formData.district,
				subCounty: formData.subcounty,
				alertCaseVillage: formData.village,
				alertCaseParish: formData.parish,
				sourceOfAlert: formData.sourceOfAlert,
				history: formData.caseAlertDescription,
				alertCaseName: formData.caseName,
				alertCaseAge: parseInt(formData.caseAge) || 0,
				alertCaseSex: formData.caseSex,
				pointOfContactName: formData.nameOfNextOfKin,
				pointOfContactPhone: formData.nextOfKinPhoneNumber,
				narrative: formData.narrative,
				symptoms: formData.signsAndSymptoms.join(", "),
			};

			const apiUrl = `${
				process.env.NEXT_PUBLIC_API_BASE_URL ||
				"http://localhost:8089/api/v1"
			}/alerts`;

			let response: Response;

			if (isAuthenticated) {
				// Use authenticated request if logged in
				response = await AuthService.makeAuthenticatedRequest(
					apiUrl,
					{
						method: "POST",
						body: JSON.stringify(alertData),
					}
				);
			} else {
				// Use public endpoint if not authenticated
				response = await fetch(apiUrl, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(alertData),
				});
			}

			if (!response.ok) {
				throw new Error(
					"Failed to submit alert. Please try again."
				);
			}

			setSubmitStatus({
				type: "success",
				message: "Alert submitted successfully! Thank you for reporting this health alert. The relevant authorities have been notified.",
			});

			// Reset form after successful submission
			setFormData({
				date: "",
				callTime: "",
				alertReportedBefore: "",
				nameOfPersonReporting: "",
				numberOfPersonReporting: "",
				status: "",
				response: "",
				district: "",
				subcounty: "",
				village: "",
				parish: "",
				sourceOfAlert: "",
				caseAlertDescription: "",
				caseName: "",
				caseAge: "",
				caseSex: "",
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

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<div className="bg-gradient-to-r from-uganda-red to-uganda-yellow text-white shadow-lg">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center py-4">
						<div className="flex items-center space-x-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm border border-white/30">
								<span className="text-lg font-bold text-white">
									MoH
								</span>
							</div>
							<div>
								<h1 className="text-xl font-bold">
									Uganda Health Alert System
								</h1>
								<p className="text-sm text-white/90">
									Ministry of Health Uganda
								</p>
							</div>
						</div>
						<div className="flex items-center space-x-4">
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
								<Link href="/login">
									<Button
										variant="secondary"
										className="bg-white/20 text-white border-white/30 hover:bg-white/30"
									>
										<LogIn className="w-4 h-4 mr-2" />
										Login
									</Button>
								</Link>
							)}
						</div>
					</div>
				</div>
			</div>

			<div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
				{/* Status Messages */}
				{submitStatus.type && (
					<div className="mb-6">
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
					</div>
				)}

				{/* Main Form */}
				<Card className="shadow-xl border-0">
					<CardHeader className="bg-gradient-to-r from-uganda-red to-uganda-yellow text-white rounded-t-lg">
						<CardTitle className="text-2xl font-bold flex items-center gap-3">
							<AlertTriangleIcon className="h-8 w-8" />
							Report Health Alert
						</CardTitle>
						<p className="text-white/90">
							{isAuthenticated
								? "Submit a health alert to the Ministry of Health surveillance system"
								: "Anyone can report a health alert. Help us protect public health by reporting suspected cases."}
						</p>
					</CardHeader>
					<CardContent className="p-8">
						<form
							onSubmit={handleSubmit}
							className="space-y-8"
						>
							{/* Basic Information */}
							<div className="space-y-6">
								<div className="flex items-center gap-3 mb-6">
									<CalendarIcon className="h-6 w-6 text-uganda-red" />
									<h3 className="text-xl font-semibold text-uganda-black">
										Basic Information
									</h3>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
										<Label className="text-sm font-medium text-gray-700">
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
											className="flex gap-6 mt-2"
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

							<Separator className="my-8" />

							{/* Reporter Information */}
							<div className="space-y-6">
								<div className="flex items-center gap-3 mb-6">
									<UserIcon className="h-6 w-6 text-uganda-red" />
									<h3 className="text-xl font-semibold text-uganda-black">
										Reporter Information
									</h3>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
								</div>

								<div className="space-y-2">
									<Label
										htmlFor="sourceOfAlert"
										className="text-sm font-medium text-gray-700"
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
									>
										<SelectTrigger className="border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow/20">
											<SelectValue placeholder="How did you learn about this case?" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="Community">
												Community Member
											</SelectItem>
											<SelectItem value="VHT">
												VHT (Village Health
												Team)
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

							<Separator className="my-8" />

							{/* Location Information */}
							<div className="space-y-6">
								<div className="flex items-center gap-3 mb-6">
									<MapPinIcon className="h-6 w-6 text-uganda-red" />
									<h3 className="text-xl font-semibold text-uganda-black">
										Case Location
									</h3>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="space-y-2">
										<Label
											htmlFor="district"
											className="text-sm font-medium text-gray-700"
										>
											District *
										</Label>
										<Select
											onValueChange={(value) =>
												handleInputChange(
													"district",
													value
												)
											}
										>
											<SelectTrigger className="border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow/20">
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
															{
																district
															}
														</SelectItem>
													)
												)}
											</SelectContent>
										</Select>
									</div>
									<div className="space-y-2">
										<Label
											htmlFor="subcounty"
											className="text-sm font-medium text-gray-700"
										>
											Subcounty/Division
										</Label>
										<Input
											id="subcounty"
											value={
												formData.subcounty
											}
											onChange={(e) =>
												handleInputChange(
													"subcounty",
													e.target.value
												)
											}
											placeholder="Enter subcounty or division"
											className="border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow/20"
										/>
									</div>
									<div className="space-y-2">
										<Label
											htmlFor="village"
											className="text-sm font-medium text-gray-700"
										>
											Village
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
											className="text-sm font-medium text-gray-700"
										>
											Parish
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

							<Separator className="my-8" />

							{/* Case Information */}
							<div className="space-y-6">
								<div className="flex items-center gap-3 mb-6">
									<AlertTriangleIcon className="h-6 w-6 text-uganda-red" />
									<h3 className="text-xl font-semibold text-uganda-black">
										Case Information
									</h3>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
											className="flex gap-6 mt-2"
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
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="space-y-2">
										<Label
											htmlFor="nameOfNextOfKin"
											className="text-sm font-medium text-gray-700"
										>
											Next of Kin Name
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
											className="text-sm font-medium text-gray-700"
										>
											Next of Kin Phone
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
										className="border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow/20"
									/>
								</div>

								<div className="space-y-2">
									<Label
										htmlFor="narrative"
										className="text-sm font-medium text-gray-700"
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
										className="border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow/20"
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

							<Separator className="my-8" />

							{/* Signs and Symptoms */}
							<div className="space-y-6">
								<div className="flex items-center gap-3 mb-6">
									<HeartIcon className="h-6 w-6 text-uganda-red" />
									<h3 className="text-xl font-semibold text-uganda-black">
										Signs and Symptoms
									</h3>
								</div>

								<div className="bg-gray-50 p-6 rounded-lg">
									<p className="text-sm text-gray-600 mb-4">
										Select all symptoms that apply
										to this case:
									</p>
									<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
										{signsAndSymptoms.map(
											(symptom) => (
												<div
													key={symptom}
													className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-uganda-yellow/50 transition-colors"
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
														className="text-sm font-medium cursor-pointer"
													>
														{symptom}
													</Label>
												</div>
											)
										)}
									</div>
									{formData.signsAndSymptoms.length >
										0 && (
										<div className="mt-4">
											<p className="text-sm font-medium text-gray-700 mb-2">
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

							{/* Submit Section */}
							<div className="flex justify-end space-x-4 pt-8 border-t">
								<Button
									type="submit"
									disabled={isSubmitting}
									className="bg-gradient-to-r from-uganda-red to-uganda-yellow hover:from-uganda-red/90 hover:to-uganda-yellow/90 text-white px-8 py-2 font-semibold"
								>
									{isSubmitting
										? "Submitting Alert..."
										: "Submit Health Alert"}
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>

				{/* Emergency Contact */}
				<Card className="mt-6 bg-red-50 border-red-200">
					<CardContent className="p-6">
						<h3 className="text-lg font-semibold text-red-800 mb-2">
							Emergency Contact
						</h3>
						<p className="text-red-700 text-sm">
							For immediate medical emergencies, please
							call <strong>911</strong> or visit the
							nearest health facility. This form is for
							reporting suspected disease outbreaks and
							public health concerns.
						</p>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
