import type { EidsrEvent } from "@/lib/fetch-eidsr-events";

/** DHIS2 data element IDs → display labels (6767 program) */
export const EIDSR_DATA_VALUE_FIELDS = {
	reporterName: "C8rAfbgOZir",
	host: "ILmx9NZX5GK",
	caseStatus: "K5xlXx9M7my",
	age: "KOYLOpD1LVN",
	symptomOnsetDate: "KyQqGXUzThE",
	location: "MaR0lvrRkvR",
	specimenStatus: "Y9ahw4POban",
	alertDate: "dbXuMlmikiE",
	disease: "elGqdsbgahz",
	phone: "fb9Fs09UNN8",
	reportDate: "mat5CiQpcYf",
	notes: "mxKyHOIv1nH",
	source: "nvYHp4qr35Q",
	verifiedFlag: "qZbnrWP7sAc",
	verificationStatus: "sapRdA8sojg",
	sex: "t0fsTEkUl2d",
	narrative: "thsZG5TJDBV",
} as const;

export const EIDSR_FIELD_LABELS: Record<
	keyof typeof EIDSR_DATA_VALUE_FIELDS,
	string
> = {
	reporterName: "Reporter name",
	host: "Host",
	caseStatus: "Case status",
	age: "Age",
	symptomOnsetDate: "Symptom onset",
	location: "Location",
	specimenStatus: "Specimen status",
	alertDate: "Alert date",
	disease: "Disease / syndrome",
	phone: "Contact phone",
	reportDate: "Report date",
	notes: "Notes",
	source: "Source of alert",
	verifiedFlag: "Verified",
	verificationStatus: "Verification status",
	sex: "Sex",
	narrative: "Message",
};

export type EidsrDataValueKey = keyof typeof EIDSR_DATA_VALUE_FIELDS;

export function getEidsrDataValue(
	event: EidsrEvent,
	field: EidsrDataValueKey
): string {
	return event.dataValues?.[EIDSR_DATA_VALUE_FIELDS[field]] ?? "";
}
