/** Normalize EIDSR SMS message records from mixed API field names. */

import {
	EIDSR_DATA_VALUE_FIELDS,
	type EidsrDataValueKey,
} from "@/lib/eidsr-event-fields";
import { resolveAlertResponseCode } from "@/lib/resolve-alert-response";
import { resolveEidsrVerifiedState } from "@/lib/eidsr-verified-state";

export interface EidsrMessage {
	id: number;
	messageId: string;
	personReporting: string;
	contactNumber: string;
	messageText: string;
	status: string;
	isVerified: boolean;
	linkedAlertId: number | null;
	createdAt: string;
	receivedAt: string;
	alertCaseDistrict: string;
	village: string;
	subCounty: string;
	symptoms: string;
	actions: string;
	feedback: string;
	sourceOfAlert: string;
	/** Disease / response type code (matches alertResponse.code). */
	response: string;
	alertCaseName: string;
	alertCaseAge: number | null;
	alertCaseSex: string;
	verifiedBy: string;
	caseVerificationDesk: string;
	signalVerified: string;
	triage: string;
	riskAssessmentLevel: string;
	dataValues: Record<string, string>;
	raw: Record<string, unknown>;
}

function pickString(
	obj: Record<string, unknown>,
	...keys: string[]
): string {
	for (const key of keys) {
		const v = obj[key];
		if (typeof v === "string" && v.trim()) return v.trim();
	}
	return "";
}

function pickNumber(
	obj: Record<string, unknown>,
	...keys: string[]
): number | null {
	for (const key of keys) {
		const v = obj[key];
		if (typeof v === "number" && !Number.isNaN(v)) return v;
		if (typeof v === "string" && v.trim() !== "") {
			const n = Number(v);
			if (!Number.isNaN(n)) return n;
		}
	}
	return null;
}

function pickBool(obj: Record<string, unknown>, ...keys: string[]): boolean {
	for (const key of keys) {
		const v = obj[key];
		if (v === true || v === 1 || v === "1" || v === "true") return true;
		if (v === false || v === 0 || v === "0" || v === "false") return false;
	}
	return false;
}

export function pickLinkedAlertId(obj: Record<string, unknown>): number | null {
	const v =
		obj.linkedAlertId ??
		obj.linked_alert_id ??
		obj.alertId ??
		obj.alert_id;
	if (v == null || v === "") return null;
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
}

function normalizeDataValues(
	raw: Record<string, unknown>
): Record<string, string> {
	const dv = raw.dataValues ?? raw.data_values ?? raw.data;
	if (!dv || typeof dv !== "object") return {};
	if (Array.isArray(dv)) {
		const out: Record<string, string> = {};
		for (const item of dv) {
			if (!item || typeof item !== "object") continue;
			const row = item as Record<string, unknown>;
			const key = String(
				row.dataElement ??
					row.data_element ??
					row.element ??
					row.name ??
					""
			);
			const val = row.value ?? row.displayValue ?? row.display_value;
			if (key) out[key] = val != null ? String(val) : "";
		}
		return out;
	}
	const map = dv as Record<string, unknown>;
	const out: Record<string, string> = {};
	for (const [k, v] of Object.entries(map)) {
		out[k] = v != null ? String(v) : "";
	}
	return out;
}

function dataValue(
	dataValues: Record<string, string>,
	...keys: string[]
): string {
	for (const key of keys) {
		const v = dataValues[key];
		if (v?.trim()) return v.trim();
	}
	return "";
}

/** Read a 6767 program field from DHIS2 element-id keyed dataValues. */
export function dataValueByProgramField(
	dataValues: Record<string, string>,
	field: EidsrDataValueKey
): string {
	return dataValues[EIDSR_DATA_VALUE_FIELDS[field]]?.trim() ?? "";
}

