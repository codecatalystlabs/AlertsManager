"use client";

import type React from "react";
import { useState, type ReactNode } from "react";
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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
	CalendarIcon,
	UserIcon,
	MapPinIcon,
	AlertTriangleIcon,
	HeartIcon,
	type LucideIcon,
} from "lucide-react";
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

/** Canonical state of the add-alert form, shared by the public and dashboard pages. */
export interface AlertFormValues {
	date: string;
	time: string;
	callTaker: string;
	alertReportedBefore: "" | "yes" | "no";
	personReporting: string;
	contactNumber: string;
	status: string;
	response: string; // disease code from `alertResponse`
	region: string;
	district: string;
	subcounty: string;
	village: string;
	parish: string;
	sourceOfAlert: string; // comma-joined MultiSelect values
	channelOfReporting: string;
	caseDescription: string;
	caseName: string;
	caseAge: string;
	caseSex: string;
	labSamplesCollected: string;
	nextOfKinName: string;
	nextOfKinPhone: string;
	narrative: string;
	symptoms: string[];
}

export function createEmptyAlertFormValues(): AlertFormValues {
	return {
		date: "",
		time: getLocalTimeString(),
		callTaker: "",
		alertReportedBefore: "",
		personReporting: "",
		contactNumber: "",
		status: "",
		response: "",
		region: "",
		district: "",
		subcounty: "",
		village: "",
		parish: "",
		sourceOfAlert: "",
		channelOfReporting: "",
		caseDescription: "",
		caseName: "",
		caseAge: "",
		caseSex: "",
		labSamplesCollected: "",
		nextOfKinName: "",
		nextOfKinPhone: "",
		narrative: "",
		symptoms: [],
	};
}

/** Maps form values to the alert-create API body. */
export function buildAlertPayload(values: AlertFormValues) {
	return {
		date: values.date
			? new Date(values.date).toISOString()
			: new Date().toISOString(),
		time: getLocalDateTimeIsoString(values.date, values.time),
		alertReportedBefore:
			values.alertReportedBefore === "yes" ? "Yes" : "No",
		personReporting: values.personReporting,
		village: values.village || "",
		contactNumber: values.contactNumber,
		status: values.status || "Pending",
		response: values.response || "Routine",
		region: values.region,
		alertCaseDistrict: values.district,
		subCounty: values.subcounty || "",
		alertCaseVillage: values.village || "",
		alertCaseSubCounty: values.subcounty || "",
		alertCaseParish: values.parish || "",
		alertCaseNationality: "Ugandan",
		sourceOfAlert: values.sourceOfAlert,
		channelOfReporting: values.channelOfReporting || "",
		callTaker: values.callTaker || "",
		history: values.caseDescription,
		alertCaseName: values.caseName,
		alertCaseAge: parseInt(values.caseAge) || 0,
		alertCaseSex: values.caseSex,
		labSamplesCollected: values.labSamplesCollected || "",
		pointOfContactName: values.nextOfKinName || "",
		pointOfContactRelationship: "Family",
		pointOfContactPhone: values.nextOfKinPhone || "",
		healthFacilityVisit: "No",
		traditionalHealerVisit: "No",
		actions: "Alert reported",
		narrative: values.narrative || "",
		symptoms: values.symptoms.join(", "),
		isHighlighted: false,
		isVerified: false,
	};
}

export type AlertPayload = ReturnType<typeof buildAlertPayload>;

function validateAlertForm(values: AlertFormValues): string | null {
	const required: (keyof AlertFormValues)[] = [
		"date",
		"time",
		"status",
		"personReporting",
		"contactNumber",
		"sourceOfAlert",
		"response",
		"region",
		"district",
		"subcounty",
		"caseName",
		"caseAge",
		"caseSex",
		"caseDescription",
	];
	if (required.some((field) => !values[field])) {
		return "Please fill in all required fields";
	}
	if (values.symptoms.length === 0) {
		return "Please select at least one sign or symptom";
	}
	return null;
}

/** Wording that differs between the public self-report page and the staff page. */
const AUDIENCE_STRINGS = {
	public: {
		reporterName: "Your Name",
		reporterNamePlaceholder: "Enter your full name",
		reporterPhone: "Your Phone Number",
		sourcePlaceholder: "How did you learn about this case?",
		channelPlaceholder: "How was this alert reported?",
	},
	staff: {
		reporterName: "Reporter Name",
		reporterNamePlaceholder: "Enter reporter's full name",
		reporterPhone: "Contact Number",
		sourcePlaceholder: "Select alert source",
		channelPlaceholder: "Select channel of reporting",
	},
} as const;

const FIELD_CLASS =
	"border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow/20";
const RADIO_CLASS = "border-uganda-red text-uganda-red";

