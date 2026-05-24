import {
	LucideIcon,
	CheckCircle,
	AlertTriangle,
	Phone,
	Users,
	ShieldCheck,
} from "lucide-react";

export const DASHBOARD_CONFIG = {
	REFRESH_INTERVAL: 300000, // 5 minutes
	ANIMATION_DURATION: 300,
} as const;

export type StatAccent = "red" | "yellow" | "green" | "neutral";

export interface StatCardConfig {
	id: string;
	title: string;
	key:
		| keyof import("@/app/dashboard/types").AlertCounts
		| "verificationRate"
		| "todayAlerts"
		| "todayVerified";
	icon: LucideIcon;
	accent: StatAccent;
	eyebrow: string;
	description?: string;
	route?: string;
	isPercentage?: boolean;
}

export const STAT_CARDS: StatCardConfig[] = [
	{
		id: "total",
		title: "Total Alerts",
		eyebrow: "01 · All-time",
		key: "total",
		icon: AlertTriangle,
		accent: "neutral",
		route: "/dashboard/alerts",
	},
	{
		id: "verified",
		title: "Verified Alerts",
		eyebrow: "02 · Confirmed",
		key: "verified",
		icon: ShieldCheck,
		accent: "green",
		route: "/dashboard/alerts",
	},
	{
		id: "notVerified",
		title: "Not Verified Alerts",
		eyebrow: "03 · Backlog",
		key: "notVerified",
		icon: AlertTriangle,
		accent: "red",
		route: "/dashboard/alerts",
	},
	{
		id: "verificationRate",
		title: "Verification Rate",
		eyebrow: "04 · Throughput",
		key: "verificationRate",
		icon: CheckCircle,
		accent: "yellow",
		route: "/dashboard/alerts",
		isPercentage: true,
	},
];

export const ADDITIONAL_STATS: StatCardConfig[] = [
	{
		id: "todayCalls",
		title: "Filed Today",
		eyebrow: "Today · Inflow",
		key: "todayAlerts",
		icon: Phone,
		accent: "neutral",
	},
	{
		id: "pendingVerification",
		title: "Pending Review",
		eyebrow: "Today · Queue",
		key: "notVerified",
		icon: Users,
		accent: "red",
	},
	{
		id: "verifiedToday",
		title: "Verified Today",
		eyebrow: "Today · Cleared",
		key: "todayVerified",
		icon: CheckCircle,
		accent: "green",
	},
];

export const LOADING_MESSAGES = {
	DASHBOARD: "Loading dashboard data…",
	ALERTS: "Loading alerts…",
	CALL_LOGS: "Loading call logs…",
	REFRESHING: "Refreshing…",
} as const;
