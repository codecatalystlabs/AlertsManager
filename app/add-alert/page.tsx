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
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	AlertTriangleIcon,
	CheckCircle2,
	LogIn,
	Home,
	BookOpen,
} from "lucide-react";
import { AuthService } from "@/lib/auth";
import { getClientApiBaseUrl } from "@/lib/api-config";
import Link from "next/link";
import {
	alertResponse,
	alertSource,
	alertStatus,
	signsAndSymptoms,
	ugandaDistricts,
} from "@/constants";
import { getLocalDateString, cn } from "@/lib/utils";
import { MohLogo, MohBrand } from "@/components/moh-logo";
import { ThemeToggleCompact } from "@/components/theme-toggle";
import { useIsAuthenticated } from "@/hooks/use-auth-status";

const inputCls =
	"h-10 text-sm bg-card border border-foreground/10 rounded-sm hover:border-foreground/30 focus:border-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0";
const triggerCls =
	"h-10 text-sm bg-card border border-foreground/10 rounded-sm hover:border-foreground/30 focus:border-foreground/60 focus:ring-0 focus:ring-offset-0";
const labelCls =
	"mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground";

function FormSection({
	number,
	title,
	description,
	children,
}: {
	number: string;
	title: string;
	description?: string;
	children: React.ReactNode;
}) {
	return (
		<section className="space-y-6 py-10 first:pt-0 border-t border-foreground/[0.08] first:border-t-0">
			<header className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-3">
				<div>
					<p className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2">
						§ {number}
					</p>
					<h2 className="serif text-2xl md:text-3xl font-medium tracking-tight text-foreground">
						{title}
					</h2>
				</div>
				{description && (
					<p className="text-sm text-muted-foreground max-w-sm md:text-right leading-relaxed">
						{description}
					</p>
				)}
			</header>
			<div>{children}</div>
		</section>
	);
}

