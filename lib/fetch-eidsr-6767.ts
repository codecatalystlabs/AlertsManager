import type { EidsrMessage } from "@/lib/eidsr-message-normalize";
import {
	fetchEidsrEventById,
	fetchEidsrEventsPage,
	getEidsrSyncStatus,
	refreshEidsrEvents,
	type EidsrEventsListParams,
	type EidsrSyncProgress,
	type EidsrSyncStart,
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
import { isEidsr6767LinkedToAlert } from "@/lib/eidsr-verified-state";
import { getClientApiBaseUrl } from "@/lib/api-config";
import { AuthService } from "@/lib/auth";
import { notifyAlertsChanged } from "@/lib/alerts-events";
import { EIDSR_MESSAGES_API_PATHS } from "@/constants/eidsr-messages";

export type EidsrDataSource = "messages" | "events";

export interface Eidsr6767ListResult {
	source: EidsrDataSource;
	messages: EidsrMessage[];
	pagination: PaginatedEidsrEventsResult;
}

/**
 * Start a 6767 sync (POST /eidsr/local/refresh). Returns immediately; the sync
 * runs in the background — poll getEidsr6767SyncStatus for progress. Incremental
 * by default; pass fullSync=true for a full re-scan.
 */
export async function syncEidsr6767(fullSync = false): Promise<EidsrSyncStart> {
	return refreshEidsrEvents(fullSync);
}

/** Live progress of the running/last 6767 sync. */
export function getEidsr6767SyncStatus(): Promise<EidsrSyncProgress> {
	return getEidsrSyncStatus();
}

export type { EidsrSyncProgress, EidsrSyncStart };

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

export interface MoveEidsr6767Result {
	alertId: number;
	/** The register row's ALT code, e.g. "ALT6316". */
	alertCode: string;
	district: string;
}

function moveErrorMessage(body: string, status: number): string {
	try {
		const j = JSON.parse(body) as {
			error?: string;
			message?: string;
			details?: string;
		};
		return (
			j.error ||
			j.message ||
			j.details ||
			`Failed to move signal into the register (HTTP ${status})`
		);
	} catch {
		return `Failed to move signal into the register (HTTP ${status})`;
	}
}

/**
 * Move a 6767 signal into the Signal Register: creates a register row (an alert
 * with its own ALT id) in the district the user chose, untriaged and ready to be
 * triaged.
 *
 * POST /eidsr/local/events/:id/move, falling back to the /messages alias and
 * then to the retired /forward paths, so a client running against an older
 * backend still works.
 */
export async function moveEidsr6767ToRegister(
	id: number,
	payload: { district: string; note?: string }
): Promise<MoveEidsr6767Result> {
	const base = getClientApiBaseUrl();
	const paths = [
		`/eidsr/local/events/${id}/move`,
		`/eidsr/local/messages/${id}/move`,
		`/eidsr/local/events/${id}/forward`,
		`/eidsr/local/messages/${id}/forward`,
	];

	let lastStatus = 404;
	let lastBody = "";
	for (const path of paths) {
		let response: Response;
		try {
			response = await AuthService.makeAuthenticatedRequest(
				`${base}${path}`,
				{ method: "POST", body: JSON.stringify(payload) }
			);
		} catch (error) {
			if (error instanceof TypeError) {
				throw new Error(
					"Cannot reach the API. If developing locally, ensure the backend is running."
				);
			}
			throw error;
		}

		if (response.ok) {
			const json = (await response.json().catch(() => ({}))) as {
				alertId?: number;
				alertCode?: string;
				district?: string;
			};
			const alertId = Number(json.alertId ?? 0);
			notifyAlertsChanged();
			return {
				alertId,
				alertCode: json.alertCode || (alertId ? `ALT${alertId}` : ""),
				district: json.district ?? payload.district,
			};
		}

		lastStatus = response.status;
		lastBody = await response.text().catch(() => "");
		// Try the next alias only when the path itself is missing. Anything else
		// (409 already-in-the-register, 400 no district) is the server's answer,
		// not a routing miss, and must surface as-is.
		if (response.status === 404 || response.status === 405) continue;
		throw new Error(moveErrorMessage(lastBody, response.status));
	}

	throw new Error(moveErrorMessage(lastBody, lastStatus));
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

	// Fallback only (the backend /stats endpoint is preferred): linked is counted
	// from the loaded page, so it's approximate when the dataset spans many pages.
	const total = eventsTotal ?? messages.length;
	const linked = messages.filter((m) => isEidsr6767LinkedToAlert(m)).length;
	return {
		totalMessages: total,
		linked,
		unlinked: Math.max(0, total - linked),
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
