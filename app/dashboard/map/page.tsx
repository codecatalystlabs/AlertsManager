"use client";

import React, { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { MapPin, RefreshCw } from "lucide-react";

import { LAYOUT } from "@/constants/layout";
import { ErrorAlert } from "@/components/dashboard";
import {
	DashboardRangePicker,
	resolveDashboardRange,
	DEFAULT_RANGE_PRESET,
	type DashboardRangeValue,
} from "@/components/dashboard/dashboard-range-picker";
import { Button } from "@/components/ui/button";
import { useGeoLayers } from "@/hooks/use-geo-layers";
import type { GeoQuery } from "@/lib/fetch-geo";

// Leaflet touches `window`, so the map is client-only (no SSR) and lazy-loaded.
const AlertsGeoMap = dynamic(
	() =>
		import("@/components/map/alerts-geo-map").then((m) => ({
			default: m.AlertsGeoMap,
		})),
	{
		ssr: false,
		loading: () => (
			<div className="h-full w-full animate-pulse rounded-md bg-gray-100" />
		),
	}
);

/**
 * Alerts Map — a zoom-driven map of alert volume across Uganda. The overview
 * shows one named pill per region; zooming in swaps to district boundaries (then
 * subcounty boundaries), and hovering any area shows its name. Counts honour the
 * same date window, canonical district matching and RBAC scope as the dashboard.
 */
export default function MapPage(): React.JSX.Element {
	const [range, setRange] = useState<DashboardRangeValue>(() =>
		resolveDashboardRange(DEFAULT_RANGE_PRESET)
	);

	const query: GeoQuery = useMemo(
		() => ({
			fromDate: range.from || undefined,
			toDate: range.to || undefined,
		}),
		[range.from, range.to]
	);

	const { regions, districts, loading, validating, error, refetch } =
		useGeoLayers(query);

	return (
		<div className={LAYOUT.pageGap}>
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div className="min-w-0">
					<h1 className={LAYOUT.pageTitle}>
						<MapPin className="mr-2 inline h-5 w-5 text-uganda-red" />
						Alerts Map
					</h1>
				</div>
				<div className="flex items-end gap-2">
					<DashboardRangePicker onChange={setRange} disabled={loading} />
					<Button
						variant="outline"
						size="sm"
						className="h-8"
						onClick={refetch}
						disabled={validating}
					>
						<RefreshCw
							className={`mr-1 h-3.5 w-3.5 ${validating ? "animate-spin" : ""}`}
						/>
						Refresh
					</Button>
				</div>
			</div>

			{error && <ErrorAlert error={error.message} onRetry={refetch} />}

			<div className="flex flex-wrap items-center justify-end gap-2">
				<div className="text-xs text-muted-foreground">
					{regions
						? `${regions.total.toLocaleString()} alerts plotted • zoom in for districts & subcounties`
						: "Loading…"}
				</div>
			</div>

			<div className="h-[72vh] min-h-[420px] w-full">
				<AlertsGeoMap
					regions={regions}
					districts={districts}
					query={query}
					validating={validating}
				/>
			</div>

			<p className="text-[11px] text-muted-foreground">
				One pill per region at the overview; zoom in to reveal district then
				subcounty boundaries (loaded on demand). Hover any area for its name and
				count. Counts use the same canonical district matching and date window
				as the dashboard; alerts whose location can&apos;t be matched to a
				boundary aren&apos;t plotted.
			</p>
		</div>
	);
}
