import { normalizeSourceOfAlert } from "@/lib/source-of-alert";

/** API alert shape used across list/detail/dashboard fetches */
export interface ApiAlert {
	id?: number;
	status: string;
	date: string;
	time: string;
	callTaker?: string;
	cifNo?: string;
	personReporting: string;
	village?: string;
	subCounty?: string;
	contactNumber: string;
	sourceOfAlert: string;
	channelOfReporting?: string;
	alertCaseName: string;
	alertCaseAge: number;
	alertCaseSex: string;
	alertCasePregnantDuration?: number;
	alertCaseVillage?: string;
	alertCaseParish?: string;
	alertCaseSubCounty?: string;
	alertCaseDistrict?: string;
	alertCaseNationality?: string;
	pointOfContactName?: string;
	pointOfContactRelationship?: string;
	pointOfContactPhone?: string;
	history?: string;
	healthFacilityVisit?: string;
	traditionalHealerVisit?: string;
	symptoms?: string;
	actions?: string;
	caseVerificationDesk?: string;
	fieldVerification?: string;
	fieldVerificationDecision?: string;
	feedback?: string;
	labSamplesCollected?: string;
	labResult?: string;
	labResultDate?: string | null;
	isHighlighted?: boolean;
	assignedTo?: string;
	alertReportedBefore?: string;
	alertFrom?: string;
	verified?: string;
	comments?: string;
	verificationDate?: string | null;
	verificationTime?: string | null;
	response?: string;
	narrative?: string;
	facilityType?: string;
	facility?: string;
	isVerified?: boolean;
	verifiedBy?: string;
	region?: string;
	caseCode?: string;
	createdAt?: string;
	updatedAt?: string;
}

function looksLikeAlertRecord(record: Record<string, unknown>): boolean {
	return (
		record.id !== undefined ||
		record.ID !== undefined ||
		record.personReporting !== undefined ||
		record.person_reporting !== undefined ||
		record.alertCaseName !== undefined ||
		record.alert_case_name !== undefined
	);
}

/** Unwrap only when the payload is a wrapper, not a flat alert row with extra keys. */
function asAlertRecord(raw: unknown): Record<string, unknown> {
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
	const body = raw as Record<string, unknown>;

	if (looksLikeAlertRecord(body)) {
		return body;
	}

	const nested = (body.data ?? body.alert ?? body.item) as unknown;
	if (nested && typeof nested === "object" && !Array.isArray(nested)) {
		const nestedRecord = nested as Record<string, unknown>;
		if (looksLikeAlertRecord(nestedRecord)) {
			return nestedRecord;
		}
	}
	return body;
}

