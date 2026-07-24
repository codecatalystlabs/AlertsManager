import { altCode } from "@/lib/alt-code";
import { useState, useCallback, useMemo, useRef } from 'react';
import useSWR from 'swr';
import type { ColumnFiltersState } from '@tanstack/react-table';
import { AuthService } from '@/lib/auth';
import { exportAlertsToCsv, exportAlertsToExcel } from '@/lib/alert-export';
import {
    CALL_LOGS_CONFIG,
    CALL_LOGS_INITIAL_FILTERS,
    type CallLogsFilterState,
} from '@/constants/call-logs';
import {
    fetchAlertsPage,
    fetchAlertsStats,
    type AlertsListParams,
} from '@/lib/fetch-alerts';
import { columnFiltersToAlertParams } from '@/lib/alert-column-filters';
import { sourceFilterValues } from '@/lib/source-of-alert';
import { useInvalidateAlerts } from '@/hooks/use-invalidate-alerts';

/** Server-side sort selection for the call-logs list. */
export interface CallLogsSort {
    /** Sort column key understood by the API; "" = server default (newest first). */
    by: string;
    order: 'asc' | 'desc';
}

export const CALL_LOGS_DEFAULT_SORT: CallLogsSort = { by: '', order: 'desc' };

export interface AlertLog {
    id: number;
    status: string;
    date: string;
    time: string;
    callTaker: string;
    cifNo: string;
    personReporting: string;
    village: string;
    subCounty: string;
    contactNumber: string;
    sourceOfAlert: string;
    channelOfReporting?: string;
    alertCaseName: string;
    alertCaseAge: number;
    alertCaseSex: string;
    alertCasePregnantDuration: number;
    alertCaseVillage: string;
    alertCaseParish: string;
    alertCaseSubCounty: string;
    alertCaseDistrict: string;
    alertCaseNationality: string;
    pointOfContactName: string;
    pointOfContactRelationship: string;
    pointOfContactPhone: string;
    history: string;
    healthFacilityVisit: string;
    traditionalHealerVisit: string;
    symptoms: string;
    actions: string;
    caseVerificationDesk: string;
    fieldVerification: string;
    fieldVerificationDecision: string;
    feedback: string;
    labSamplesCollected?: string;
    labResult: string;
    labResultDate: string | null;
    isHighlighted: boolean;
    assignedTo: string;
    alertReportedBefore: string;
    alertFrom: string;
    verified: string;
    comments: string;
    verificationDate: string;
    verificationTime: string;
    response: string;
    narrative: string;
    facilityType: string;
    facility: string;
    isVerified: boolean;
    verifiedBy: string;
    region: string;
    createdAt: string;
    updatedAt: string;
}

type CallLogsFilters = CallLogsFilterState;

interface CallLogsStats {
    alive: number;
    other: number;
    verified: number;
    pending: number;
}

interface CallLogsPagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

interface UseCallLogsDataReturn {
    alerts: AlertLog[];
    filteredAlerts: AlertLog[];
    stats: CallLogsStats;
    filters: CallLogsFilters;
    sort: CallLogsSort;
    pagination: CallLogsPagination;
    loading: boolean;
    isValidating: boolean;
    error: string | null;
    selectedAlert: AlertLog | null;
    /** Per-column header filters (server-side; scope the whole dataset). */
    columnFilters: ColumnFiltersState;
    /** Increments on clearFilters so the table can reset its own header-filter UI. */
    filtersResetKey: number;
    setColumnFilters: (filters: ColumnFiltersState) => void;
    setFilters: (filters: Partial<CallLogsFilters>) => void;
    setSort: (sort: CallLogsSort) => void;
    setSelectedAlert: (alert: AlertLog | null) => void;
    setPage: (page: number) => void;
    setPageSize: (limit: number) => void;
    refetch: () => Promise<void>;
    deleteAlert: (alertId: number) => Promise<void>;
    exportToExcel: () => Promise<void>;
    exportToCSV: () => void;
    /** Which export is currently running (drives the header's loading state). */
    exporting: 'csv' | 'excel' | null;
    clearFilters: () => void;
}