function SectionHeading({
	icon: Icon,
	title,
	required,
}: {
	icon: LucideIcon;
	title: string;
	required?: boolean;
}) {
	return (
		<div className="flex items-center gap-2">
			<Icon className="h-5 w-5 text-uganda-red" />
			<h3 className="text-lg font-semibold text-uganda-black">
				{title}
				{required && (
					<>
						{" "}
						<span className="text-uganda-red">*</span>
					</>
				)}
			</h3>
		</div>
	);
}

function FieldLabel({
	htmlFor,
	optional,
	children,
}: {
	htmlFor?: string;
	optional?: boolean;
	children: ReactNode;
}) {
	return (
		<Label
			htmlFor={htmlFor}
			className={`text-sm font-medium ${optional ? "text-gray-600" : "text-gray-700"
				}`}
		>
			{children}
			{optional && (
				<>
					{" "}
					<span className="font-normal text-gray-400">
						(optional)
					</span>
				</>
			)}
		</Label>
	);
}

function TextField({
	id,
	label,
	value,
	onChange,
	optional,
	...inputProps
}: {
	id: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
	optional?: boolean;
} & Omit<React.ComponentProps<typeof Input>, "id" | "value" | "onChange">) {
	return (
		<div className="space-y-2">
			<FieldLabel htmlFor={id} optional={optional}>
				{label}
			</FieldLabel>
			<Input
				id={id}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				required={!optional}
				className={FIELD_CLASS}
				{...inputProps}
			/>
		</div>
	);
}

function RadioRow({
	value,
	onChange,
	options,
}: {
	value: string;
	onChange: (value: string) => void;
	options: { value: string; id: string; label: string }[];
}) {
	return (
		<RadioGroup
			value={value}
			onValueChange={onChange}
			className="flex min-h-10 items-center gap-4"
		>
			{options.map((option) => (
				<div
					key={option.value}
					className="flex items-center space-x-2"
				>
					<RadioGroupItem
						value={option.value}
						id={option.id}
						className={RADIO_CLASS}
					/>
					<Label htmlFor={option.id} className="text-sm">
						{option.label}
					</Label>
				</div>
			))}
		</RadioGroup>
	);
}

export interface AddAlertFormProps {
	/** Adjusts reporter-facing wording; defaults to the public self-report copy. */
	audience?: keyof typeof AUDIENCE_STRINGS;
	/** Sends the payload to the API and resolves the created alert id (null if unknown). */
	submitAlert: (payload: AlertPayload) => Promise<number | null>;
	successMessage: string;
	/** Called as a submission starts, before validation (e.g. clear page-level state). */
	onSubmitStart?: () => void;
	/** Called on success with the submitted values (the form itself is reset after). */
	onSuccess?: (values: AlertFormValues, createdId: number | null) => void;
	/** Rendered under the success message, e.g. the public page's PDF download offer. */
	successExtra?: ReactNode;
	/** Submit/cancel controls, rendered at the end of the form. */
	renderActions: (isSubmitting: boolean) => ReactNode;
}

