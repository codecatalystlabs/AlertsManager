"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { ErrorAlert } from "@/components/dashboard";
import { PoeAlertDetailsDialog, PoeAlertsTable } from "@/components/poe-alerts";
import { NdwPageHeader } from "@/components/ndw-alerts/ndw-page-header";
import { NdwSegmentTiles } from "@/components/ndw-alerts/ndw-segment-tiles";
import { NdwQuickFilterBar } from "@/components/ndw-alerts/ndw-quick-filter-bar";
import { NdwLiveFilterSheet } from "@/components/ndw-alerts/ndw-live-filter-sheet";
import { NdwEmptyState, NdwLiveBanner } from "@/components/ndw-alerts/ndw-feed-notices";
import { ForwardToDistrictDialog } from "@/components/forward-to-district-dialog";
import { RawInformationSyncFooter, SyncProgressPanel } from "@/components/sync";
import { POE_NDW_FILTER_FIELDS } from "@/constants/ndw-filter-fields";
import {
	buildPoeChips,
	buildPoeSegments,
	POE_ALERTS_CONFIG,
	POE_MORE_FIELDS,
} from "@/constants/poe-alerts";
import { usePoeAlertsData } from "@/hooks/use-poe-alerts-data";
import { useCurrentUser } from "@/hooks/use-current-user";
import { feedActions } from "@/lib/access";
import { forwardPoeAlert, type PoeAlertRow } from "@/lib/fetch-ndw-alerts";
import { poeToAlertShape } from "@/lib/ndw-alert-to-shape";
import { LAYOUT } from "@/constants/layout";
import { ORIGIN_POE } from "@/lib/signal-origin";

const AlertVerificationDialog = dynamic(
	() =>
		import("@/components/alert-verification-dialog").then(
			(m) => m.AlertVerificationDialog
		),
	{ ssr: false }
);

