"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AuthService } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
	LayoutDashboard,
	AlertTriangle,
	FileText,
	Users,
	LogOut,
	X,
	Phone,
	PhoneCall,
	User,
	PanelLeftClose,
	PanelLeftOpen,
	BarChart3,
} from "lucide-react";
import { MohLogo } from "@/components/moh-logo";

interface NavigationItem {
	name: string;
	href: string;
	icon: React.ComponentType<{ className?: string }>;
	badge?: string | null;
	dynamicBadge?: "verified" | "notVerified" | "total";
}

interface NavigationGroup {
	label: string;
	items: NavigationItem[];
}

const navigationGroups: NavigationGroup[] = [
	{
		label: "Main",
		items: [
			{ name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
			{ name: "Add Alert", href: "/add-alert", icon: AlertTriangle },
		],
	},
	{
		label: "Alert Management",
		items: [
			{
				name: "View Alerts",
				href: "/dashboard/alerts",
				icon: FileText,
				dynamicBadge: "total",
			},
			{ name: "Call Logs", href: "/dashboard/call-logs", icon: Phone, badge: "3" },
			{ name: "6767 Alerts", href: "/dashboard/eidsr-alerts", icon: PhoneCall },
			{
				name: "Summaries / Reports",
				href: "/dashboard/reports",
				icon: BarChart3,
			},
		],
	},
	{
		label: "Administration",
		items: [
			{ name: "Manage Users", href: "/dashboard/users", icon: Users },
			{ name: "Profile", href: "/dashboard/profile", icon: User },
		],
	},
];

interface ModernSidebarProps {
	mobileOpen: boolean;
	onMobileClose: () => void;
	collapsed: boolean;
	onToggleCollapsed: () => void;
}

type AlertCounts = { verified: number; notVerified: number; total: number };

export function ModernSidebar({
	mobileOpen,
	onMobileClose,
	collapsed,
	onToggleCollapsed,
}: ModernSidebarProps) {
	const pathname = usePathname();
	const [user, setUser] = useState<ReturnType<typeof AuthService.getUser>>(null);
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const [alertCounts, setAlertCounts] = useState<AlertCounts>({
		verified: 0,
		notVerified: 0,
		total: 0,
	});
	const mobilePanelRef = useRef<HTMLDivElement>(null);
	const closeButtonRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		setUser(AuthService.getUser());
	}, []);

	useEffect(() => {
		if (!AuthService.isAuthenticated()) return;

		const loadCounts = async () => {
			try {
				const counts = await AuthService.fetchAlertCounts();
				setAlertCounts({
					verified: counts.verified,
					notVerified: counts.notVerified,
					total: counts.total,
				});
			} catch (error) {
				console.error("Error fetching alert counts for sidebar:", error);
				setAlertCounts({ verified: 0, notVerified: 0, total: 0 });
			}
		};

		loadCounts();
	}, []);

	useEffect(() => {
		if (!mobileOpen) return;

		const previousFocus = document.activeElement as HTMLElement | null;
		closeButtonRef.current?.focus();

		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onMobileClose();
		};
		document.addEventListener("keydown", onKeyDown);
		document.body.style.overflow = "hidden";

		return () => {
			document.removeEventListener("keydown", onKeyDown);
			document.body.style.overflow = "";
			previousFocus?.focus();
		};
	}, [mobileOpen, onMobileClose]);

	const handleLogout = async () => {
		if (isLoggingOut) return;
		try {
			setIsLoggingOut(true);
			await AuthService.logout();
			window.location.href = "/add-alert";
		} catch (error) {
			console.error("Logout error:", error);
			window.location.href = "/add-alert";
		} finally {
			setIsLoggingOut(false);
		}
	};

	const displayName = (() => {
		if (!user) return "Admin User";
		const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
		return full || user.username || "Admin User";
	})();

	const email = user?.email || (user ? `${user.username}@health.go.ug` : "admin@health.go.ug");

	const getBadgeValue = (item: NavigationItem): string | null => {
		if (item.badge) return item.badge;
		if (item.dynamicBadge) {
			const count = alertCounts[item.dynamicBadge];
			return count > 0 ? count.toString() : null;
		}
		return null;
	};

	const contentProps = {
		pathname,
		displayName,
		email,
		onLogout: handleLogout,
		isLoggingOut,
		getBadgeValue,
	};

	return (
		<>
			{/* Mobile drawer */}
			<div
				className={cn(
					"fixed inset-0 z-50 lg:hidden transition-opacity duration-300",
					mobileOpen
						? "pointer-events-auto opacity-100"
						: "pointer-events-none opacity-0"
				)}
				role="dialog"
				aria-modal="true"
				aria-hidden={!mobileOpen}
				aria-label="Navigation menu"
				id="mobile-sidebar"
			>
				<button
					type="button"
					className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm"
					onClick={onMobileClose}
					aria-label="Close navigation menu"
					tabIndex={mobileOpen ? 0 : -1}
				/>
				<div
					ref={mobilePanelRef}
					className={cn(
						"fixed inset-y-0 left-0 flex w-[min(17rem,82vw)] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out",
						mobileOpen ? "translate-x-0" : "-translate-x-full"
					)}
				>
					<SidebarContent {...contentProps} collapsed={false} onNavigate={onMobileClose} />
					<div className="absolute top-3 right-3">
						<Button
							ref={closeButtonRef}
							variant="ghost"
							size="icon"
							onClick={onMobileClose}
							className="h-8 w-8 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
							aria-label="Close navigation menu"
						>
							<X className="h-5 w-5" />
						</Button>
					</div>
				</div>
			</div>

			{/* Desktop sidebar */}
			<aside
				id="desktop-sidebar"
				className={cn(
					"hidden lg:fixed lg:inset-y-0 lg:z-30 lg:flex lg:flex-col transition-[width] duration-300 ease-in-out",
					collapsed ? "lg:w-16" : "lg:w-72"
				)}
				aria-label="Main navigation"
			>
				<SidebarContent
					{...contentProps}
					collapsed={collapsed}
					onToggleCollapsed={onToggleCollapsed}
				/>
			</aside>
		</>
	);
}

