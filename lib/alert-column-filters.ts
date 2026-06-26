import type { ColumnFiltersState } from "@tanstack/react-table";
import type { AlertsListParams } from "@/lib/fetch-alerts";
import { sourceFilterValues } from "@/lib/source-of-alert";

type DateRange = { from?: string; to?: string };

/**
 * Translate the data-table's per-column header filters into server-side
 * /alerts query params, so a column filter scopes the WHOLE dataset (every
 * page) instead of only the rows currently loaded on the page. Shared by the
 * Alerts and Call Logs lists, which hit the same backend (applyAlertListFilters).
 *
 * Column ids are the TanStack `accessorKey`s used in the Alerts/Call-Logs
 * column definitions. Anything without a server mapping is ignored.
 */
export function columnFiltersToAlertParams(
	filters: ColumnFiltersState
): Partial<AlertsListParams> {
	const params: Partial<AlertsListParams> = {};

	for (const { id, value } of filters) {
		if (value === undefined || value === null || value === "") continue;

		switch (id) {
			case "id": {
				// The cell shows "ALT059" but the stored id is "59"; accept the
				// padded/prefixed form the user sees as well as the bare number.
				const raw = String(value)
					.trim()
					.replace(/^alt/i, "")
					.replace(/^0+(?=\d)/, "");
				if (raw) params.alert_id = raw;
				break;
			}
			case "alertCaseName":
				params.alert_case_name = String(value).trim();
				break;
			case "personReporting":
				params.person_reporting = String(value).trim();
				break;
			case "alertCaseDistrict":
				params.alert_case_district = String(value).trim();
				break;
			case "contactNumber":
				params.contact_number = String(value).trim();
				break;
			case "alertCaseAge":
				params.age = String(value).trim();
				break;
			case "response":
				params.response = String(value).trim();
				break;
			case "time":
				params.time = String(value).trim();
				break;
			case "status":
				params.status = String(value);
				break;
			case "sourceOfAlert":
				// Expand the canonical source to its raw aliases (mirrors the filter
				// bar) so the server IN-match also catches legacy stored spellings.
				params.source = sourceFilterValues(String(value)).join(",");
				break;
			case "alertCaseSex":
				params.sex = String(value);
				break;
			case "isVerified":
				if (value === "true") params.is_verified = true;
				else if (value === "false") params.is_verified = false;
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
