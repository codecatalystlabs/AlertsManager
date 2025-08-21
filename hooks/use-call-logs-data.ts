import { useState, useEffect, useCallback, useMemo } from 'react';
import { AuthService } from '@/lib/auth';

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

interface CallLogsFilters {
    status: string;
    source: string;
    search: string;
}

interface CallLogsStats {
    alive: number;
    other: number;
    verified: number;
    pending: number;
}

interface UseCallLogsDataReturn {
    alerts: AlertLog[];
    filteredAlerts: AlertLog[];
    stats: CallLogsStats;
    filters: CallLogsFilters;
    loading: boolean;
    error: string | null;
    selectedAlert: AlertLog | null;
    setFilters: (filters: Partial<CallLogsFilters>) => void;
    setSelectedAlert: (alert: AlertLog | null) => void;
    refetch: () => Promise<void>;
    deleteAlert: (alertId: number) => Promise<void>;
    exportToExcel: () => void;
    clearFilters: () => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8089/api/v1';

const initialFilters: CallLogsFilters = {
    status: 'all',
    source: 'all',
    search: '',
};

export const useCallLogsData = (): UseCallLogsDataReturn => {
    const [alerts, setAlerts] = useState<AlertLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFiltersState] = useState<CallLogsFilters>(initialFilters);
    const [selectedAlert, setSelectedAlert] = useState<AlertLog | null>(null);

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
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch call logs';
            setError(errorMessage);
            setAlerts([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const deleteAlert = useCallback(async (alertId: number) => {
        const confirmed = confirm(
            `Are you sure you want to delete alert ALT${String(alertId).padStart(3, '0')}? This action cannot be undone.`
        );

        if (!confirmed) return;

        try {
            await AuthService.deleteAlert(alertId);
            await fetchAlerts(); 
        } catch (error) {
            setError('Failed to delete alert. Please try again.');
            throw error;
        }
    }, [fetchAlerts]);

    const setFilters = useCallback((newFilters: Partial<CallLogsFilters>) => {
        setFiltersState(currentFilters => ({ ...currentFilters, ...newFilters }));
    }, []);

    const clearFilters = useCallback(() => {
        setFiltersState(initialFilters);
    }, []);

    const filteredAlerts = useMemo(() => {
        return alerts.filter((alert) => {
            const matchesStatus =
                filters.status === 'all' ||
                alert.status.toLowerCase() === filters.status.toLowerCase();

            const matchesSource =
                filters.source === 'all' ||
                alert.sourceOfAlert.toLowerCase() === filters.source.toLowerCase();

            const matchesSearch =
                filters.search === '' ||
                alert.personReporting.toLowerCase().includes(filters.search.toLowerCase()) ||
                alert.contactNumber.includes(filters.search) ||
                alert.alertCaseDistrict.toLowerCase().includes(filters.search.toLowerCase()) ||
                alert.id.toString().includes(filters.search);

            return matchesStatus && matchesSource && matchesSearch;
        });
    }, [alerts, filters]);

    // Memoized statistics
    const stats = useMemo((): CallLogsStats => {
        const alive = alerts.filter(alert => alert.status === 'Alive').length;
        const other = alerts.filter(alert => alert.status !== 'Alive').length;
        const verified = alerts.filter(alert => alert.isVerified).length;
        const pending = alerts.filter(alert => !alert.isVerified).length;

        return { alive, other, verified, pending };
    }, [alerts]);

    // Export functionality
    const exportToExcel = useCallback(() => {
        console.log('Export to Excel functionality to be implemented');
        // TODO: Implement actual Excel export functionality
    }, []);

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
        selectedAlert,
        setFilters,
        setSelectedAlert,
        refetch: fetchAlerts,
        deleteAlert,
        exportToExcel,
        clearFilters,
    };
};
