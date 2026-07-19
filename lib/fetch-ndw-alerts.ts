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
	// cht_ebs_report-only fields (empty for rows from the old feed).
	externalUuid?: string;
	signalReported?: string;
	reportedAt?: string;
	region?: string;
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

// ── Per-source client factory ────────────────────────────────────────────────
// eCHIS and POE differ only by URL segment and row type; one factory produces
// the whole per-source client so the two feeds can never drift apart again.

export interface ForwardNdwResult {
	alertId: number;
	district: string;
}

export interface VerifyNdwResult {
	alertId: number;
}

export interface NdwSource<TRow> {
	list(params?: NdwListParams): Promise<{
		alerts: TRow[];
		pagination: NdwPagination;
		live?: boolean;
	}>;
	stats(): Promise<{ totalAlerts: number; note?: string }>;
	sync(
		fullSync?: boolean,
		refreshExisting?: boolean
	): Promise<{
		started: boolean;
		running: boolean;
		progress: NdwSyncProgress;
		message: string;
	}>;
	syncStatus(): Promise<NdwSyncProgress>;
	forward(
		id: number,
		payload: { district: string; note?: string }
	): Promise<ForwardNdwResult>;
	verify(
		id: number,
		payload: EidsrMessageVerifyPayload
	): Promise<VerifyNdwResult>;
}

export function createNdwSource<TRow>(base: "echis" | "poe"): NdwSource<TRow> {
	const root = `/ndw/${base}`;
	const jsonHeaders = { "Content-Type": "application/json" };
	return {
		async list(params) {
			const json = await ndwRequest<{
				alerts: TRow[];
				pagination: NdwPagination;
				live?: boolean;
			}>(`${root}${buildQuery(params)}`);
			return {
				alerts: json.alerts ?? [],
				pagination:
					json.pagination ?? { page: 1, limit: 50, total: 0, totalPages: 0 },
				live: json.live,
			};
		},
		stats() {
			return ndwRequest<{ totalAlerts: number; note?: string }>(`${root}/stats`);
		},
		sync(fullSync = false, refreshExisting = false) {
			return ndwRequest<{
				started: boolean;
				running: boolean;
				progress: NdwSyncProgress;
				message: string;
			}>(`${root}/sync`, {
				method: "POST",
				headers: jsonHeaders,
				body: JSON.stringify({ fullSync, refreshExisting }),
			});
		},
		syncStatus() {
			return ndwRequest<NdwSyncProgress>(`${root}/sync/status`);
		},
		async forward(id, payload) {
			const json = await ndwRequest<{ alertId?: number; district?: string }>(
				`${root}/${id}/forward`,
				{
					method: "POST",
					headers: jsonHeaders,
					body: JSON.stringify(payload),
				}
			);
			notifyAlertsChanged();
			return {
				alertId: Number(json.alertId ?? 0),
				district: json.district ?? payload.district,
			};
		},
		async verify(id, payload) {
			const json = await ndwRequest<{ alertId?: number }>(
				`${root}/${id}/verify`,
				{
					method: "POST",
					headers: jsonHeaders,
					body: JSON.stringify(payload),
				}
			);
			notifyAlertsChanged();
			return { alertId: Number(json.alertId ?? 0) };
		},
	};
}

export const echisSource = createNdwSource<EchisAlertRow>("echis");
export const poeSource = createNdwSource<PoeAlertRow>("poe");

// Back-compat named exports (imported across hooks/pages). Both feeds now share
// the single implementation produced by the factory above.
export const listEchisAlerts = echisSource.list;
export const getEchisStats = echisSource.stats;
export const syncEchisAlerts = echisSource.sync;
export const getEchisSyncStatus = echisSource.syncStatus;
export const forwardEchisAlert = echisSource.forward;
export const verifyEchisAlert = echisSource.verify;

export const listPoeAlerts = poeSource.list;
export const getPoeStats = poeSource.stats;
export const syncPoeAlerts = poeSource.sync;
export const getPoeSyncStatus = poeSource.syncStatus;
export const forwardPoeAlert = poeSource.forward;
export const verifyPoeAlert = poeSource.verify;

// eCHIS-only: edit a synced row / re-pull it from the remote feed.
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
