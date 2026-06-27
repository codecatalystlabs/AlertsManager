import { AuthService } from "@/lib/auth";
import { getClientApiBaseUrl } from "@/lib/api-config";
import { notifyAlertsChanged } from "@/lib/alerts-events";
import type { EidsrMessageVerifyPayload } from "@/lib/fetch-eidsr-messages";

export class NdwFetchError extends Error {
	constructor(
		message: string,
		readonly status?: number
	) {
		super(message);
		this.name = "NdwFetchError";
	}
}

export interface NdwSyncProgress {
	running: boolean;
	source: string;
	phase: string;
	incremental: boolean;
	page: number;
	pageCount: number;
	remoteTotal: number;
	scanned: number;
	imported: number;
	updated: number;
	skipped: number;
	startedAt?: string;
	endedAt?: string;
	error?: string;
	message?: string;
}

export interface NdwPagination {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

/**
 * Live snapshot of the call-log alert an eCHIS/POE signal was forwarded into, so
 * the table can show the downstream verification outcome. Shape matches the
 * backend models.ForwardedAlertRef and is accepted by AlertVerifyChip.
 */
export interface ForwardedAlertRef {
	id: number;
	isVerified: boolean;
	status?: string;
	verifiedBy?: string;
	verificationDate?: string;
	district?: string;
}

export interface EchisAlertRow {
	id: number;
	recordHash?: string;
	date?: string;
	district: string;
	county: string;
	subCounty: string;
	healthFacility: string;
	parish: string;
	village: string;
	vhtName: string;
	vhtPhone: string;
	verificationStatus: string;
	personInVhtArea: string;
	briefDescription: string;
	additionalInformation: string;
	createdAt?: string;
	updatedAt?: string;
	rawPayload?: string;
	live?: boolean;
	// Verify-into-alerts tracking (the verified call-log alert this signal became).
	linkedAlertId?: number;
	linkedAlert?: ForwardedAlertRef;
	// Forward-to-district tracking (most recent forward).
	forwardedAlertId?: number;
	forwardedToDistrict?: string;
	forwardedAt?: string;
	forwardedAlert?: ForwardedAlertRef;
}

export interface PoeAlertRow {
	id: number;
	externalSourceId: number;
	refCode: string;
	fullName: string;
	passportNumber: string;
	nationality: string;
	nationalityCode: string;
	portOfEntry: string;
	arrivalDate?: string;
	flightNumber: string;
	countryOfEmbarkation: string;
	riskLevel: string;
	riskBand: string;
	riskScore: number;
	sex: string;
	phoneUganda: string;
	email: string;
	symptomsText: string;
	symptomCount: number;
	isVerified: boolean;
	createdAtRemote?: string;
	updatedAtRemote?: string;
	createdAt?: string;
	updatedAt?: string;
	rawPayload?: string;
	live?: boolean;
	addressInUganda?: string;
	// Verify-into-alerts tracking (the verified call-log alert this signal became).
	linkedAlertId?: number;
	linkedAlert?: ForwardedAlertRef;
	// Forward-to-district tracking (most recent forward).
	forwardedAlertId?: number;
	forwardedToDistrict?: string;
	forwardedAt?: string;
	forwardedAlert?: ForwardedAlertRef;
}

export interface NdwListParams {
	page?: number;
	limit?: number;
	search?: string;
	live?: boolean;
	ndwFilters?: Record<string, string>;
	/**
	 * Inline filters applied to the locally synced rows. Keys are backend query
	 * params (e.g. district, county, verificationStatus, from_date, to_date for
	 * eCHIS; port, nation, risk, from_date, to_date for POE). These deliberately
	 * avoid the NDW column names so the request is NOT switched to the live proxy.
	 */
	localFilters?: Record<string, string>;
}

async function ndwRequest<T>(path: string, init?: RequestInit): Promise<T> {
	const base = getClientApiBaseUrl();
	let response: Response;
	try {
		response = await AuthService.makeAuthenticatedRequest(`${base}${path}`, init);
	} catch (err) {
		const msg =
			err instanceof Error ? err.message : "Could not reach the API server";
		throw new NdwFetchError(msg);
	}
	const text = await response.text();
	if (!response.ok) {
		let msg = `Request failed (HTTP ${response.status})`;
		try {
			const j = JSON.parse(text) as { error?: string; message?: string };
			msg = j.error || j.message || msg;
		} catch {
			if (text) msg = text;
		}
		throw new NdwFetchError(msg, response.status);
	}
	if (!text) return {} as T;
	return JSON.parse(text) as T;
}

function buildQuery(params?: NdwListParams): string {
	const sp = new URLSearchParams();
	if (params?.page) sp.set("page", String(params.page));
	if (params?.limit) sp.set("limit", String(params.limit));
	if (params?.search) sp.set("search", params.search);
	if (params?.live) sp.set("live", "true");
	if (params?.ndwFilters) {
		for (const [k, v] of Object.entries(params.ndwFilters)) {
			if (v.trim()) sp.set(k, v);
		}
	}
	if (params?.localFilters) {
		for (const [k, v] of Object.entries(params.localFilters)) {
			if (v.trim()) sp.set(k, v);
		}
	}
	const q = sp.toString();
	return q ? `?${q}` : "";
}

export async function listEchisAlerts(params?: NdwListParams): Promise<{
	alerts: EchisAlertRow[];
	pagination: NdwPagination;
	live?: boolean;
}> {
	const json = await ndwRequest<{
		alerts: EchisAlertRow[];
		pagination: NdwPagination;
		live?: boolean;
	}>(`/ndw/echis${buildQuery(params)}`);
	return {
		alerts: json.alerts ?? [],
		pagination: json.pagination ?? { page: 1, limit: 50, total: 0, totalPages: 0 },
		live: json.live,
	};
}

export async function getEchisStats(): Promise<{ totalAlerts: number; note?: string }> {
	return ndwRequest(`/ndw/echis/stats`);
}

export async function syncEchisAlerts(
	fullSync = false,
	refreshExisting = false
): Promise<{
	started: boolean;
	running: boolean;
	progress: NdwSyncProgress;
	message: string;
}> {
	return ndwRequest(`/ndw/echis/sync`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ fullSync, refreshExisting }),
	});
}

