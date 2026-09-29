/**
 * Signal origin — which door a signal came into Raw Information through.
 *
 * Not the same question as "Source of alert", which says WHO reported
 * (community, health facility, VHT…). Origin says HOW the report reached this
 * system: an SMS to 6767 pulled from eIDSR, an eCHIS or PoE record from the NDW
 * feeds, or somebody logging it here directly. It is read from `alertFrom`,
 * the one field every path — old and new — stamps.
 *
 * Mirrors Go `services.OriginPredicate` / `OriginCaseSQL`
 * (internal/services/signal_origin.go); the chips' counts and the filtered list
 * come from the server, this file only has to agree on the labels.
 */

export const ORIGIN_6767 = "6767";
export const ORIGIN_ECHIS = "echis";
export const ORIGIN_POE = "poe";
export const ORIGIN_DIRECT = "direct";

export type SignalOrigin =
	| typeof ORIGIN_6767
	| typeof ORIGIN_ECHIS
	| typeof ORIGIN_POE
	| typeof ORIGIN_DIRECT;

/** "all" is the absence of an origin filter. */
export type SignalOriginFilter = SignalOrigin | "all";

/**
 * `alertFrom` on a row logged automatically when a sync imported it (mirrors Go
 * services.AlertFrom6767Sync / AlertFromEchisSync / AlertFromPoeSync). A row
 * moved in by hand carries "… Forward" instead.
 */
export const ALERT_FROM_6767_SYNC = "6767 Sync";
export const ALERT_FROM_ECHIS_SYNC = "eCHIS Sync";
export const ALERT_FROM_POE_SYNC = "POE Sync";
const SYNC_LABELS = [ALERT_FROM_6767_SYNC, ALERT_FROM_ECHIS_SYNC, ALERT_FROM_POE_SYNC].map(
	(l) => l.toLowerCase()
);

export const SIGNAL_ORIGINS: {
	value: SignalOrigin;
	label: string;
	hint: string;
}[] = [
	{
		value: ORIGIN_6767,
		label: "6767 SMS",
		hint: "Sent by SMS to 6767 and pulled from eIDSR — logged automatically on sync, or moved in by hand.",
	},
	{
		value: ORIGIN_ECHIS,
		label: "eCHIS",
		hint: "From the eCHIS feed — logged automatically on sync, or forwarded by hand.",
	},
	{
		value: ORIGIN_POE,
		label: "PoE",
		hint: "A Point of Entry traveller declaration — logged automatically on sync, or forwarded by hand.",
	},
	{
		value: ORIGIN_DIRECT,
		label: "Logged directly",
		hint: "Logged in this system — the Add Alert form, a call, or the public form.",
	},
];

export function isSignalOrigin(value: unknown): value is SignalOrigin {
	return (
		value === ORIGIN_6767 ||
		value === ORIGIN_ECHIS ||
		value === ORIGIN_POE ||
		value === ORIGIN_DIRECT
	);
}

/** Reads an origin off a URL/query value; anything unrecognised is "all". */
export function parseSignalOriginFilter(
	value: string | null | undefined
): SignalOriginFilter {
	const v = (value ?? "").trim().toLowerCase();
	return isSignalOrigin(v) ? v : "all";
}

/**
 * The origin of one row, from its `alertFrom`. Same precedence as the server's
 * CASE, so a row's badge always matches the chip that lists it.
 */
export function signalOriginOf(alertFrom: string | null | undefined): SignalOrigin {
	const from = (alertFrom ?? "").trim().toLowerCase();
	if (from.includes("6767") || from === "eidsr sms") return ORIGIN_6767;
	if (from.includes("echis")) return ORIGIN_ECHIS;
	if (from.startsWith("poe")) return ORIGIN_POE;
	return ORIGIN_DIRECT;
}

/** Logged by the 6767 sync itself rather than moved in by a person. */
export function isAutoLogged6767(alertFrom: string | null | undefined): boolean {
	return (alertFrom ?? "").trim().toLowerCase() === ALERT_FROM_6767_SYNC.toLowerCase();
}

/** Logged by a feed's sync (6767, eCHIS or PoE) rather than moved in by a person. */
export function isLoggedBySync(alertFrom: string | null | undefined): boolean {
	return SYNC_LABELS.includes((alertFrom ?? "").trim().toLowerCase());
}

export function signalOriginLabel(origin: SignalOrigin): string {
	return SIGNAL_ORIGINS.find((o) => o.value === origin)?.label ?? origin;
}

/** How long a newly arrived signal keeps its "New" marker. */
export const NEW_SIGNAL_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Arrived within the last 24 hours (by an ISO timestamp), false if unknown. */
export function arrivedRecently(
	iso: string | null | undefined,
	now: number = Date.now()
): boolean {
	if (!iso) return false;
	const age = now - new Date(iso).getTime();
	// A few minutes of grace the other way: the server's clock stamped it, and a
	// browser running slightly behind must not call a fresh arrival "not new".
	return Number.isFinite(age) && age > -5 * 60 * 1000 && age < NEW_SIGNAL_WINDOW_MS;
}