export default function PoeAlertsPage() {
	const {
		alerts,
		stats,
		applied,
		facets,
		facetsLoading,
		segment,
		setSegment,
		pagination,
		loading,
		isSyncing,
		error,
		syncMessage,
		syncProgress,
		applyQuickFilters,
		applyLiveFilters,
		clearLiveFilters,
		clearFilters,
		setColumnFilters,
		filtersResetKey,
		setPage,
		setPageSize,
		refetch,
		syncFromRemote,
	} = usePoeAlertsData();
	const actions = feedActions(useCurrentUser(), "poe");

	const [selected, setSelected] = useState<PoeAlertRow | null>(null);
	const [detailsOpen, setDetailsOpen] = useState(false);
	const [forwardTarget, setForwardTarget] = useState<PoeAlertRow | null>(null);
	const [forwardOpen, setForwardOpen] = useState(false);
	const [verifyTarget, setVerifyTarget] = useState<PoeAlertRow | null>(null);
	const [verifyOpen, setVerifyOpen] = useState(false);
	const [liveOpen, setLiveOpen] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);

	const live = stats.live;
	const filtered = Boolean(applied.search) || Object.keys(applied.local).length > 0;
	const segments = useMemo(() => buildPoeSegments(facets, filtered), [facets, filtered]);
	const chips = useMemo(() => buildPoeChips(facets), [facets]);
	const activeSegment = segment ? segments.find((s) => s.key === segment) : undefined;

	// Stabilize the prefill shape so the verify dialog isn't handed a brand-new
	// object on every SWR auto-refresh (belt-and-suspenders alongside the dialog's
	// id-keyed reset effect).
	const verifyAlertShape = useMemo(
		() => (verifyTarget ? poeToAlertShape(verifyTarget) : null),
		[verifyTarget]
	);

	// Stable so the table's column defs are not rebuilt on every render.
	const openDetails = useCallback((a: PoeAlertRow) => {
		setSelected(a);
		setDetailsOpen(true);
	}, []);
	const openForward = useCallback((a: PoeAlertRow) => {
		setDetailsOpen(false);
		setForwardTarget(a);
		setForwardOpen(true);
	}, []);
	const openVerify = useCallback((a: PoeAlertRow) => {
		setDetailsOpen(false);
		setVerifyTarget(a);
		setVerifyOpen(true);
	}, []);

	const handleRefresh = async () => {
		setIsRefreshing(true);
		try {
			await refetch();
		} finally {
			setIsRefreshing(false);
		}
	};

	return (
		<div className={LAYOUT.pageGap}>
			<NdwPageHeader
				feed="poe"
				title={POE_ALERTS_CONFIG.PAGE_TITLE}
				description={POE_ALERTS_CONFIG.PAGE_DESCRIPTION}
				sync={facets?.sync}
				isSyncing={isSyncing}
				progress={syncProgress}
				onSync={() => void syncFromRemote()}
				onRefresh={() => void handleRefresh()}
				isRefreshing={isRefreshing}
			/>

			{error ? (
				<ErrorAlert error={error} onRetry={() => void refetch()} />
			) : null}

			<SyncProgressPanel
				source="NDW"
				isSyncing={isSyncing}
				progress={syncProgress}
				summaryMessage={syncMessage}
				footer={
					<RawInformationSyncFooter autoLog={syncProgress?.autoLog} origin={ORIGIN_POE}>
						They are untriaged in Raw Information, flagged{" "}
						<span className="font-semibold text-violet-700">PoE</span>, with a district only where the traveller&apos;s address in Uganda names
					one — confirm it, or set it, at triage.
					</RawInformationSyncFooter>
				}
			/>

			<NdwSegmentTiles
				segments={segments}
				active={segment}
				onSelect={setSegment}
				isLoading={facetsLoading}
				disabled={live}
				className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
			/>

			{live ? (
				<NdwLiveBanner
					total={pagination.total}
					noun="travellers"
					onEdit={() => setLiveOpen(true)}
					onExit={clearLiveFilters}
				/>
			) : (
				<NdwQuickFilterBar
					searchPlaceholder="Search name, passport, flight, ref…"
					chips={chips}
					moreFields={POE_MORE_FIELDS}
					applied={applied}
					onApply={applyQuickFilters}
					onOpenLive={() => setLiveOpen(true)}
					isLoading={loading}
				/>
			)}

			<PoeAlertsTable
				title={live ? "Live NDW results" : (activeSegment?.label ?? "All travellers")}
				alerts={alerts}
				totalCount={pagination.total}
				page={pagination.page}
				pageSize={pagination.limit}
				totalPages={pagination.totalPages}
				isLoading={loading}
				onPageChange={setPage}
				onPageSizeChange={setPageSize}
				onColumnFiltersChange={setColumnFilters}
				filtersResetKey={filtersResetKey}
				emptyState={
					<NdwEmptyState
						noun="travellers"
						segmentLabel={live ? undefined : activeSegment?.label}
						filtered={filtered || live}
						onShowAll={() => setSegment("")}
						onClear={clearFilters}
					/>
				}
				onView={openDetails}
				onForward={openForward}
				onVerify={openVerify}
			/>

			<NdwLiveFilterSheet
				open={liveOpen}
				onOpenChange={setLiveOpen}
				fields={POE_NDW_FILTER_FIELDS}
				filters={applied.ndwFilters}
				operators={applied.operators}
				onApply={applyLiveFilters}
			/>

			<PoeAlertDetailsDialog
				alert={selected}
				open={detailsOpen}
				onOpenChange={setDetailsOpen}
				onForward={actions.forward ? openForward : undefined}
				onVerify={actions.verify ? openVerify : undefined}
			/>

			<ForwardToDistrictDialog
				isOpen={forwardOpen}
				onClose={() => setForwardOpen(false)}
				sourceLabel="POE alert"
				alreadyForwarded={forwardTarget?.forwardedToDistrict ?? null}
				onForward={(district, note) =>
					forwardPoeAlert(forwardTarget!.id, { district, note })
				}
				onForwarded={() => void refetch()}
			/>

			{verifyOpen && verifyTarget && verifyAlertShape && (
				<AlertVerificationDialog
					isOpen={verifyOpen}
					onClose={() => {
						setVerifyOpen(false);
						setVerifyTarget(null);
					}}
					alert={verifyAlertShape}
					ndwSource="poe"
					ndwId={verifyTarget.id}
					onVerificationComplete={() => void refetch()}
				/>
			)}
		</div>
	);
}
