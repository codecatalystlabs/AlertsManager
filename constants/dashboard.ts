import {
    LucideIcon,
    CheckCircle,
    Files,
    ListChecks,
    Siren,
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

// Signal workflow, in pipeline order: raw signals enter the system, triage
// (EBS step 2) decides which ones go forward, and verification (step 3)
// separates actionable alerts from discarded signals.
export const STAT_CARDS: StatCardConfig[] = [
    {
        id: 'total',
        title: 'Total Signals',
        key: 'total',
        icon: Files,
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
        id: 'triaged',
        title: 'Triaged Signals',
        key: 'triaged',
        icon: ListChecks,
        gradient: 'from-amber-50 to-amber-100',
        iconBg: 'bg-amber-500',
        textColor: 'text-amber-700',
        // Deliberately the alerts list, like every other card. The register's
        // Triaged view splits into forwarded vs discarded and defaults to the
        // forwarded half, so linking there would land on a smaller number than
        // the card shows.
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
        icon: Siren,
        gradient: 'from-purple-50 to-purple-100',
        iconBg: 'bg-purple-500',
        textColor: 'text-purple-700',
        route: '/dashboard/alerts',
    },
];

export const LOADING_MESSAGES = {
    DASHBOARD: 'Loading dashboard data...',
    ALERTS: 'Loading alerts...',
    CALL_LOGS: 'Loading signal logs...',
    REFRESHING: 'Refreshing data...',
} as const;
