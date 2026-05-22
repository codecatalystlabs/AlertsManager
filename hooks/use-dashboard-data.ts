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
    chartsLoading: boolean;
    isValidating: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

function computeMetrics(alertsData: CallLogAlert[]) {
    const today = new Date().toISOString().split('T')[0];

    const verified = alertsData.filter((a) => a.isVerified === true).length;
    const notVerified = alertsData.filter((a) => a.isVerified === false).length;
    const total = alertsData.length;

    const todayAlerts = alertsData.filter((alert) => {
        const alertDate = new Date(alert.date).toISOString().split('T')[0];
        return alertDate === today;
    });

    const todayVerified = todayAlerts.filter((alert) => alert.isVerified).length;

    return {
        alertCounts: { verified, notVerified, total },
        todayAlerts,
        todayVerified,
    };
}

export const useDashboardData = (): UseDashboardDataReturn => {
    const [alerts, setAlerts] = useState<CallLogAlert[]>([]);
    const [alertCounts, setAlertCounts] = useState<AlertCounts>({
        verified: 0,
        notVerified: 0,
        total: 0,
    });
    const [todayAlerts, setTodayAlerts] = useState<CallLogAlert[]>([]);
    const [todayVerified, setTodayVerified] = useState(0);
    const [loading, setLoading] = useState(true);
    const [chartsLoading, setChartsLoading] = useState(true);
    const [isValidating, setIsValidating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const applyAlerts = useCallback((alertsData: CallLogAlert[]) => {
        setAlerts(alertsData);
        const metrics = computeMetrics(alertsData);
        setAlertCounts(metrics.alertCounts);
        setTodayAlerts(metrics.todayAlerts);
        setTodayVerified(metrics.todayVerified);
        setChartsLoading(false);
    }, []);

    const loadAlerts = useCallback(async (options?: { force?: boolean }) => {
        const force = options?.force ?? false;
        const cached = getCachedAlerts<CallLogAlert[]>();

        if (!force && cached?.data?.length) {
            applyAlerts(cached.data);
            setLoading(false);
        } else if (!cached) {
            setLoading(true);
            setChartsLoading(true);
        }

        if (force) {
            setIsValidating(true);
        }

        setError(null);

        try {
            const result = await fetchAllAlerts<CallLogAlert[]>({ force });
            applyAlerts(result.data);

            if (result.revalidate) {
                setIsValidating(true);
                result
                    .revalidate()
                    .then((fresh) => {
                        if (fresh) applyAlerts(fresh);
                    })
                    .finally(() => setIsValidating(false));
            }
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : 'Failed to fetch alert data';
            setError(errorMessage);
            if (!cached) {
                setAlerts([]);
                setAlertCounts({ verified: 0, notVerified: 0, total: 0 });
                setTodayAlerts([]);
                setTodayVerified(0);
            }
        } finally {
            setLoading(false);
            setIsValidating(false);
        }
    }, [applyAlerts]);

    const refetch = useCallback(() => loadAlerts({ force: true }), [loadAlerts]);

    useEffect(() => {
        loadAlerts();
    }, [loadAlerts]);

    useEffect(() => {
        const unsubscribe = subscribeAlertsCache<CallLogAlert[]>((data) => {
            applyAlerts(data);
        });
        return unsubscribe;
    }, [applyAlerts]);

    return {
        data: {
            alerts,
            alertCounts,
            todayAlerts,
            todayVerified,
        },
        loading,
        chartsLoading,
        isValidating,
        error,
        refetch,
    };
};
