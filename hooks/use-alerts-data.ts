import { useCallback, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { AuthService, Alert as AlertType } from '@/lib/auth';
import { exportAlertsToCsv, exportAlertsToExcel } from '@/lib/alert-export';
import { ALERTS_CONFIG } from '@/constants/alerts';
import { fetchAlertsPage, type AlertsListParams } from '@/lib/fetch-alerts';
import { fetchReportOptions } from '@/lib/fetch-reports';
import { useInvalidateAlerts } from '@/hooks/use-invalidate-alerts';

interface AlertsFilters {
    status: string;
    district: string;
    source: string;
    date: string;
    verification: string;
}

interface AlertsStats {
    alive: number;
    dead: number;
    unknown: number;
    total: number;
}

interface AlertsPagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

interface UseAlertsDataReturn {
    alerts: AlertType[];
    filteredAlerts: AlertType[];
    stats: AlertsStats;
    filters: AlertsFilters;
    pagination: AlertsPagination;
    loading: boolean;
    isValidating: boolean;
    error: string | null;
    deletingId: number | null;
    uniqueDistricts: string[];
    uniqueSources: string[];
    setFilters: (filters: Partial<AlertsFilters>) => void;
    setPage: (page: number) => void;
    setPageSize: (limit: number) => void;
    refetch: () => Promise<void>;
    deleteAlert: (alertId: number) => Promise<void>;
    exportToCSV: () => void;
    exportToExcel: () => Promise<void>;
}

const initialFilters: AlertsFilters = {
    status: '',
    district: '',
    source: '',
    date: '',
    verification: 'all',
};

function toApiParams(
    filters: AlertsFilters,
    page: number,
    limit: number
): AlertsListParams {
    const params: AlertsListParams = { page, limit };

    if (filters.district && filters.district !== 'all') {
        params.district = filters.district;
    }

    if (filters.verification === 'verified') {
        params.is_verified = true;
    } else if (filters.verification === 'pending') {
        params.is_verified = false;
    }

    // Status, source and date are sent to the server so they filter the whole
    // dataset, not just the loaded page. applyClientFilters() below still runs
    // as a fallback in case the backend ignores a param.
    if (filters.status && filters.status !== 'all') {
        params.status = filters.status;
    }

    if (filters.source && filters.source !== 'all') {
        params.source = filters.source;
    }

    if (filters.date) {
        params.from_date = filters.date;
        params.to_date = filters.date;
    }

    return params;
}

function applyClientFilters(alerts: AlertType[], filters: AlertsFilters): AlertType[] {
    return alerts.filter((alert) => {
        const matchesStatus =
            !filters.status ||
            filters.status === 'all' ||
            alert.status === filters.status;
        const matchesSource =
            !filters.source ||
            filters.source === 'all' ||
            alert.sourceOfAlert === filters.source;

        let matchesDate = true;
        if (filters.date) {
            const alertDate = new Date(alert.date).toISOString().split('T')[0];
            matchesDate = alertDate === filters.date;
        }

        return matchesStatus && matchesSource && matchesDate;
    });
}

export const useAlertsData = (): UseAlertsDataReturn => {
    const [filters, setFiltersState] = useState<AlertsFilters>(initialFilters);
    const [page, setPageState] = useState(1);
    const [limit, setLimitState] = useState<number>(ALERTS_CONFIG.ITEMS_PER_PAGE);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [uniqueSources, setUniqueSources] = useState<string[]>([]);

    const filtersRef = useRef(filters);
    filtersRef.current = filters;

    const invalidateAlerts = useInvalidateAlerts();

    const {
        data,
        error: swrError,
        isLoading,
        isValidating,
        mutate,
    } = useSWR(
        ['alerts', toApiParams(filters, page, limit)] as const,
        ([, params]) => fetchAlertsPage(params),
        { keepPreviousData: true }
    );

    // District options share the reports endpoint; cached app-wide under one key.
    const { data: reportOptions } = useSWR('report-options', fetchReportOptions);

    const alerts = useMemo(() => (data?.data ?? []) as AlertType[], [data]);

    const uniqueDistricts = useMemo(
        () => (reportOptions?.districts ?? []).filter(Boolean),
        [reportOptions]
    );

    const pagination: AlertsPagination = {
        page: data?.page ?? page,
        limit: data?.limit ?? limit,
        total: data?.total ?? 0,
        totalPages: data?.totalPages ?? 1,
    };

    const error = swrError
        ? swrError instanceof Error
            ? swrError.message
            : 'Failed to fetch alerts'
        : null;

    const loadAlertsForExport = useCallback(async (): Promise<AlertType[]> => {
        const result = await fetchAlertsPage({
            ...toApiParams(filtersRef.current, 1, limit),
            page: 1,
            limit: 10_000,
        });
        return applyClientFilters(result.data as AlertType[], filtersRef.current);
    }, [limit]);

    const deleteAlert = useCallback(
        async (alertId: number) => {
            try {
                setDeletingId(alertId);
                await AuthService.deleteAlert(alertId);
                await invalidateAlerts();
            } catch (err) {
                console.error('Error deleting alert:', err);
                throw err;
            } finally {
                setDeletingId(null);
            }
        },
        [invalidateAlerts]
    );

    const setFilters = useCallback((newFilters: Partial<AlertsFilters>) => {
        setFiltersState((currentFilters) => ({
            ...currentFilters,
            ...newFilters,
        }));
        setPageState(1);
    }, []);

    const setPage = useCallback((nextPage: number) => {
        setPageState(nextPage);
    }, []);

    const setPageSize = useCallback((nextLimit: number) => {
        setLimitState(nextLimit);
        setPageState(1);
    }, []);

    const filteredAlerts = useMemo(() => {
        const filtered = applyClientFilters(alerts, filters);
        // Float pending (unverified) alerts to the top of the page,
        // preserving the server's order within each group.
        return [...filtered].sort(
            (a, b) => Number(!!a.isVerified) - Number(!!b.isVerified)
        );
    }, [alerts, filters]);

    const stats = useMemo((): AlertsStats => {
        const alive = alerts.filter((alert) => alert.status === 'Alive').length;
        const dead = alerts.filter((alert) => alert.status === 'Dead').length;
        const unknown = alerts.filter(
            (alert) => alert.status === 'Unknown' || alert.status === 'Pending'
        ).length;

        return { alive, dead, unknown, total: pagination.total || alerts.length };
    }, [alerts, pagination.total]);

    const exportPrefix = ALERTS_CONFIG.EXPORT_FILENAME_PREFIX;

    const exportToCSV = useCallback(async () => {
        try {
            const rows = await loadAlertsForExport();
            const exported = exportAlertsToCsv(rows, exportPrefix);
            if (!exported) {
                window.alert(
                    'No records to export. Adjust your filters or refresh the data.'
                );
            }
        } catch (err) {
            console.error('CSV export failed:', err);
            window.alert('Failed to export CSV file. Please try again.');
        }
    }, [loadAlertsForExport, exportPrefix]);

    const exportToExcel = useCallback(async () => {
        try {
            const rows = await loadAlertsForExport();
            const exported = await exportAlertsToExcel(rows, exportPrefix, 'Alerts');
            if (!exported) {
                window.alert(
                    'No records to export. Adjust your filters or refresh the data.'
                );
            }
        } catch (err) {
            console.error('Excel export failed:', err);
            window.alert('Failed to export Excel file. Please try again.');
        }
    }, [loadAlertsForExport, exportPrefix]);

    const refetch = useCallback(async () => {
        await mutate();
    }, [mutate]);

    // Accumulate the distinct alert sources seen across visited pages, so the
    // source filter keeps options even after the user pages away from them.
    const fromPage = useMemo(
        () =>
            Array.from(
                new Set(
                    alerts
                        .map((alert) => alert.sourceOfAlert)
                        .filter(Boolean) as string[]
                )
            ),
        [alerts]
    );

    if (fromPage.length) {
        const merged = Array.from(new Set([...uniqueSources, ...fromPage])).sort();
        if (
            merged.length !== uniqueSources.length ||
            merged.some((value, index) => value !== uniqueSources[index])
        ) {
            // Safe state update during render (React bails out if unchanged).
            setUniqueSources(merged);
        }
    }

    return {
        alerts,
        filteredAlerts,
        stats,
        filters,
        pagination,
        loading: isLoading,
        isValidating,
        error,
        deletingId,
        uniqueDistricts,
        uniqueSources,
        setFilters,
        setPage,
        setPageSize,
        refetch,
        deleteAlert,
        exportToCSV,
        exportToExcel,
    };
};
