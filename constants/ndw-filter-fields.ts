export type NdwFilterFieldType = "text" | "number" | "boolean" | "date";

export interface NdwFilterField {
	key: string;
	label: string;
	type: NdwFilterFieldType;
	group: string;
	placeholder?: string;
}

export const NDW_FILTER_OPERATORS = [
	{ value: "ilike.", label: "Contains" },
	{ value: "eq.", label: "Equals" },
	{ value: "like.", label: "Like" },
	{ value: "gte.", label: "≥" },
	{ value: "lte.", label: "≤" },
	{ value: "gt.", label: ">" },
	{ value: "lt.", label: "<" },
	{ value: "is.null", label: "Is empty" },
	{ value: "is.notnull", label: "Has value" },
] as const;

export const POE_NDW_FILTER_FIELDS: NdwFilterField[] = [
	{ key: "full_name", label: "Full name", type: "text", group: "Traveller" },
	{ key: "sex", label: "Sex", type: "text", group: "Traveller" },
	{ key: "date_of_birth", label: "Date of birth", type: "text", group: "Traveller" },
	{ key: "passport_number", label: "Passport", type: "text", group: "Traveller" },
	{ key: "nationality", label: "Nationality", type: "text", group: "Traveller" },
	{ key: "nationality_code", label: "Nationality code", type: "text", group: "Traveller" },
	{ key: "phone_uganda", label: "Phone (Uganda)", type: "text", group: "Traveller" },
	{ key: "email", label: "Email", type: "text", group: "Traveller" },
	{ key: "next_of_kin_phone", label: "Next of kin phone", type: "text", group: "Traveller" },
	{ key: "address_in_uganda", label: "Address in Uganda", type: "text", group: "Traveller" },
	{ key: "port_of_entry", label: "Port of entry", type: "text", group: "Travel" },
	{ key: "port_of_entry_other", label: "Port of entry (other)", type: "text", group: "Travel" },
	{ key: "flight_number", label: "Flight number", type: "text", group: "Travel" },
	{ key: "country_of_embarkation", label: "Country of embarkation", type: "text", group: "Travel" },
	{ key: "embarkation_code", label: "Embarkation code", type: "text", group: "Travel" },
	{ key: "countries_visited_21d", label: "Countries visited (21d)", type: "text", group: "Travel" },
	{ key: "arrival_date", label: "Arrival date", type: "text", group: "Travel" },
	{ key: "arrival_date_parsed", label: "Arrival date (parsed)", type: "date", group: "Travel" },
	{ key: "duration_days", label: "Duration (days)", type: "number", group: "Travel" },
	{ key: "risk_level", label: "Risk level", type: "text", group: "Risk" },
	{ key: "risk_band", label: "Risk band", type: "text", group: "Risk" },
	{ key: "risk_score", label: "Risk score", type: "number", group: "Risk" },
	{ key: "symptom_count", label: "Symptom count", type: "number", group: "Health" },
	{ key: "symptoms_text", label: "Symptoms text", type: "text", group: "Health" },
	{ key: "symptoms", label: "Symptoms (JSON)", type: "text", group: "Health" },
	{ key: "exposure_bushmeat", label: "Exposure: bushmeat", type: "boolean", group: "Exposure" },
	{ key: "exposure_funeral", label: "Exposure: funeral", type: "boolean", group: "Exposure" },
	{ key: "exposure_healthcare", label: "Exposure: healthcare", type: "boolean", group: "Exposure" },
	{ key: "exposure_sick_contact", label: "Exposure: sick contact", type: "boolean", group: "Exposure" },
	{ key: "exposure_count", label: "Exposure count", type: "number", group: "Exposure" },
	{ key: "ref_code", label: "Ref code", type: "text", group: "Record" },
	{ key: "source_id", label: "Source ID", type: "number", group: "Record" },
	{ key: "created_at", label: "Created at", type: "date", group: "Record" },
	{ key: "created_date", label: "Created date", type: "date", group: "Record" },
	{ key: "updated_at", label: "Updated at", type: "date", group: "Record" },
	{ key: "is_verified", label: "Verified", type: "boolean", group: "Verification" },
	{ key: "verified_at", label: "Verified at", type: "date", group: "Verification" },
	{ key: "verified_by", label: "Verified by", type: "number", group: "Verification" },
	{ key: "verify_token", label: "Verify token", type: "text", group: "Verification" },
];

export const ECHIS_NDW_FILTER_FIELDS: NdwFilterField[] = [
	{ key: "Date", label: "Date", type: "date", group: "Dates" },
	{ key: "District", label: "District", type: "text", group: "Location" },
	{ key: "County", label: "County", type: "text", group: "Location" },
	{ key: "Sub-County", label: "Sub-county", type: "text", group: "Location" },
	{ key: "Health Facility", label: "Health facility", type: "text", group: "Location" },
	{ key: "Parish", label: "Parish", type: "text", group: "Location" },
	{ key: "Village", label: "Village", type: "text", group: "Location" },
	{ key: "VHT Name", label: "VHT name", type: "text", group: "VHT" },
	{ key: "VHT Phone", label: "VHT phone", type: "text", group: "VHT" },
	{ key: "Verification Status", label: "Verification status", type: "text", group: "Verification" },
	{ key: "Person in VHT Area", label: "Person in VHT area", type: "text", group: "Verification" },
	{ key: "Brief Description", label: "Brief description", type: "text", group: "Signal" },
	{ key: "Additional Information", label: "Additional information", type: "text", group: "Signal" },
];

export function countActiveNdwFilters(filters: Record<string, string>): number {
	return Object.values(filters).filter((v) => v.trim() !== "").length;
}

export function buildNdwFilterValue(
	field: NdwFilterField,
	operator: string,
	raw: string
): string {
	const v = raw.trim();
	if (!v && operator !== "is.null" && operator !== "is.notnull") return "";
	if (operator === "is.null" || operator === "is.notnull") return operator;
	if (operator === "eq.") return v;
	if (operator) return operator + v;
	if (field.type === "text") return "ilike." + v;
	return v;
}

export function groupNdwFields(fields: NdwFilterField[]): Record<string, NdwFilterField[]> {
	const groups: Record<string, NdwFilterField[]> = {};
	for (const f of fields) {
		if (!groups[f.group]) groups[f.group] = [];
		groups[f.group].push(f);
	}
	return groups;
}
