import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AuthService } from '@/lib/auth';
import { exportAlertsToCsv, exportAlertsToExcel } from '@/lib/alert-export';
import {
    CALL_LOGS_CONFIG,
    CALL_LOGS_INITIAL_FILTERS,
    type CallLogsFilterState,
} from '@/constants/call-logs';
import { fetchAlertsPage, type AlertsListParams } from '@/lib/fetch-alerts';
import { invalidateAlertsCache } from '@/lib/alerts-cache';

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

interface CallLogsPagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

interface UseCallLogsDataReturn {
    alerts: AlertLog[];
    filteredAlerts: AlertLog[];
    stats: CallLogsStats;
    filters: CallLogsFilters;
    pagination: CallLogsPagination;
    loading: boolean;
    isValidating: boolean;
    error: string | null;
    selectedAlert: AlertLog | null;
    setFilters: (filters: Partial<CallLogsFilters>) => void;
    setSelectedAlert: (alert: AlertLog | null) => void;
    setPage: (page: number) => void;
    setPageSize: (limit: number) => void;
    refetch: () => Promise<void>;
    deleteAlert: (alertId: number) => Promise<void>;
    exportToExcel: () => Promise<void>;
    exportToCSV: () => void;
    clearFilters: () => void;
}

function toApiParams(
    filters: CallLogsFilters,
    page: number,
    limit: number
): AlertsListParams {
    const params: AlertsListParams = { page, limit };

    if (filters.verification === 'verified') {
        params.is_verified = true;
    } else if (filters.verification === 'pending') {
        params.is_verified = false;
    }

    return params;
}

function applyClientFilters(alerts: AlertLog[], filters: CallLogsFilters): AlertLog[] {
    return alerts.filter((alert) => {
        const matchesStatus =
            filters.status === 'all' ||
            (filters.status === 'other' && alert.status !== 'Alive') ||
            (alert.status ?? '').toLowerCase() === filters.status.toLowerCase();

        const matchesSource =
            filters.source === 'all' ||
            (alert.sourceOfAlert ?? '').toLowerCase() === filters.source.toLowerCase();

        const search = filters.search.toLowerCase();
        const matchesSearch =
            filters.search === '' ||
            (alert.personReporting ?? '').toLowerCase().includes(search) ||
            (alert.contactNumber ?? '').includes(filters.search) ||
            (alert.alertCaseDistrict ?? '').toLowerCase().includes(search) ||
            (alert.id?.toString() ?? '').includes(filters.search);

        return matchesStatus && matchesSource && matchesSearch;
    });
}

export const useCallLogsData = (): UseCallLogsDataReturn => {
    const [alerts, setAlerts] = useState<AlertLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [isValidating, setIsValidating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFiltersState] = useState<CallLogsFilters>({
        ...CALL_LOGS_INITIAL_FILTERS,
    });
    const [selectedAlert, setSelectedAlert] = useState<AlertLog | null>(null);
    const [page, setPageState] = useState(1);
    const [limit, setLimitState] = useState<number>(CALL_LOGS_CONFIG.ITEMS_PER_PAGE);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const filtersRef = useRef(filters);
    filtersRef.current = filters;

    const loadAlerts = useCallback(async () => {
        setIsValidating(true);
        setError(null);

        try {
            const result = await fetchAlertsPage<AlertLog>(
                toApiParams(filtersRef.current, page, limit)
            );

            setAlerts(result.data);
            setPageState(result.page);
            setLimitState(result.limit);
            setTotal(result.total);
            setTotalPages(result.totalPages);
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : 'Failed to fetch call logs';
            setError(errorMessage);
            setAlerts([]);
            setTotal(0);
            setTotalPages(1);
        } finally {
            setLoading(false);
            setIsValidating(false);
        }
    }, [page, limit]);

    const loadAlertsForExport = useCallback(async (): Promise<AlertLog[]> => {
        const result = await fetchAlertsPage<AlertLog>({
            ...toApiParams(filtersRef.current, 1, limit),
            page: 1,
            limit: 10_000,
        });
        return applyClientFilters(result.data, filtersRef.current);
    }, [limit]);

    const deleteAlert = useCallback(
        async (alertId: number) => {
            const confirmed = confirm(
                `Are you sure you want to delete alert ALT${String(alertId).padStart(3, '0')}? This action cannot be undone.`
            );

            if (!confirmed) return;

            try {
                await AuthService.deleteAlert(alertId);
                invalidateAlertsCache();
                await loadAlerts();
            } catch (err) {
                setError('Failed to delete alert. Please try again.');
                throw err;
            }
        },
        [loadAlerts]
    );

    const setFilters = useCallback((newFilters: Partial<CallLogsFilters>) => {
        setFiltersState((current) => ({ ...current, ...newFilters }));
        setPageState(1);
    }, []);

    const clearFilters = useCallback(() => {
        setFiltersState({ ...CALL_LOGS_INITIAL_FILTERS });
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

    const stats = useMemo((): CallLogsStats => {
        const alive = alerts.filter((alert) => alert.status === 'Alive').length;
        const other = alerts.filter((alert) => alert.status !== 'Alive').length;
        const verified = alerts.filter((alert) => alert.isVerified).length;
        const pending = alerts.filter((alert) => !alert.isVerified).length;

        return { alive, other, verified, pending };
    }, [alerts]);

    const exportPrefix = CALL_LOGS_CONFIG.EXPORT_FILENAME_PREFIX;

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
            const exported = await exportAlertsToExcel(
                rows,
                exportPrefix,
                'Call Logs'
            );
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

    const refetch = useCallback(() => loadAlerts(), [loadAlerts]);

    useEffect(() => {
        loadAlerts();
    }, [loadAlerts, page, limit, filters.verification]);

    return {
        alerts,
        filteredAlerts,
        stats,
        filters,
        pagination: { page, limit, total, totalPages },
        loading,
        isValidating,
        error,
        selectedAlert,
        setFilters,
        setSelectedAlert,
        setPage,
        setPageSize,
        refetch,
        deleteAlert,
        exportToExcel,
        exportToCSV,
        clearFilters,
    };
};
