import type { ColumnFiltersState } from "@tanstack/react-table";

type DateRange = { from?: string; to?: string };

/**
 * Translate the eCHIS data-table's per-column header filters into server-side
 * /ndw/echis *local* query params, so a column filter scopes the WHOLE synced
 * dataset (every page) rather than only the rows loaded on the current page.
 * Mirrors columnFiltersToEidsrParams (6767) and columnFiltersToAlertParams.
 *
 * Keys are the backend's LOCAL query params (lowercase/underscore) — deliberately
 * NOT the capitalized NDW field names, so the request isn't flipped to the live
 * proxy (see the ndw-filters-and-ordering gotcha). Column ids are the TanStack
 * accessorKey/id values from the eCHIS table columns.
 */
export function columnFiltersToEchisLocalParams(
	filters: ColumnFiltersState
): Record<string, string> {
	const params: Record<string, string> = {};

	for (const { id, value } of filters) {
		if (value === undefined || value === null || value === "") continue;

		switch (id) {
			case "district":
				params.district = String(value).trim();
				break;
			case "county":
				params.county = String(value).trim();
				break;
			case "subCounty":
				params.sub_county = String(value).trim();
				break;
			case "healthFacility":
				params.health_facility = String(value).trim();
				break;
			case "vhtName":
				params.vht_name = String(value).trim();
				break;
			case "vhtPhone":
				params.vht_phone = String(value).trim();
				break;
			case "verificationStatus":
				params.verificationStatus = String(value).trim();
				break;
			case "briefDescription":
				params.brief_description = String(value).trim();
				break;
			case "additionalInformation":
				params.additional_information = String(value).trim();
				break;
			case "inAlerts":
				if (value === "linked") params.linked = "true";
				else if (value === "unlinked") params.linked = "false";
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
