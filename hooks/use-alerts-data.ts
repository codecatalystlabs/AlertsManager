import { useState, useEffect, useCallback, useMemo } from 'react';
import { AuthService, Alert as AlertType } from '@/lib/auth';
import { exportAlertsToCsv, exportAlertsToExcel } from '@/lib/alert-export';
import { ALERTS_CONFIG } from '@/constants/alerts';
import { fetchAllAlerts } from '@/lib/fetch-alerts';
import {
    getCachedAlerts,
    invalidateAlertsCache,
    setCachedAlerts,
    subscribeAlertsCache,
} from '@/lib/alerts-cache';

interface AlertsFilters {
    status: string;
    district: string;
    source: string;
    date: string;
}

interface AlertsStats {
    alive: number;
    dead: number;
    unknown: number;
    total: number;
}

interface UseAlertsDataReturn {
    alerts: AlertType[];
    filteredAlerts: AlertType[];
    stats: AlertsStats;
    filters: AlertsFilters;
    loading: boolean;
    isValidating: boolean;
    error: string | null;
    deletingId: number | null;
    uniqueDistricts: string[];
    uniqueSources: string[];
    setFilters: (filters: Partial<AlertsFilters>) => void;
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
};

export const useAlertsData = (): UseAlertsDataReturn => {
    const [alerts, setAlerts] = useState<AlertType[]>([]);
    const [loading, setLoading] = useState(true);
    const [isValidating, setIsValidating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [filters, setFiltersState] = useState<AlertsFilters>(initialFilters);

    const loadAlerts = useCallback(async (options?: { force?: boolean }) => {
        const force = options?.force ?? false;
        const cached = getCachedAlerts<AlertType[]>();

        if (!force && cached) {
            setAlerts(cached.data);
            setLoading(false);
        } else if (!cached) {
            setLoading(true);
        }

        if (force) {
            setIsValidating(true);
        }

        setError(null);

        try {
            const result = await fetchAllAlerts<AlertType[]>({ force });
            setAlerts(result.data);

            if (result.revalidate) {
                setIsValidating(true);
                result
                    .revalidate()
                    .then((fresh) => setAlerts(fresh))
                    .catch((err) =>
                        console.error('Background alerts refresh failed:', err)
                    )
                    .finally(() => setIsValidating(false));
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch alerts';
            console.error('Error fetching alerts:', err);
            setError(errorMessage);
            if (!cached) {
                setAlerts([]);
            }
        } finally {
            setLoading(false);
            setIsValidating(false);
        }
    }, []);

    const deleteAlert = useCallback(async (alertId: number) => {
        try {
            setDeletingId(alertId);
            await AuthService.deleteAlert(alertId);
            invalidateAlertsCache();
            setAlerts((currentAlerts) =>
                currentAlerts.filter((alert) => alert.id !== alertId)
            );
            const cached = getCachedAlerts<AlertType[]>();
            if (cached) {
                const next = cached.data.filter((alert) => alert.id !== alertId);
                setCachedAlerts(next);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to delete alert';
            console.error('Error deleting alert:', err);
            setError(errorMessage);
            throw err;
        } finally {
            setDeletingId(null);
        }
    }, []);

    const setFilters = useCallback((newFilters: Partial<AlertsFilters>) => {
        setFiltersState(currentFilters => ({ ...currentFilters, ...newFilters }));
    }, []);

    const filteredAlerts = useMemo(() => {
        return alerts.filter((alert) => {
            const matchesStatus = !filters.status || filters.status === 'all' || alert.status === filters.status;
            const matchesDistrict = !filters.district || filters.district === 'all' || alert.alertCaseDistrict === filters.district;
            const matchesSource = !filters.source || filters.source === 'all' || alert.sourceOfAlert === filters.source;

            let matchesDate = true;
            if (filters.date) {
                const alertDate = new Date(alert.date).toISOString().split('T')[0];
                matchesDate = alertDate === filters.date;
            }

            return matchesStatus && matchesDistrict && matchesSource && matchesDate;
        });
    }, [alerts, filters]);

    const stats = useMemo((): AlertsStats => {
        const alive = alerts.filter(alert => alert.status === 'Alive').length;
        const dead = alerts.filter(alert => alert.status === 'Dead').length;
        const unknown = alerts.filter(alert => alert.status === 'Unknown' || alert.status === 'Pending').length;
        const total = alerts.length;

        return { alive, dead, unknown, total };
    }, [alerts]);

    const uniqueDistricts = useMemo(() => {
        return Array.from(new Set(alerts.map(alert => alert.alertCaseDistrict).filter(Boolean)));
    }, [alerts]);

    const uniqueSources = useMemo(() => {
        return Array.from(new Set(alerts.map(alert => alert.sourceOfAlert).filter(Boolean)));
    }, [alerts]);

    const exportPrefix = ALERTS_CONFIG.EXPORT_FILENAME_PREFIX;

    const exportToCSV = useCallback(() => {
        const exported = exportAlertsToCsv(filteredAlerts, exportPrefix);
        if (!exported) {
            window.alert('No records to export. Adjust your filters or refresh the data.');
        }
    }, [filteredAlerts, exportPrefix]);

    const exportToExcel = useCallback(async () => {
        try {
            const exported = await exportAlertsToExcel(
                filteredAlerts,
                exportPrefix,
                'Alerts'
            );
            if (!exported) {
                window.alert('No records to export. Adjust your filters or refresh the data.');
            }
        } catch (err) {
            console.error('Excel export failed:', err);
            window.alert('Failed to export Excel file. Please try again.');
        }
    }, [filteredAlerts, exportPrefix]);

    const refetch = useCallback(() => loadAlerts({ force: true }), [loadAlerts]);

    useEffect(() => {
        loadAlerts();
    }, [loadAlerts]);

    useEffect(() => {
        const unsubscribe = subscribeAlertsCache<AlertType[]>((data) => {
            setAlerts(data);
        });
        return unsubscribe;
    }, []);

    return {
        alerts,
        filteredAlerts,
        stats,
        filters,
        loading,
        isValidating,
        error,
        deletingId,
        uniqueDistricts,
        uniqueSources,
        setFilters,
        refetch,
        deleteAlert,
        exportToCSV,
        exportToExcel,
    };
};
