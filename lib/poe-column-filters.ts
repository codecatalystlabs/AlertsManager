import type { ColumnFiltersState } from "@tanstack/react-table";

type DateRange = { from?: string; to?: string };

/**
 * Translate the POE data-table's per-column header filters into server-side
 * /ndw/poe *local* query params, so a column filter scopes the WHOLE synced
 * dataset (every page) rather than only the rows loaded on the current page.
 * Mirrors columnFiltersToEchisLocalParams / columnFiltersToEidsrParams.
 *
 * Param names deliberately AVOID the PoeFilterFields() NDW column names
 * ("full_name"/"passport_number"/"flight_number"/"nationality"/"risk_level"…),
 * using distinct aliases ("traveller"/"passport"/"flight"/"nation"/"risk"…) so
 * the request is NOT flipped to the live NDW proxy (see the ndw-filters gotcha).
 * Column ids are the TanStack accessorKey/id values from the POE table columns.
 */
export function columnFiltersToPoeLocalParams(
	filters: ColumnFiltersState
): Record<string, string> {
	const params: Record<string, string> = {};

	for (const { id, value } of filters) {
		if (value === undefined || value === null || value === "") continue;

		switch (id) {
			case "fullName":
				params.traveller = String(value).trim();
				break;
			case "passportNumber":
				params.passport = String(value).trim();
				break;
			case "nationality":
				params.nation = String(value).trim();
				break;
			case "portOfEntry":
				params.port = String(value).trim();
				break;
			case "flightNumber":
				params.flight = String(value).trim();
				break;
			case "riskLevel":
				params.risk = String(value).trim();
				break;
			case "symptomsText":
				params.symptom = String(value).trim();
				break;
			case "refCode":
				params.ref = String(value).trim();
				break;
			case "inAlerts":
				if (value === "linked") params.linked = "true";
				else if (value === "unlinked") params.linked = "false";
				break;
			case "createdAtRemote": {
				const range = value as DateRange;
				if (range?.from) params.from_date = range.from;
				if (range?.to) params.to_date = range.to;
				break;
			}
			case "arrivalDate": {
				const range = value as DateRange;
				if (range?.from) params.arrival_from = range.from;
				if (range?.to) params.arrival_to = range.to;
				break;
			}
			default:
				break;
		}
	}

	return params;
}
