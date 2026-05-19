import { useState, useEffect, useCallback } from 'react';
import { AlertCounts, CallLogAlert } from '@/app/dashboard/types';
import { fetchAllAlerts } from '@/lib/fetch-alerts';
import { getCachedAlerts, subscribeAlertsCache } from '@/lib/alerts-cache';

interface DashboardData {
    alerts: CallLogAlert[];
    alertCounts: AlertCounts;
    todayAlerts: CallLogAlert[];
    todayVerified: number;
}

interface UseDashboardDataReturn {
    data: DashboardData;
    loading: boolean;
    isValidating: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export const useDashboardData = (): UseDashboardDataReturn => {
    const [alerts, setAlerts] = useState<CallLogAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [isValidating, setIsValidating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const calculateDashboardMetrics = useCallback((alertsData: CallLogAlert[]) => {
        const today = new Date().toISOString().split('T')[0];

        const verified = alertsData.filter(alert => alert.isVerified === true).length;
        const notVerified = alertsData.filter(alert => alert.isVerified === false).length;
        const total = alertsData.length;

        const todayAlerts = alertsData.filter(alert => {
            const alertDate = new Date(alert.date).toISOString().split('T')[0];
            return alertDate === today;
        });

        const todayVerified = todayAlerts.filter(alert => alert.isVerified).length;

        return {
            alertCounts: { verified, notVerified, total },
            todayAlerts,
            todayVerified,
        };
    }, []);

    const loadAlerts = useCallback(async (options?: { force?: boolean }) => {
        const force = options?.force ?? false;
        const cached = getCachedAlerts<CallLogAlert[]>();

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
            const result = await fetchAllAlerts<CallLogAlert[]>({ force });
            setAlerts(result.data);

            if (result.revalidate) {
                setIsValidating(true);
                result
                    .revalidate()
                    .then((fresh) => setAlerts(fresh))
                    .catch((err) =>
                        console.error('Background dashboard refresh failed:', err)
                    )
                    .finally(() => setIsValidating(false));
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch alert data';
            setError(errorMessage);
            if (!cached) {
                setAlerts([]);
            }
        } finally {
            setLoading(false);
            setIsValidating(false);
        }
    }, []);

    const refetch = useCallback(() => loadAlerts({ force: true }), [loadAlerts]);

    useEffect(() => {
        loadAlerts();
    }, [loadAlerts]);

    useEffect(() => {
        const unsubscribe = subscribeAlertsCache<CallLogAlert[]>((data) => {
            setAlerts(data);
        });
        return unsubscribe;
    }, []);

    const dashboardMetrics = calculateDashboardMetrics(alerts);

    return {
        data: {
            alerts,
            ...dashboardMetrics,
        },
        loading,
        isValidating,
        error,
        refetch,
    };
};