/** Normalize API alert payloads (wrapped body, snake_case, mixed types). */
export function normalizeAlertFromApi(raw: unknown): ApiAlert {
	const body = asAlertRecord(raw);
	const str = (value: unknown): string | undefined => {
		if (typeof value === "string") return value;
		if (value == null) return undefined;
		return String(value);
	};
	const num = (value: unknown): number | undefined => {
		if (typeof value === "number") return value;
		if (typeof value === "string" && value.trim() !== "") {
			const parsed = Number(value);
			return Number.isFinite(parsed) ? parsed : undefined;
		}
		return undefined;
	};
	const bool = (value: unknown): boolean | undefined => {
		if (typeof value === "boolean") return value;
		if (typeof value === "string") {
			if (value.toLowerCase() === "true") return true;
			if (value.toLowerCase() === "false") return false;
		}
		return undefined;
	};

	return {
		id: num(body.id ?? body.ID),
		status: str(body.status) ?? "Pending",
		date: str(body.date) ?? new Date().toISOString(),
		time: str(body.time) ?? new Date().toISOString(),
		callTaker: str(body.callTaker ?? body.call_taker),
		cifNo: str(body.cifNo ?? body.cif_no),
		personReporting: str(body.personReporting ?? body.person_reporting) ?? "",
		village: str(body.village),
		subCounty: str(body.subCounty ?? body.sub_county),
		contactNumber: str(body.contactNumber ?? body.contact_number) ?? "",
		sourceOfAlert: normalizeSourceOfAlert(
			str(body.sourceOfAlert ?? body.source_of_alert)
		),
		channelOfReporting: str(
			body.channelOfReporting ?? body.channel_of_reporting
		),
		alertCaseName: str(body.alertCaseName ?? body.alert_case_name) ?? "",
		alertCaseAge: num(body.alertCaseAge ?? body.alert_case_age) ?? 0,
		alertCaseSex: str(body.alertCaseSex ?? body.alert_case_sex) ?? "",
		alertCasePregnantDuration: num(
			body.alertCasePregnantDuration ?? body.alert_case_pregnant_duration
		),
		alertCaseVillage: str(body.alertCaseVillage ?? body.alert_case_village),
		alertCaseParish: str(body.alertCaseParish ?? body.alert_case_parish),
		alertCaseSubCounty: str(body.alertCaseSubCounty ?? body.alert_case_sub_county),
		alertCaseDistrict: str(body.alertCaseDistrict ?? body.alert_case_district),
		alertCaseNationality: str(
			body.alertCaseNationality ?? body.alert_case_nationality
		),
		pointOfContactName: str(
			body.pointOfContactName ?? body.point_of_contact_name
		),
		pointOfContactRelationship: str(
			body.pointOfContactRelationship ?? body.point_of_contact_relationship
		),
		pointOfContactPhone: str(
			body.pointOfContactPhone ?? body.point_of_contact_phone
		),
		history: str(body.history),
		healthFacilityVisit: str(
			body.healthFacilityVisit ?? body.health_facility_visit
		),
		traditionalHealerVisit: str(
			body.traditionalHealerVisit ?? body.traditional_healer_visit
		),
		symptoms: str(body.symptoms),
		caseVerificationDesk: str(
			body.caseVerificationDesk ??
				body.case_verification_desk ??
				body.deskVerificationActions ??
				body.desk_verification_actions
		),
		fieldVerificationDecision: str(
			body.fieldVerificationDecision ??
				body.field_verification_decision ??
				body.fieldVerificationFeedback ??
				body.field_verification_feedback
		),
		fieldVerification: str(
			body.fieldVerification ??
				body.field_verification ??
				body.fieldVerificationFeedback ??
				body.field_verification_feedback
		),
		actions: str(
			body.actions ??
				body.caseVerificationDesk ??
				body.case_verification_desk ??
				body.deskVerificationActions ??
				body.desk_verification_actions
		),
		feedback: str(body.feedback),
		labSamplesCollected: str(
			body.labSamplesCollected ?? body.lab_samples_collected
		),
		labResult: str(body.labResult ?? body.lab_result),
		labResultDate: str(body.labResultDate ?? body.lab_result_date) ?? null,
		isHighlighted: bool(body.isHighlighted ?? body.is_highlighted),
		assignedTo: str(body.assignedTo ?? body.assigned_to),
		alertReportedBefore: str(
			body.alertReportedBefore ?? body.alert_reported_before
		),
		alertFrom: str(body.alertFrom ?? body.alert_from),
		verified: str(body.verified),
		comments: str(body.comments),
		verificationDate:
			str(body.verificationDate ?? body.verification_date) ?? null,
		verificationTime:
			str(body.verificationTime ?? body.verification_time) ?? null,
		response: str(body.response),
		narrative: str(body.narrative),
		facilityType: str(body.facilityType ?? body.facility_type),
		facility: str(body.facility),
		isVerified: bool(body.isVerified ?? body.is_verified),
		verifiedBy: str(body.verifiedBy ?? body.verified_by),
		region: str(body.region),
		caseCode: str(body.caseCode ?? body.case_code),
		createdAt: str(body.createdAt ?? body.created_at),
		updatedAt: str(body.updatedAt ?? body.updated_at),
	};
}

export function normalizeAlertsList(rawItems: unknown[]): ApiAlert[] {
	return rawItems.map((item) => normalizeAlertFromApi(item));
}