/** Fill display/edit fields from dataValues when top-level props are empty. */
export function enrichEidsrMessage(message: EidsrMessage): EidsrMessage {
	const dv = message.dataValues ?? {};
	let enriched = message;

	if (Object.keys(dv).length > 0) {
		const ageFromDv = dataValueByProgramField(dv, "age");
		const ageNum =
			message.alertCaseAge ??
			(ageFromDv && !Number.isNaN(Number(ageFromDv))
				? Number(ageFromDv)
				: null);

		enriched = {
			...message,
			personReporting:
				message.personReporting ||
				dataValueByProgramField(dv, "reporterName"),
			contactNumber:
				message.contactNumber || dataValueByProgramField(dv, "phone"),
			messageText:
				message.messageText || dataValueByProgramField(dv, "narrative"),
			status:
				message.status || dataValueByProgramField(dv, "caseStatus"),
			sourceOfAlert:
				message.sourceOfAlert || dataValueByProgramField(dv, "source"),
			response:
				message.response ||
				resolveAlertResponseCode(
					dataValueByProgramField(dv, "disease")
				),
			alertCaseName: message.alertCaseName,
			alertCaseAge: ageNum,
			alertCaseSex:
				message.alertCaseSex || dataValueByProgramField(dv, "sex"),
			alertCaseDistrict:
				message.alertCaseDistrict ||
				dataValueByProgramField(dv, "location"),
			symptoms:
				message.symptoms ||
				dataValueByProgramField(dv, "notes") ||
				dataValue(dv, "symptoms"),
			feedback: message.feedback || dataValue(dv, "feedback"),
			signalVerified:
				message.signalVerified ||
				dataValueByProgramField(dv, "verifiedFlag") ||
				dataValueByProgramField(dv, "verificationStatus"),
		};
	}

	return {
		...enriched,
		...resolveEidsrVerifiedState({
			linkedAlertId: enriched.linkedAlertId,
			raw: enriched.raw,
			dataValues: enriched.dataValues,
			signalVerified: enriched.signalVerified,
			isVerified: enriched.isVerified,
		}),
	};
}

export function mergeEidsrMessages(
	base: EidsrMessage,
	overlay: EidsrMessage
): EidsrMessage {
	return enrichEidsrMessage({
		...base,
		...overlay,
		dataValues: { ...base.dataValues, ...overlay.dataValues },
		raw: { ...base.raw, ...overlay.raw },
	});
}

export type EidsrMessageEditForm = {
	personReporting: string;
	contactNumber: string;
	messageText: string;
	status: string;
	alertCaseDistrict: string;
	village: string;
	subCounty: string;
	symptoms: string;
	actions: string;
	feedback: string;
	sourceOfAlert: string;
	response: string;
	alertCaseName: string;
	alertCaseAge: string;
	alertCaseSex: string;
};

export function eidsrMessageToEditForm(message: EidsrMessage): EidsrMessageEditForm {
	const m = enrichEidsrMessage(message);
	return {
		personReporting: m.personReporting,
		contactNumber: m.contactNumber,
		messageText: m.messageText,
		status: m.status,
		alertCaseDistrict: m.alertCaseDistrict,
		village: m.village,
		subCounty: m.subCounty,
		symptoms: m.symptoms,
		actions: m.actions,
		feedback: m.feedback,
		sourceOfAlert: m.sourceOfAlert,
		response: m.response,
		alertCaseName: m.alertCaseName,
		alertCaseAge: m.alertCaseAge != null ? String(m.alertCaseAge) : "",
		alertCaseSex: m.alertCaseSex,
	};
}

