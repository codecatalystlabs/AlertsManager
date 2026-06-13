import { useCallback, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { AuthService, Alert as AlertType } from '@/lib/auth';
import { exportAlertsToCsv, exportAlertsToExcel } from '@/lib/alert-export';
import { ALERTS_CONFIG } from '@/constants/alerts';
import {
    fetchAlertsPage,
    fetchAlertsStats,
    type AlertsListParams,
} from '@/lib/fetch-alerts';
import { useInvalidateAlerts } from '@/hooks/use-invalidate-alerts';

interface AlertsFilters {
    status: string;
    region: string;
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
    region: '',
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

    if (filters.region && filters.region !== 'all') {
        params.region = filters.region;
    }

    if (filters.district && filters.district !== 'all') {
        params.district = filters.district;
    }

    if (filters.verification === 'verified') {
        params.is_verified = true;
    } else if (filters.verification === 'pending') {
        params.is_verified = false;
    }

    // Status, source and date are filtered server-side so they scope the whole
    // dataset (and the summary cards), not just the loaded page.
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

    // Summary cards count the whole filtered dataset (server-side aggregate),
    // not just the current page. Keyed on filters only — page/limit don't change
    // the totals, so paging the table never refetches the stats. Shares the
    // "alerts" root so alert create/verify/delete revalidates the cards too.
    const { data: statsData } = useSWR(
        ['alerts', 'alerts-stats', filters] as const,
        ([, , currentFilters]) =>
            fetchAlertsStats(toApiParams(currentFilters, 1, 1)),
        { keepPreviousData: true }
    );

    const alerts = useMemo(() => (data?.data ?? []) as AlertType[], [data]);

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
        // Same server-side filters as the table, just unpaginated, so the export
        // covers the whole filtered dataset rather than the current page.
        const result = await fetchAlertsPage({
            ...toApiParams(filtersRef.current, 1, limit),
            page: 1,
            limit: 10_000,
        });
        return result.data as AlertType[];
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
        // Filtering and pagination are server-side (see toApiParams), so the page
        // is already the correct slice. Just float pending (unverified) alerts to
        // the top, preserving the server's order within each group.
        return [...alerts].sort(
            (a, b) => Number(!!a.isVerified) - Number(!!b.isVerified)
        );
    }, [alerts]);

    const stats = useMemo(
        (): AlertsStats => ({
            alive: statsData?.alive ?? 0,
            dead: statsData?.dead ?? 0,
            unknown: statsData?.unknown ?? 0,
            total: statsData?.total ?? pagination.total,
        }),
        [statsData, pagination.total]
    );

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
