import { EIDSR_API_PATHS } from "@/constants/eidsr-alerts";
import { EIDSR_MESSAGES_API_PATHS } from "@/constants/eidsr-messages";
import { getClientApiBaseUrl } from "@/lib/api-config";

/** Ordered verify routes — first match wins. */
export function getEidsrVerifyEndpointPaths(
	messageId: number,
	eventLocalId: number = messageId
): string[] {
	return [
		EIDSR_MESSAGES_API_PATHS.verify(messageId),
		EIDSR_MESSAGES_API_PATHS.verifyAlt(messageId),
		EIDSR_API_PATHS.eventVerify(eventLocalId),
	];
}

export function buildEidsrVerifyUrls(
	messageId: number,
	eventLocalId: number = messageId
): string[] {
	const base = getClientApiBaseUrl();
	return getEidsrVerifyEndpointPaths(messageId, eventLocalId).map(
		(path) => `${base}${path}`
	);
}
