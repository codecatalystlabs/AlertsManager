/**
 * Admin-managed dropdown lists — the API client half (/lookups CRUD).
 *
 * Split from lib/lookup-registry.ts, which holds the pure registry/normalisation
 * logic: that half is reachable from lib/alert-normalize.ts and must stay
 * loadable by the plain-node test scripts, which cannot pull in fetch/auth.
 * Everything from the registry module is re-exported here so callers that need
 * both have a single import.
 */

import { AuthService } from "@/lib/auth";
import { getClientApiBaseUrl } from "@/lib/api-config";
import { formatApiFetchError } from "@/lib/api-errors";
import {
	LOOKUP_KIND_LABELS,
	type LookupKind,
	type LookupOption,
	type LookupOptionInput,
} from "@/lib/lookup-registry";
import type { EbsSignalRow, SignalDomain, SignalSetting } from "@/lib/ebs-signals";

export * from "@/lib/lookup-registry";

class LookupApiError extends Error {
	readonly status?: number;

	constructor(message: string, status?: number) {
		super(message);
		this.name = "LookupApiError";
		this.status = status;
	}
}

/** Parse the backend's {error, hint, usageCount} body into a usable message. */
async function readApiError(
	response: Response,
	fallbackLabel: string
): Promise<LookupApiError> {
	const bodyText = await response.text().catch(() => "");
	try {
		const parsed = JSON.parse(bodyText) as Record<string, unknown>;
		const parts = [parsed.error, parsed.hint, parsed.message]
			.filter((part): part is string => typeof part === "string" && !!part)
			.join(" ");
		if (parts) return new LookupApiError(parts, response.status);
	} catch {
		// Not JSON — fall through to the generic formatter.
	}
	return new LookupApiError(
		formatApiFetchError(
			response.status,
			response.statusText,
			bodyText,
			fallbackLabel
		),
		response.status
	);
}

function parseOptions(json: unknown, kind: LookupKind): LookupOption[] {
	if (!Array.isArray(json)) return [];
	const out: LookupOption[] = [];
	for (const item of json) {
		if (!item || typeof item !== "object") continue;
		const row = item as Record<string, unknown>;
		const name = typeof row.name === "string" ? row.name.trim() : "";
		if (!name) continue;
		out.push({
			id: Number(row.id) || 0,
			kind,
			name,
			aliases: Array.isArray(row.aliases)
				? row.aliases
						.map((a) => String(a).trim())
						.filter((a): a is string => Boolean(a))
				: [],
			active: row.active !== false,
			sortOrder: Number(row.sortOrder) || 0,
			usageCount: Number(row.usageCount) || 0,
		});
	}
	return out;
}

/**
 * GET /lookups/:kind. Unauthenticated on purpose — the public report form needs
 * these pickers and has no token. `includeInactive` is what hydration uses, so
 * retired options still contribute their aliases to normalisation.
 */
export async function fetchLookupOptions(
	kind: LookupKind,
	includeInactive = false
): Promise<LookupOption[]> {
	const url = `${getClientApiBaseUrl()}/lookups/${kind}${
		includeInactive ? "?include_inactive=true" : ""
	}`;

	let response: Response;
	try {
		response = await fetch(url, { credentials: "omit" });
	} catch (error) {
		if (error instanceof TypeError) {
			throw new LookupApiError(
				"Cannot reach the API server. Confirm the backend is online and reachable, then retry."
			);
		}
		throw error;
	}

	if (!response.ok) {
		throw await readApiError(response, LOOKUP_KIND_LABELS[kind]);
	}
	return parseOptions(await response.json(), kind);
}

async function writeLookupOption(
	method: "POST" | "PUT",
	url: string,
	body: LookupOptionInput,
	kind: LookupKind
): Promise<LookupOption> {
	const response = await AuthService.makeAuthenticatedRequest(url, {
		method,
		body: JSON.stringify(body),
	});
	if (!response.ok) {
		throw await readApiError(response, LOOKUP_KIND_LABELS[kind]);
	}
	const [option] = parseOptions([await response.json()], kind);
	if (!option) {
		throw new LookupApiError("The API returned an unreadable option.");
	}
	return option;
}

export function createLookupOption(
	kind: LookupKind,
	input: LookupOptionInput
): Promise<LookupOption> {
	return writeLookupOption(
		"POST",
		`${getClientApiBaseUrl()}/lookups/${kind}`,
		input,
		kind
	);
}

export function updateLookupOption(
	kind: LookupKind,
	id: number,
	input: LookupOptionInput
): Promise<LookupOption> {
	return writeLookupOption(
		"PUT",
		`${getClientApiBaseUrl()}/lookups/${kind}/${id}`,
		input,
		kind
	);
}

