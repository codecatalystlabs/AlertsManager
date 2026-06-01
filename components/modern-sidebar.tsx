"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AuthService } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
	LayoutDashboard,
	AlertTriangle,
	FileText,
	Upload,
	Users,
	LogOut,
	X,
	Phone,
	PhoneCall,
	ChevronDown,
	User,
	PanelLeftClose,
	PanelLeftOpen,
	BarChart3,
} from "lucide-react";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { MohLogo } from "@/components/moh-logo";

interface NavigationItem {
	name: string;
	href: string;
	icon: React.ComponentType<{ className?: string }>;
	badge?: string | null;
	dynamicBadge?: "verified" | "notVerified" | "total";
}

const navigation: NavigationItem[] = [
	{
		name: "Dashboard",
		href: "/dashboard",
		icon: LayoutDashboard,
		badge: null,
	},
	{
		name: "Add Alert",
		href: "/add-alert",
		icon: AlertTriangle,
		badge: null,
	},
	{
		name: "View Alerts",
		href: "/dashboard/alerts",
		icon: FileText,
		dynamicBadge: "total",
	},
	{
		name: "Call Logs",
		href: "/dashboard/call-logs",
		icon: Phone,
		badge: "3",
	},
	{
		name: "6767 Alerts",
		href: "/dashboard/eidsr-alerts",
		icon: PhoneCall,
		badge: null,
	},
	{
		name: "Summaries / Reports",
		href: "/dashboard/reports",
		icon: BarChart3,
		badge: null,
	},
	{
		name: "Upload CSV",
		href: "/dashboard/upload",
		icon: Upload,
		badge: "New",
	},
	{
		name: "Manage Users",
		href: "/dashboard/users",
		icon: Users,
		badge: null,
	},
];

interface ModernSidebarProps {
	mobileOpen: boolean;
	onMobileClose: () => void;
	collapsed: boolean;
	onToggleCollapsed: () => void;
}