export function AddAlertForm({
	audience = "public",
	submitAlert,
	successMessage,
	onSubmitStart,
	onSuccess,
	successExtra,
	renderActions,
}: AddAlertFormProps) {
	const strings = AUDIENCE_STRINGS[audience];
	const [values, setValues] = useState<AlertFormValues>(
		createEmptyAlertFormValues
	);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitStatus, setSubmitStatus] = useState<{
		type: "success" | "error" | null;
		message: string;
	}>({ type: null, message: "" });

	const setField = <K extends keyof AlertFormValues>(
		field: K,
		value: AlertFormValues[K]
	) => {
		setValues((prev) => ({ ...prev, [field]: value }));
	};

	const handleSymptomToggle = (symptom: string, checked: boolean) => {
		setValues((prev) => ({
			...prev,
			symptoms: checked
				? [...prev.symptoms, symptom]
				: prev.symptoms.filter((s) => s !== symptom),
		}));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		setSubmitStatus({ type: null, message: "" });
		onSubmitStart?.();

		try {
			const validationError = validateAlertForm(values);
			if (validationError) throw new Error(validationError);

			const createdId = await submitAlert(buildAlertPayload(values));
			onSuccess?.(values, createdId);
			setSubmitStatus({ type: "success", message: successMessage });
			setValues(createEmptyAlertFormValues());
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
		<form onSubmit={handleSubmit} className="space-y-5">
			{/* Basic Information */}
			<div className="space-y-4">
				<SectionHeading icon={CalendarIcon} title="Basic Information" />
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
					<TextField
						id="date"
						label="Date *"
						type="date"
						max={getLocalDateString()}
						value={values.date}
						onChange={(v) => setField("date", v)}
					/>
					<TextField
						id="time"
						label="Time *"
						type="time"
						value={values.time}
						onChange={(v) => setField("time", v)}
					/>
					<div className="space-y-2">
						<FieldLabel htmlFor="status">Alert Status *</FieldLabel>
						<Select
							value={values.status}
							onValueChange={(v) => setField("status", v)}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select alert status" />
							</SelectTrigger>
							<SelectContent>
								{alertEntryStatus?.map((status) => (
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
					<TextField
						id="callTaker"
						label="Call Taker Name"
						optional
						value={values.callTaker}
						onChange={(v) => setField("callTaker", v)}
						placeholder="Enter call taker's name"
					/>
					<div className="space-y-2">
						<FieldLabel optional>Alert reported before?</FieldLabel>
						<RadioRow
							value={values.alertReportedBefore}
							onChange={(v) =>
								setField(
									"alertReportedBefore",
									v as AlertFormValues["alertReportedBefore"]
								)
							}
							options={[
								{ value: "yes", id: "yes", label: "Yes" },
								{ value: "no", id: "no", label: "No" },
							]}
						/>
					</div>
				</div>
			</div>

			<Separator />

			{/* Reporter Information */}
			<div className="space-y-4">
				<SectionHeading icon={UserIcon} title="Reporter Information" />
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
					<TextField
						id="personReporting"
						label={`${strings.reporterName} *`}
						value={values.personReporting}
						onChange={(v) => setField("personReporting", v)}
						placeholder={strings.reporterNamePlaceholder}
					/>
					<TextField
						id="contactNumber"
						label={`${strings.reporterPhone} *`}
						value={values.contactNumber}
						onChange={(v) => setField("contactNumber", v)}
						placeholder="e.g., 0701234567"
					/>
					<div className="space-y-2">
						<FieldLabel htmlFor="sourceOfAlert">
							Source of Alert *
						</FieldLabel>
						<MultiSelect
							id="sourceOfAlert"
							options={alertSource.map((source) => ({
								value: source.name,
								label: source.name,
							}))}
							values={
								values.sourceOfAlert
									? values.sourceOfAlert
										.split(",")
										.map((s) => s.trim())
										.filter(Boolean)
									: []
							}
							onChange={(vals) =>
								setField("sourceOfAlert", vals.join(", "))
							}
							placeholder={strings.sourcePlaceholder}
							searchPlaceholder="Search sources..."
							className="border-gray-300 focus-visible:ring-uganda-yellow/20"
						/>
					</div>
					<div className="space-y-2">
						<FieldLabel htmlFor="channelOfReporting">
							Channel of Reporting
						</FieldLabel>
						<Select
							value={values.channelOfReporting}
							onValueChange={(v) =>
								setField("channelOfReporting", v)
							}
						>
							<SelectTrigger
								id="channelOfReporting"
								className="border-gray-300 focus:ring-uganda-yellow/20"
							>
								<SelectValue
									placeholder={strings.channelPlaceholder}
								/>
							</SelectTrigger>
							<SelectContent>
								{CHANNEL_OF_REPORTING_OPTIONS.map((channel) => (
									<SelectItem key={channel} value={channel}>
										{channel}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

				</div>
			</div>

			<Separator />

			{/* Location Information */}
			<div className="space-y-4">
				<SectionHeading icon={MapPinIcon} title="Signal Location" />
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
					<CaseLocationSelect
						value={{
							region: values.region,
							district: values.district,
							subcounty: values.subcounty,
						}}
						onChange={(loc) =>
							setValues((prev) => ({
								...prev,
								region: loc.region,
								district: loc.district,
								subcounty: loc.subcounty,
							}))
						}
						triggerClassName={FIELD_CLASS}
					/>
					<TextField
						id="village"
						label="Village"
						optional
						value={values.village}
						onChange={(v) => setField("village", v)}
						placeholder="Enter village name"
					/>
					<TextField
						id="parish"
						label="Parish"
						optional
						value={values.parish}
						onChange={(v) => setField("parish", v)}
						placeholder="Enter parish name"
					/>
				</div>
			</div>

			<Separator />

			{/* Case Information */}
			<div className="space-y-4">
				<SectionHeading
					icon={AlertTriangleIcon}
					title="Signal Information"
				/>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
					<TextField
						id="caseName"
						label="Patient Name *"
						value={values.caseName}
						onChange={(v) => setField("caseName", v)}
						placeholder="Patient's full name"
					/>
					<TextField
						id="caseAge"
						label="Patient Age *"
						type="number"
						min="0"
						max="150"
						value={values.caseAge}
						onChange={(v) => setField("caseAge", v)}
						placeholder="Age in years"
					/>
					<div className="space-y-2">
						<FieldLabel>Patient Sex *</FieldLabel>
						<RadioRow
							value={values.caseSex}
							onChange={(v) => setField("caseSex", v)}
							options={[
								{ value: "Male", id: "male", label: "Male" },
								{
									value: "Female",
									id: "female",
									label: "Female",
								},
							]}
						/>
					</div>
					<TextField
						id="nextOfKinName"
						label="Next of Kin Name"
						optional
						value={values.nextOfKinName}
						onChange={(v) => setField("nextOfKinName", v)}
						placeholder="Next of kin's full name"
					/>
					<TextField
						id="nextOfKinPhone"
						label="Next of Kin Phone"
						optional
						value={values.nextOfKinPhone}
						onChange={(v) => setField("nextOfKinPhone", v)}
						placeholder="e.g., 0701234567"
					/>
				</div>




			</div>

			<Separator />

			{/* Signs and Symptoms */}
			<div className="space-y-4">
				<SectionHeading
					icon={HeartIcon}
					title="Signs and Symptoms"
					required
				/>
				<div className="rounded-lg bg-gray-50 p-3 sm:p-4">
					<p className="mb-3 text-sm text-gray-600">
						Select all symptoms that apply to this case (at least
						one is required):
					</p>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{signsAndSymptoms.map((symptom) => (
							<div
								key={symptom}
								className="flex min-h-10 items-center space-x-2 rounded border border-gray-200 bg-white px-3 py-2 transition-colors hover:border-uganda-yellow/50"
							>
								<Checkbox
									id={symptom}
									checked={values.symptoms.includes(symptom)}
									onCheckedChange={(checked) =>
										handleSymptomToggle(
											symptom,
											checked as boolean
										)
									}
									className="border-uganda-red data-[state=checked]:bg-uganda-red data-[state=checked]:border-uganda-red"
								/>
								<Label
									htmlFor={symptom}
									className="cursor-pointer text-sm font-medium leading-tight"
								>
									{symptom}
								</Label>
							</div>
						))}
					</div>
					{values.symptoms.length > 0 && (
						<div className="mt-3">
							<p className="mb-2 text-sm font-medium text-gray-700">
								Selected symptoms:
							</p>
							<div className="flex flex-wrap gap-2">
								{values.symptoms.map((symptom) => (
									<Badge
										key={symptom}
										variant="secondary"
										className="bg-uganda-yellow/20 text-uganda-black"
									>
										{symptom}
									</Badge>
								))}
							</div>
						</div>
					)}
				</div>
			</div>





			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<div className="space-y-2">
					<FieldLabel htmlFor="caseDescription">
						Signal Description *
					</FieldLabel>
					<Textarea
						id="caseDescription"
						value={values.caseDescription}
						onChange={(e) =>
							setField("caseDescription", e.target.value)
						}
						required
						rows={3}
						placeholder="Describe what happened, when it started, and any relevant details"
						className={`min-h-24 ${FIELD_CLASS}`}
					/>
				</div>
				<div className="space-y-2">
					<FieldLabel htmlFor="narrative" optional>
						Additional Notes
					</FieldLabel>
					<Textarea
						id="narrative"
						placeholder="Any additional information that might be helpful"
						value={values.narrative}
						onChange={(e) =>
							setField("narrative", e.target.value)
						}

						rows={3}
						className={`min-h-24 ${FIELD_CLASS}`}
					/>

				</div>
			</div>


			{/* response and laboratory */}
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

				<div className="space-y-2">
					<FieldLabel htmlFor="response">
						Response *
					</FieldLabel>
					<SearchableSelect
						id="response"
						options={alertResponse.map((disease) => ({
							value: disease.code,
							label: disease.name,
						}))}
						value={values.response}
						onChange={(v) => setField("response", v)}
						placeholder="Select disease"
						searchPlaceholder="Search diseases..."
					/>
				</div>

				<div className="space-y-2">
					<FieldLabel>Were laboratory samples collected?</FieldLabel>
					<RadioRow
						value={values.labSamplesCollected}
						onChange={(v) => setField("labSamplesCollected", v)}
						options={[
							{
								value: "Yes",
								id: "labSamplesYes",
								label: "Yes",
							},
							{ value: "No", id: "labSamplesNo", label: "No" },
						]}
					/>
				</div>
			</div>
			{/* response and laboratory */}


			{/* Status Messages */}
			{submitStatus.type && (
				<div>
					<Alert
						className={
							submitStatus.type === "success"
								? "surface-success"
								: "surface-danger"
						}
					>
						<AlertTriangleIcon
							className={`h-4 w-4 ${submitStatus.type === "success"
								? "text-success"
								: "text-destructive"
								}`}
						/>
						<AlertDescription
							className={
								submitStatus.type === "success"
									? "text-success"
									: "text-destructive"
							}
						>
							{submitStatus.message}
						</AlertDescription>
					</Alert>
					{submitStatus.type === "success" && successExtra}
				</div>
			)}

			{renderActions(isSubmitting)}
		</form>
	);
}