function toApiParams(
    filters: CallLogsFilters,
    page: number,
    limit: number,
    options: { sort?: CallLogsSort } = {}
): AlertsListParams {
    const params: AlertsListParams = { page, limit };

    // Verified status is a first-class server filter: "verified" -> is_verified=1
    // (desk verification done), "pending" -> is_verified=0, "all" -> unfiltered.
    if (filters.verification === 'verified') {
        params.is_verified = true;
    } else if (filters.verification === 'pending') {
        params.is_verified = false;
    }

    if (filters.region && filters.region !== 'all') {
        params.region = filters.region;
    }

    if (filters.district && filters.district !== 'all') {
        params.district = filters.district;
    }

    if (filters.division && filters.division !== 'all') {
        params.division = filters.division;
    }

    if (filters.fromDate) {
        params.from_date = filters.fromDate;
    }
    if (filters.toDate) {
        params.to_date = filters.toDate;
    }

    // Map every status filter to a SERVER param so it scopes the whole dataset
    // (and the pagination totals/cards), not just the loaded page. "other" =
    // any status that isn't Alive (incl. NULL/blank) → status_not=Alive.
    const statusMap: Record<string, string> = {
        alive: 'Alive',
        dead: 'Dead',
        unknown: 'Unknown',
    };
    if (filters.status === 'other') {
        params.status_not = 'Alive';
    } else if (filters.status && statusMap[filters.status]) {
        params.status = statusMap[filters.status];
    }

    // Source: expand the canonical label to every raw alias it merges, so the
    // server IN-filter also matches legacy stored values (e.g. "Community
    // Member" for "Community"). Mirrors normalizeSourceOfAlert on the client.
    if (filters.source && filters.source !== 'all') {
        params.source = sourceFilterValues(filters.source).join(',');
    }

    // Free-text search now runs server-side (scans the whole dataset, not just
    // the current page).
    const search = filters.search.trim();
    if (search) {
        params.search = search;
    }

    if (filters.sex && filters.sex !== 'all') {
        params.sex = filters.sex;
    }

    const ageMin = parseInt(filters.ageMin, 10);
    if (!Number.isNaN(ageMin)) {
        params.age_min = ageMin;
    }
    const ageMax = parseInt(filters.ageMax, 10);
    if (!Number.isNaN(ageMax)) {
        params.age_max = ageMax;
    }

    if (filters.callTaker.trim()) {
        params.call_taker = filters.callTaker.trim();
    }
    if (filters.assignedTo.trim()) {
        params.assigned_to = filters.assignedTo.trim();
    }
    if (filters.verifiedBy.trim()) {
        params.verified_by = filters.verifiedBy.trim();
    }

    if (options.sort?.by) {
        params.sort_by = options.sort.by;
        params.order = options.sort.order;
    }

    return params;
}

