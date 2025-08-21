import { useState, useEffect, useCallback, useMemo } from 'react';
import { AuthService, Alert as AlertType } from '@/lib/auth';

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
    error: string | null;
    deletingId: number | null;
    uniqueDistricts: string[];
    uniqueSources: string[];
    setFilters: (filters: Partial<AlertsFilters>) => void;
    refetch: () => Promise<void>;
    deleteAlert: (alertId: number) => Promise<void>;
    exportToCSV: () => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8089/api/v1';

const initialFilters: AlertsFilters = {
    status: '',
    district: '',
    source: '',
    date: '',
};

export const useAlertsData = (): UseAlertsDataReturn => {
    const [alerts, setAlerts] = useState<AlertType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [filters, setFiltersState] = useState<AlertsFilters>(initialFilters);

    const fetchAlerts = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await AuthService.makeAuthenticatedRequest(`${API_BASE_URL}/alerts`);

            if (!response.ok) {
                throw new Error(`Failed to fetch alerts: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            setAlerts(Array.isArray(data) ? data : []);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch alerts';
            console.error('Error fetching alerts:', err);
            setError(errorMessage);
            setAlerts([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const deleteAlert = useCallback(async (alertId: number) => {
        try {
            setDeletingId(alertId);
            await AuthService.deleteAlert(alertId);

            // Remove the alert from local state
            setAlerts(currentAlerts => currentAlerts.filter(alert => alert.id !== alertId));
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to delete alert';
            console.error('Error deleting alert:', err);
            setError(errorMessage);
            throw err; // Re-throw to allow component to handle UI feedback
        } finally {
            setDeletingId(null);
        }
    }, []);

    const setFilters = useCallback((newFilters: Partial<AlertsFilters>) => {
        setFiltersState(currentFilters => ({ ...currentFilters, ...newFilters }));
    }, []);

    // Memoized filtered data
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

    // Memoized statistics
    const stats = useMemo((): AlertsStats => {
        const alive = alerts.filter(alert => alert.status === 'Alive').length;
        const dead = alerts.filter(alert => alert.status === 'Dead').length;
        const unknown = alerts.filter(alert => alert.status === 'Unknown' || alert.status === 'Pending').length;
        const total = alerts.length;

        return { alive, dead, unknown, total };
    }, [alerts]);

    // Memoized unique values for filters
    const uniqueDistricts = useMemo(() => {
        return Array.from(new Set(alerts.map(alert => alert.alertCaseDistrict).filter(Boolean)));
    }, [alerts]);

    const uniqueSources = useMemo(() => {
        return Array.from(new Set(alerts.map(alert => alert.sourceOfAlert).filter(Boolean)));
    }, [alerts]);

    // Export functionality
    const exportToCSV = useCallback(() => {
        const headers = [
            'Alert ID', 'Status', 'Date', 'Time', 'Reporter', 'Source of Alert',
            'District', 'Contact Number', 'Alert Case Name', 'Age', 'Sex', 'Verified'
        ];

        const csvContent = [
            headers.join(','),
            ...filteredAlerts.map((alert) =>
                [
                    `ALT${String(alert.id).padStart(3, '0')}`,
                    alert.status,
                    new Date(alert.date).toLocaleDateString(),
                    new Date(alert.time).toLocaleTimeString(),
                    alert.personReporting,
                    alert.sourceOfAlert,
                    alert.alertCaseDistrict,
                    alert.contactNumber,
                    alert.alertCaseName,
                    alert.alertCaseAge,
                    alert.alertCaseSex,
                    alert.isVerified ? 'Yes' : 'Pending',
                ].join(',')
            ),
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `alerts_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    }, [filteredAlerts]);

    useEffect(() => {
        fetchAlerts();
    }, [fetchAlerts]);

    return {
        alerts,
        filteredAlerts,
        stats,
        filters,
        loading,
        error,
        deletingId,
        uniqueDistricts,
        uniqueSources,
        setFilters,
        refetch: fetchAlerts,
        deleteAlert,
        exportToCSV,
    };
};
