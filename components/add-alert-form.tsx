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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CalendarIcon,
  UserIcon,
  MapPinIcon,
  AlertTriangleIcon,
  type LucideIcon,
} from "lucide-react";
import { FieldHint } from "@/components/field-hint";
import { alertEntryStatus } from "@/constants";
import { CaseLocationSelect } from "@/components/case-location-select";
import { MultiSelect } from "@/components/searchable-select";
import {
  useChannelOfReportingOptions,
  useSourceOfAlertOptions,
} from "@/hooks/use-lookup-options";
import {
  getLocalDateString,
  getLocalDateTimeIsoString,
  getLocalTimeString,
} from "@/lib/utils";

/**
 * Who is filling the form in. The public self-report page and the EOC dashboard
 * share this component but ask for genuinely different things — see
 * AUDIENCE_STRINGS for wording and PUBLIC_DEFAULTS for the intake fields a
 * community reporter is never shown.
 */
export type AlertFormAudience = "public" | "staff";

/**
 * Intake values a community reporter cannot meaningfully supply, so the public
 * form doesn't ask and fills them in instead. The backend applies its own
 * fallbacks for date/time/status (handlers/alert.go CreateAlert), but sending
 * them explicitly keeps the confirmation PDF and the created row consistent.
 */
/**
 * Guidance shown from the info button on each label, taken from the Event-Based
 * Surveillance Guidelines for Uganda (MoH IES&PHE) — see
 * uganda-ebs-operational-reference.md. Step 1 of the EBS cycle defines the
 * minimum dataset for a reported signal, and those seven items are what these
 * fields collect.
 */
const FIELD_HINTS = {
  // Step 1, item 1 — date and time of detection, plus the reporting clock.
  date: "Date the unusual occurrence was detected, not the date you are entering it. Every signal must be reported within 24 hours of detection.",
  time: "Time of detection. With the date, this starts the 24-hour reporting clock and the triage deadline.",
  status:
    "Where this report sits in the EBS cycle. It stays a signal until verification confirms it, at which point it becomes an event.",
  callTaker:
    "You — the officer at the desk taking this report. The caller's own name goes under Person Reporting the Signal, not here.",
  // Step 2, triage question 1.
  alertReportedBefore:
    "First triage question: if this was reported before and is already under investigation, it is discarded — but the discard is still recorded.",
  // Step 1, item 7 — and Step 3, which begins by calling the reporter back.
  personReporting:
    "Name of the person reporting the signal — the caller, not the call taker. Desk verification begins by contacting them, and feedback on the outcome is owed to them.",
  contactNumber:
    "Phone number of the person reporting, so verification can call them back to confirm the report and feedback can be returned to them.",
  // Section 5 — sources of signals.
  sourceOfAlert:
    "Where did you see this? The setting the signal came from: community, health facility, animal or wildlife, environment, media, point of entry or cross-border.",
  // Section 6 — reporting channels.
  channelOfReporting:
    "How are you reporting this? The route the signal arrived by: SMS 6767, toll-free 0800100066, web form, eCHIS, direct call, WhatsApp or email.",
  // Step 1, item 2 — location, and Section 4 for who receives it.
  region:
    "Region the district falls under. Determines which Regional PHEOC receives and supports this signal.",
  district:
    "District where the event is happening. The District Surveillance Focal Person triages and verifies signals here.",
  subcounty:
    "Sub-county or division. District, sub-county and village are all part of the minimum location detail a signal must carry.",
  village:
    "Village or facility where the event was observed. Completes the required location detail.",
  parish:
    "Parish, where known. Helps the rapid response team find the place during field verification.",
  // A signal is about an event; verification is what resolves it into cases.
  caseName:
    "Name of the person affected, if known. A signal describes an unusual event — leave this blank if no single patient is identified.",
  caseAge: "Age of the person affected, if known.",
  // Step 1, item 4 — the one minimum-dataset field that was captured nowhere.
  numberAffected:
    "Roughly how many people or animals are affected? An estimate is fine — scale is what triage and risk assessment weigh, and one case is a different signal from forty. Leave blank if you genuinely do not know.",
  caseSex: "Sex of the person affected, if known.",
  nextOfKinName:
    "Next of kin or another contact who can be reached if the affected person cannot be.",
  nextOfKinPhone: "Phone number for the next of kin.",
  // Step 1, items 3, 4 and 6 — the description carries all three.
  caseDescription:
    "Describe the unusual occurrence: what was seen, when it started.",
} as const;