function applyClientFilters(alerts: AlertLog[], filters: CallLogsFilters): AlertLog[] {
    const search = filters.search.trim().toLowerCase();
    const callTaker = filters.callTaker.trim().toLowerCase();
    const assignedTo = filters.assignedTo.trim().toLowerCase();
    const verifiedBy = filters.verifiedBy.trim().toLowerCase();
    const ageMin = parseInt(filters.ageMin, 10);
    const ageMax = parseInt(filters.ageMax, 10);

    return alerts.filter((alert) => {
        const matchesVerification =
            filters.verification === 'all' ||
            (filters.verification === 'verified' && alert.isVerified) ||
            (filters.verification === 'pending' && !alert.isVerified);

        // Status (including "other" = not Alive) is now fully server-side via the
        // status / status_not params, so it scopes the whole dataset and the
        // pagination totals. Re-filtering here would only risk dropping rows the
        // server already matched (e.g. case differences), so this is a no-op.
        const matchesStatus = true;

        const matchesSource =
            filters.source === 'all' ||
            (alert.sourceOfAlert ?? '').toLowerCase() === filters.source.toLowerCase();

        // Mirrors the server-side search columns so a row the API matched is
        // never wrongly dropped when this page-level filter re-runs.
        const matchesSearch =
            search === '' ||
            (alert.personReporting ?? '').toLowerCase().includes(search) ||
            (alert.alertCaseName ?? '').toLowerCase().includes(search) ||
            (alert.cifNo ?? '').toLowerCase().includes(search) ||
            (alert.contactNumber ?? '').toLowerCase().includes(search) ||
            (alert.alertCaseDistrict ?? '').toLowerCase().includes(search) ||
            (alert.id?.toString() ?? '').includes(search);

        const matchesSex =
            filters.sex === 'all' ||
            (alert.alertCaseSex ?? '').toLowerCase() === filters.sex.toLowerCase();

        const age =
            typeof alert.alertCaseAge === 'number' ? alert.alertCaseAge : NaN;
        const matchesAgeMin =
            Number.isNaN(ageMin) || (!Number.isNaN(age) && age >= ageMin);
        const matchesAgeMax =
            Number.isNaN(ageMax) || (!Number.isNaN(age) && age <= ageMax);

        const matchesCallTaker =
            callTaker === '' ||
            (alert.callTaker ?? '').toLowerCase().includes(callTaker);
        const matchesAssignedTo =
            assignedTo === '' ||
            (alert.assignedTo ?? '').toLowerCase().includes(assignedTo);
        const matchesVerifiedBy =
            verifiedBy === '' ||
            (alert.verifiedBy ?? '').toLowerCase().includes(verifiedBy);

        return (
            matchesVerification &&
            matchesStatus &&
            matchesSource &&
            matchesSearch &&
            matchesSex &&
            matchesAgeMin &&
            matchesAgeMax &&
            matchesCallTaker &&
            matchesAssignedTo &&
            matchesVerifiedBy
        );
    });
}

/**
 * Human-readable tokens describing the active filters, woven into the export
 * filename so a downloaded file says what it contains (e.g.
 * call_logs_export_Kampala_Central_verified_2026-01-01_to_2026-03-31.csv).
 * Free-text filters (search, staff names) are omitted to keep names clean.
 */
function buildExportFilterTokens(filters: CallLogsFilters): string[] {
    const tokens: string[] = [];
    if (filters.region && filters.region !== 'all') tokens.push(filters.region);
    if (filters.district && filters.district !== 'all') tokens.push(filters.district);
    if (filters.division && filters.division !== 'all') tokens.push(filters.division);
    if (filters.status && filters.status !== 'all') tokens.push(filters.status);
    if (filters.verification && filters.verification !== 'all') {
        tokens.push(filters.verification);
    }
    if (filters.source && filters.source !== 'all') tokens.push(filters.source);
    if (filters.sex && filters.sex !== 'all') tokens.push(filters.sex);
    if (filters.ageMin || filters.ageMax) {
        tokens.push(`age${filters.ageMin || '0'}-${filters.ageMax || 'max'}`);
    }
    return tokens;
}

async function fetchCallLogsPage(
    filters: CallLogsFilters,
    sort: CallLogsSort,
    page: number,
    limit: number,
    columnFilters: ColumnFiltersState
): Promise<CallLogsPagination & { data: AlertLog[] }> {
    // Every filter (verified status + per-column header filters included) is
    // applied server-side, so a single page request is enough — the returned
    // pagination total already reflects the active filters.
    const result = await fetchAlertsPage({
        ...toApiParams(filters, page, limit, { sort }),
        ...columnFiltersToAlertParams(columnFilters),
    });
    return {
        ...result,
        data: result.data as AlertLog[],
    };
}

