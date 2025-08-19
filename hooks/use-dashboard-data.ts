import { useState, useEffect, useCallback } from 'react';
import { AuthService } from '@/lib/auth';
import { AlertCounts, CallLogAlert } from '@/app/dashboard/types';

interface DashboardData {
    alerts: CallLogAlert[];
    alertCounts: AlertCounts;
    todayAlerts: CallLogAlert[];
    todayVerified: number;
}

interface UseDashboardDataReturn {
    data: DashboardData;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8089/api/v1';

export const useDashboardData = (): UseDashboardDataReturn => {
    const [alerts, setAlerts] = useState<CallLogAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const calculateDashboardMetrics = useCallback((alertsData: CallLogAlert[]) => {
        const today = new Date().toISOString().split('T')[0];

        // Calculate alert counts
        const verified = alertsData.filter(alert => alert.isVerified === true).length;
        const notVerified = alertsData.filter(alert => alert.isVerified === false).length;
        const total = alertsData.length;

        // Calculate today's statistics
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

    const fetchAlertsData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await AuthService.makeAuthenticatedRequest(`${API_BASE_URL}/alerts`);

            if (!response.ok) {
                throw new Error(`Failed to fetch alerts: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            const alertsData = Array.isArray(data) ? data : [];

            setAlerts(alertsData);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch alert data';
            setError(errorMessage);
            setAlerts([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAlertsData();
    }, [fetchAlertsData]);

    const dashboardMetrics = calculateDashboardMetrics(alerts);

    return {
        data: {
            alerts,
            ...dashboardMetrics,
        },
        loading,
        error,
        refetch: fetchAlertsData,
    };
};
