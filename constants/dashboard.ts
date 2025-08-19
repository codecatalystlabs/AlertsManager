import { LucideIcon, CheckCircle, AlertTriangle, TrendingUp, Phone, Users } from 'lucide-react';

export const DASHBOARD_CONFIG = {
    REFRESH_INTERVAL: 300000, // 5 minutes
    ANIMATION_DURATION: 300,
    CARD_HOVER_SCALE: 1.02,
} as const;

export interface StatCardConfig {
    id: string;
    title: string;
    key: keyof import('@/app/dashboard/types').AlertCounts | 'verificationRate' | 'todayAlerts' | 'todayVerified';
    icon: LucideIcon;
    gradient: string;
    iconBg: string;
    textColor: string;
    description?: string;
    route?: string;
    isPercentage?: boolean;
}

export const STAT_CARDS: StatCardConfig[] = [
    {
        id: 'verified',
        title: 'Verified Alerts',
        key: 'verified',
        icon: CheckCircle,
        gradient: 'from-green-50 to-green-100',
        iconBg: 'bg-green-500',
        textColor: 'text-green-700',
        route: '/dashboard/alerts',
    },
    {
        id: 'notVerified',
        title: 'Not Verified Alerts',
        key: 'notVerified',
        icon: AlertTriangle,
        gradient: 'from-red-50 to-red-100',
        iconBg: 'bg-red-500',
        textColor: 'text-red-700',
        route: '/dashboard/alerts',
    },
    {
        id: 'total',
        title: 'Total Alerts',
        key: 'total',
        icon: AlertTriangle,
        gradient: 'from-blue-50 to-blue-100',
        iconBg: 'bg-blue-500',
        textColor: 'text-blue-700',
        route: '/dashboard/alerts',
    },
    {
        id: 'verificationRate',
        title: 'Verification Rate',
        key: 'verificationRate',
        icon: CheckCircle,
        gradient: 'from-purple-50 to-purple-100',
        iconBg: 'bg-purple-500',
        textColor: 'text-purple-700',
        route: '/dashboard/alerts',
        isPercentage: true,
    },
];

export const ADDITIONAL_STATS: StatCardConfig[] = [
    {
        id: 'todayCalls',
        title: 'Total Calls Today',
        key: 'todayAlerts',
        icon: Phone,
        gradient: 'from-purple-50 to-purple-100',
        iconBg: 'bg-purple-500',
        textColor: 'text-purple-700',
    },
    {
        id: 'pendingVerification',
        title: 'Pending Verification',
        key: 'notVerified',
        icon: Users,
        gradient: 'from-indigo-50 to-indigo-100',
        iconBg: 'bg-indigo-500',
        textColor: 'text-indigo-700',
    },
    {
        id: 'verifiedToday',
        title: 'Verified Today',
        key: 'todayVerified',
        icon: CheckCircle,
        gradient: 'from-teal-50 to-teal-100',
        iconBg: 'bg-teal-500',
        textColor: 'text-teal-700',
    },
];

export const LOADING_MESSAGES = {
    DASHBOARD: 'Loading dashboard data...',
    ALERTS: 'Loading alerts...',
    REFRESHING: 'Refreshing data...',
} as const;
