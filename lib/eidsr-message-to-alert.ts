import type { EidsrMessage } from "@/lib/eidsr-message-normalize";

/** Shape passed into AlertVerificationDialog for EIDSR SMS verify prefill. */
export function eidsrMessageToAlertShape(message: EidsrMessage): Record<string, unknown> {
	return {
		id: message.id,
		personReporting: message.personReporting,
		contactNumber: message.contactNumber,
		sourceOfAlert: message.sourceOfAlert,
		response: message.response,
		alertCaseName: message.alertCaseName,
		alertCaseAge: message.alertCaseAge ?? 0,
		alertCaseSex: message.alertCaseSex,
		alertCaseVillage: message.village,
		alertCaseDistrict: message.alertCaseDistrict,
		subCounty: message.subCounty,
		village: message.village,
		symptoms: message.symptoms,
		feedback: message.feedback,
		history: message.messageText,
		actions: message.actions,
		caseVerificationDesk: message.caseVerificationDesk,
		status: message.status,
		linkedAlertId: message.linkedAlertId,
		_eidsrMeta: {
			signalVerified: message.signalVerified,
			triage: message.triage,
			riskAssessmentLevel: message.riskAssessmentLevel,
			messageStatus: message.status,
		},
	};
}
