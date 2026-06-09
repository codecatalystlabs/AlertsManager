import {
    LucideIcon,
    CheckCircle,
    Clock,
    FileWarning,
    ShieldAlert,
    XCircle,
} from 'lucide-react';

export const DASHBOARD_CONFIG = {
    REFRESH_INTERVAL: 300000, // 5 minutes
    ANIMATION_DURATION: 300,
    CARD_HOVER_SCALE: 1.02,
} as const;

export interface StatCardConfig {
    id: string;
    title: string;
    key: keyof import('@/app/dashboard/types').AlertCounts;
    icon: LucideIcon;
    gradient: string;
    iconBg: string;
    textColor: string;
    description?: string;
    route?: string;
}

// Signal workflow: raw signals enter the system, verification separates
// actionable alerts from discarded signals, and unverified signals remain
// pending triage.
export const STAT_CARDS: StatCardConfig[] = [
    {
        id: 'total',
        title: 'Total Signals',
        key: 'total',
        icon: FileWarning,
        gradient: 'from-blue-50 to-blue-100',
        iconBg: 'bg-blue-500',
        textColor: 'text-blue-700',
        route: '/dashboard/alerts',
    },
    {
        id: 'verified',
        title: 'Verified Signals',
        key: 'verified',
        icon: CheckCircle,
        gradient: 'from-green-50 to-green-100',
        iconBg: 'bg-green-500',
        textColor: 'text-green-700',
        route: '/dashboard/alerts',
    },
    {
        id: 'notVerified',
        title: 'Unverified Signals',
        key: 'notVerified',
        icon: Clock,
        gradient: 'from-red-50 to-red-100',
        iconBg: 'bg-red-500',
        textColor: 'text-red-700',
        route: '/dashboard/alerts',
    },
    {
        id: 'discarded',
        title: 'Discarded Signals',
        key: 'discarded',
        icon: XCircle,
        gradient: 'from-indigo-50 to-indigo-100',
        iconBg: 'bg-indigo-500',
        textColor: 'text-indigo-700',
        route: '/dashboard/alerts',
    },
    {
        id: 'alerts',
        title: 'Alerts',
        key: 'alerts',
        icon: ShieldAlert,
        gradient: 'from-purple-50 to-purple-100',
        iconBg: 'bg-purple-500',
        textColor: 'text-purple-700',
        route: '/dashboard/alerts',
    },
];

export const LOADING_MESSAGES = {
    DASHBOARD: 'Loading dashboard data...',
    ALERTS: 'Loading alerts...',
    CALL_LOGS: 'Loading call logs...',
    REFRESHING: 'Refreshing data...',
} as const;
