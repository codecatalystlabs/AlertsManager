import type { EidsrEvent } from "@/lib/fetch-eidsr-events";
import type { EidsrMessage } from "@/lib/eidsr-message-normalize";
import { enrichEidsrMessage } from "@/lib/eidsr-message-normalize";
import { getEidsrDataValue } from "@/lib/eidsr-event-fields";
import { resolveAlertResponseCode } from "@/lib/resolve-alert-response";
import { pickLinkedAlertId } from "@/lib/eidsr-message-normalize";

/** Map DHIS2 local event rows to the SMS message shape used by the 6767 UI. */
export function eidsrEventToMessage(event: EidsrEvent): EidsrMessage {
	const raw = event as unknown as Record<string, unknown>;
	const ageStr = getEidsrDataValue(event, "age");
	const ageNum = ageStr ? Number(ageStr) : null;

	return enrichEidsrMessage({
		id: event.id,
		messageId: event.eventId || String(event.id),
		personReporting: getEidsrDataValue(event, "reporterName"),
		contactNumber: getEidsrDataValue(event, "phone"),
		messageText: getEidsrDataValue(event, "narrative"),
		status: event.status || getEidsrDataValue(event, "caseStatus"),
		isVerified: false,
		linkedAlertId: pickLinkedAlertId(raw),
		createdAt: event.createdAt || event.eventDate,
		receivedAt: event.eventDate || event.updatedAt,
		alertCaseDistrict: getEidsrDataValue(event, "location"),
		village: "",
		subCounty: "",
		symptoms: "",
		actions: "",
		feedback: "",
		sourceOfAlert: getEidsrDataValue(event, "source"),
		response: resolveAlertResponseCode(getEidsrDataValue(event, "disease")),
		alertCaseName: "",
		alertCaseAge:
			ageNum != null && !Number.isNaN(ageNum) ? ageNum : null,
		alertCaseSex: getEidsrDataValue(event, "sex"),
		verifiedBy: "",
		caseVerificationDesk: "",
		signalVerified:
			getEidsrDataValue(event, "verifiedFlag") ||
			getEidsrDataValue(event, "verificationStatus"),
		triage: "",
		riskAssessmentLevel: "",
		dataValues: { ...(event.dataValues ?? {}) },
		raw: event as unknown as Record<string, unknown>,
	});
}
