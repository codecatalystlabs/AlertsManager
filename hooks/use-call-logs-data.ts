import { useState, useEffect, useCallback, useMemo } from 'react';
import { AuthService } from '@/lib/auth';
import { exportAlertsToCsv, exportAlertsToExcel } from '@/lib/alert-export';
import {
    CALL_LOGS_CONFIG,
    CALL_LOGS_INITIAL_FILTERS,
    type CallLogsFilterState,
} from '@/constants/call-logs';
import { fetchAllAlerts } from '@/lib/fetch-alerts';
import {
    getCachedAlerts,
    invalidateAlertsCache,
    subscribeAlertsCache,
} from '@/lib/alerts-cache';

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

type CallLogsFilters = CallLogsFilterState;

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
    isValidating: boolean;
    error: string | null;
    selectedAlert: AlertLog | null;
    setFilters: (filters: Partial<CallLogsFilters>) => void;
    setSelectedAlert: (alert: AlertLog | null) => void;
    refetch: () => Promise<void>;
    deleteAlert: (alertId: number) => Promise<void>;
    exportToExcel: () => Promise<void>;
    exportToCSV: () => void;
    clearFilters: () => void;
}

const initialFilters: CallLogsFilters = { ...CALL_LOGS_INITIAL_FILTERS };

export const useCallLogsData = (): UseCallLogsDataReturn => {
    const [alerts, setAlerts] = useState<AlertLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [isValidating, setIsValidating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFiltersState] = useState<CallLogsFilters>(initialFilters);
    const [selectedAlert, setSelectedAlert] = useState<AlertLog | null>(null);

    const loadAlerts = useCallback(async (options?: { force?: boolean }) => {
        const force = options?.force ?? false;
        const cached = getCachedAlerts<AlertLog[]>();

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
            const result = await fetchAllAlerts<AlertLog[]>({ force });
            setAlerts(result.data);

            if (result.revalidate) {
                setIsValidating(true);
                result
                    .revalidate()
                    .then((fresh) => {
                        if (fresh) setAlerts(fresh);
                    })
                    .finally(() => setIsValidating(false));
            }
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : 'Failed to fetch call logs';
            setError(errorMessage);
            if (!cached) {
                setAlerts([]);
            }
        } finally {
            setLoading(false);
            if (force) {
                setIsValidating(false);
            }
        }
    }, []);

    const deleteAlert = useCallback(async (alertId: number) => {
        const confirmed = confirm(
            `Are you sure you want to delete alert ALT${String(alertId).padStart(3, '0')}? This action cannot be undone.`
        );

        if (!confirmed) return;

        try {
            await AuthService.deleteAlert(alertId);
            invalidateAlertsCache();
            await loadAlerts({ force: true });
        } catch (error) {
            setError('Failed to delete alert. Please try again.');
            throw error;
        }
    }, [loadAlerts]);

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
                (filters.status === 'other' && alert.status !== 'Alive') ||
                alert.status.toLowerCase() === filters.status.toLowerCase();

            const matchesVerification =
                filters.verification === 'all' ||
                (filters.verification === 'verified' && alert.isVerified) ||
                (filters.verification === 'pending' && !alert.isVerified);

            const matchesSource =
                filters.source === 'all' ||
                alert.sourceOfAlert.toLowerCase() === filters.source.toLowerCase();

            const matchesSearch =
                filters.search === '' ||
                alert.personReporting.toLowerCase().includes(filters.search.toLowerCase()) ||
                alert.contactNumber.includes(filters.search) ||
                alert.alertCaseDistrict.toLowerCase().includes(filters.search.toLowerCase()) ||
                alert.id.toString().includes(filters.search);

            return (
                matchesStatus &&
                matchesVerification &&
                matchesSource &&
                matchesSearch
            );
        });
    }, [alerts, filters]);

    const stats = useMemo((): CallLogsStats => {
        const alive = alerts.filter(alert => alert.status === 'Alive').length;
        const other = alerts.filter(alert => alert.status !== 'Alive').length;
        const verified = alerts.filter(alert => alert.isVerified).length;
        const pending = alerts.filter(alert => !alert.isVerified).length;

        return { alive, other, verified, pending };
    }, [alerts]);

    const exportPrefix = CALL_LOGS_CONFIG.EXPORT_FILENAME_PREFIX;

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
                'Call Logs'
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
        const unsubscribe = subscribeAlertsCache<AlertLog[]>((data) => {
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
        selectedAlert,
        setFilters,
        setSelectedAlert,
        refetch,
        deleteAlert,
        exportToExcel,
        exportToCSV,
        clearFilters,
    };
};
