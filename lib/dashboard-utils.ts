/**
 * Dashboard Utilities
 * 
 * Collection of utility functions for dashboard data processing and formatting.
 * Follows functional programming principles with pure functions.
 */

import { CallLogAlert, AlertCounts } from '@/app/dashboard/types';

/**
 * Calculates alert statistics from raw alert data
 * @param alerts - Array of alert data
 * @returns Object containing alert counts and statistics
 */
export const calculateAlertStatistics = (alerts: CallLogAlert[]): AlertCounts & {
    verificationRate: number;
    totalToday: number;
    verifiedToday: number;
} => {
    const verified = alerts.filter(alert => alert.isVerified === true).length;
    const notVerified = alerts.filter(alert => alert.isVerified === false).length;
    const total = alerts.length;

    const today = new Date().toISOString().split('T')[0];
    const todayAlerts = alerts.filter(alert => {
        const alertDate = new Date(alert.date).toISOString().split('T')[0];
        return alertDate === today;
    });

    const verifiedToday = todayAlerts.filter(alert => alert.isVerified).length;
    const verificationRate = total > 0 ? Math.round((verified / total) * 100) : 0;

    return {
        verified,
        notVerified,
        total,
        verificationRate,
        totalToday: todayAlerts.length,
        verifiedToday,
    };
};

/**
 * Formats a number for display with locale-appropriate formatting
 * @param value - Number to format
 * @param options - Intl.NumberFormat options
 * @returns Formatted number string
 */
export const formatNumber = (
    value: number,
    options: Intl.NumberFormatOptions = {}
): string => {
    return new Intl.NumberFormat('en-UG', options).format(value);
};

/**
 * Formats a percentage value
 * @param value - Percentage value (0-100)
 * @param decimals - Number of decimal places
 * @returns Formatted percentage string
 */
export const formatPercentage = (value: number, decimals: number = 0): string => {
    return `${value.toFixed(decimals)}%`;
};

/**
 * Checks if two dates are on the same day
 * @param date1 - First date
 * @param date2 - Second date
 * @returns Boolean indicating if dates are on same day
 */
export const isSameDay = (date1: Date, date2: Date): boolean => {
    return date1.toDateString() === date2.toDateString();
};

/**
 * Gets alerts for a specific date
 * @param alerts - Array of alerts
 * @param targetDate - Target date to filter by
 * @returns Filtered alerts for the target date
 */
export const getAlertsForDate = (alerts: CallLogAlert[], targetDate: Date): CallLogAlert[] => {
    return alerts.filter(alert => isSameDay(new Date(alert.date), targetDate));
};

/**
 * Calculates trends between two time periods
 * @param current - Current period value
 * @param previous - Previous period value
 * @returns Object with trend information
 */
export const calculateTrend = (current: number, previous: number): {
    change: number;
    percentage: number;
    direction: 'up' | 'down' | 'neutral';
} => {
    const change = current - previous;
    const percentage = previous > 0 ? Math.round((change / previous) * 100) : 0;

    let direction: 'up' | 'down' | 'neutral' = 'neutral';
    if (change > 0) direction = 'up';
    else if (change < 0) direction = 'down';

    return { change, percentage, direction };
};

/**
 * Debounce function for search and other frequent operations
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export const debounce = <T extends (...args: any[]) => any>(
    func: T,
    wait: number
): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;

    return (...args: Parameters<T>): void => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};

/**
 * Creates a safe async function that handles errors
 * @param fn - Async function to wrap
 * @returns Function that returns [error, data] tuple
 */
export const safeAsync = <T>(
    fn: () => Promise<T>
): Promise<[Error | null, T | null]> => {
    return fn()
        .then<[null, T]>((data: T) => [null, data])
        .catch<[Error, null]>((error: Error) => [error, null]);
};

/**
 * Type guard to check if a value is not null or undefined
 * @param value - Value to check
 * @returns Boolean indicating if value is defined
 */
export const isDefined = <T>(value: T | null | undefined): value is T => {
    return value !== null && value !== undefined;
};

/**
 * Groups an array of items by a key function
 * @param array - Array to group
 * @param keyFn - Function to extract key from item
 * @returns Object with grouped items
 */
export const groupBy = <T, K extends string | number>(
    array: T[],
    keyFn: (item: T) => K
): Record<K, T[]> => {
    return array.reduce((groups, item) => {
        const key = keyFn(item);
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(item);
        return groups;
    }, {} as Record<K, T[]>);
};
