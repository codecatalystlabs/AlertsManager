import {
	POE_ALERTS_CONFIG,
	POE_INITIAL_NDW_FILTERS,
} from "@/constants/poe-alerts";
import { poeSource, type PoeAlertRow } from "@/lib/fetch-ndw-alerts";
import { columnFiltersToPoeLocalParams } from "@/lib/poe-column-filters";
import { useNdwAlertsData } from "@/hooks/use-ndw-alerts-data";

/** POE traveller feed — thin config over the shared useNdwAlertsData engine. */
export function usePoeAlertsData() {
	return useNdwAlertsData<PoeAlertRow>({
		key: "poe-alerts",
		source: poeSource,
		initialFilters: POE_INITIAL_NDW_FILTERS,
		itemsPerPage: POE_ALERTS_CONFIG.ITEMS_PER_PAGE,
		autoRefreshMs: POE_ALERTS_CONFIG.AUTO_REFRESH_INTERVAL_MS,
		columnParamsFn: columnFiltersToPoeLocalParams,
	});
}
