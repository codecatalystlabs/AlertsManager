import { useCallback, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import type { ColumnFiltersState } from '@tanstack/react-table';
import { AuthService, Alert as AlertType } from '@/lib/auth';
import { exportAlertsToCsv, exportAlertsToExcel } from '@/lib/alert-export';
import { ALERTS_CONFIG } from '@/constants/alerts';
import { sourceFilterValues } from '@/lib/source-of-alert';
import {
    fetchAlertsPage,
    fetchAlertsStats,
    type AlertsListParams,
} from '@/lib/fetch-alerts';
import { columnFiltersToAlertParams } from '@/lib/alert-column-filters';
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

/** Server-side sort: `by` is a backend-whitelisted key (id|date|name|status…). */
export type AlertsSort = { by: string; order: 'asc' | 'desc' };
export const ALERTS_DEFAULT_SORT: AlertsSort = { by: '', order: 'desc' };

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
    /** Per-column header filters (server-side; scope the whole dataset). */
    columnFilters: ColumnFiltersState;
    setColumnFilters: (filters: ColumnFiltersState) => void;
    setFilters: (filters: Partial<AlertsFilters>) => void;
    sort: AlertsSort;
    setSort: (sort: AlertsSort) => void;
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
    limit: number,
    options?: { sort?: AlertsSort }
): AlertsListParams {
    const params: AlertsListParams = { page, limit };

    // Server-side sort so a header sort orders the WHOLE dataset, not just the
    // loaded page. The backend whitelists sort_by, so an empty `by` is ignored.
    if (options?.sort?.by) {
        params.sort_by = options.sort.by;
        params.order = options.sort.order;
    }

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
        // Expand the canonical source to its raw aliases so the server-side
        // IN-match also catches legacy values (mirrors call-logs).
        params.source = sourceFilterValues(filters.source).join(',');
    }

    if (filters.date) {
        params.from_date = filters.date;
        params.to_date = filters.date;
    }

    return params;
}

export const useAlertsData = (): UseAlertsDataReturn => {
    const [filters, setFiltersState] = useState<AlertsFilters>(initialFilters);
    const [columnFilters, setColumnFiltersState] = useState<ColumnFiltersState>([]);
    const [sort, setSortState] = useState<AlertsSort>(ALERTS_DEFAULT_SORT);
    const [page, setPageState] = useState(1);
    const [limit, setLimitState] = useState<number>(ALERTS_CONFIG.ITEMS_PER_PAGE);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const filtersRef = useRef(filters);
    filtersRef.current = filters;
    const columnFiltersRef = useRef(columnFilters);
    columnFiltersRef.current = columnFilters;
    const sortRef = useRef(sort);
    sortRef.current = sort;

    const invalidateAlerts = useInvalidateAlerts();

    // Merge the filter-bar params with the per-column header filters so both
    // scope the whole dataset server-side. Column filters win on overlap.
    const listParams = useMemo(
        () => ({
            ...toApiParams(filters, page, limit, { sort }),
            ...columnFiltersToAlertParams(columnFilters),
        }),
        [filters, page, limit, columnFilters, sort]
    );

    const {
        data,
        error: swrError,
        isLoading,
        isValidating,
        mutate,
    } = useSWR(
        ['alerts', listParams] as const,
        ([, params]) => fetchAlertsPage(params),
        { keepPreviousData: true }
    );

    // Summary cards count the whole filtered dataset (server-side aggregate),
    // not just the current page. Keyed on filters only — page/limit don't change
    // the totals, so paging the table never refetches the stats. Shares the
    // "alerts" root so alert create/verify/delete revalidates the cards too.
    const statsParams = useMemo(
        () => ({
            ...toApiParams(filters, 1, 1),
            ...columnFiltersToAlertParams(columnFilters),
        }),
        [filters, columnFilters]
    );
    const { data: statsData } = useSWR(
        ['alerts', 'alerts-stats', statsParams] as const,
        ([, , params]) => fetchAlertsStats(params),
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
        // Page through every result in the current filter set. A single huge
        // `limit` is unreliable because the backend caps page size, which
        // silently truncated exports (the same bug call-logs already fixed).
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
        const collected: AlertType[] = [...(first.data as AlertType[])];

        const lastPage = Math.min(Math.max(first.totalPages ?? 1, 1), MAX_EXPORT_PAGES);
        if (lastPage > 1) {
            const rest = await Promise.all(
                Array.from({ length: lastPage - 1 }, (_, index) =>
                    fetchExportPage(index + 2)
                )
            );
            for (const pageResult of rest) {
                collected.push(...(pageResult.data as AlertType[]));
            }
        }

        return collected;
    }, []);

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

    const setColumnFilters = useCallback((next: ColumnFiltersState) => {
        // Changing a column filter re-scopes the whole dataset, so go back to the
        // first page of the new result set.
        setColumnFiltersState(next);
        setPageState(1);
    }, []);

    const setSort = useCallback((next: AlertsSort) => {
        // Re-sorting reorders the whole dataset server-side, so reset to page 1.
        setSortState(next);
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
        // Filtering, sorting and pagination are server-side (see toApiParams), so
        // the page is already the correct slice. When the user has NOT chosen an
        // explicit column sort, float pending (unverified) alerts to the top
        // (preserving server order within each group). When they HAVE chosen a
        // sort, respect it exactly rather than overriding it with the float.
        if (sort.by) return alerts;
        return [...alerts].sort(
            (a, b) => Number(!!a.isVerified) - Number(!!b.isVerified)
        );
    }, [alerts, sort.by]);

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
        columnFilters,
        setColumnFilters,
        setFilters,
        sort,
        setSort,
        setPage,
        setPageSize,
        refetch,
        deleteAlert,
        exportToCSV,
        exportToExcel,
    };
};