export const useCallLogsData = (): UseCallLogsDataReturn => {
    const [filters, setFiltersState] = useState<CallLogsFilters>({
        ...CALL_LOGS_INITIAL_FILTERS,
    });
    const [sort, setSortState] = useState<CallLogsSort>({
        ...CALL_LOGS_DEFAULT_SORT,
    });
    const [selectedAlert, setSelectedAlert] = useState<AlertLog | null>(null);
    const [columnFilters, setColumnFiltersState] = useState<ColumnFiltersState>([]);
    // Bumped on clearFilters so the DataTable resets its own header-filter UI.
    const [filtersResetKey, setFiltersResetKey] = useState(0);
    const [page, setPageState] = useState(1);
    const [limit, setLimitState] = useState<number>(CALL_LOGS_CONFIG.ITEMS_PER_PAGE);
    const [exporting, setExporting] = useState<'csv' | 'excel' | null>(null);

    const filtersRef = useRef(filters);
    filtersRef.current = filters;
    const sortRef = useRef(sort);
    sortRef.current = sort;
    const columnFiltersRef = useRef(columnFilters);
    columnFiltersRef.current = columnFilters;

    const invalidateAlerts = useInvalidateAlerts();

    // Keep the "alerts" root so alert mutations invalidate this view too.
    const { data, error: swrError, isLoading, isValidating, mutate } = useSWR(
        ['alerts', 'call-logs', filters, sort, page, limit, columnFilters] as const,
        ([, , currentFilters, currentSort, currentPage, currentLimit, currentColumnFilters]) =>
            fetchCallLogsPage(currentFilters, currentSort, currentPage, currentLimit, currentColumnFilters),
        { keepPreviousData: true }
    );

    // Summary cards count the whole filtered dataset (server-side aggregate),
    // not just the current page. Keyed on filters only — page/limit/sort don't
    // change the totals, so paging the table doesn't refetch the stats. Shares
    // the "alerts" root so alert mutations revalidate the cards too.
    const { data: statsData } = useSWR(
        ['alerts', 'call-logs-stats', filters, columnFilters] as const,
        ([, , currentFilters, currentColumnFilters]) =>
            fetchAlertsStats({
                ...toApiParams(currentFilters, 1, 1),
                ...columnFiltersToAlertParams(currentColumnFilters),
            }),
        { keepPreviousData: true }
    );

    const alerts = useMemo(() => (data?.data ?? []) as AlertLog[], [data]);

    const pagination: CallLogsPagination = {
        page: data?.page ?? page,
        limit: data?.limit ?? limit,
        total: data?.total ?? 0,
        totalPages: data?.totalPages ?? 1,
    };

    const error = swrError
        ? swrError instanceof Error
            ? swrError.message
            : 'Failed to fetch call logs'
        : null;

    const loadAlertsForExport = useCallback(async (): Promise<AlertLog[]> => {
        // Walk every page in the selected range. A single huge `limit` is
        // unreliable because the backend caps page size (this is why exports
        // were silently truncated to ~9 days). Page through until done.
        const EXPORT_PAGE_LIMIT = 500;
        const MAX_EXPORT_PAGES = 200; // safety cap → up to 100k rows

        const fetchExportPage = (targetPage: number) =>
            fetchAlertsPage({
                ...toApiParams(filtersRef.current, targetPage, EXPORT_PAGE_LIMIT, {
                    sort: sortRef.current,
                }),
                ...columnFiltersToAlertParams(columnFiltersRef.current),
            });

        const first = await fetchExportPage(1);
        const collected: AlertLog[] = [...(first.data as AlertLog[])];

        const lastPage = Math.min(Math.max(first.totalPages, 1), MAX_EXPORT_PAGES);

        if (lastPage > 1) {
            const rest = await Promise.all(
                Array.from({ length: lastPage - 1 }, (_, index) =>
                    fetchExportPage(index + 2)
                )
            );
            for (const pageResult of rest) {
                collected.push(...(pageResult.data as AlertLog[]));
            }
        }

        return applyClientFilters(collected, filtersRef.current);
    }, []);

    const deleteAlert = useCallback(
        async (alertId: number) => {
            const confirmed = confirm(
                `Are you sure you want to delete alert ${altCode(alertId)}? This action cannot be undone.`
            );

            if (!confirmed) return;

            try {
                await AuthService.deleteAlert(alertId);
                await invalidateAlerts();
            } catch (err) {
                console.error('Failed to delete alert:', err);
                throw err;
            }
        },
        [invalidateAlerts]
    );

    const setFilters = useCallback((newFilters: Partial<CallLogsFilters>) => {
        setFiltersState((current) => ({ ...current, ...newFilters }));
        setPageState(1);
    }, []);

    const setColumnFilters = useCallback((next: ColumnFiltersState) => {
        // A column filter re-scopes the whole dataset, so reset to the first page.
        setColumnFiltersState(next);
        setPageState(1);
    }, []);

    const setSort = useCallback((nextSort: CallLogsSort) => {
        setSortState(nextSort);
        setPageState(1);
    }, []);

    const clearFilters = useCallback(() => {
        setFiltersState({ ...CALL_LOGS_INITIAL_FILTERS });
        setSortState({ ...CALL_LOGS_DEFAULT_SORT });
        setColumnFiltersState([]);
        setFiltersResetKey((k) => k + 1);
        setPageState(1);
    }, []);

    const setPage = useCallback((nextPage: number) => {
        setPageState(nextPage);
    }, []);

    const setPageSize = useCallback((nextLimit: number) => {
        setLimitState(nextLimit);
        setPageState(1);
    }, []);

    const filteredAlerts = useMemo(
        () => applyClientFilters(alerts, filters),
        [alerts, filters]
    );

    const stats = useMemo(
        (): CallLogsStats => ({
            alive: statsData?.alive ?? 0,
            other: statsData?.other ?? 0,
            verified: statsData?.verified ?? 0,
            pending: statsData?.pending ?? 0,
        }),
        [statsData]
    );

    const exportPrefix = CALL_LOGS_CONFIG.EXPORT_FILENAME_PREFIX;

    const exportToCSV = useCallback(async () => {
        setExporting('csv');
        try {
            const rows = await loadAlertsForExport();
            const exported = exportAlertsToCsv(rows, exportPrefix, {
                range: {
                    from: filtersRef.current.fromDate,
                    to: filtersRef.current.toDate,
                },
                tokens: buildExportFilterTokens(filtersRef.current),
            });
            if (!exported) {
                window.alert(
                    'No records to export. Adjust your filters or refresh the data.'
                );
            }
        } catch (err) {
            console.error('CSV export failed:', err);
            window.alert('Failed to export CSV file. Please try again.');
        } finally {
            setExporting(null);
        }
    }, [loadAlertsForExport, exportPrefix]);

    const exportToExcel = useCallback(async () => {
        setExporting('excel');
        try {
            const rows = await loadAlertsForExport();
            const exported = await exportAlertsToExcel(
                rows,
                exportPrefix,
                'Call Logs',
                {
                    range: {
                        from: filtersRef.current.fromDate,
                        to: filtersRef.current.toDate,
                    },
                    tokens: buildExportFilterTokens(filtersRef.current),
                }
            );
            if (!exported) {
                window.alert(
                    'No records to export. Adjust your filters or refresh the data.'
                );
            }
        } catch (err) {
            console.error('Excel export failed:', err);
            window.alert('Failed to export Excel file. Please try again.');
        } finally {
            setExporting(null);
        }
    }, [loadAlertsForExport, exportPrefix]);

    const refetch = useCallback(async () => {
        await mutate();
    }, [mutate]);

    return {
        alerts,
        filteredAlerts,
        stats,
        filters,
        sort,
        pagination,
        loading: isLoading,
        isValidating,
        error,
        selectedAlert,
        columnFilters,
        filtersResetKey,
        setColumnFilters,
        setFilters,
        setSort,
        setSelectedAlert,
        setPage,
        setPageSize,
        refetch,
        deleteAlert,
        exportToExcel,
        exportToCSV,
        exporting,
        clearFilters,
    };
};