export function ModernSidebar({
	mobileOpen,
	onMobileClose,
	collapsed,
	onToggleCollapsed,
}: ModernSidebarProps) {
	const pathname = usePathname();
	const [alertsExpanded, setAlertsExpanded] = useState(true);
	const [user, setUser] = useState<ReturnType<typeof AuthService.getUser>>(
		null
	);
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const [alertCounts, setAlertCounts] = useState({
		verified: 0,
		notVerified: 0,
		total: 0,
	});
	const mobilePanelRef = useRef<HTMLDivElement>(null);
	const closeButtonRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		const userData = AuthService.getUser();
		setUser(userData);
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
				console.error(
					"Error fetching alert counts for sidebar:",
					error
				);
				setAlertCounts({
					verified: 0,
					notVerified: 0,
					total: 0,
				});
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

	const getUserInitials = (name: string) => {
		if (!name) return "AU";
		const names = name.split(" ");
		return names.length > 1
			? (names[0][0] + names[names.length - 1][0]).toUpperCase()
			: names[0].substring(0, 2).toUpperCase();
	};

	const getUserDisplayName = () => {
		if (!user) return "Admin User";
		return user.username || user.name || "Admin User";
	};

	const getUserEmail = () => {
		if (!user) return "admin@health.go.ug";
		return user.email || `${user.username}@health.go.ug`;
	};

	const getBadgeValue = (item: NavigationItem) => {
		if (item.badge) return item.badge;
		if (item.dynamicBadge) {
			const count = alertCounts[item.dynamicBadge];
			return count > 0 ? count.toString() : null;
		}
		return null;
	};

	const contentProps = {
		pathname,
		alertsExpanded,
		setAlertsExpanded,
		user,
		onLogout: handleLogout,
		isLoggingOut,
		getUserInitials,
		getUserDisplayName,
		getUserEmail,
		alertCounts,
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
					className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm"
					onClick={onMobileClose}
					aria-label="Close navigation menu"
					tabIndex={mobileOpen ? 0 : -1}
				/>
				<div
					ref={mobilePanelRef}
					className={cn(
						"fixed inset-y-0 left-0 flex w-[min(18rem,85vw)] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out",
						mobileOpen ? "translate-x-0" : "-translate-x-full"
					)}
				>
					<SidebarContent
						{...contentProps}
						collapsed={false}
						onNavigate={onMobileClose}
					/>
					<div className="absolute top-4 right-4">
						<Button
							ref={closeButtonRef}
							variant="ghost"
							size="sm"
							onClick={onMobileClose}
							className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
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
	const isActive =
		pathname === item.href ||
		(item.href === "/add-alert" && pathname === "/add-alert");
	const badge = getBadgeValue(item);

	return (
		<Link
			href={item.href}
			onClick={onNavigate}
			title={collapsed ? item.name : undefined}
			className={cn(
				"group relative flex items-center rounded-lg text-sm font-medium transition-all duration-200",
				collapsed ? "justify-center p-2.5" : "px-3 py-2.5",
				isActive
					? "bg-gradient-to-r from-uganda-red to-uganda-yellow text-white shadow-lg shadow-uganda-red/25"
					: "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
			)}
		>
			<item.icon
				className={cn(
					"h-5 w-5 shrink-0 transition-colors",
					!collapsed && "mr-3",
					isActive
						? "text-white"
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
								"ml-auto text-xs",
								isActive
									? "bg-white/20 text-white"
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
					className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-uganda-red px-1 text-[10px] font-semibold text-white"
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
	alertsExpanded,
	setAlertsExpanded,
	user,
	onLogout,
	isLoggingOut,
	getUserInitials,
	getUserDisplayName,
	getUserEmail,
	getBadgeValue,
	collapsed,
	onToggleCollapsed,
	onNavigate,
}: {
	pathname: string;
	alertsExpanded: boolean;
	setAlertsExpanded: (expanded: boolean) => void;
	user: ReturnType<typeof AuthService.getUser>;
	onLogout: () => Promise<void>;
	isLoggingOut: boolean;
	getUserInitials: (name: string) => string;
	getUserDisplayName: () => string;
	getUserEmail: () => string;
	getBadgeValue: (item: NavigationItem) => string | null;
	collapsed: boolean;
	onToggleCollapsed?: () => void;
	onNavigate?: () => void;
}) {
	const displayName = getUserDisplayName();

	return (
		<div className="flex flex-col flex-grow bg-gradient-to-b overflow-hidden from-white to-gray-50/50 shadow-xl border-r border-gray-200/50 h-full">
			{/* Header */}
			<div
				className={cn(
					"flex items-center bg-gradient-to-r from-uganda-red via-uganda-red to-uganda-yellow relative overflow-hidden shrink-0",
					collapsed ? "h-16 justify-center px-2" : "h-20 px-6"
				)}
			>
				<div className="absolute inset-0 bg-black/10" />
				<div
					className={cn(
						"relative flex items-center",
						collapsed ? "justify-center" : "space-x-3"
					)}
				>
					<MohLogo size={collapsed ? "sm" : "md"} />
					{!collapsed && (
						<div className="min-w-0">
							<h1 className="text-lg font-bold text-white truncate">
								Health Alert
							</h1>
							<p className="text-xs text-white/80 truncate">
								Ministry of Health Uganda
							</p>
						</div>
					)}
				</div>
			</div>

			{/* User Profile */}
			<div
				className={cn(
					"border-b border-gray-200/50 shrink-0",
					collapsed ? "px-2 py-3 flex justify-center" : "px-6 py-4"
				)}
			>
				<div
					className={cn(
						"flex items-center",
						collapsed ? "justify-center" : "space-x-3"
					)}
				>
					<div
						className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-uganda-yellow to-uganda-red text-white font-semibold text-sm"
						title={collapsed ? displayName : undefined}
					>
						{getUserInitials(displayName)}
					</div>
					{!collapsed && (
						<>
							<div className="flex-1 min-w-0">
								<p className="text-sm font-semibold text-gray-900 truncate">
									{displayName}
								</p>
								<p className="text-xs text-gray-500 truncate">
									{getUserEmail()}
								</p>
							</div>
							<Badge
								variant="secondary"
								className="bg-green-100 text-green-700 text-xs shrink-0"
							>
								Online
							</Badge>
						</>
					)}
				</div>
			</div>

			{/* Navigation */}
			<ScrollArea className={cn("flex-1", collapsed ? "px-2 py-3" : "px-4 py-4")}>
				<nav className="space-y-2" aria-label="Sidebar navigation">
					<div className="space-y-1">
						{!collapsed && (
							<h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
								Main Menu
							</h3>
						)}

						{navigation.slice(0, 2).map((item) => (
							<NavLink
								key={item.name}
								item={item}
								pathname={pathname}
								getBadgeValue={getBadgeValue}
								collapsed={collapsed}
								onNavigate={onNavigate}
							/>
						))}

						{collapsed ? (
							navigation.slice(2, 7).map((item) => (
								<NavLink
									key={item.name}
									item={item}
									pathname={pathname}
									getBadgeValue={getBadgeValue}
									collapsed={collapsed}
									onNavigate={onNavigate}
								/>
							))
						) : (
							<Collapsible
								open={alertsExpanded}
								onOpenChange={setAlertsExpanded}
							>
								<CollapsibleTrigger asChild>
									<Button
										variant="ghost"
										className="w-full justify-start px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-lg"
									>
										<AlertTriangle className="mr-3 h-5 w-5 text-gray-400" />
										Alert Management
										<ChevronDown
											className={cn(
												"ml-auto h-4 w-4 transition-transform",
												alertsExpanded && "rotate-180"
											)}
										/>
									</Button>
								</CollapsibleTrigger>
								<CollapsibleContent className="space-y-1 ml-6 mt-1">
									{navigation.slice(2, 7).map((item) => {
										const isActive = pathname === item.href;
										const badge = getBadgeValue(item);
										return (
											<Link
												key={item.name}
												href={item.href}
												onClick={onNavigate}
												className={cn(
													"group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
													isActive
														? "bg-gradient-to-r from-uganda-red to-uganda-yellow text-white shadow-lg shadow-uganda-red/25"
														: "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
												)}
											>
												<item.icon
													className={cn(
														"mr-3 h-4 w-4 transition-colors",
														isActive
															? "text-white"
															: "text-gray-400 group-hover:text-gray-600"
													)}
												/>
												{item.name}
												{badge && (
													<Badge
														variant="secondary"
														className={cn(
															"ml-auto text-xs",
															isActive
																? "bg-white/20 text-white"
																: badge === "New"
																	? "bg-uganda-yellow text-uganda-black"
																	: "bg-blue-100 text-blue-700"
														)}
													>
														{badge}
													</Badge>
												)}
											</Link>
										);
									})}
								</CollapsibleContent>
							</Collapsible>
						)}

						{navigation.slice(7).map((item) => (
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

					<Separator className={cn("my-4", collapsed && "mx-1")} />

					<div className="space-y-1">
						{!collapsed && (
							<h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
								System
							</h3>
						)}
						<Link
							href="/dashboard/profile"
							onClick={onNavigate}
							title={collapsed ? "Profile" : undefined}
						>
							<Button
								variant="ghost"
								className={cn(
									"w-full text-sm font-medium rounded-lg transition-all duration-200",
									collapsed
										? "justify-center p-2.5"
										: "justify-start px-3 py-2.5",
									pathname === "/dashboard/profile"
										? "bg-gradient-to-r from-uganda-red to-uganda-yellow text-white shadow-lg shadow-uganda-red/25"
										: "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
								)}
							>
								<User
									className={cn(
										"h-5 w-5",
										!collapsed && "mr-3",
										pathname === "/dashboard/profile"
											? "text-white"
											: "text-gray-400"
									)}
								/>
								{!collapsed && "Profile"}
							</Button>
						</Link>
					</div>
				</nav>
			</ScrollArea>

			{/* Footer */}
			<div
				className={cn(
					"border-t border-gray-200/50 shrink-0 space-y-2",
					collapsed ? "p-2" : "p-4"
				)}
			>
				{onToggleCollapsed && (
					<Button
						variant="ghost"
						size="sm"
						onClick={onToggleCollapsed}
						className={cn(
							"w-full text-gray-600 hover:bg-gray-100 rounded-lg",
							collapsed ? "justify-center p-2.5" : "justify-start"
						)}
						aria-expanded={!collapsed}
						aria-label={
							collapsed ? "Expand sidebar" : "Collapse sidebar"
						}
					>
						{collapsed ? (
							<PanelLeftOpen className="h-5 w-5" />
						) : (
							<>
								<PanelLeftClose className="mr-3 h-5 w-5" />
								Collapse
							</>
						)}
					</Button>
				)}
				<Button
					variant="ghost"
					className={cn(
						"w-full text-gray-700 hover:bg-red-50 hover:text-red-700 rounded-lg",
						collapsed ? "justify-center p-2.5" : "justify-start"
					)}
					onClick={onLogout}
					disabled={isLoggingOut}
					title={collapsed ? "Sign Out" : undefined}
					aria-label={collapsed ? "Sign Out" : undefined}
				>
					<LogOut className={cn("h-5 w-5", !collapsed && "mr-3")} />
					{!collapsed &&
						(isLoggingOut ? "Signing Out..." : "Sign Out")}
				</Button>
			</div>
		</div>
	);
}
