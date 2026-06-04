import { AuthService } from "@/lib/auth";
import { getClientApiBaseUrl } from "@/lib/api-config";
import {
	formatEidsrFetchError,
	formatEidsrVerifyFetchError,
} from "@/lib/api-errors";
import { EIDSR_MESSAGES_API_PATHS } from "@/constants/eidsr-messages";
import {
	buildEidsrVerifyUrls,
	getEidsrVerifyEndpointPaths,
} from "@/lib/eidsr-verify-endpoints";
import {
	asEidsrMessage,
	asEidsrMessageList,
	mergeEidsrMessages,
	type EidsrMessage,
} from "@/lib/eidsr-message-normalize";
import { invalidateAlertsCache } from "@/lib/alerts-cache";

export class EidsrMessagesFetchError extends Error {
	constructor(
		message: string,
		readonly status?: number
	) {
		super(message);
		this.name = "EidsrMessagesFetchError";
	}
}

export type EidsrMessageVerifyPayload = {
	status?: string;
	verificationDate?: string;
	verificationTime?: string;
	personReporting?: string;
	contactNumber?: string;
	sourceOfAlert?: string;
	response?: string;
	alertCaseName?: string;
	alertCaseAge?: number;
	alertCaseSex?: string;
	alertCaseDistrict?: string;
	village?: string;
	subCounty?: string;
	symptoms?: string;
	actions?: string;
	feedback?: string;
	verifiedBy?: string;
	caseVerificationDesk?: string;
	signalVerified?: string;
	triage?: string;
	riskAssessmentLevel?: string;
	cifNo?: string;
	history?: string;
	healthFacilityVisit?: string;
	traditionalHealerVisit?: string;
	alertCaseVillage?: string;
	alertCaseParish?: string;
	alertCaseSubCounty?: string;
	alertCaseNationality?: string;
	pointOfContactName?: string;
	pointOfContactRelationship?: string;
	pointOfContactPhone?: string;
	deskVerificationActions?: string;
	fieldVerificationFeedback?: string;
	fieldVerification?: string;
	fieldVerificationDecision?: string;
	isVerified?: boolean;
};

export interface EidsrMessagesListParams {
	all?: boolean;
	page?: number;
	limit?: number;
}

export interface EidsrMessageVerifyResult {
	message?: { linkedAlertId?: number };
	alert?: { isVerified?: boolean };
	alertId?: number;
}

export type EidsrMessageOptions = Record<string, string[] | string>;

async function requestEidsrMessages<T>(
	url: string,
	init?: RequestInit
): Promise<T> {
	let response: Response;

	try {
		response = await AuthService.makeAuthenticatedRequest(url, init);
	} catch (error) {
		if (error instanceof TypeError) {
			throw new EidsrMessagesFetchError(
				"Cannot reach the API. If developing locally, ensure the backend is running."
			);
		}
		throw error;
	}

	if (!response.ok) {
		const bodyText = await response.text().catch(() => "");
		throw new EidsrMessagesFetchError(
			formatEidsrFetchError(response.status, response.statusText, bodyText),
			response.status
		);
	}

	if (response.status === 204) {
		return undefined as T;
	}

	return response.json() as Promise<T>;
}

function apiUrl(path: string, query?: Record<string, string>): string {
	const base = getClientApiBaseUrl();
	if (!query || Object.keys(query).length === 0) {
		return `${base}${path}`;
	}
	const search = new URLSearchParams(query).toString();
	return `${base}${path}?${search}`;
}

function unwrapMessage(
	json: unknown,
	fallbackId?: number,
	fallback?: Partial<EidsrMessage>
): EidsrMessage {
	const candidates: unknown[] = [];
	if (Array.isArray(json)) {
		candidates.push(...json);
	} else if (json && typeof json === "object") {
		const body = json as Record<string, unknown>;
		candidates.push(
			json,
			body.message,
			body.data,
			body.item,
			body.event,
			body.record
		);
	}

	for (const candidate of candidates) {
		if (!candidate || typeof candidate !== "object") continue;
		const msg = asEidsrMessage(candidate);
		if (msg) return msg;
	}

	if (fallbackId != null && fallback) {
		const merged = asEidsrMessage({
			id: fallbackId,
			...fallback,
			...(json && typeof json === "object" ? json : {}),
		});
		if (merged) return merged;
	}

	if (fallbackId != null) {
		const minimal = asEidsrMessage({ id: fallbackId, ...(fallback ?? {}) });
		if (minimal) return minimal;
	}

	throw new EidsrMessagesFetchError("Invalid message response");
}

/** POST /eidsr/local/messages/sync */
export async function syncEidsrMessages(): Promise<void> {
	await requestEidsrMessages<void>(
		apiUrl(EIDSR_MESSAGES_API_PATHS.sync),
		{ method: "POST", body: JSON.stringify({}) }
	);
}

/** GET /eidsr/local/messages */
export async function getEidsrMessages(
	params: EidsrMessagesListParams = { all: true }
): Promise<EidsrMessage[]> {
	const query: Record<string, string> = {};
	if (params.all !== false) query.all = "true";
	if (params.page != null) query.page = String(params.page);
	if (params.limit != null) query.limit = String(params.limit);

	const json = await requestEidsrMessages<unknown>(
		apiUrl(EIDSR_MESSAGES_API_PATHS.messages, query)
	);
	return asEidsrMessageList(json);
}

