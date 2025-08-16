"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AuthService } from "@/lib/auth";
import {
	LayoutDashboard,
	AlertTriangle,
	FileText,
	Upload,
	Users,
	LogOut,
	X,
	Phone,
	Stethoscope,
	ChevronDown,
	Bell,
	Settings,
	User,
} from "lucide-react";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface NavigationItem {
	name: string;
	href: string;
	icon: any;
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
		name: "Upload CSV",
		href: "/dashboard/upload",
		icon: Upload,
		badge: null,
	},
	{
		name: "EVD Case Definition",
		href: "/dashboard/evd-definition",
		icon: Stethoscope,
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
	sidebarOpen: boolean;
	setSidebarOpen: (open: boolean) => void;
}

export function ModernSidebar({
	sidebarOpen,
	setSidebarOpen,
}: ModernSidebarProps) {
	const pathname = usePathname();
	const [alertsExpanded, setAlertsExpanded] = useState(true);
	const [user, setUser] = useState<any>(null);
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const [alertCounts, setAlertCounts] = useState({
		verified: 0,
		notVerified: 0,
		total: 0,
	});

	useEffect(() => {
		const userData = AuthService.getUser();
		setUser(userData);
	}, []);

	useEffect(() => {
		const fetchAlertsData = async () => {
			try {
				// Fetch alerts from call logs API
				const response = await AuthService.makeAuthenticatedRequest(
					`${
						process.env.NEXT_PUBLIC_API_BASE_URL ||
						"http://localhost:8089/api/v1"
					}/alerts`
				);

				if (!response.ok) {
					throw new Error("Failed to fetch alerts");
				}

				const data = await response.json();
				const alertsData = Array.isArray(data) ? data : [];

				// Calculate counts based on verification status
				const verified = alertsData.filter(
					(alert: any) => alert.isVerified === true
				).length;
				const notVerified = alertsData.filter(
					(alert: any) => alert.isVerified === false
				).length;
				const total = alertsData.length;

				setAlertCounts({
					verified,
					notVerified,
					total,
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

		if (AuthService.isAuthenticated()) {
			fetchAlertsData();
		}
	}, []);

	const handleLogout = async () => {
		if (isLoggingOut) return; // Prevent multiple logout calls

		try {
			setIsLoggingOut(true);
			await AuthService.logout();
			window.location.href = "/add-alert";
		} catch (error) {
			console.error("Logout error:", error);
			// Even if logout fails, redirect to add alert page
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

	return (
		<>
			{/* Mobile sidebar */}
			<div
				className={`fixed inset-0 z-50 lg:hidden ${
					sidebarOpen ? "block" : "hidden"
				}`}
			>
				<div
					className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm"
					onClick={() => setSidebarOpen(false)}
				/>
				<div className="fixed inset-y-0 left-0 flex w-72 flex-col bg-white shadow-2xl">
					<SidebarContent
						pathname={pathname}
						alertsExpanded={alertsExpanded}
						setAlertsExpanded={setAlertsExpanded}
						user={user}
						onLogout={handleLogout}
						isLoggingOut={isLoggingOut}
						getUserInitials={getUserInitials}
						getUserDisplayName={getUserDisplayName}
						getUserEmail={getUserEmail}
						alertCounts={alertCounts}
						getBadgeValue={getBadgeValue}
					/>
					<div className="absolute top-4 right-4">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setSidebarOpen(false)}
							className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
						>
							<X className="h-5 w-5" />
						</Button>
					</div>
				</div>
			</div>

			{/* Desktop sidebar */}
			<div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
				<SidebarContent
					pathname={pathname}
					alertsExpanded={alertsExpanded}
					setAlertsExpanded={setAlertsExpanded}
					user={user}
					onLogout={handleLogout}
					isLoggingOut={isLoggingOut}
					getUserInitials={getUserInitials}
					getUserDisplayName={getUserDisplayName}
					getUserEmail={getUserEmail}
					alertCounts={alertCounts}
					getBadgeValue={getBadgeValue}
				/>
			</div>
		</>
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
	alertCounts,
	getBadgeValue,
}: {
	pathname: string;
	alertsExpanded: boolean;
	setAlertsExpanded: (expanded: boolean) => void;
	user: any;
	onLogout: () => Promise<void>;
	isLoggingOut: boolean;
	getUserInitials: (name: string) => string;
	getUserDisplayName: () => string;
	getUserEmail: () => string;
	alertCounts: {
		verified: number;
		notVerified: number;
		total: number;
	};
	getBadgeValue: (item: NavigationItem) => string | null;
}) {
	return (
		<div className="flex flex-col flex-grow bg-gradient-to-b overflow-y-auto from-white to-gray-50/50 shadow-xl border-r border-gray-200/50">
			{/* Header */}
			<div className="flex h-20 items-center px-6 bg-gradient-to-r from-uganda-red via-uganda-red to-uganda-yellow relative overflow-hidden">
				<div className="absolute inset-0 bg-black/10"></div>
				<div className="relative flex items-center space-x-3">
					<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm border border-white/30">
						<span className="text-xl font-bold text-white">
							MoH
						</span>
					</div>
					<div>
						<h1 className="text-lg font-bold text-white">
							Health Alert
						</h1>
						<p className="text-xs text-white/80">
							Ministry of Health Uganda
						</p>
					</div>
				</div>
			</div>

			{/* User Profile */}
			<div className="px-6 py-4 border-b border-gray-200/50">
				<div className="flex items-center space-x-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-uganda-yellow to-uganda-red text-white font-semibold text-sm">
						{getUserInitials(getUserDisplayName())}
					</div>
					<div className="flex-1 min-w-0">
						<p className="text-sm font-semibold text-gray-900 truncate">
							{getUserDisplayName()}
						</p>
						<p className="text-xs text-gray-500 truncate">
							{getUserEmail()}
						</p>
					</div>
					<Badge
						variant="secondary"
						className="bg-green-100 text-green-700 text-xs"
					>
						Online
					</Badge>
				</div>
			</div>

			{/* Navigation */}
			<ScrollArea className="flex-1 px-4 py-4">
				<nav className="space-y-2">
					{/* Quick Stats */}
					
					{/* Main Navigation */}
					<div className="space-y-1">
						<h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
							Main Menu
						</h3>

						{navigation.slice(0, 2).map((item) => {
							const isActive =
								pathname === item.href ||
								(item.href === "/add-alert" &&
									pathname === "/add-alert");
							return (
								<Link
									key={item.name}
									href={item.href}
									className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
										isActive
											? "bg-gradient-to-r from-uganda-red to-uganda-yellow text-white shadow-lg shadow-uganda-red/25"
											: "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
									}`}
								>
									<item.icon
										className={`mr-3 h-5 w-5 transition-colors ${
											isActive
												? "text-white"
												: "text-gray-400 group-hover:text-gray-600"
										}`}
									/>
									{item.name}
									{getBadgeValue(item) && (
										<Badge
											variant="secondary"
											className={`ml-auto text-xs ${
												isActive
													? "bg-white/20 text-white"
													: "bg-gray-200 text-gray-700"
											}`}
										>
											{getBadgeValue(item)}
										</Badge>
									)}
								</Link>
							);
						})}

						{/* Alerts Section */}
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
										className={`ml-auto h-4 w-4 transition-transform ${
											alertsExpanded
												? "rotate-180"
												: ""
										}`}
									/>
								</Button>
							</CollapsibleTrigger>
							<CollapsibleContent className="space-y-1 ml-6 mt-1">
								{navigation.slice(2, 5).map((item) => {
									const isActive =
										pathname === item.href;
									return (
										<Link
											key={item.name}
											href={item.href}
											className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
												isActive
													? "bg-gradient-to-r from-uganda-red to-uganda-yellow text-white shadow-lg shadow-uganda-red/25"
													: "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
											}`}
										>
											<item.icon
												className={`mr-3 h-4 w-4 transition-colors ${
													isActive
														? "text-white"
														: "text-gray-400 group-hover:text-gray-600"
												}`}
											/>
											{item.name}
											{getBadgeValue(item) && (
												<Badge
													variant="secondary"
													className={`ml-auto text-xs ${
														isActive
															? "bg-white/20 text-white"
															: getBadgeValue(
																	item
															  ) ===
															  "New"
															? "bg-uganda-yellow text-uganda-black"
															: "bg-blue-100 text-blue-700"
													}`}
												>
													{getBadgeValue(
														item
													)}
												</Badge>
											)}
										</Link>
									);
								})}
							</CollapsibleContent>
						</Collapsible>

						{/* Other Navigation Items */}
						{navigation.slice(5).map((item) => {
							const isActive = pathname === item.href;
							return (
								<Link
									key={item.name}
									href={item.href}
									className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
										isActive
											? "bg-gradient-to-r from-uganda-red to-uganda-yellow text-white shadow-lg shadow-uganda-red/25"
											: "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
									}`}
								>
									<item.icon
										className={`mr-3 h-5 w-5 transition-colors ${
											isActive
												? "text-white"
												: "text-gray-400 group-hover:text-gray-600"
										}`}
									/>
									{item.name}
									{getBadgeValue(item) && (
										<Badge
											variant="secondary"
											className={`ml-auto text-xs ${
												isActive
													? "bg-white/20 text-white"
													: getBadgeValue(
															item
													  ) === "New"
													? "bg-uganda-yellow text-uganda-black"
													: "bg-blue-100 text-blue-700"
											}`}
										>
											{getBadgeValue(item)}
										</Badge>
									)}
								</Link>
							);
						})}
					</div>

					<Separator className="my-4" />

					{/* System Section */}
					<div className="space-y-1">
						<h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
							System
						</h3>
						<Link href="/dashboard/profile">
							<Button
								variant="ghost"
								className={`w-full justify-start px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
									pathname === "/dashboard/profile"
										? "bg-gradient-to-r from-uganda-red to-uganda-yellow text-white shadow-lg shadow-uganda-red/25"
										: "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
								}`}
							>
								<User
									className={`mr-3 h-5 w-5 ${
										pathname ===
										"/dashboard/profile"
											? "text-white"
											: "text-gray-400"
									}`}
								/>
								Profile
							</Button>
						</Link>
						<Button
							variant="ghost"
							className="w-full justify-start px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-lg"
						>
							<Settings className="mr-3 h-5 w-5 text-gray-400" />
							Settings
						</Button>
						<Button
							variant="ghost"
							className="w-full justify-start px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-lg"
						>
							<Bell className="mr-3 h-5 w-5 text-gray-400" />
							Notifications
							<Badge
								variant="secondary"
								className="ml-auto bg-red-100 text-red-700 text-xs"
							>
								2
							</Badge>
						</Button>
					</div>
				</nav>
			</ScrollArea>

			{/* Footer */}
			<div className="p-4 border-t border-gray-200/50">
				<Button
					variant="ghost"
					className="w-full justify-start text-gray-700 hover:bg-red-50 hover:text-red-700 rounded-lg"
					onClick={onLogout}
					disabled={isLoggingOut}
				>
					<LogOut className="mr-3 h-5 w-5" />
					{isLoggingOut ? "Signing Out..." : "Sign Out"}
				</Button>
			</div>
		</div>
	);
}
