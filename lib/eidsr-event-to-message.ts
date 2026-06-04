import type { EidsrEvent } from "@/lib/fetch-eidsr-events";
import type { EidsrMessage } from "@/lib/eidsr-message-normalize";
import { enrichEidsrMessage } from "@/lib/eidsr-message-normalize";
import { getEidsrDataValue } from "@/lib/eidsr-event-fields";

/** Map DHIS2 local event rows to the SMS message shape used by the 6767 UI. */
export function eidsrEventToMessage(event: EidsrEvent): EidsrMessage {
	const linkedRaw =
		event.dataValues?.linkedAlertId ??
		event.dataValues?.linked_alert_id;
	const linked =
		linkedRaw != null && linkedRaw !== ""
			? Number(linkedRaw)
			: null;
	const linkedAlertId =
		linked != null && Number.isFinite(linked) ? linked : null;

	const ageStr = getEidsrDataValue(event, "age");
	const ageNum = ageStr ? Number(ageStr) : null;

	return enrichEidsrMessage({
		id: event.id,
		messageId: event.eventId || String(event.id),
		personReporting: getEidsrDataValue(event, "reporterName"),
		contactNumber: getEidsrDataValue(event, "phone"),
		messageText: getEidsrDataValue(event, "narrative"),
		status: event.status || getEidsrDataValue(event, "caseStatus"),
		isVerified: linkedAlertId != null,
		linkedAlertId,
		createdAt: event.createdAt || event.eventDate,
		receivedAt: event.eventDate || event.updatedAt,
		alertCaseDistrict: getEidsrDataValue(event, "location"),
		village: "",
		subCounty: "",
		symptoms: "",
		actions: "",
		feedback: "",
		sourceOfAlert: getEidsrDataValue(event, "source"),
		alertCaseName: getEidsrDataValue(event, "disease"),
		alertCaseAge:
			ageNum != null && !Number.isNaN(ageNum) ? ageNum : null,
		alertCaseSex: getEidsrDataValue(event, "sex"),
		verifiedBy: "",
		caseVerificationDesk: "",
		signalVerified: getEidsrDataValue(event, "verifiedFlag"),
		triage: "",
		riskAssessmentLevel: "",
		dataValues: { ...(event.dataValues ?? {}) },
		raw: event as unknown as Record<string, unknown>,
	});
}