function NavLink({
	item,
	pathname,
	getBadgeValue,
	collapsed,
	onNavigate,
}: {
	item: NavigationItem;
	pathname: string;
	getBadgeValue: (item: NavigationItem) => string | null;
	collapsed: boolean;
	onNavigate?: () => void;
}) {
	const isActive = pathname === item.href;
	const badge = getBadgeValue(item);

	return (
		<Link
			href={item.href}
			onClick={onNavigate}
			title={collapsed ? item.name : undefined}
			aria-current={isActive ? "page" : undefined}
			className={cn(
				"group relative flex items-center rounded-md text-sm transition-colors",
				collapsed ? "mx-auto h-10 w-10 justify-center" : "gap-3 px-3 py-2",
				isActive
					? "bg-uganda-red/10 font-semibold text-uganda-red"
					: "font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
			)}
		>
			{/* Active accent bar */}
			{isActive && !collapsed && (
				<span className="absolute inset-y-1.5 left-0 w-0.5 rounded-r bg-uganda-red" />
			)}
			<item.icon
				className={cn(
					"h-5 w-5 shrink-0 transition-colors",
					isActive
						? "text-uganda-red"
						: "text-gray-400 group-hover:text-gray-600"
				)}
			/>
			{!collapsed && (
				<>
					<span className="truncate">{item.name}</span>
					{badge && (
						<Badge
							variant="secondary"
							className={cn(
								"ml-auto h-5 px-1.5 text-[10px] font-semibold",
								isActive
									? "bg-uganda-red/15 text-uganda-red"
									: badge === "New"
										? "bg-uganda-yellow text-uganda-black"
										: "bg-gray-200 text-gray-700"
							)}
						>
							{badge}
						</Badge>
					)}
				</>
			)}
			{collapsed && badge && (
				<span
					className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-uganda-red px-1 text-[10px] font-semibold text-white"
					aria-label={`${item.name}: ${badge}`}
				>
					{badge.length > 2 ? "•" : badge}
				</span>
			)}
		</Link>
	);
}

