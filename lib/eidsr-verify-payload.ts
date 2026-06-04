import type { EidsrMessageVerifyPayload } from "@/lib/fetch-eidsr-messages";

export function buildEidsrVerifyPayload(
	formData: Record<string, unknown>,
	eidsrMeta?: {
		signalVerified?: string;
		triage?: string;
		riskAssessmentLevel?: string;
	}
): EidsrMessageVerifyPayload {
	const verificationDate = new Date(String(formData.verificationDate));
	const verificationTime = new Date();
	const timeStr = String(formData.verificationTime ?? "");
	const [hours, minutes] = timeStr.split(":");
	if (hours != null && minutes != null) {
		verificationTime.setHours(
			parseInt(hours, 10),
			parseInt(minutes, 10),
			0,
			0
		);
	}

	const deskAction = String(
		formData.deskVerificationActions || formData.actions || ""
	);
	const fieldFeedback = String(formData.fieldVerificationFeedback || "");

	const payload: EidsrMessageVerifyPayload = {
		status: String(formData.status || "") || undefined,
		verificationDate: verificationDate.toISOString(),
		verificationTime: verificationTime.toISOString(),
		personReporting: String(formData.personReporting || "") || undefined,
		contactNumber: String(formData.contactNumber || "") || undefined,
		sourceOfAlert: String(formData.sourceOfAlert || "") || undefined,
		response: String(formData.response || "") || undefined,
		alertCaseName: String(formData.alertCaseName || "") || undefined,
		alertCaseSex: String(formData.alertCaseSex || "") || undefined,
		alertCaseDistrict: String(formData.alertCaseDistrict || "") || undefined,
		village: String(formData.village || formData.alertCaseVillage || "") || undefined,
		subCounty: String(formData.subCounty || "") || undefined,
		symptoms: String(formData.symptoms || "") || undefined,
		actions: deskAction || undefined,
		feedback:
			String(formData.feedback || fieldFeedback || "") || undefined,
		verifiedBy: String(formData.verifiedBy || "") || undefined,
		caseVerificationDesk: deskAction || undefined,
		signalVerified: eidsrMeta?.signalVerified || undefined,
		triage: eidsrMeta?.triage || undefined,
		riskAssessmentLevel: eidsrMeta?.riskAssessmentLevel || undefined,
		history: String(formData.history || "") || undefined,
		cifNo: String(formData.cifNo || "") || undefined,
		alertCaseVillage: String(formData.alertCaseVillage || "") || undefined,
		alertCaseParish: String(formData.alertCaseParish || "") || undefined,
		alertCaseSubCounty: String(formData.alertCaseSubCounty || "") || undefined,
		alertCaseNationality: String(formData.alertCaseNationality || "") || undefined,
		pointOfContactName: String(formData.pointOfContactName || "") || undefined,
		pointOfContactRelationship:
			String(formData.pointOfContactRelationship || "") || undefined,
		pointOfContactPhone: String(formData.pointOfContactPhone || "") || undefined,
		healthFacilityVisit: String(formData.healthFacilityVisit || "") || undefined,
		traditionalHealerVisit:
			String(formData.traditionalHealerVisit || "") || undefined,
		deskVerificationActions: deskAction || undefined,
		fieldVerificationFeedback: fieldFeedback || undefined,
		fieldVerification: fieldFeedback || undefined,
		fieldVerificationDecision: fieldFeedback || undefined,
		isVerified: true,
	};

	const age = formData.alertCaseAge;
	if (typeof age === "number" && !Number.isNaN(age) && age > 0) {
		payload.alertCaseAge = age;
	}

	return payload;
}
