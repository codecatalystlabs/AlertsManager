"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AuthService } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
	LayoutDashboard,
	AlertTriangle,
	FileText,
	Upload,
	Users,
	X,
	Phone,
	User,
	BarChart3,
	type LucideIcon,
} from "lucide-react";
import { MohLogo, MohBrand } from "@/components/moh-logo";

interface NavigationItem {
	name: string;
	href: string;
	icon: LucideIcon;
	badge?: string | null;
	dynamicBadge?: "verified" | "notVerified" | "total";
	tag?: "NEW" | null;
}

const surveillanceNav: NavigationItem[] = [
	{ name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, badge: null },
	{
		name: "View Alerts",
		href: "/dashboard/alerts",
		icon: FileText,
		dynamicBadge: "total",
	},
	{
		name: "Add Alert",
		href: "/add-alert",
		icon: AlertTriangle,
		badge: null,
	},
	{
		name: "Call Logs",
		href: "/dashboard/call-logs",
		icon: Phone,
		badge: "3",
	},
];

const intelligenceNav: NavigationItem[] = [
	{
		name: "Summaries & Reports",
		href: "/dashboard/reports",
		icon: BarChart3,
		badge: null,
	},
	{
		name: "Upload CSV",
		href: "/dashboard/upload",
		icon: Upload,
		badge: null,
		tag: "NEW",
	},
];

const administrationNav: NavigationItem[] = [
	{ name: "Manage Users", href: "/dashboard/users", icon: Users, badge: null },
	{ name: "Profile", href: "/dashboard/profile", icon: User, badge: null },
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
	const [alertCounts, setAlertCounts] = useState({
		verified: 0,
		notVerified: 0,
		total: 0,
	});
	const mobilePanelRef = useRef<HTMLDivElement>(null);
	const closeButtonRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (!AuthService.isAuthenticated()) return;
		AuthService.fetchAlertCounts()
			.then((counts) =>
				setAlertCounts({
					verified: counts.verified,
					notVerified: counts.notVerified,
					total: counts.total,
				})
			)
			.catch(() =>
				setAlertCounts({ verified: 0, notVerified: 0, total: 0 })
			);
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

	const getBadgeValue = (item: NavigationItem) => {
		if (item.badge) return item.badge;
		if (item.dynamicBadge) {
			const count = alertCounts[item.dynamicBadge];
			return count > 0 ? count.toLocaleString() : null;
		}
		return null;
	};

	const contentProps = {
		pathname,
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
					className="fixed inset-0 bg-foreground/40"
					onClick={onMobileClose}
					aria-label="Close navigation menu"
					tabIndex={mobileOpen ? 0 : -1}
				/>
				<div
					ref={mobilePanelRef}
					className={cn(
						"fixed inset-y-0 left-0 flex w-[min(18rem,85vw)] flex-col bg-background border-r border-border transition-transform duration-300 ease-out",
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
							className="text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-sm"
							aria-label="Close navigation menu"
						>
							<X className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</div>

			{/* Desktop sidebar */}
			<aside
				id="desktop-sidebar"
				className={cn(
					"hidden lg:fixed lg:inset-y-0 lg:z-30 lg:flex lg:flex-col transition-[width] duration-300 ease-in-out border-r border-border bg-background",
					collapsed ? "lg:w-16" : "lg:w-72"
				)}
				aria-label="Main navigation"
			>
				<SidebarContent {...contentProps} collapsed={collapsed} />
			</aside>
		</>
	);
}

function NavSection({
	label,
	children,
	collapsed,
}: {
	label: string;
	children: React.ReactNode;
	collapsed: boolean;
}) {
	return (
		<div className="space-y-1">
			{!collapsed && (
				<h3 className="px-3 mb-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground/60">
					{label}
				</h3>
			)}
			{children}
		</div>
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
				"group relative flex items-center text-sm font-medium transition-colors rounded-md",
				collapsed ? "justify-center p-2.5" : "px-3 py-2",
				isActive
					? "bg-foreground/5 text-foreground"
					: "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.03]"
			)}
		>
			{isActive && !collapsed && (
				<span
					aria-hidden="true"
					className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[2px] rounded-full bg-accent-red"
				/>
			)}
			<item.icon
				className={cn(
					"h-4 w-4 shrink-0",
					!collapsed && "mr-3",
					isActive
						? "text-foreground"
						: "text-muted-foreground group-hover:text-foreground"
				)}
				strokeWidth={1.75}
			/>
			{!collapsed && (
				<>
					<span className="truncate">{item.name}</span>
					{item.tag === "NEW" && (
						<span className="ml-auto text-[10px] bg-accent-yellow/20 text-foreground px-1.5 py-0.5 rounded-sm font-semibold tracking-wider mono">
							NEW
						</span>
					)}
					{badge && item.tag !== "NEW" && (
						<span className="ml-auto mono text-[10px] bg-accent-red/10 text-accent-red px-1.5 rounded-full font-semibold">
							{badge}
						</span>
					)}
				</>
			)}
			{collapsed && badge && (
				<span
					className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-red px-1 text-[9px] font-bold text-background mono"
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
	getBadgeValue,
	collapsed,
	onNavigate,
}: {
	pathname: string;
	getBadgeValue: (item: NavigationItem) => string | null;
	collapsed: boolean;
	onNavigate?: () => void;
}) {
	return (
		<div className="flex flex-col flex-grow h-full overflow-hidden">
			{/* Brand header */}
			<div
				className={cn(
					"flex items-center shrink-0 border-b border-border",
					collapsed ? "h-16 justify-center px-2" : "h-20 px-5"
				)}
			>
				{collapsed ? (
					<MohLogo size="sm" />
				) : (
					<MohBrand size="md" />
				)}
			</div>

			{/* Navigation */}
			<ScrollArea
				className={cn("flex-1", collapsed ? "px-2 py-4" : "px-3 py-5")}
			>
				<nav className="space-y-6" aria-label="Sidebar navigation">
					<NavSection label="Surveillance" collapsed={collapsed}>
						{surveillanceNav.map((item) => (
							<NavLink
								key={item.name}
								item={item}
								pathname={pathname}
								getBadgeValue={getBadgeValue}
								collapsed={collapsed}
								onNavigate={onNavigate}
							/>
						))}
					</NavSection>

					<NavSection label="Intelligence" collapsed={collapsed}>
						{intelligenceNav.map((item) => (
							<NavLink
								key={item.name}
								item={item}
								pathname={pathname}
								getBadgeValue={getBadgeValue}
								collapsed={collapsed}
								onNavigate={onNavigate}
							/>
						))}
					</NavSection>

					<NavSection label="Administration" collapsed={collapsed}>
						{administrationNav.map((item) => (
							<NavLink
								key={item.name}
								item={item}
								pathname={pathname}
								getBadgeValue={getBadgeValue}
								collapsed={collapsed}
								onNavigate={onNavigate}
							/>
						))}
					</NavSection>
				</nav>
			</ScrollArea>

			{/* Footer: editorial brand line — user/sign-out moved to top-right UserMenu. */}
			<div
				className={cn(
					"border-t border-border shrink-0",
					collapsed ? "px-2 py-3" : "px-5 py-4"
				)}
			>
				{collapsed ? (
					<p className="mono text-[9px] uppercase tracking-tighter text-muted-foreground/70 text-center">
						MoH
					</p>
				) : (
					<p className="mono text-[9px] uppercase tracking-tighter text-muted-foreground/70 leading-relaxed">
						Ministry of Health · Republic of Uganda
					</p>
				)}
			</div>
		</div>
	);
}
