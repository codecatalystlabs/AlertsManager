import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AuthService, Alert as AlertType } from '@/lib/auth';
import { exportAlertsToCsv, exportAlertsToExcel } from '@/lib/alert-export';
import { ALERTS_CONFIG } from '@/constants/alerts';
import { fetchAlertsPage, type AlertsListParams } from '@/lib/fetch-alerts';
import { fetchReportOptions } from '@/lib/fetch-reports';
import { invalidateAlertsCache } from '@/lib/alerts-cache';

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
    verified: number;
    awaitingVerification: number;
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
    const [alerts, setAlerts] = useState<AlertType[]>([]);
    const [loading, setLoading] = useState(true);
    const [isValidating, setIsValidating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [filters, setFiltersState] = useState<AlertsFilters>(initialFilters);
    const [page, setPageState] = useState(1);
    const [limit, setLimitState] = useState<number>(ALERTS_CONFIG.ITEMS_PER_PAGE);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [uniqueDistricts, setUniqueDistricts] = useState<string[]>([]);
    const [uniqueSources, setUniqueSources] = useState<string[]>([]);
    // Counts computed across the full alert universe, not the paginated page.
    const [backendCounts, setBackendCounts] = useState({
        verified: 0,
        notVerified: 0,
        total: 0,
    });
    const [statusTotals, setStatusTotals] = useState({
        alive: 0,
        dead: 0,
        unknown: 0,
    });

    const filtersRef = useRef(filters);
    filtersRef.current = filters;

    const loadAlerts = useCallback(async () => {
        setIsValidating(true);
        setError(null);

        try {
            const result = await fetchAlertsPage<AlertType>(
                toApiParams(filtersRef.current, page, limit)
            );

            setAlerts(result.data);
            setPageState(result.page);
            setLimitState(result.limit);
            setTotal(result.total);
            setTotalPages(result.totalPages);
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : 'Failed to fetch alerts';
            console.error('Error fetching alerts:', err);
            setError(errorMessage);
            setAlerts([]);
            setTotal(0);
            setTotalPages(1);
        } finally {
            setLoading(false);
            setIsValidating(false);
        }
    }, [page, limit]);

    const loadAlertsForExport = useCallback(async (): Promise<AlertType[]> => {
        const result = await fetchAlertsPage<AlertType>({
            ...toApiParams(filtersRef.current, 1, limit),
            page: 1,
            limit: 10_000,
        });
        return applyClientFilters(result.data, filtersRef.current);
    }, [limit]);

    /**
     * Counts across the entire alert universe.
     *
     * We try the dedicated `/alerts/verified/count` endpoints first; if they
     * exist they're the cheapest source. But the Go backend's response shape
     * has been inconsistent (sometimes 0 even when alerts exist), so we always
     * fall back to tallying a single unpaginated fetch — that fetch is the
     * authoritative source for status totals too, so verified/notVerified
     * derived from it cannot drift from what the user sees in the table.
     */
    const loadFullCounts = useCallback(async () => {
        try {
            const [countsResult, allAlerts] = await Promise.allSettled([
                AuthService.fetchAlertCounts(),
                fetchAlertsPage<AlertType>({ page: 1, limit: 10_000 }).then(
                    (r) => r.data
                ),
            ]);

            const records =
                allAlerts.status === 'fulfilled' ? allAlerts.value : [];

            // Always tally from the actual records — never trust a count
            // endpoint that disagrees with the data itself.
            const verifiedFromRecords = records.filter(
                (a) => a.isVerified
            ).length;
            const notVerifiedFromRecords = records.length - verifiedFromRecords;

            // Prefer the dedicated endpoint only when it returned something
            // non-zero AND the totals add up; otherwise use the record tally.
            const trustEndpoint =
                countsResult.status === 'fulfilled' &&
                countsResult.value.total > 0 &&
                countsResult.value.verified +
                    countsResult.value.notVerified ===
                    countsResult.value.total;

            const verified = trustEndpoint
                ? countsResult.value.verified
                : verifiedFromRecords;
            const notVerified = trustEndpoint
                ? countsResult.value.notVerified
                : notVerifiedFromRecords;
            const totalFromCounts = trustEndpoint
                ? countsResult.value.total
                : records.length;

            setBackendCounts({
                verified,
                notVerified,
                total: totalFromCounts,
            });

            setStatusTotals({
                alive: records.filter((a) => a.status === 'Alive').length,
                dead: records.filter((a) => a.status === 'Dead').length,
                unknown: records.filter(
                    (a) => a.status === 'Unknown' || a.status === 'Pending'
                ).length,
            });
        } catch (err) {
            // Leave previous counts in place; surface but don't break the page.
            console.error('Error fetching full alert counts:', err);
        }
    }, []);

    const deleteAlert = useCallback(
        async (alertId: number) => {
            try {
                setDeletingId(alertId);
                await AuthService.deleteAlert(alertId);
                invalidateAlertsCache();
                await Promise.all([loadAlerts(), loadFullCounts()]);
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : 'Failed to delete alert';
                console.error('Error deleting alert:', err);
                setError(errorMessage);
                throw err;
            } finally {
                setDeletingId(null);
            }
        },
        [loadAlerts, loadFullCounts]
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

    const filteredAlerts = useMemo(
        () => applyClientFilters(alerts, filters),
        [alerts, filters]
    );

    const stats = useMemo((): AlertsStats => {
        return {
            alive: statusTotals.alive,
            dead: statusTotals.dead,
            unknown: statusTotals.unknown,
            total: backendCounts.total || total || alerts.length,
            verified: backendCounts.verified,
            awaitingVerification: backendCounts.notVerified,
        };
    }, [statusTotals, backendCounts, total, alerts.length]);

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

    const refetch = useCallback(
        () => Promise.all([loadAlerts(), loadFullCounts()]).then(() => undefined),
        [loadAlerts, loadFullCounts]
    );

    useEffect(() => {
        loadAlerts();
    }, [loadAlerts, filters.district, filters.verification]);

    // Counts come from a dedicated endpoint + an unpaginated fetch, so refresh
    // them once on mount; subsequent refreshes go through `refetch`.
    useEffect(() => {
        loadFullCounts();
    }, [loadFullCounts]);

    useEffect(() => {
        let cancelled = false;

        async function loadDistrictOptions() {
            try {
                const opts = await fetchReportOptions();
                if (!cancelled) {
                    setUniqueDistricts(opts.districts.filter(Boolean));
                }
            } catch {
                // District filter can stay empty if options fail
            }
        }

        loadDistrictOptions();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        const fromPage = Array.from(
            new Set(
                alerts
                    .map((alert) => alert.sourceOfAlert)
                    .filter(Boolean) as string[]
            )
        );
        if (!fromPage.length) return;

        setUniqueSources((prev) => {
            const merged = Array.from(new Set([...prev, ...fromPage])).sort();
            if (
                merged.length === prev.length &&
                merged.every((value, index) => value === prev[index])
            ) {
                return prev;
            }
            return merged;
        });
    }, [alerts]);

    return {
        alerts,
        filteredAlerts,
        stats,
        filters,
        pagination: { page, limit, total, totalPages },
        loading,
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
