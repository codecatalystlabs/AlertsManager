import { useState, useCallback, useMemo, useRef } from 'react';
import useSWR from 'swr';
import { AuthService } from '@/lib/auth';
import { exportAlertsToCsv, exportAlertsToExcel } from '@/lib/alert-export';
import {
    CALL_LOGS_CONFIG,
    CALL_LOGS_INITIAL_FILTERS,
    type CallLogsFilterState,
} from '@/constants/call-logs';
import { fetchAlertsPage, type AlertsListParams } from '@/lib/fetch-alerts';
import { useInvalidateAlerts } from '@/hooks/use-invalidate-alerts';

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
    pagination: CallLogsPagination;
    loading: boolean;
    isValidating: boolean;
    error: string | null;
    selectedAlert: AlertLog | null;
    setFilters: (filters: Partial<CallLogsFilters>) => void;
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
    limit: number
): AlertsListParams {
    const params: AlertsListParams = { page, limit };

    if (filters.verification === 'verified') {
        params.is_verified = true;
    } else if (filters.verification === 'pending') {
        params.is_verified = false;
    }

    if (filters.district && filters.district !== 'all') {
        params.district = filters.district;
    }

    if (filters.fromDate) {
        params.from_date = filters.fromDate;
    }
    if (filters.toDate) {
        params.to_date = filters.toDate;
    }

    // Map concrete statuses to the server `status` param so they filter the
    // whole dataset. "other" (= any status that isn't Alive) has no single
    // server value, so it stays a client-side page filter via applyClientFilters.
    const statusMap: Record<string, string> = {
        alive: 'Alive',
        dead: 'Dead',
        unknown: 'Unknown',
    };
    if (filters.status && statusMap[filters.status]) {
        params.status = statusMap[filters.status];
    }

    if (filters.source && filters.source !== 'all') {
        params.source = filters.source;
    }

    return params;
}

function applyClientFilters(alerts: AlertLog[], filters: CallLogsFilters): AlertLog[] {
    return alerts.filter((alert) => {
        const matchesStatus =
            filters.status === 'all' ||
            (filters.status === 'other' && alert.status !== 'Alive') ||
            (alert.status ?? '').toLowerCase() === filters.status.toLowerCase();

        const matchesSource =
            filters.source === 'all' ||
            (alert.sourceOfAlert ?? '').toLowerCase() === filters.source.toLowerCase();

        const search = filters.search.toLowerCase();
        const matchesSearch =
            filters.search === '' ||
            (alert.personReporting ?? '').toLowerCase().includes(search) ||
            (alert.contactNumber ?? '').includes(filters.search) ||
            (alert.alertCaseDistrict ?? '').toLowerCase().includes(search) ||
            (alert.id?.toString() ?? '').includes(filters.search);

        return matchesStatus && matchesSource && matchesSearch;
    });
}

export const useCallLogsData = (): UseCallLogsDataReturn => {
    const [filters, setFiltersState] = useState<CallLogsFilters>({
        ...CALL_LOGS_INITIAL_FILTERS,
    });
    const [selectedAlert, setSelectedAlert] = useState<AlertLog | null>(null);
    const [page, setPageState] = useState(1);
    const [limit, setLimitState] = useState<number>(CALL_LOGS_CONFIG.ITEMS_PER_PAGE);
    const [exporting, setExporting] = useState<'csv' | 'excel' | null>(null);

    const filtersRef = useRef(filters);
    filtersRef.current = filters;

    const invalidateAlerts = useInvalidateAlerts();

    // Shares the ["alerts", …] key space with the alerts page, so identical
    // requests dedupe and an alert mutation invalidates both views at once.
    const { data, error: swrError, isLoading, isValidating, mutate } = useSWR(
        ['alerts', toApiParams(filters, page, limit)] as const,
        ([, params]) => fetchAlertsPage(params),
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
            fetchAlertsPage(
                toApiParams(filtersRef.current, targetPage, EXPORT_PAGE_LIMIT)
            );

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
                `Are you sure you want to delete alert ALT${String(alertId).padStart(3, '0')}? This action cannot be undone.`
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

    const clearFilters = useCallback(() => {
        setFiltersState({ ...CALL_LOGS_INITIAL_FILTERS });
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

    const stats = useMemo((): CallLogsStats => {
        const alive = alerts.filter((alert) => alert.status === 'Alive').length;
        const other = alerts.filter((alert) => alert.status !== 'Alive').length;
        const verified = alerts.filter((alert) => alert.isVerified).length;
        const pending = alerts.filter((alert) => !alert.isVerified).length;

        return { alive, other, verified, pending };
    }, [alerts]);

    const exportPrefix = CALL_LOGS_CONFIG.EXPORT_FILENAME_PREFIX;

    const exportToCSV = useCallback(async () => {
        setExporting('csv');
        try {
            const rows = await loadAlertsForExport();
            const exported = exportAlertsToCsv(rows, exportPrefix, {
                from: filtersRef.current.fromDate,
                to: filtersRef.current.toDate,
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
                    from: filtersRef.current.fromDate,
                    to: filtersRef.current.toDate,
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
        pagination,
        loading: isLoading,
        isValidating,
        error,
        selectedAlert,
        setFilters,
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
