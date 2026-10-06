/**
 * Carrying the dashboard's scope into the lists its figures link to.
 *
 * Every dashboard number links to a list — Raw Information to the untriaged
 * queue, each "where every signal is now" row to its queue, Alerts to the
 * Alerts page. Those links used to drop the scope: a dashboard filtered to one
 * district and one month opened the WHOLE register, so the number clicked and
 * the list that opened disagreed every time a filter was set. That was the
 * commonest "the numbers don't tally" report (2026-10-06 audit).
 *
 * The scope travels as URL params the register and the Alerts page read once
 * on arrival (`scopeFromSearchParams`): the same names the API takes, so a
 * link is also a readable record of what was counted.
 */

export interface DashboardLinkScope {
	/** Inclusive YYYY-MM-DD; "" for unbounded. */
	from: string;
	to: string;
	/** Names, or "all"/"" for no filter. */
	region: string;
	district: string;
	division: string;
	/** alertResponse code(s), comma-separated, or "all"/"" for every disease. */
	disease: string;
}

/** The list-filter shape a scoped link carries. */
export interface ListScope {
	fromDate: string;
	toDate: string;
	region: string;
	district: string;
	division: string;
	disease: string;
}

const isSet = (v: string | null | undefined): v is string =>
	!!v && v.trim() !== "" && v.trim().toLowerCase() !== "all";

/** `href` with the scope appended as query params (only the ones set). */
export function withDashboardScope(href: string, scope?: DashboardLinkScope | null): string {
	if (!scope) return href;
	const [path, query = ""] = href.split("?");
	const params = new URLSearchParams(query);
	const put = (key: string, value: string) => {
		if (isSet(value)) params.set(key, value.trim());
	};
	put("from_date", scope.from);
	put("to_date", scope.to);
	put("region", scope.region);
	put("district", scope.district);
	put("division", scope.division);
	put("disease", scope.disease);
	const qs = params.toString();
	return qs ? `${path}?${qs}` : path;
}

const SCOPE_KEYS = ["from_date", "to_date", "region", "district", "division", "disease"] as const;

/**
 * The scope a link carried, as list filters — null when it carried none, so a
 * plain visit leaves the list's own defaults alone. Unset dimensions come back
 * as their "no filter" value so arriving with a scope REPLACES whatever scope
 * the list was showing rather than mixing with it.
 */
export function scopeFromSearchParams(
	params: { get(name: string): string | null } | null | undefined
): ListScope | null {
	if (!params) return null;
	if (!SCOPE_KEYS.some((k) => isSet(params.get(k)))) return null;
	const val = (k: (typeof SCOPE_KEYS)[number], none: string) => {
		const v = params.get(k);
		return isSet(v) ? v.trim() : none;
	};
	return {
		fromDate: val("from_date", ""),
		toDate: val("to_date", ""),
		region: val("region", "all"),
		district: val("district", "all"),
		division: val("division", "all"),
		disease: val("disease", "all"),
	};
}

/** A stable key for "this scope was already applied" refs. */
export function scopeKey(scope: ListScope | null): string {
	return scope ? JSON.stringify(scope) : "";
}