export async function getEchisSyncStatus(): Promise<NdwSyncProgress> {
	return ndwRequest(`/ndw/echis/sync/status`);
}

export type UpdateEchisAlertPayload = Partial<
	Pick<
		EchisAlertRow,
		| "district"
		| "county"
		| "subCounty"
		| "healthFacility"
		| "parish"
		| "village"
		| "vhtName"
		| "vhtPhone"
		| "verificationStatus"
		| "personInVhtArea"
		| "briefDescription"
		| "additionalInformation"
	>
>;

export async function updateEchisAlert(
	id: number,
	payload: UpdateEchisAlertPayload
): Promise<{ alert: EchisAlertRow }> {
	return ndwRequest(`/ndw/echis/${id}`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});
}

export async function refreshEchisAlert(
	id: number
): Promise<{ alert: EchisAlertRow; message: string }> {
	return ndwRequest(`/ndw/echis/${id}/refresh`, { method: "POST" });
}

export async function listPoeAlerts(params?: NdwListParams): Promise<{
	alerts: PoeAlertRow[];
	pagination: NdwPagination;
	live?: boolean;
}> {
	const json = await ndwRequest<{
		alerts: PoeAlertRow[];
		pagination: NdwPagination;
		live?: boolean;
	}>(`/ndw/poe${buildQuery(params)}`);
	return {
		alerts: json.alerts ?? [],
		pagination: json.pagination ?? { page: 1, limit: 50, total: 0, totalPages: 0 },
		live: json.live,
	};
}

export async function getPoeStats(): Promise<{ totalAlerts: number }> {
	return ndwRequest(`/ndw/poe/stats`);
}

export async function syncPoeAlerts(
	fullSync = false,
	refreshExisting = false
): Promise<{
	started: boolean;
	running: boolean;
	progress: NdwSyncProgress;
	message: string;
}> {
	return ndwRequest(`/ndw/poe/sync`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ fullSync, refreshExisting }),
	});
}

export async function getPoeSyncStatus(): Promise<NdwSyncProgress> {
	return ndwRequest(`/ndw/poe/sync/status`);
}

export interface ForwardNdwResult {
	alertId: number;
	district: string;
}

/**
 * Forward an eCHIS signal to a district as a new call-log alert (it then appears
 * in that district's Call Logs and can be verified through the normal flow).
 * POST /ndw/echis/:id/forward. Notifies alerts-derived views so the new alert
 * shows up without a manual refresh.
 */
export async function forwardEchisAlert(
	id: number,
	payload: { district: string; note?: string }
): Promise<ForwardNdwResult> {
	const json = await ndwRequest<{ alertId?: number; district?: string }>(
		`/ndw/echis/${id}/forward`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		}
	);
	notifyAlertsChanged();
	return {
		alertId: Number(json.alertId ?? 0),
		district: json.district ?? payload.district,
	};
}

/**
 * Forward a POE traveller alert to a district as a new call-log alert.
 * POST /ndw/poe/:id/forward. See forwardEchisAlert.
 */
export async function forwardPoeAlert(
	id: number,
	payload: { district: string; note?: string }
): Promise<ForwardNdwResult> {
	const json = await ndwRequest<{ alertId?: number; district?: string }>(
		`/ndw/poe/${id}/forward`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		}
	);
	notifyAlertsChanged();
	return {
		alertId: Number(json.alertId ?? 0),
		district: json.district ?? payload.district,
	};
}

export interface VerifyNdwResult {
	alertId: number;
}

/**
 * Verify an eCHIS signal INTO the alerts table as a verified call-log alert.
 * POST /ndw/echis/:id/verify. Re-verifying updates the same linked alert. The
 * payload is the shared verification form (built by buildEidsrVerifyPayload).
 */
export async function verifyEchisAlert(
	id: number,
	payload: EidsrMessageVerifyPayload
): Promise<VerifyNdwResult> {
	const json = await ndwRequest<{ alertId?: number }>(
		`/ndw/echis/${id}/verify`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		}
	);
	notifyAlertsChanged();
	return { alertId: Number(json.alertId ?? 0) };
}

/**
 * Verify a POE traveller alert INTO the alerts table. POST /ndw/poe/:id/verify.
 * See verifyEchisAlert.
 */
export async function verifyPoeAlert(
	id: number,
	payload: EidsrMessageVerifyPayload
): Promise<VerifyNdwResult> {
	const json = await ndwRequest<{ alertId?: number }>(
		`/ndw/poe/${id}/verify`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		}
	);
	notifyAlertsChanged();
	return { alertId: Number(json.alertId ?? 0) };
}
