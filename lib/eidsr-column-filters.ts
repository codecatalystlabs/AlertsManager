import type { ColumnFiltersState } from "@tanstack/react-table";
import type { EidsrEventsListParams } from "@/lib/fetch-eidsr-events";

type DateRange = { from?: string; to?: string };

/**
 * Translate the 6767 data-table's per-column header filters into server-side
 * /eidsr/local/messages query params, so a column filter scopes the WHOLE
 * dataset (every page) rather than only the rows loaded on the current page.
 * Mirrors columnFiltersToAlertParams (Alerts/Call-Logs).
 *
 * Only columns the backend can filter are mapped: Status, Location (district),
 * In-alerts (linked) and Received (date range). The free-text columns (reporter,
 * phone, message) have no dedicated server filter, so they don't expose a header
 * funnel — they stay searchable via the dedicated filter bar's global search.
 * Column ids are the TanStack accessorKey/id values from createColumns().
 */
export function columnFiltersToEidsrParams(
	filters: ColumnFiltersState
): Partial<EidsrEventsListParams> {
	const params: Partial<EidsrEventsListParams> = {};

	for (const { id, value } of filters) {
		if (value === undefined || value === null || value === "") continue;

		switch (id) {
			case "status":
				params.status = String(value);
				break;
			case "location":
				// The location cell shows "village, district"; the backend filters
				// the EIDSR location data value (district).
				params.district = String(value).trim();
				break;
			case "inAlerts":
				if (value === "linked") params.linked = true;
				else if (value === "unlinked") params.linked = false;
				break;
			case "date": {
				const range = value as DateRange;
				if (range?.from) params.from_date = range.from;
				if (range?.to) params.to_date = range.to;
				break;
			}
			default:
				break;
		}
	}

	return params;
}
