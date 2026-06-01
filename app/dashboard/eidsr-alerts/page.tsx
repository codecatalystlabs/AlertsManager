"use client";

import { useCallback, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ErrorAlert } from "@/components/dashboard";
import {
	EidsrAlertsFilters,
	EidsrAlertsHeader,
	EidsrAlertsTable,
	EidsrEventDetailsDialog,
} from "@/components/eidsr-alerts";
import { useEidsrEventsData } from "@/hooks/use-eidsr-events-data";
import type { EidsrEvent } from "@/lib/fetch-eidsr-events";
import { LAYOUT } from "@/constants/layout";
import { CheckCircle2 } from "lucide-react";

export default function EidsrAlertsPage() {
	const {
		events,
		filters,
		pagination,
		loading,
		isSyncing,
		isValidating,
		error,
		syncMessage,
		setFilters,
		clearFilters,
		applyFilters,
		setPage,
		setPageSize,
		refetch,
		syncFromRemote,
	} = useEidsrEventsData();

	const [selectedEvent, setSelectedEvent] = useState<EidsrEvent | null>(null);
	const [isDetailsOpen, setIsDetailsOpen] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);

	const handleRefresh = useCallback(async () => {
		setIsRefreshing(true);
		try {
			await refetch();
		} finally {
			setIsRefreshing(false);
		}
	}, [refetch]);

	const handleApplyFilters = useCallback(async () => {
		await applyFilters();
	}, [applyFilters]);

	const handleClearFilters = useCallback(async () => {
		clearFilters();
		await applyFilters();
	}, [clearFilters, applyFilters]);

	const handleViewEvent = useCallback((event: EidsrEvent) => {
		setSelectedEvent(event);
		setIsDetailsOpen(true);
	}, []);

	const closeDetails = useCallback(() => {
		setIsDetailsOpen(false);
		setSelectedEvent(null);
	}, []);

	return (
		<div className={LAYOUT.pageGap}>
			<EidsrAlertsHeader
				onRefresh={handleRefresh}
				onSyncFromRemote={syncFromRemote}
				isRefreshing={isRefreshing || isValidating}
				isSyncing={isSyncing}
			/>

			{syncMessage && (
				<Alert className="border-green-200 bg-green-50">
					<CheckCircle2 className="h-4 w-4 text-green-600" />
					<AlertDescription className="text-green-700">
						{syncMessage}
					</AlertDescription>
				</Alert>
			)}

			{error && (
				<ErrorAlert
					error={error}
					onRetry={handleRefresh}
					retrying={isRefreshing}
				/>
			)}

			<EidsrAlertsFilters
				filters={filters}
				onFiltersChange={setFilters}
				onApply={handleApplyFilters}
				onClear={handleClearFilters}
				isLoading={loading || isValidating || isSyncing}
			/>

			<EidsrAlertsTable
				events={events}
				totalCount={pagination.total}
				page={pagination.page}
				pageSize={pagination.limit}
				totalPages={pagination.totalPages}
				isLoading={loading || isValidating}
				onPageChange={setPage}
				onPageSizeChange={setPageSize}
				onViewEvent={handleViewEvent}
			/>

			<EidsrEventDetailsDialog
				isOpen={isDetailsOpen}
				onClose={closeDetails}
				event={selectedEvent}
			/>
		</div>
	);
}