/**
 * DELETE /lookups/:kind/:id. The API refuses (409) to delete an option that
 * signals already reference unless `force` is set — see the admin screen, which
 * surfaces that refusal and offers retiring instead.
 */
export async function deleteLookupOption(
	kind: LookupKind,
	id: number,
	force = false
): Promise<void> {
	const url = `${getClientApiBaseUrl()}/lookups/${kind}/${id}${
		force ? "?force=true" : ""
	}`;
	const response = await AuthService.makeAuthenticatedRequest(url, {
		method: "DELETE",
	});
	if (!response.ok) {
		throw await readApiError(response, LOOKUP_KIND_LABELS[kind]);
	}
}


/* ------------------------------------------------------------------------- *
 * EBS signal list (/ebs-signals)
 *
 * The third admin-managed dropdown. It is its own resource rather than another
 * lookup `kind` because a signal is not just a label: it carries the code that
 * alerts store, a long definition, and the domain/setting axes the picker
 * groups by.
 * ------------------------------------------------------------------------- */

/** Create/update body for a signal. Omitted fields are left unchanged. */
export interface EbsSignalInput {
	code?: string;
	label?: string;
	domain?: SignalDomain;
	setting?: SignalSetting;
	active?: boolean;
	sortOrder?: number;
}

const SIGNAL_LABEL = "EBS signals";

function parseSignals(json: unknown): EbsSignalRow[] {
	if (!Array.isArray(json)) return [];
	const out: EbsSignalRow[] = [];
	for (const item of json) {
		if (!item || typeof item !== "object") continue;
		const row = item as Record<string, unknown>;
		const code = typeof row.code === "string" ? row.code.trim() : "";
		if (!code) continue;
		out.push({
			id: Number(row.id) || 0,
			code,
			label: typeof row.label === "string" ? row.label : "",
			domain: (row.domain as SignalDomain) ?? "human",
			setting: (row.setting as SignalSetting) ?? "community",
			annex: row.setting === "facility" ? "I" : "II",
			active: row.active !== false,
			sortOrder: Number(row.sortOrder) || 0,
			usageCount: Number(row.usageCount) || 0,
		});
	}
	return out;
}

/**
 * GET /ebs-signals. Unauthenticated like the other lists — the registry is
 * hydrated app-wide and the Annex lists are published guidance. `includeRetired`
 * is what hydration uses, so a signal that has left the Annex still resolves for
 * the alerts classified under it.
 */
export async function fetchEbsSignals(
	includeRetired = false
): Promise<EbsSignalRow[]> {
	const url = `${getClientApiBaseUrl()}/ebs-signals${
		includeRetired ? "?include_retired=true" : ""
	}`;

	let response: Response;
	try {
		response = await fetch(url, { credentials: "omit" });
	} catch (error) {
		if (error instanceof TypeError) {
			throw new LookupApiError(
				"Cannot reach the API server. Confirm the backend is online and reachable, then retry."
			);
		}
		throw error;
	}

	if (!response.ok) {
		throw await readApiError(response, SIGNAL_LABEL);
	}
	return parseSignals(await response.json());
}

async function writeEbsSignal(
	method: "POST" | "PUT",
	url: string,
	body: EbsSignalInput
): Promise<EbsSignalRow> {
	const response = await AuthService.makeAuthenticatedRequest(url, {
		method,
		body: JSON.stringify(body),
	});
	if (!response.ok) {
		throw await readApiError(response, SIGNAL_LABEL);
	}
	const [signal] = parseSignals([await response.json()]);
	if (!signal) {
		throw new LookupApiError("The API returned an unreadable signal.");
	}
	return signal;
}

export function createEbsSignal(input: EbsSignalInput): Promise<EbsSignalRow> {
	return writeEbsSignal("POST", `${getClientApiBaseUrl()}/ebs-signals`, input);
}

export function updateEbsSignal(
	id: number,
	input: EbsSignalInput
): Promise<EbsSignalRow> {
	return writeEbsSignal(
		"PUT",
		`${getClientApiBaseUrl()}/ebs-signals/${id}`,
		input
	);
}

/**
 * DELETE /ebs-signals/:id. The API refuses (409) to delete a signal that alerts
 * already record unless `force` is set — those alerts would be left carrying a
 * code that resolves to nothing.
 */
export async function deleteEbsSignal(
	id: number,
	force = false
): Promise<void> {
	const url = `${getClientApiBaseUrl()}/ebs-signals/${id}${
		force ? "?force=true" : ""
	}`;
	const response = await AuthService.makeAuthenticatedRequest(url, {
		method: "DELETE",
	});
	if (!response.ok) {
		throw await readApiError(response, SIGNAL_LABEL);
	}
}
