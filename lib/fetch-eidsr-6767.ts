import type { EidsrMessage } from "@/lib/eidsr-message-normalize";
import {
	fetchEidsrEventById,
	fetchEidsrEventsPage,
	refreshEidsrEvents,
	type EidsrEventsListParams,
	type PaginatedEidsrEventsResult,
} from "@/lib/fetch-eidsr-events";
import {
	EidsrMessagesFetchError,
	getEidsrMessage,
	getEidsrMessageOptions,
	getEidsrMessageStats,
	type EidsrMessageOptions,
} from "@/lib/fetch-eidsr-messages";
import { eidsrEventToMessage } from "@/lib/eidsr-event-to-message";
import { isEidsr6767Verified } from "@/lib/eidsr-verified-state";
import { getClientApiBaseUrl } from "@/lib/api-config";
import { AuthService } from "@/lib/auth";
import { EIDSR_MESSAGES_API_PATHS } from "@/constants/eidsr-messages";

export type EidsrDataSource = "messages" | "events";

export interface Eidsr6767ListResult {
	source: EidsrDataSource;
	messages: EidsrMessage[];
	pagination: PaginatedEidsrEventsResult;
}

/** Sync 6767 data via POST /eidsr/local/refresh */
export async function syncEidsr6767(): Promise<void> {
	await refreshEidsrEvents(true);
}

/** Table list always uses GET /eidsr/local/events (paginated). */
export async function listEidsr6767(
	params: EidsrEventsListParams = {}
): Promise<Eidsr6767ListResult> {
	const pageResult = await fetchEidsrEventsPage(params);
	return {
		source: "events",
		messages: pageResult.data.map(eidsrEventToMessage),
		pagination: pageResult,
	};
}

/** GET /eidsr/local/messages/:id, falling back to /eidsr/local/events/:id */
export async function getEidsr6767ById(id: number): Promise<{
	source: EidsrDataSource;
	message: EidsrMessage;
}> {
	try {
		return { source: "messages", message: await getEidsrMessage(id) };
	} catch (err) {
		if (err instanceof EidsrMessagesFetchError && err.status === 404) {
			const event = await fetchEidsrEventById(id);
			return { source: "events", message: eidsrEventToMessage(event) };
		}
		throw err;
	}
}

export async function getEidsr6767Stats(
	messages: EidsrMessage[],
	eventsTotal?: number
): Promise<Record<string, number>> {
	try {
		const stats = await getEidsrMessageStats();
		if (Object.keys(stats).length > 0) return stats;
	} catch {
		/* use events totals */
	}

	const total = eventsTotal ?? messages.length;
	const linked = messages.filter((m) => isEidsr6767Verified(m)).length;
	return {
		total,
		totalMessages: total,
		linked,
		verified: linked,
		unlinked: Math.max(0, total - linked),
		unverified: Math.max(0, total - linked),
	};
}

export async function getEidsr6767Options(): Promise<EidsrMessageOptions> {
	try {
		return await getEidsrMessageOptions();
	} catch {
		return {};
	}
}

/** SMS GET/PUT/verify routes available (stats or options endpoint exists). */
export async function probeEidsrSmsApi(): Promise<boolean> {
	const base = getClientApiBaseUrl();
	try {
		const response = await AuthService.makeAuthenticatedRequest(
			`${base}${EIDSR_MESSAGES_API_PATHS.stats}`,
			{ method: "GET" }
		);
		return response.status !== 404;
	} catch {
		return false;
	}
}
