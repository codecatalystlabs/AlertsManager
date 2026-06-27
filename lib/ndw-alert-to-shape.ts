import type { EchisAlertRow, PoeAlertRow } from "@/lib/fetch-ndw-alerts";

/**
 * Shape passed into AlertVerificationDialog to prefill the verify form from an
 * eCHIS signal. Field names mirror what the dialog reads (alertCase*, etc.).
 */
export function echisToAlertShape(row: EchisAlertRow): Record<string, unknown> {
	return {
		id: row.id,
		personReporting: row.vhtName,
		contactNumber: row.vhtPhone,
		pointOfContactName: row.vhtName,
		pointOfContactPhone: row.vhtPhone,
		sourceOfAlert: "eCHIS",
		alertCaseName: row.briefDescription,
		alertCaseVillage: row.village,
		alertCaseParish: row.parish,
		alertCaseSubCounty: row.subCounty,
		alertCaseDistrict: row.district,
		subCounty: row.subCounty,
		village: row.village,
		symptoms: row.briefDescription,
		history: [row.briefDescription, row.additionalInformation]
			.filter(Boolean)
			.join(" | "),
		linkedAlertId: row.linkedAlertId,
	};
}

/**
 * Shape passed into AlertVerificationDialog to prefill the verify form from a POE
 * traveller alert. POE has no district of its own, so the verifier picks one.
 */
export function poeToAlertShape(row: PoeAlertRow): Record<string, unknown> {
	const travel = [
		row.passportNumber && `Passport ${row.passportNumber}`,
		row.flightNumber && `Flight ${row.flightNumber}`,
		row.countryOfEmbarkation && `From ${row.countryOfEmbarkation}`,
		row.riskLevel && `Risk ${row.riskLevel}`,
	]
		.filter(Boolean)
		.join(" | ");

	return {
		id: row.id,
		personReporting: "POE Surveillance",
		contactNumber: row.phoneUganda,
		pointOfContactName: row.fullName,
		pointOfContactPhone: row.phoneUganda,
		sourceOfAlert: row.portOfEntry ? `POE: ${row.portOfEntry}` : "POE",
		alertCaseName: row.fullName,
		alertCaseSex: row.sex,
		alertCaseVillage: row.portOfEntry,
		alertCaseNationality: row.nationality,
		village: row.portOfEntry,
		symptoms: row.symptomsText,
		history: travel,
		linkedAlertId: row.linkedAlertId,
	};
}