export const PUBLIC_DEFAULTS = {
  status: "Pending",
  sourceOfAlert: "Community",
  channelOfReporting: "Public web form",
  callTaker: "",
} as const;

/** Canonical state of the add-alert form, shared by the public and dashboard pages. */
export interface AlertFormValues {
  date: string;
  time: string;
  callTaker: string;
  alertReportedBefore: "" | "yes" | "no";
  personReporting: string;
  contactNumber: string;
  status: string;
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
  /** Minimum dataset item 4. Free text on the way in so "blank" stays distinct from 0. */
  numberAffected: string;
  nextOfKinName: string;
  nextOfKinPhone: string;
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
    numberAffected: "",
    nextOfKinName: "",
    nextOfKinPhone: "",
  };
}

/**
 * Parse the estimated number affected. Returns null for blank or nonsense so an
 * unanswered field never lands in the database as 0 — "I don't know" and "none"
 * are different answers, and only one of them means the event is over.
 */
export function parseNumberAffected(value: string): number | null {
  const n = Number.parseInt(value.trim(), 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Maps form values to the alert-create API body. */
export function buildAlertPayload(
  values: AlertFormValues,
  audience: AlertFormAudience = "public",
) {
  const isPublic = audience === "public";
  // The public form hides these; a community reporter's own entry would be a
  // guess at an EOC label, so the defaults stand in.
  const status = isPublic ? PUBLIC_DEFAULTS.status : values.status || "Pending";
  // The public form asks where the signal was seen but doesn't force an answer;
  // a blank falls back to "Community", which is what a self-report is.
  const sourceOfAlert = isPublic
    ? values.sourceOfAlert || PUBLIC_DEFAULTS.sourceOfAlert
    : values.sourceOfAlert;
  const channelOfReporting = isPublic
    ? values.channelOfReporting || PUBLIC_DEFAULTS.channelOfReporting
    : values.channelOfReporting || "";
  const callTaker = isPublic
    ? PUBLIC_DEFAULTS.callTaker
    : values.callTaker || "";
  return {
    date: values.date
      ? new Date(values.date).toISOString()
      : new Date().toISOString(),
    time: getLocalDateTimeIsoString(values.date, values.time),
    alertReportedBefore: values.alertReportedBefore === "yes" ? "Yes" : "No",
    personReporting: values.personReporting,
    village: values.village || "",
    contactNumber: values.contactNumber,
    status,
    // Response type, symptoms, lab samples and notes are staff findings
    // recorded on the verification form, not reporter input — a new signal
    // is created with them unset rather than guessed at intake.
    response: "",
    region: values.region,
    alertCaseDistrict: values.district,
    subCounty: values.subcounty || "",
    alertCaseVillage: values.village || "",
    alertCaseSubCounty: values.subcounty || "",
    alertCaseParish: values.parish || "",
    alertCaseNationality: "Ugandan",
    sourceOfAlert,
    channelOfReporting,
    callTaker,
    history: values.caseDescription,
    alertCaseName: values.caseName,
    alertCaseAge: parseInt(values.caseAge) || 0,
    // Sent as null when unanswered: "the reporter did not know" and "nobody is
    // affected" are different facts, and 0 would assert the second.
    numberAffected: parseNumberAffected(values.numberAffected),
    alertCaseSex: values.caseSex,
    labSamplesCollected: "",
    pointOfContactName: values.nextOfKinName || "",
    pointOfContactRelationship: "Family",
    pointOfContactPhone: values.nextOfKinPhone || "",
    healthFacilityVisit: "No",
    traditionalHealerVisit: "No",
    actions: "Alert reported",
    narrative: "",
    symptoms: "",
    isHighlighted: false,
    isVerified: false,
  };
}

export type AlertPayload = ReturnType<typeof buildAlertPayload>;

const STAFF_REQUIRED_FIELDS: (keyof AlertFormValues)[] = [
  "date",
  "time",
  "status",
  "personReporting",
  "contactNumber",
  "sourceOfAlert",
  "region",
  "district",
  "subcounty",
  "caseName",
  "caseAge",
  "caseSex",
  "caseDescription",
];

/**
 * What the public form actually requires. Date/time/status are filled from
 * PUBLIC_DEFAULTS, and source/channel are asked but optional. Region is listed
 * because the location picker is a cascade — district can't be chosen until a
 * region is, so it is always set by the time the form is submitted.
 *
 * The patient's identity is optional on purpose: a community member reporting
 * "several children in my village are vomiting" cannot name one patient, and
 * forcing the field would either block the report or fill the case line-list
 * with guesses. Verification is where a health worker resolves it into cases.
 */
const PUBLIC_REQUIRED_FIELDS: (keyof AlertFormValues)[] = [
  "personReporting",
  "contactNumber",
  "region",
  "district",
  "subcounty",
  "caseDescription",
];

function validateAlertForm(
  values: AlertFormValues,
  audience: AlertFormAudience,
): string | null {
  const required =
    audience === "public" ? PUBLIC_REQUIRED_FIELDS : STAFF_REQUIRED_FIELDS;
  if (required.some((field) => !values[field])) {
    return "Please fill in all required fields";
  }
  return null;
}

/** Wording that differs between the public self-report page and the staff page. */
const AUDIENCE_STRINGS = {
  public: {
    reporterName: "Your Name",
    reporterNamePlaceholder: "Enter your full name",
    reporterPhone: "Your Phone Number",
    sourcePlaceholder: "Community, health facility, school...",
    channelPlaceholder: "Select how you are reporting",
  },
  staff: {
    reporterName: "Reporter Name",
    reporterNamePlaceholder: "Enter reporter's full name",
    reporterPhone: "Contact Number",
    sourcePlaceholder: "Select signal source",
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
  hint,
  children,
}: {
  htmlFor?: string;
  optional?: boolean;
  /** Plain-language explanation shown from an info button next to the label. */
  hint?: string;
  children: ReactNode;
}) {
  const label = (
    <Label
      htmlFor={htmlFor}
      className={`text-sm font-medium ${optional ? "text-gray-600" : "text-gray-700"
        }`}
    >
      {children}
      {optional && (
        <>
          {" "}
          <span className="font-normal text-gray-400">(optional)</span>
        </>
      )}
    </Label>
  );

  if (!hint) return label;

  return (
    <div className="flex items-center gap-1.5">
      {label}
      <FieldHint text={hint} />
    </div>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  optional,
  hint,
  ...inputProps
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
  hint?: string;
} & Omit<React.ComponentProps<typeof Input>, "id" | "value" | "onChange">) {
  return (
    <div className="space-y-2">
      <FieldLabel htmlFor={id} optional={optional} hint={hint}>
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
        <div key={option.value} className="flex items-center space-x-2">
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
  audience?: AlertFormAudience;
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
  // Admin-managed lists (Administration -> Dropdown Options). These start on the
  // built-in fallbacks and re-render once the API responds, so the PUBLIC form
  // still shows pickers if the lookup call is slow or fails.
  const sourceOptions = useSourceOfAlertOptions();
  const channelOptions = useChannelOfReportingOptions();
  const [values, setValues] = useState<AlertFormValues>(
    createEmptyAlertFormValues,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const setField = <K extends keyof AlertFormValues>(
    field: K,
    value: AlertFormValues[K],
  ) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: "" });
    onSubmitStart?.();

    try {
      const validationError = validateAlertForm(values, audience);
      if (validationError) throw new Error(validationError);

      const createdId = await submitAlert(buildAlertPayload(values, audience));
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

  const isPublic = audience === "public";

  // Fields both audiences ask for, defined once and composed into each layout
  // below. Only the required-marker and wording differ between them.
  const reporterNameField = (
    <TextField
      id="personReporting"
      hint={FIELD_HINTS.personReporting}
      label={`${strings.reporterName} *`}
      value={values.personReporting}
      onChange={(v) => setField("personReporting", v)}
      placeholder={strings.reporterNamePlaceholder}
    />
  );

  const reporterPhoneField = (
    <TextField
      id="contactNumber"
      hint={FIELD_HINTS.contactNumber}
      label={`${strings.reporterPhone} *`}
      value={values.contactNumber}
      onChange={(v) => setField("contactNumber", v)}
      placeholder="e.g., 0701234567"
    />
  );

  const locationSelect = (
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
      hints={{
        region: FIELD_HINTS.region,
        district: FIELD_HINTS.district,
        subcounty: FIELD_HINTS.subcounty,
      }}
    />
  );

  const villageParishFields = (
    <>
        <TextField
          id="parish"
          hint={FIELD_HINTS.parish}
          label="Parish"
          optional
          value={values.parish}
          onChange={(v) => setField("parish", v)}
          placeholder="Enter parish name"
        />
      <TextField
        id="village"
        hint={FIELD_HINTS.village}
        label="Village"
        optional
        value={values.village}
        onChange={(v) => setField("village", v)}
        placeholder="Enter village name"
      />
    </>
  );

  // Asked of both audiences: required for staff, optional and plainly worded for
  // a community reporter (who is usually the "Community" source themselves).
  const sourceField = (
    <div className="space-y-2">
      <FieldLabel
        htmlFor="sourceOfAlert"
        optional={isPublic}
        hint={FIELD_HINTS.sourceOfAlert}
      >
        {isPublic ? "Source of signal" : "Source of signal *"}
      </FieldLabel>
      <MultiSelect
        id="sourceOfAlert"
        options={sourceOptions.map((source) => ({
          value: source,
          label: source,
        }))}
        values={
          values.sourceOfAlert
            ? values.sourceOfAlert
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
            : []
        }
        onChange={(vals) => setField("sourceOfAlert", vals.join(", "))}
        placeholder={strings.sourcePlaceholder}
        searchPlaceholder="Search sources..."
        className="border-gray-300 focus-visible:ring-uganda-yellow/20"
      />
    </div>
  );

  // Optional for both audiences. A blank public answer falls back to
  // PUBLIC_DEFAULTS.channelOfReporting, since the web form knows its own medium.
  const channelField = (
    <div className="space-y-2">
      <FieldLabel
        htmlFor="channelOfReporting"
        optional
        hint={FIELD_HINTS.channelOfReporting}
      >
        Channel of Reporting
      </FieldLabel>
      <Select
        value={values.channelOfReporting}
        onValueChange={(v) => setField("channelOfReporting", v)}
      >
        <SelectTrigger
          id="channelOfReporting"
          className="border-gray-300 focus:ring-uganda-yellow/20"
        >
          <SelectValue placeholder={strings.channelPlaceholder} />
        </SelectTrigger>
        <SelectContent>
          {channelOptions.map((channel) => (
            <SelectItem key={channel} value={channel}>
              {channel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  // Staff intake only — EBS triage question 1 is a desk decision, so the public
  // form does not ask it. Public reports post alertReportedBefore: "No".
  const reportedBeforeField = (
    <div className="space-y-2">
      <FieldLabel optional hint={FIELD_HINTS.alertReportedBefore}>
        Signal reported before?
      </FieldLabel>
      <RadioRow
        value={values.alertReportedBefore}
        onChange={(v) =>
          setField(
            "alertReportedBefore",
            v as AlertFormValues["alertReportedBefore"],
          )
        }
        options={[
          { value: "yes", id: "yes", label: "Yes" },
          { value: "no", id: "no", label: "No" },
        ]}
      />
    </div>
  );

  // Patient identity is optional for the public reporter — see
  // PUBLIC_REQUIRED_FIELDS. `optional` also clears the native `required` on the
  // inputs, so the browser doesn't block an otherwise complete report.
  const patientFields = (
    <>
      <TextField
        id="caseName"
        hint={FIELD_HINTS.caseName}
        label={isPublic ? "Name" : "Patient Name *"}
        optional={isPublic}
        value={values.caseName}
        onChange={(v) => setField("caseName", v)}
        placeholder="Patient's full name"
      />
      <TextField
        id="caseAge"
        hint={FIELD_HINTS.caseAge}
        label={isPublic ? "Age" : "Patient Age *"}
        optional={isPublic}
        type="number"
        min="0"
        max="150"
        value={values.caseAge}
        onChange={(v) => setField("caseAge", v)}
        placeholder="Age in years"
      />
      <TextField
        id="numberAffected"
        hint={FIELD_HINTS.numberAffected}
        label="Number Affected"
        optional
        type="number"
        min="0"
        max="1000000"
        value={values.numberAffected}
        onChange={(v) => setField("numberAffected", v)}
        placeholder="e.g. 3"
      />
      <div className="space-y-2">
        <FieldLabel optional={isPublic} hint={FIELD_HINTS.caseSex}>
          {isPublic ? "Sex" : "Patient Sex *"}
        </FieldLabel>
        <RadioRow
          value={values.caseSex}
          onChange={(v) => setField("caseSex", v)}
          options={[
            { value: "Male", id: "male", label: "Male" },
            { value: "Female", id: "female", label: "Female" },
          ]}
        />
      </div>
      <TextField
        id="nextOfKinName"
        hint={FIELD_HINTS.nextOfKinName}
        label="Next of Kin Name"
        optional
        value={values.nextOfKinName}
        onChange={(v) => setField("nextOfKinName", v)}
        placeholder="Next of kin's full name"
      />
      <TextField
        id="nextOfKinPhone"
        hint={FIELD_HINTS.nextOfKinPhone}
        label="Next of Kin Phone"
        optional
        value={values.nextOfKinPhone}
        onChange={(v) => setField("nextOfKinPhone", v)}
        placeholder="e.g., 0701234567"
      />
    </>
  );

  const descriptionField = (
    <div className="space-y-2">
      <FieldLabel htmlFor="caseDescription" hint={FIELD_HINTS.caseDescription}>
        {isPublic ? "Describe what is happening(presentation , sex, age ,signs and symptoms,date of onset) *" : "Signal Description(suspected case,sex,age,signs and symptoms,date of onset) *"}
      </FieldLabel>
      <Textarea
        id="caseDescription"
        value={values.caseDescription}
        onChange={(e) => setField("caseDescription", e.target.value)}
        required
        rows={8}
        placeholder={
          isPublic
            ? "What have you seen or  heard? When did it start? number affected?"
            : "Describe what happened, when it started, who is affected, and any other relevant details"
        }
        className={`min-h-48 ${FIELD_CLASS}`}
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {isPublic ? (
        <>
          {/* Reporter's Details */}
          <div className="space-y-4">
            <SectionHeading icon={UserIcon} title="Reporter's Details" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {reporterNameField}
              {reporterPhoneField}
            </div>
          </div>

          <Separator />

          {/* Location */}
          <div className="space-y-4">
            <SectionHeading icon={MapPinIcon} title="Signal Location" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {locationSelect}
              {villageParishFields}
            </div>
          </div>

          <Separator />

          {/* What are you reporting? One section, three blocks, in the order a
              reporter can answer them: the short pickers, then whoever is
              affected, then the free-text description — the big textarea closes
              the section.

              The person affected used to be a section of its own. It is not a
              separate question: a heading promised a second thing to fill in,
              when it is the same report seen from another angle, and every
              field in it is optional. Hairline rules group the block instead,
              which is how the staff form has always carried these fields. */}
          <div className="space-y-4">
            <SectionHeading
              icon={AlertTriangleIcon}
              title="Signal Information"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {sourceField}
              {channelField}
            </div>

            {/* The reassurance outlives the heading it sat under: without it the
                row reads as five more things to find out before reporting. */}
            <div className="space-y-3 border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-600">
                Only fill in the person&apos;s details if you know them. You can
                send the report without them.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {patientFields}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              {descriptionField}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Basic Information */}
          <div className="space-y-4">
            <SectionHeading icon={CalendarIcon} title="Basic Information" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <TextField
                id="date"
                hint={FIELD_HINTS.date}
                label="Date *"
                type="date"
                max={getLocalDateString()}
                value={values.date}
                onChange={(v) => setField("date", v)}
              />
              <TextField
                id="time"
                hint={FIELD_HINTS.time}
                label="Time *"
                type="time"
                value={values.time}
                onChange={(v) => setField("time", v)}
              />
              <div className="space-y-2">
                <FieldLabel htmlFor="status" hint={FIELD_HINTS.status}>
                  Signal Status *
                </FieldLabel>
                <Select
                  value={values.status}
                  onValueChange={(v) => setField("status", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select signal status" />
                  </SelectTrigger>
                  <SelectContent>
                    {alertEntryStatus?.map((status) => (
                      <SelectItem key={status.name} value={status.name}>
                        {status.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <TextField
                id="callTaker"
                hint={FIELD_HINTS.callTaker}
                label="Call Taker Name"
                optional
                value={values.callTaker}
                onChange={(v) => setField("callTaker", v)}
                placeholder="Enter call taker's name"
              />
              {reportedBeforeField}
            </div>
          </div>

          <Separator />

          {/* Reporter Information */}
          <div className="space-y-4">
            <SectionHeading
              icon={UserIcon}
              title="Person Reporting the Signal"
            />
            <p className="text-sm text-gray-600">
              Details of whoever is reporting this signal — the community
              member, VHT or health worker on the line. Not you: your name goes
              in Call Taker Name above.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {reporterNameField}
              {reporterPhoneField}
              {sourceField}
              {channelField}
            </div>
          </div>

          <Separator />

          {/* Location Information */}
          <div className="space-y-4">
            <SectionHeading icon={MapPinIcon} title="Signal Location" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {locationSelect}
              {villageParishFields}
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
              {patientFields}
            </div>
          </div>

          <Separator />

          {descriptionField}
        </>
      )}

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