export default function PublicAddAlertPage() {
	const [formData, setFormData] = useState({
		date: "",
		callTime: "",
		call_taker: "",
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

		try {
			if (
				!formData.date ||
				!formData.callTime ||
				!formData.nameOfPersonReporting ||
				!formData.numberOfPersonReporting ||
				!formData.sourceOfAlert ||
				!formData.caseName ||
				!formData.caseAge ||
				!formData.caseSex ||
				!formData.caseAlertDescription
			) {
				throw new Error("Please fill in all required fields.");
			}

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

			const alertData = {
				date: formData.date
					? new Date(formData.date).toISOString()
					: new Date().toISOString(),
				time: formatTime(formData.callTime),
				alertReportedBefore:
					formData.alertReportedBefore === "yes" ? "Yes" : "No",
				personReporting: formData.nameOfPersonReporting,
				village: formData.village || "",
				contactNumber: formData.numberOfPersonReporting,
				status: formData.status || "Pending",
				response: formData.response || "Routine",
				alertCaseDistrict: formData.district,
				subCounty: formData.subcounty || "",
				alertCaseVillage: formData.village || "",
				alertCaseSubCounty: formData.subcounty || "",
				alertCaseParish: formData.parish || "",
				alertCaseNationality: "Ugandan",
				sourceOfAlert: formData.sourceOfAlert,
				callTaker: formData.call_taker || "",
				history: formData.caseAlertDescription,
				alertCaseName: formData.caseName,
				alertCaseAge: parseInt(formData.caseAge) || 0,
				alertCaseSex: formData.caseSex,
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

			if (isAuthenticated) {
				await AuthService.createAlert(alertData);
			} else {
				const response = await fetch(
					`${getClientApiBaseUrl()}/alerts/create`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
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
					} catch {
						// keep default
					}
					throw new Error(errorMessage);
				}
			}

			setSubmitStatus({
				type: "success",
				message:
					"Alert submitted. The Ministry surveillance team will follow up shortly.",
			});

			setFormData({
				date: "",
				callTime: "",
				call_taker: "",
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

			window.scrollTo({ top: 0, behavior: "smooth" });
		} catch (err) {
			setSubmitStatus({
				type: "error",
				message:
					err instanceof Error
						? err.message
						: "An error occurred while submitting the alert. Please try again.",
			});
			window.scrollTo({ top: 0, behavior: "smooth" });
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="min-h-screen bg-background text-foreground">
			{/* Header */}
			<header className="border-b border-border bg-background/85 backdrop-blur-md sticky top-0 z-30">
				<div className="max-w-7xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
					<MohBrand size="md" />
					<nav className="flex items-center gap-2">
						<ThemeToggleCompact className="mr-1" />
						{isAuthenticated ? (
							<>
								<Link href="/dashboard">
									<Button
										variant="ghost"
										className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-sm gap-2 h-auto"
									>
										<Home
											className="h-3.5 w-3.5"
											strokeWidth={1.75}
										/>
										<span className="mono uppercase tracking-widest font-bold">
											Dashboard
										</span>
									</Button>
								</Link>
								<Button
									variant="ghost"
									className="px-3 py-2 text-xs text-muted-foreground hover:text-accent-red hover:bg-accent-red/5 rounded-sm gap-2 h-auto"
									onClick={async () => {
										try {
											await AuthService.logout();
										} catch {
											/* ignore */
										} finally {
											window.location.href =
												"/add-alert";
										}
									}}
								>
									<LogIn
										className="h-3.5 w-3.5 rotate-180"
										strokeWidth={1.75}
									/>
									<span className="mono uppercase tracking-widest font-bold">
										Logout
									</span>
								</Button>
							</>
						) : (
							<>
								<Link href="/evd-definition" target="_blank">
									<Button
										variant="ghost"
										className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-sm gap-2 h-auto"
									>
										<BookOpen
											className="h-3.5 w-3.5"
											strokeWidth={1.75}
										/>
										<span className="mono uppercase tracking-widest font-bold">
											EVD Definition
										</span>
									</Button>
								</Link>
								<Link href="/login">
									<Button className="px-5 py-2.5 bg-foreground text-background text-xs font-medium hover:opacity-90 rounded-sm gap-2 h-auto">
										<LogIn
											className="h-3.5 w-3.5"
											strokeWidth={1.75}
										/>
										<span className="mono uppercase tracking-widest font-bold">
											Login
										</span>
									</Button>
								</Link>
							</>
						)}
					</nav>
				</div>
			</header>

			<main className="max-w-5xl mx-auto px-6 md:px-12 py-12">
				{/* Hero */}
				<section className="animate-reveal mb-12">
					<div className="flex items-center gap-3 mb-5">
						<span className="h-1 w-8 bg-accent-red rounded-full" />
						<span className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
							Public Report · Form 01
						</span>
					</div>
					<h1 className="serif text-5xl md:text-6xl font-medium tracking-tight leading-[1.05] text-foreground text-balance">
						Report a{" "}
						<em className="italic text-accent-red">health alert</em>
					</h1>
					<p className="mt-5 text-base text-muted-foreground max-w-2xl leading-relaxed">
						{isAuthenticated
							? "Submit a health alert to the Ministry of Health surveillance system. Fields marked with an asterisk are required."
							: "Anyone may file a report. Information here helps the surveillance team detect outbreaks early and respond quickly. Required fields are marked with an asterisk."}
					</p>
				</section>

				{/* Status messages */}
				{submitStatus.type === "success" && (
					<div className="animate-reveal mb-10 editorial-card border-l-2 border-l-accent-green px-6 py-5 flex items-start gap-4">
						<CheckCircle2
							className="h-5 w-5 text-accent-green mt-0.5 shrink-0"
							strokeWidth={1.75}
						/>
						<div>
							<p className="mono text-[10px] uppercase tracking-widest font-bold text-accent-green mb-1">
								Submitted
							</p>
							<p className="text-sm text-foreground/80 leading-relaxed">
								{submitStatus.message}
							</p>
						</div>
					</div>
				)}
				{submitStatus.type === "error" && (
					<div className="animate-reveal mb-10 editorial-card border-l-2 border-l-accent-red px-6 py-5 flex items-start gap-4">
						<AlertTriangleIcon
							className="h-5 w-5 text-accent-red mt-0.5 shrink-0"
							strokeWidth={1.75}
						/>
						<div>
							<p className="mono text-[10px] uppercase tracking-widest font-bold text-accent-red mb-1">
								Could not submit
							</p>
							<p className="text-sm text-foreground/80 leading-relaxed">
								{submitStatus.message}
							</p>
						</div>
					</div>
				)}

				{/* Form */}
				<form
					onSubmit={handleSubmit}
					className="editorial-card px-6 md:px-10 py-2 animate-reveal [animation-delay:100ms]"
				>
					<FormSection
						number="01"
						title="Basic information"
						description="When did you take this call, and what is the urgency?"
					>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-5">
							<div className="space-y-2">
								<Label htmlFor="date" className={labelCls}>
									Date *
								</Label>
								<Input
									id="date"
									type="date"
									max={getLocalDateString()}
									value={formData.date}
									onChange={(e) =>
										handleInputChange("date", e.target.value)
									}
									required
									className={cn(inputCls, "mono")}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="callTime" className={labelCls}>
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
									className={cn(inputCls, "mono")}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="status" className={labelCls}>
									Alert status *
								</Label>
								<Select
									onValueChange={(value) =>
										handleInputChange("status", value)
									}
									value={formData.status}
								>
									<SelectTrigger
										id="status"
										className={triggerCls}
									>
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

						<div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
							<div className="space-y-2">
								<Label htmlFor="call_taker" className={labelCls}>
									Call taker name
								</Label>
								<Input
									id="call_taker"
									value={formData.call_taker}
									onChange={(e) =>
										handleInputChange(
											"call_taker",
											e.target.value
										)
									}
									placeholder="Enter call taker's name"
									className={inputCls}
								/>
							</div>
							<div className="space-y-2">
								<Label className={labelCls}>
									Alert reported before? *
								</Label>
								<RadioGroup
									value={formData.alertReportedBefore}
									onValueChange={(value) =>
										handleInputChange(
											"alertReportedBefore",
											value
										)
									}
									className="flex gap-5 h-10 items-center"
								>
									<div className="flex items-center gap-2">
										<RadioGroupItem
											value="yes"
											id="yes"
											className="border-foreground/30 text-accent-red"
										/>
										<Label
											htmlFor="yes"
											className="text-sm cursor-pointer"
										>
											Yes
										</Label>
									</div>
									<div className="flex items-center gap-2">
										<RadioGroupItem
											value="no"
											id="no"
											className="border-foreground/30 text-accent-red"
										/>
										<Label
											htmlFor="no"
											className="text-sm cursor-pointer"
										>
											No
										</Label>
									</div>
								</RadioGroup>
							</div>
						</div>
					</FormSection>

					<FormSection
						number="02"
						title="Reporter"
						description="Who is filing this report? How can the team reach them?"
					>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
							<div className="space-y-2">
								<Label
									htmlFor="nameOfPersonReporting"
									className={labelCls}
								>
									Your name *
								</Label>
								<Input
									id="nameOfPersonReporting"
									value={formData.nameOfPersonReporting}
									onChange={(e) =>
										handleInputChange(
											"nameOfPersonReporting",
											e.target.value
										)
									}
									required
									placeholder="Enter your full name"
									className={inputCls}
								/>
							</div>
							<div className="space-y-2">
								<Label
									htmlFor="numberOfPersonReporting"
									className={labelCls}
								>
									Your phone number *
								</Label>
								<Input
									id="numberOfPersonReporting"
									value={formData.numberOfPersonReporting}
									onChange={(e) =>
										handleInputChange(
											"numberOfPersonReporting",
											e.target.value
										)
									}
									required
									placeholder="0701234567"
									className={cn(inputCls, "mono")}
								/>
							</div>
							<div className="space-y-2">
								<Label
									htmlFor="sourceOfAlert"
									className={labelCls}
								>
									Source of alert *
								</Label>
								<Select
									onValueChange={(value) =>
										handleInputChange("sourceOfAlert", value)
									}
								>
									<SelectTrigger
										id="sourceOfAlert"
										className={triggerCls}
									>
										<SelectValue placeholder="How did you learn about this case?" />
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
							<div className="space-y-2">
								<Label htmlFor="response" className={labelCls}>
									Suspected disease *
								</Label>
								<Select
									onValueChange={(value) =>
										handleInputChange("response", value)
									}
									value={formData.response}
								>
									<SelectTrigger
										id="response"
										className={triggerCls}
									>
										<SelectValue placeholder="Select disease" />
									</SelectTrigger>
									<SelectContent>
										{alertResponse?.map((disease) => (
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
						</div>
					</FormSection>

					<FormSection
						number="03"
						title="Case location"
						description="Where in Uganda is the case located?"
					>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
							<div className="space-y-2">
								<Label htmlFor="district" className={labelCls}>
									District *
								</Label>
								<Select
									onValueChange={(value) =>
										handleInputChange("district", value)
									}
								>
									<SelectTrigger
										id="district"
										className={triggerCls}
									>
										<SelectValue placeholder="Select district" />
									</SelectTrigger>
									<SelectContent className="max-h-72">
										{ugandaDistricts.map((district) => (
											<SelectItem
												key={district}
												value={district}
											>
												{district}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label htmlFor="subcounty" className={labelCls}>
									Subcounty / Division
								</Label>
								<Input
									id="subcounty"
									value={formData.subcounty}
									onChange={(e) =>
										handleInputChange(
											"subcounty",
											e.target.value
										)
									}
									placeholder="Enter subcounty or division"
									className={inputCls}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="village" className={labelCls}>
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
									className={inputCls}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="parish" className={labelCls}>
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
									className={inputCls}
								/>
							</div>
						</div>
					</FormSection>

					<FormSection
						number="04"
						title="Case details"
						description="Tell us about the patient and what happened."
					>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-5">
							<div className="space-y-2">
								<Label htmlFor="caseName" className={labelCls}>
									Patient name *
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
									className={inputCls}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="caseAge" className={labelCls}>
									Patient age *
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
									placeholder="Years"
									min="0"
									max="150"
									className={cn(inputCls, "mono")}
								/>
							</div>
							<div className="space-y-2">
								<Label className={labelCls}>
									Patient sex *
								</Label>
								<RadioGroup
									value={formData.caseSex}
									onValueChange={(value) =>
										handleInputChange("caseSex", value)
									}
									className="flex gap-5 h-10 items-center"
								>
									<div className="flex items-center gap-2">
										<RadioGroupItem
											value="Male"
											id="male"
											className="border-foreground/30 text-accent-red"
										/>
										<Label
											htmlFor="male"
											className="text-sm cursor-pointer"
										>
											Male
										</Label>
									</div>
									<div className="flex items-center gap-2">
										<RadioGroupItem
											value="Female"
											id="female"
											className="border-foreground/30 text-accent-red"
										/>
										<Label
											htmlFor="female"
											className="text-sm cursor-pointer"
										>
											Female
										</Label>
									</div>
								</RadioGroup>
							</div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
							<div className="space-y-2">
								<Label
									htmlFor="nameOfNextOfKin"
									className={labelCls}
								>
									Next of kin name
								</Label>
								<Input
									id="nameOfNextOfKin"
									value={formData.nameOfNextOfKin}
									onChange={(e) =>
										handleInputChange(
											"nameOfNextOfKin",
											e.target.value
										)
									}
									placeholder="Next of kin's full name"
									className={inputCls}
								/>
							</div>
							<div className="space-y-2">
								<Label
									htmlFor="nextOfKinPhoneNumber"
									className={labelCls}
								>
									Next of kin phone
								</Label>
								<Input
									id="nextOfKinPhoneNumber"
									value={formData.nextOfKinPhoneNumber}
									onChange={(e) =>
										handleInputChange(
											"nextOfKinPhoneNumber",
											e.target.value
										)
									}
									placeholder="0701234567"
									className={cn(inputCls, "mono")}
								/>
							</div>
						</div>

						<div className="space-y-2 mt-5">
							<Label
								htmlFor="caseAlertDescription"
								className={labelCls}
							>
								Case description *
							</Label>
							<Textarea
								id="caseAlertDescription"
								value={formData.caseAlertDescription}
								onChange={(e) =>
									handleInputChange(
										"caseAlertDescription",
										e.target.value
									)
								}
								required
								rows={3}
								placeholder="Describe what happened, when it started, and any relevant details"
								className={cn(
									inputCls,
									"h-auto py-3 leading-relaxed"
								)}
							/>
						</div>

						<div className="space-y-2 mt-5">
							<Label htmlFor="narrative" className={labelCls}>
								Additional notes
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
								className={cn(
									inputCls,
									"h-auto py-3 leading-relaxed"
								)}
							/>
							<div className="flex justify-between mono text-[10px] uppercase tracking-widest text-muted-foreground">
								<span>Maximum 250 characters</span>
								<span className="tabular-nums">
									{formData.narrative.length} / 250
								</span>
							</div>
						</div>
					</FormSection>

					<FormSection
						number="05"
						title="Signs & symptoms"
						description="Tick everything the patient has been experiencing."
					>
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
							{signsAndSymptoms.map((symptom) => {
								const checked =
									formData.signsAndSymptoms.includes(symptom);
								return (
									<label
										key={symptom}
										htmlFor={symptom}
										className={cn(
											"flex items-center gap-3 px-3 py-3 border rounded-sm cursor-pointer transition-colors",
											checked
												? "border-foreground/30 bg-accent-yellow/[0.08]"
												: "border-foreground/10 hover:border-foreground/30 hover:bg-foreground/[0.02]"
										)}
									>
										<Checkbox
											id={symptom}
											checked={checked}
											onCheckedChange={(c) =>
												handleSymptomsChange(
													symptom,
													c as boolean
												)
											}
											className="border-foreground/30 data-[state=checked]:bg-foreground data-[state=checked]:border-foreground rounded-sm"
										/>
										<span className="text-sm">
											{symptom}
										</span>
									</label>
								);
							})}
						</div>

						{formData.signsAndSymptoms.length > 0 && (
							<div className="mt-5 pt-5 border-t border-foreground/[0.08]">
								<p className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-3">
									Selected · {formData.signsAndSymptoms.length}
								</p>
								<div className="flex flex-wrap gap-2">
									{formData.signsAndSymptoms.map((symptom) => (
										<span
											key={symptom}
											className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] bg-accent-yellow/20 text-foreground rounded-sm font-medium"
										>
											{symptom}
										</span>
									))}
								</div>
							</div>
						)}
					</FormSection>

					{/* Submit */}
					<div className="py-10 border-t border-foreground/[0.08] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
						<p className="text-xs text-muted-foreground max-w-md leading-relaxed">
							By submitting, you confirm the information above is
							accurate to the best of your knowledge.
						</p>
						<div className="flex items-center gap-3">
							<Button
								type="button"
								variant="ghost"
								onClick={() =>
									setFormData({
										date: "",
										callTime: "",
										call_taker: "",
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
									})
								}
								disabled={isSubmitting}
								className="text-xs mono uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-sm h-10 px-4"
							>
								Clear form
							</Button>
							<Button
								type="submit"
								disabled={isSubmitting}
								className="px-6 py-3 bg-foreground text-background text-xs font-medium hover:opacity-90 rounded-sm gap-2 h-10"
							>
								<span className="mono uppercase tracking-widest font-bold">
									{isSubmitting
										? "Submitting…"
										: "Submit alert"}
								</span>
							</Button>
						</div>
					</div>
				</form>

				{/* Emergency Contact */}
				<aside className="mt-12 editorial-card border-l-2 border-l-accent-red px-6 py-5">
					<p className="mono text-[10px] uppercase tracking-widest font-bold text-accent-red mb-2">
						Emergency contact
					</p>
					<p className="text-sm text-foreground/80 leading-relaxed">
						For immediate medical emergencies, call{" "}
						<strong className="mono tracking-tight">
							0800-100-066
						</strong>
						, SMS{" "}
						<strong className="mono tracking-tight">6767</strong>,
						or visit the nearest health facility. This form is for
						reporting suspected outbreaks and public health concerns
						— not acute emergencies.
					</p>
				</aside>
			</main>

			<footer className="border-t border-border mt-16 px-6 md:px-12 py-6">
				<div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
					<div className="flex items-center gap-2.5">
						<MohLogo size="xs" />
						<p className="mono text-[10px] uppercase tracking-tighter text-muted-foreground">
							Ministry of Health · Republic of Uganda · National
							Surveillance
						</p>
					</div>
					<p className="mono text-[10px] uppercase tracking-tighter text-muted-foreground">
						v.2026.05 — Editorial release
					</p>
				</div>
			</footer>
		</div>
	);
}