function SidebarContent({
	pathname,
	displayName,
	email,
	onLogout,
	isLoggingOut,
	getBadgeValue,
	collapsed,
	onToggleCollapsed,
	onNavigate,
}: {
	pathname: string;
	displayName: string;
	email: string;
	onLogout: () => Promise<void>;
	isLoggingOut: boolean;
	getBadgeValue: (item: NavigationItem) => string | null;
	collapsed: boolean;
	onToggleCollapsed?: () => void;
	onNavigate?: () => void;
}) {
	const initials = getInitials(displayName);

	return (
		<div className="flex h-full flex-col overflow-hidden border-r border-gray-200 bg-white">
			{/* Brand header */}
			<div
				className={cn(
					"flex shrink-0 items-center border-b border-gray-200",
					collapsed ? "h-16 justify-center px-2" : "h-16 gap-3 px-4"
				)}
			>
				<MohLogo size="sm" className="border-gray-200" />
				{!collapsed && (
					<div className="min-w-0">
						<h1 className="truncate text-sm font-bold leading-tight text-gray-900">
							Health Alert
						</h1>
						<p className="truncate text-[11px] text-gray-500">
							Ministry of Health Uganda
						</p>
					</div>
				)}
			</div>

			{/* Navigation */}
			<ScrollArea className="flex-1">
				<nav
					className={cn("space-y-5 py-4", collapsed ? "px-2" : "px-3")}
					aria-label="Sidebar navigation"
				>
					{navigationGroups.map((group, groupIndex) => (
						<div key={group.label} className="space-y-1">
							{collapsed
								? groupIndex > 0 && (
										<div className="mx-2 mb-2 border-t border-gray-200" />
									)
								: (
									<h3 className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
										{group.label}
									</h3>
								)}
							{group.items.map((item) => (
								<NavLink
									key={item.name}
									item={item}
									pathname={pathname}
									getBadgeValue={getBadgeValue}
									collapsed={collapsed}
									onNavigate={onNavigate}
								/>
							))}
						</div>
					))}
				</nav>
			</ScrollArea>

			{/* Footer: user card + actions */}
			<div className={cn("shrink-0 border-t border-gray-200", collapsed ? "p-2" : "p-3")}>
				<div
					className={cn(
						"flex items-center rounded-md",
						collapsed ? "justify-center" : "gap-3 px-1 py-1.5"
					)}
				>
					<div
						className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-uganda-yellow to-uganda-red text-xs font-semibold text-white"
						title={collapsed ? displayName : undefined}
					>
						{initials}
						<span
							className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500"
							aria-label="Online"
						/>
					</div>
					{!collapsed && (
						<div className="min-w-0 flex-1">
							<p className="truncate text-sm font-semibold text-gray-900">
								{displayName}
							</p>
							<p className="truncate text-xs text-gray-500">{email}</p>
						</div>
					)}
				</div>

				<div className={cn("mt-2 flex gap-2", collapsed && "flex-col items-center")}>
					{onToggleCollapsed && (
						<Button
							variant="outline"
							size={collapsed ? "icon" : "sm"}
							onClick={onToggleCollapsed}
							className={cn(collapsed ? "h-9 w-9" : "flex-1 gap-2")}
							aria-expanded={!collapsed}
							aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
						>
							{collapsed ? (
								<PanelLeftOpen className="h-4 w-4" />
							) : (
								<>
									<PanelLeftClose className="h-4 w-4" />
									Collapse
								</>
							)}
						</Button>
					)}
					<Button
						variant="ghost"
						size={collapsed ? "icon" : "sm"}
						onClick={onLogout}
						disabled={isLoggingOut}
						title={collapsed ? "Sign Out" : undefined}
						aria-label="Sign Out"
						className={cn(
							"text-gray-600 hover:bg-red-50 hover:text-red-700",
							collapsed ? "h-9 w-9" : "flex-1 gap-2"
						)}
					>
						<LogOut className="h-4 w-4" />
						{!collapsed && (isLoggingOut ? "Signing Out..." : "Sign Out")}
					</Button>
				</div>
			</div>
		</div>
	);
}

function getInitials(name: string): string {
	if (!name) return "AU";
	const parts = name.trim().split(/\s+/);
	return parts.length > 1
		? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
		: parts[0].substring(0, 2).toUpperCase();
}
