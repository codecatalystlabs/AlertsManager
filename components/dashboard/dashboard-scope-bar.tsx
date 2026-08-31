"use client";

import React, { memo } from "react";
import { Download, MapPin, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { alertResponse } from "@/constants";
import type { DashboardScope } from "@/hooks/use-dashboard-scope";
import { DashboardRangePicker } from "./dashboard-range-picker";
import { DashboardDistrictPicker } from "./dashboard-district-picker";
import { DashboardRegionPicker } from "./dashboard-region-picker";

interface DashboardScopeBarProps {
	title: string;
	scope: DashboardScope;
	loading: boolean;
	onRefresh: () => void;
	isRefreshing: boolean;
	/** Omit to hide the PDF button. */
	onDownload?: () => void;
	isDownloading?: boolean;
	downloadDisabled?: boolean;
}

/**
 * The filter/action strip at the top of a dashboard view: title + scope line
 * on the left; refresh, PDF export and the range / region / district /
 * response pickers on the right.
 *
 * District- and region-scoped users see a locked chip in place of the picker
 * they cannot change (enforced server-side anyway); a region-scoped user can
 * still narrow to a district WITHIN their region.
 */
export const DashboardScopeBar = memo<DashboardScopeBarProps>(
	({
		title,
		scope,
		loading,
		onRefresh,
		isRefreshing,
		onDownload,
		isDownloading,
		downloadDisabled,
	}) => {
		const {
			region,
			district,
			response,
			setRange,
			setRegion,
			setDistrict,
			setResponse,
			scopedToDistrict,
			assignedDistrict,
			scopedToRegion,
			assignedRegion,
			scopeLabel,
		} = scope;

		return (
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div className="min-w-0">
					<h2 className="text-base font-semibold text-gray-900">{title}</h2>
					<p className="text-xs text-muted-foreground">{scopeLabel}</p>
				</div>
				<div className="flex flex-wrap items-end gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={onRefresh}
						disabled={isRefreshing || loading}
						className="h-8 gap-2"
						aria-label="Refresh"
					>
						<RefreshCw
							className={`h-4 w-4 ${isRefreshing || loading ? "animate-spin" : ""}`}
						/>
						<span className="hidden sm:inline">Refresh</span>
					</Button>
					{onDownload && (
						<Button
							variant="outline"
							size="sm"
							onClick={onDownload}
							disabled={downloadDisabled || isDownloading}
							className="h-8 gap-2"
							aria-label="Download as PDF"
						>
							<Download className="h-4 w-4" />
							<span className="hidden sm:inline">
								{isDownloading ? "Preparing…" : "Download (PDF)"}
							</span>
						</Button>
					)}
					{scopedToDistrict ? (
						<div
							className="flex h-8 items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 text-xs font-medium text-gray-700"
							title="You can only see data for your assigned district"
						>
							<MapPin className="h-3.5 w-3.5 text-uganda-red" />
							<span>{assignedDistrict || "No district assigned"}</span>
						</div>
					) : scopedToRegion ? (
						<>
							<div
								className="flex h-8 items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 text-xs font-medium text-gray-700"
								title="You can only see data for your assigned region"
							>
								<MapPin className="h-3.5 w-3.5 text-uganda-red" />
								<span>{assignedRegion || "No region assigned"}</span>
							</div>
							<DashboardDistrictPicker
								value={district}
								onChange={setDistrict}
								disabled={loading}
								region={assignedRegion || "all"}
							/>
						</>
					) : (
						<>
							<DashboardRegionPicker
								value={region}
								onChange={setRegion}
								disabled={loading}
							/>
							<DashboardDistrictPicker
								value={district}
								onChange={setDistrict}
								disabled={loading}
								region={region}
							/>
						</>
					)}
					<DashboardRangePicker onChange={setRange} disabled={loading} />
					<Select value={response} onValueChange={setResponse} disabled={loading}>
						<SelectTrigger
							className="h-8 w-[160px] text-xs"
							aria-label="Filter by response type"
						>
							<SelectValue placeholder="All response types" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All response types</SelectItem>
							{/* Canonical response taxonomy (same list as the Add/Edit/Verify
							    forms) — value is the disease code, which the backend matches
							    by folding stored responses onto the same canonical bucket. */}
							{alertResponse.map((r) => (
								<SelectItem key={r.code} value={r.code}>
									{r.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>
		);
	}
);
DashboardScopeBar.displayName = "DashboardScopeBar";
