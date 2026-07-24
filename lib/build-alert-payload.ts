import { getLocalDateTimeIsoString } from "@/lib/utils";

/**
 * Canonical inputs for a new alert, independent of either add-alert form's local
 * field naming. Both add-alert pages (public + dashboard) map their own formData
 * into this shape and call buildAlertPayload, so the API payload's literals,
 * defaults and transforms live in exactly one place (they were copy-pasted, and
 * a missing/renamed field on one copy is a known prod failure mode).
 */
export interface AlertFormInput {
	date: string;
	/** Time-of-day string (HH:mm). Combined with `date` into a real timestamp. */
	time: string;
	callTaker: string;
	/** "yes" | "no" | "" — the radio value. */
	alertReportedBefore: string;
	personReporting: string;
	contactNumber: string;
	status: string;
	response: string;
	region: string;
	district: string;
	subCounty: string;
	village: string;
	parish: string;
	nationality: string;
	sourceOfAlert: string;
	channelOfReporting: string;
	history: string;
	caseName: string;
	caseAge: string;
	caseSex: string;
	labSamplesCollected: string;
	pointOfContactName: string;
	pointOfContactPhone: string;
	narrative: string;
	symptoms: string[];
}

/** Build the AuthService.createAlert / public-endpoint payload from form inputs. */
export function buildAlertPayload(v: AlertFormInput) {
	return {
		date: v.date ? new Date(v.date).toISOString() : new Date().toISOString(),
		time: getLocalDateTimeIsoString(v.date, v.time),
		callTaker: v.callTaker || "",
		alertReportedBefore: v.alertReportedBefore === "yes" ? "Yes" : "No",
		personReporting: v.personReporting,
		village: v.village || "",
		contactNumber: v.contactNumber,
		status: v.status || "Pending",
		response: v.response || "Routine",
		region: v.region,
		alertCaseDistrict: v.district,
		subCounty: v.subCounty || "",
		alertCaseVillage: v.village || "",
		alertCaseSubCounty: v.subCounty || "",
		alertCaseParish: v.parish || "",
		alertCaseNationality: v.nationality || "",
		sourceOfAlert: v.sourceOfAlert,
		channelOfReporting: v.channelOfReporting || "",
		history: v.history,
		alertCaseName: v.caseName,
		alertCaseAge: parseInt(v.caseAge) || 0,
		alertCaseSex: v.caseSex,
		labSamplesCollected: v.labSamplesCollected || "",
		pointOfContactName: v.pointOfContactName || "",
		pointOfContactRelationship: "Family",
		pointOfContactPhone: v.pointOfContactPhone || "",
		healthFacilityVisit: "No",
		traditionalHealerVisit: "No",
		actions: "Alert reported",
		narrative: v.narrative || "",
		symptoms: v.symptoms.join(", "),
		isHighlighted: false,
		isVerified: false,
	};
}
