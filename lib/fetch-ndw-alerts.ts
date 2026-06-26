import { AuthService } from "@/lib/auth";
import { getClientApiBaseUrl } from "@/lib/api-config";

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
}

export interface NdwListParams {
	page?: number;
	limit?: number;
	search?: string;
	live?: boolean;
	ndwFilters?: Record<string, string>;
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
