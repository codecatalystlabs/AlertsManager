import { useRegionOptions } from "@/hooks/use-region-options";
import { useDistrictOptions } from "@/hooks/use-district-options";
import { useDivisionOptions } from "@/hooks/use-division-options";

/**
 * Region → District → Division cascade for the filter bars. Centralises the
 * "resolve the selected region *name* to its id, then scope the district list
 * to that region" step (and the `"all"` sentinel handling) that the Alerts and
 * Call-Logs filters each hand-wired — the correctness-sensitive part that is
 * easy to get subtly wrong per copy. Callers destructure only the levels they
 * use (Alerts: region+district; Call-Logs: region+district+division).
 */
export function useLocationCascade({
	region,
	district,
}: {
	region: string;
	district: string;
}) {
	const regionArg = region === "all" ? "" : region;
	const districtArg = district === "all" ? "" : district;

	const {
		regions,
		regionOptions,
		loading: regionsLoading,
	} = useRegionOptions(regionArg);

	const selectedRegionId =
		region && region !== "all"
			? regionOptions.find((r) => r.name === region)?.id
			: undefined;

	const { districts, loading: districtsLoading } = useDistrictOptions(
		districtArg,
		selectedRegionId
	);

	const {
		divisions,
		loading: divisionsLoading,
		enabled: divisionsEnabled,
	} = useDivisionOptions(districtArg);

	return {
		regions,
		regionOptions,
		regionsLoading,
		selectedRegionId,
		districts,
		districtsLoading,
		divisions,
		divisionsLoading,
		divisionsEnabled,
	};
}
