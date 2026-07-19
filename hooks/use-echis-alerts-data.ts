import {
	ECHIS_ALERTS_CONFIG,
	ECHIS_INITIAL_NDW_FILTERS,
} from "@/constants/echis-alerts";
import { echisSource, type EchisAlertRow } from "@/lib/fetch-ndw-alerts";
import { columnFiltersToEchisLocalParams } from "@/lib/echis-column-filters";
import { useNdwAlertsData } from "@/hooks/use-ndw-alerts-data";

/** eCHIS signal feed — thin config over the shared useNdwAlertsData engine. */
export function useEchisAlertsData() {
	return useNdwAlertsData<EchisAlertRow>({
		key: "echis-alerts",
		source: echisSource,
		initialFilters: ECHIS_INITIAL_NDW_FILTERS,
		itemsPerPage: ECHIS_ALERTS_CONFIG.ITEMS_PER_PAGE,
		autoRefreshMs: ECHIS_ALERTS_CONFIG.AUTO_REFRESH_INTERVAL_MS,
		columnParamsFn: columnFiltersToEchisLocalParams,
	});
}
