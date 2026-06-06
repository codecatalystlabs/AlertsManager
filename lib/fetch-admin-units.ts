import { AuthService } from "@/lib/auth";
import { getClientApiBaseUrl } from "@/lib/api-config";
import { formatAlertsFetchError } from "@/lib/api-errors";

class AdminUnitsFetchError extends Error {
	constructor(
		message: string,
		readonly status?: number
	) {
		super(message);
		this.name = "AdminUnitsFetchError";
	}
}

function asRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function districtLabelFromItem(item: unknown): string | null {
	if (typeof item === "string") {
		const trimmed = item.trim();
		return trimmed || null;
	}

	const row = asRecord(item);
	if (!row) return null;

	const name =
		row.name ??
		row.district ??
		row.district_name ??
		row.districtName ??
		row.label ??
		row.displayName ??
		row.display_name;

	return name ? String(name).trim() : null;
}

function dedupeSortDistricts(list: string[]): string[] {
	return Array.from(new Set(list.filter(Boolean))).sort((a, b) =>
		a.localeCompare(b)
	);
}

/** Parse GET /admin-units/districts response (array or wrapped list of units). */
export function parseDistrictsResponse(json: unknown): string[] {
	if (!json) return [];

	if (Array.isArray(json)) {
		return dedupeSortDistricts(
			json
				.map(districtLabelFromItem)
				.filter((name): name is string => Boolean(name))
		);
	}

	const body = asRecord(json);
	if (!body) return [];

	const nested = [
		body.data,
		body.districts,
		body.results,
		body.items,
		body.rows,
	];

	for (const candidate of nested) {
		if (!Array.isArray(candidate)) continue;
		const list = candidate
			.map(districtLabelFromItem)
			.filter((name): name is string => Boolean(name));
		if (list.length > 0) return dedupeSortDistricts(list);
	}

	return [];
}

export async function fetchDistricts(): Promise<string[]> {
	const url = `${getClientApiBaseUrl()}/admin-units/districts`;

	let response: Response;
	try {
		response = await AuthService.makeAuthenticatedRequest(url);
	} catch (error) {
		if (error instanceof TypeError) {
			throw new AdminUnitsFetchError(
				"Cannot reach the API server. Confirm the backend is online and reachable, then retry."
			);
		}
		throw error;
	}

	if (!response.ok) {
		const bodyText = await response.text().catch(() => "");
		throw new AdminUnitsFetchError(
			formatAlertsFetchError(response.status, response.statusText, bodyText),
			response.status
		);
	}

	const json = (await response.json()) as unknown;
	return parseDistrictsResponse(json);
}