/** GET /eidsr/local/messages/:id */
export async function getEidsrMessage(id: number): Promise<EidsrMessage> {
	const json = await requestEidsrMessages<unknown>(
		apiUrl(EIDSR_MESSAGES_API_PATHS.messageById(id))
	);
	return unwrapMessage(json, id);
}

/** PUT /eidsr/local/messages/:id */
export async function updateEidsrMessage(
	id: number,
	payload: Record<string, unknown>,
	fallback?: EidsrMessage
): Promise<EidsrMessage> {
	const json = await requestEidsrMessages<unknown>(
		apiUrl(EIDSR_MESSAGES_API_PATHS.messageById(id)),
		{
			method: "PUT",
			body: JSON.stringify(payload),
		}
	);
	try {
		return unwrapMessage(json, id, { ...fallback, ...payload } as Partial<EidsrMessage>);
	} catch {
		if (fallback) {
			const overlay = asEidsrMessage({ id, ...payload });
			if (overlay) return mergeEidsrMessages(fallback, overlay);
			return mergeEidsrMessages(fallback, { ...fallback, id });
		}
		throw new EidsrMessagesFetchError("Invalid message response");
	}
}

/**
 * POST verify into alerts — JWT only, no token in body.
 * Tries in order:
 * 1. /eidsr/local/messages/:messageId/verify
 * 2. /eidsr/local/messages/verify/:messageId
 * 3. /eidsr/local/events/:eventLocalId/verify
 */
export async function verifyEidsrMessage(
	messageId: number,
	payload: EidsrMessageVerifyPayload,
	eventLocalId: number = messageId
): Promise<EidsrMessageVerifyResult> {
	const urls = buildEidsrVerifyUrls(messageId, eventLocalId);
	const triedRoutes = getEidsrVerifyEndpointPaths(messageId, eventLocalId).map(
		(p) => `POST /api/v1${p}`
	);

	let lastStatus = 404;
	let lastStatusText = "Not Found";
	let lastBody = "";

	for (const url of urls) {
		let response: Response;

		try {
			response = await AuthService.makeAuthenticatedRequest(url, {
				method: "POST",
				body: JSON.stringify(payload),
			});
		} catch (error) {
			if (error instanceof TypeError) {
				throw new EidsrMessagesFetchError(
					"Cannot reach the API. If developing locally, ensure the backend is running."
				);
			}
			throw error;
		}

		if (response.ok) {
			const json = (await response.json()) as EidsrMessageVerifyResult;
			invalidateAlertsCache();
			return json ?? {};
		}

		const bodyText = await response.text().catch(() => "");
		lastStatus = response.status;
		lastStatusText = response.statusText;
		lastBody = bodyText;

		// Try next route when this path is not registered
		if (response.status === 404 || response.status === 405) {
			continue;
		}

		throw new EidsrMessagesFetchError(
			formatEidsrVerifyFetchError(
				response.status,
				response.statusText,
				bodyText,
				messageId
			),
			response.status
		);
	}

	throw new EidsrMessagesFetchError(
		formatEidsrVerifyFetchError(
			lastStatus,
			lastStatusText,
			lastBody,
			messageId,
			triedRoutes
		),
		lastStatus
	);
}

/** DELETE /eidsr/local/messages/:id */
export async function deleteEidsrMessage(id: number): Promise<void> {
	await requestEidsrMessages<void>(
		apiUrl(EIDSR_MESSAGES_API_PATHS.messageById(id)),
		{ method: "DELETE" }
	);
}

/** GET /eidsr/local/messages/stats */
export async function getEidsrMessageStats(): Promise<
	Record<string, number>
> {
	const json = await requestEidsrMessages<unknown>(
		apiUrl(EIDSR_MESSAGES_API_PATHS.stats)
	);
	if (!json || typeof json !== "object") return {};
	const body = json as Record<string, unknown>;
	const stats = (body.stats ?? body.data ?? json) as Record<string, unknown>;
	const out: Record<string, number> = {};
	for (const [key, value] of Object.entries(stats)) {
		if (typeof value === "number" && !Number.isNaN(value)) {
			out[key] = value;
		} else if (typeof value === "string" && value.trim() !== "") {
			const n = Number(value);
			if (!Number.isNaN(n)) out[key] = n;
		}
	}
	return out;
}

/** GET /eidsr/local/messages/options */
export async function getEidsrMessageOptions(): Promise<EidsrMessageOptions> {
	const json = await requestEidsrMessages<unknown>(
		apiUrl(EIDSR_MESSAGES_API_PATHS.options)
	);
	if (!json || typeof json !== "object") return {};
	const body = json as Record<string, unknown>;
	const opts = (body.options ?? body.data ?? json) as Record<string, unknown>;
	const out: EidsrMessageOptions = {};
	for (const [key, value] of Object.entries(opts)) {
		if (Array.isArray(value)) {
			out[key] = value.map(String);
		} else if (typeof value === "string") {
			out[key] = value;
		}
	}
	return out;
}
