import { AuthService } from "@/lib/auth";
import { getClientApiBaseUrl } from "@/lib/api-config";
import { formatAlertsFetchError } from "@/lib/api-errors";

/**
 * Signal traceability: the lifecycle timeline of one alert. Each event is an
 * append-only record of a transition (created / forwarded / verified / …) carrying
 * the actor and the exact time it happened. Backed by GET /alerts/{id}/history.
 */

export interface AlertHistoryEvent {
	id: number;
	/** Stable action slug: created | forwarded | desk_verified | verified | updated | discarded | deleted. */
	action: string;
	/** JSON string of salient details (origin, district, outcome, by, note…). Parsed by the UI. */
	detail?: string;
	/** Resolved username of the authenticated actor; empty for public (create/verify) actions. */
	actor?: string;
	/** RFC3339 timestamp of the transition. */
	timestamp: string;
}

/** GET /alerts/{id}/history — chronological (oldest-first) lifecycle events. */
export async function fetchAlertHistory(
	alertId: number
): Promise<AlertHistoryEvent[]> {
	const url = `${getClientApiBaseUrl()}/alerts/${alertId}/history`;

	let response: Response;
	try {
		response = await AuthService.makeAuthenticatedRequest(url);
	} catch (error) {
		if (error instanceof TypeError) {
			throw new Error(
				"Cannot reach the API server. Confirm the backend is online and reachable, then retry."
			);
		}
		throw error;
	}

	if (!response.ok) {
		const bodyText = await response.text().catch(() => "");
		throw new Error(
			formatAlertsFetchError(response.status, response.statusText, bodyText)
		);
	}

	const json = (await response.json()) as { events?: AlertHistoryEvent[] } | null;
	return json?.events ?? [];
}

/** Parsed detail bag (all optional — depends on the action). */
export interface AlertHistoryDetail {
	origin?: string;
	source?: string;
	district?: string;
	outcome?: string;
	field?: string;
	status?: string;
	channel?: string;
	reporter?: string;
	caseName?: string;
	note?: string;
	by?: string;
}

/** Safely parse the JSON detail blob; returns {} on absent/invalid detail. */
export function parseHistoryDetail(detail?: string): AlertHistoryDetail {
	if (!detail) return {};
	try {
		return JSON.parse(detail) as AlertHistoryDetail;
	} catch {
		return {};
	}
}
