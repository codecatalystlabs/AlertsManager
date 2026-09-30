import type { EidsrEvent } from "@/lib/fetch-eidsr-events";
import type { EidsrMessage } from "@/lib/eidsr-message-normalize";
import { enrichEidsrMessage } from "@/lib/eidsr-message-normalize";
import { getEidsrDataValue } from "@/lib/eidsr-event-fields";
import { resolveAlertResponseCode } from "@/lib/resolve-alert-response";
import {
	pickAlertRef,
	pickLinkedAlertId,
} from "@/lib/eidsr-message-normalize";

/** "YYYY-MM-DD HH:mm" in the viewer's clock, or "" when unparseable. */
function formatReceived(value: string | undefined): string {
	if (!value) return "";
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return "";
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Map DHIS2 local event rows to the SMS message shape used by the 6767 UI.
 *
 * Rows read from eIDSR's SMS inbox (origin "sms") carry the message, the
 * sender's number and — when eIDSR knows the sender — their name and org unit,
 * but no location: the Location column then shows the reporter's district, and
 * Received shows when eIDSR received the SMS, to the minute.
 */
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
		linkedAlert: pickAlertRef(raw, "linkedAlert", "linked_alert"),
		forwardedAlertId: (() => {
			const n = Number(raw.forwardedAlertId ?? raw.forwarded_alert_id);
			return Number.isFinite(n) && n > 0 ? n : null;
		})(),
		forwardedAlert: pickAlertRef(raw, "forwardedAlert", "forwarded_alert"),
		forwardedToDistrict: event.forwardedToDistrict?.trim() || null,
		forwardedAt: event.forwardedAt || null,
		createdAt: event.createdAt || event.eventDate,
		receivedAt:
			(event.origin === "sms" && formatReceived(event.occurredAt)) ||
			event.eventDate ||
			event.updatedAt,
		alertCaseDistrict:
			getEidsrDataValue(event, "location") ||
			event.reporterDistrict?.trim() ||
			"",
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