export function asEidsrMessage(input: unknown): EidsrMessage | null {
	if (!input || typeof input !== "object") return null;
	const raw = input as Record<string, unknown>;
	const id = Number(
		raw.id ??
			raw.message_id ??
			raw.messageId ??
			raw.localId ??
			raw.local_id ??
			raw.eventId
	);
	if (!Number.isFinite(id) || id <= 0) return null;

	const dataValues = normalizeDataValues(raw);

	const personReporting =
		pickString(raw, "personReporting", "person_reporting", "reporter") ||
		dataValue(dataValues, "personReporting", "reporterName", "reporter") ||
		dataValueByProgramField(dataValues, "reporterName");
	const contactNumber =
		pickString(raw, "contactNumber", "contact_number", "phone") ||
		dataValue(dataValues, "contactNumber", "phone", "phoneNumber") ||
		dataValueByProgramField(dataValues, "phone");
	const messageText =
		pickString(
			raw,
			"messageText",
			"message_text",
			"text",
			"narrative",
			"message"
		) ||
		dataValue(dataValues, "narrative", "messageText", "message") ||
		dataValueByProgramField(dataValues, "narrative");
	return enrichEidsrMessage({
		id,
		messageId:
			pickString(raw, "messageId", "message_id", "smsId", "sms_id") ||
			String(id),
		personReporting,
		contactNumber,
		messageText,
		status:
			pickString(raw, "status", "messageStatus", "message_status") ||
			dataValueByProgramField(dataValues, "caseStatus"),
		isVerified: pickBool(raw, "isVerified", "is_verified"),
		linkedAlertId: pickLinkedAlertId(raw),
		createdAt: pickString(
			raw,
			"createdAt",
			"created_at",
			"receivedAt",
			"received_at"
		),
		receivedAt: pickString(
			raw,
			"receivedAt",
			"received_at",
			"createdAt",
			"created_at"
		),
		alertCaseDistrict:
			pickString(
				raw,
				"alertCaseDistrict",
				"alert_case_district",
				"district"
			) ||
			dataValue(dataValues, "district", "alertCaseDistrict") ||
			dataValueByProgramField(dataValues, "location"),
		village:
			pickString(raw, "village", "alertCaseVillage", "alert_case_village") ||
			dataValue(dataValues, "village", "location"),
		subCounty: pickString(raw, "subCounty", "sub_county"),
		symptoms:
			pickString(raw, "symptoms") ||
			dataValue(dataValues, "symptoms") ||
			dataValueByProgramField(dataValues, "notes"),
		actions: pickString(raw, "actions"),
		feedback: pickString(raw, "feedback"),
		sourceOfAlert:
			pickString(raw, "sourceOfAlert", "source_of_alert") ||
			dataValueByProgramField(dataValues, "source"),
		response:
			pickString(raw, "response", "disease", "diseaseCode") ||
			resolveAlertResponseCode(
				pickString(raw, "alertCaseName", "alert_case_name") ||
					dataValueByProgramField(dataValues, "disease")
			),
		alertCaseName:
			pickString(
				raw,
				"alertCaseName",
				"alert_case_name",
				"caseName",
				"patientName",
				"patient_name"
			) || dataValue(dataValues, "patientName", "caseName"),
		alertCaseAge:
			pickNumber(raw, "alertCaseAge", "alert_case_age", "age") ??
			(() => {
				const a = dataValueByProgramField(dataValues, "age");
				const n = Number(a);
				return a && !Number.isNaN(n) ? n : null;
			})(),
		alertCaseSex:
			pickString(raw, "alertCaseSex", "alert_case_sex", "sex") ||
			dataValueByProgramField(dataValues, "sex"),
		verifiedBy: pickString(raw, "verifiedBy", "verified_by"),
		caseVerificationDesk: pickString(
			raw,
			"caseVerificationDesk",
			"case_verification_desk"
		),
		signalVerified:
			pickString(raw, "signalVerified", "signal_verified") ||
			dataValueByProgramField(dataValues, "verifiedFlag"),
		triage: pickString(raw, "triage"),
		riskAssessmentLevel: pickString(
			raw,
			"riskAssessmentLevel",
			"risk_assessment_level"
		),
		dataValues,
		raw,
	});
}

export function asEidsrMessageList(json: unknown): EidsrMessage[] {
	if (!json) return [];
	const items = Array.isArray(json)
		? json
		: (() => {
				const body = json as Record<string, unknown>;
				return (body.data ??
					body.messages ??
					body.items ??
					[]) as unknown[];
			})();
	return items
		.map((item) => asEidsrMessage(item))
		.filter((m): m is EidsrMessage => m != null);
}

/** ID for POST /eidsr/local/messages/{id}/verify (SMS local id when present). */
export function resolveEidsrVerifyId(message: EidsrMessage): number {
	const raw = message.raw;
	const candidates = [
		raw.smsMessageId,
		raw.sms_message_id,
		raw.messageLocalId,
		raw.message_local_id,
		message.id,
	];
	for (const c of candidates) {
		const n = Number(c);
		if (Number.isFinite(n) && n > 0) return n;
	}
	return message.id;
}

export function formatEidsrMessageStatLabel(key: string): string {
	const normalized = key.replace(/_/g, " ");
	return (
		key
			.replace(/([A-Z])/g, " $1")
			.replace(/^./, (s) => s.toUpperCase())
			.trim() || normalized
	);
}
