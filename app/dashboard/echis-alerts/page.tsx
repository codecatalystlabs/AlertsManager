"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { ErrorAlert } from "@/components/dashboard";
import { EchisAlertDetailsDialog, EchisAlertsTable } from "@/components/echis-alerts";
import { NdwPageHeader } from "@/components/ndw-alerts/ndw-page-header";
import { NdwSegmentTiles } from "@/components/ndw-alerts/ndw-segment-tiles";
import { NdwQuickFilterBar } from "@/components/ndw-alerts/ndw-quick-filter-bar";
import { NdwLiveFilterSheet } from "@/components/ndw-alerts/ndw-live-filter-sheet";
import { NdwEmptyState, NdwLiveBanner } from "@/components/ndw-alerts/ndw-feed-notices";
import { ForwardToDistrictDialog } from "@/components/forward-to-district-dialog";
import { ndwRegisterAlertId } from "@/components/ndw-alerts/ndw-signals-table";
import { RawInformationSyncFooter, SyncProgressPanel } from "@/components/sync";
import { ECHIS_NDW_FILTER_FIELDS } from "@/constants/ndw-filter-fields";
import {
	buildEchisChips,
	buildEchisSegments,
	ECHIS_ALERTS_CONFIG,
	ECHIS_MORE_FIELDS,
} from "@/constants/echis-alerts";
import { useEchisAlertsData } from "@/hooks/use-echis-alerts-data";
import { useCurrentUser } from "@/hooks/use-current-user";
import { feedActions } from "@/lib/access";
import { forwardEchisAlert, type EchisAlertRow } from "@/lib/fetch-ndw-alerts";
import { echisToAlertShape } from "@/lib/ndw-alert-to-shape";
import { LAYOUT } from "@/constants/layout";
import { ORIGIN_ECHIS } from "@/lib/signal-origin";

const AlertVerificationDialog = dynamic(
	() =>
		import("@/components/alert-verification-dialog").then(
			(m) => m.AlertVerificationDialog
		),
	{ ssr: false }
);

export default function EchisAlertsPage() {
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
	} = useEchisAlertsData();
	const actions = feedActions(useCurrentUser(), "echis");

	const [selected, setSelected] = useState<EchisAlertRow | null>(null);
	const [detailsOpen, setDetailsOpen] = useState(false);
	const [forwardTarget, setForwardTarget] = useState<EchisAlertRow | null>(null);
	const [forwardOpen, setForwardOpen] = useState(false);
	const [verifyTarget, setVerifyTarget] = useState<EchisAlertRow | null>(null);
	const [verifyOpen, setVerifyOpen] = useState(false);
	const [liveOpen, setLiveOpen] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);

	const live = stats.live;
	const filtered = Boolean(applied.search) || Object.keys(applied.local).length > 0;
	const segments = useMemo(() => buildEchisSegments(facets), [facets]);
	const chips = useMemo(() => buildEchisChips(facets), [facets]);
	const activeSegment = segment ? segments.find((s) => s.key === segment) : undefined;

	// Stabilize the prefill shape so the verify dialog isn't handed a brand-new
	// object on every SWR auto-refresh (belt-and-suspenders alongside the dialog's
	// id-keyed reset effect).
	const verifyAlertShape = useMemo(
		() => (verifyTarget ? echisToAlertShape(verifyTarget) : null),
		[verifyTarget]
	);

	// Stable so the table's column defs are not rebuilt on every render.
	const openDetails = useCallback((a: EchisAlertRow) => {
		setSelected(a);
		setDetailsOpen(true);
	}, []);
	const openForward = useCallback((a: EchisAlertRow) => {
		setDetailsOpen(false);
		setForwardTarget(a);
		setForwardOpen(true);
	}, []);
	const openVerify = useCallback((a: EchisAlertRow) => {
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
				feed="echis"
				title={ECHIS_ALERTS_CONFIG.PAGE_TITLE}
				description={ECHIS_ALERTS_CONFIG.PAGE_DESCRIPTION}
				sync={facets?.sync}
				isSyncing={isSyncing}
				progress={syncProgress}
				onSync={() => void syncFromRemote({ refreshExisting: true })}
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
					<RawInformationSyncFooter autoLog={syncProgress?.autoLog} origin={ORIGIN_ECHIS}>
						They are untriaged in Raw Information, flagged{" "}
						<span className="font-semibold text-emerald-700">eCHIS</span>, each in the district its eCHIS record names; any whose district matches
					none wait for one to be set at triage.
					</RawInformationSyncFooter>
				}
			/>

			<NdwSegmentTiles
				segments={segments}
				active={segment}
				onSelect={setSegment}
				isLoading={facetsLoading}
				disabled={live}
				className="grid-cols-2 sm:grid-cols-4 2xl:grid-cols-8"
			/>

			{live ? (
				<NdwLiveBanner
					total={pagination.total}
					noun="signals"
					onEdit={() => setLiveOpen(true)}
					onExit={clearLiveFilters}
				/>
			) : (
				<NdwQuickFilterBar
					searchPlaceholder="Search district, facility, VHT, village, description…"
					chips={chips}
					moreFields={ECHIS_MORE_FIELDS}
					applied={applied}
					onApply={applyQuickFilters}
					onOpenLive={() => setLiveOpen(true)}
					isLoading={loading}
				/>
			)}

			<EchisAlertsTable
				title={live ? "Live NDW results" : (activeSegment?.label ?? "All signals")}
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
						noun="signals"
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
				fields={ECHIS_NDW_FILTER_FIELDS}
				filters={applied.ndwFilters}
				operators={applied.operators}
				onApply={applyLiveFilters}
			/>

			<EchisAlertDetailsDialog
				alert={selected}
				open={detailsOpen}
				onOpenChange={setDetailsOpen}
				onForward={actions.forward ? openForward : undefined}
				onVerify={actions.verify ? openVerify : undefined}
			/>

			<ForwardToDistrictDialog
				isOpen={forwardOpen}
				onClose={() => setForwardOpen(false)}
				sourceLabel="eCHIS signal"
				defaultDistrict={forwardTarget?.district || ""}
				alreadyForwarded={forwardTarget?.forwardedToDistrict ?? null}
				allowRepeat
				registerAlertId={ndwRegisterAlertId(forwardTarget)}
				onForward={(district, note, again) =>
					forwardEchisAlert(forwardTarget!.id, { district, note, again })
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
					ndwSource="echis"
					ndwId={verifyTarget.id}
					onVerificationComplete={() => void refetch()}
				/>
			)}
		</div>
	);
}
