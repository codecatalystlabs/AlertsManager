"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AuthService, canManageUsers } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
	LayoutDashboard,
	BellPlus,
	Siren,
	UsersRound,
	X,
	RadioTower,
	Headset,
	CircleUser,
	FileBarChart,
	Map as MapIcon,
	Stethoscope,
	PlaneLanding,
	ShieldQuestion,
	ShieldCheck,
	MessageCircleReply,
} from "lucide-react";
import { MohLogo } from "@/components/moh-logo";

interface NavigationItem {
	name: string;
	href: string;
	icon: React.ComponentType<{ className?: string }>;
	badge?: string | null;
	/**
	 * Only shown to users who can manage other users (Admin). EOC is excluded —
	 * it has admin-like alert rights but no user management. The backend also
	 * enforces these routes (403), so this is UX, not the security boundary.
	 */
	adminOnly?: boolean;
}

interface NavigationGroup {
	label: string;
	items: NavigationItem[];
}

/**
 * Navigation follows the EBS pipeline, not the transports signals arrive on.
 *
 * It used to list one destination per source — 6767, eCHIS, POE, the register —
 * which answers "where did this come from?" A person opening the app needs the
 * other question answered: "what do I work next?" So the spine is now the
 * guideline's own sequence of gates (§3), each entry a live queue, and the
 * source pages are demoted to what they actually are: feed inspectors used for
 * reconciliation, not inboxes.
 */
const navigationGroups: NavigationGroup[] = [
	{
		label: "Main",
		items: [
			{ name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
			{ name: "Add Alert", href: "/add-alert", icon: BellPlus },
		],
	},
	{
		// The pipeline, in guideline order. Step 5 (Alert issued) is absent
		// because the system cannot record it yet — the pipeline strip shows it
		// as locked rather than the nav offering a page that does not exist.
		label: "Signal Pipeline",
		items: [
			{ name: "Signal Register", href: "/dashboard/signal-logs", icon: RadioTower },
			// The register's own tabs, as destinations: the register opens on the
			// untriaged signals, "Triaged" is the forwarded-but-unverified queue
			// (?stage=verification is the gate they are waiting AT), and
			// "Verified" is the confirmed events waiting to be risk-assessed —
			// step 4 has no separate entry because risk can only be assessed on a
			// verified signal, so the Verified tab IS the risk queue.
			{
				name: "Triaged",
				href: "/dashboard/signal-logs?stage=verification",
				icon: ShieldQuestion,
			},
			{
				name: "Verified",
				href: "/dashboard/signal-logs?stage=risk",
				icon: ShieldCheck,
			},
			{
				name: "Feedback Due",
				href: "/dashboard/signal-logs?stage=feedback",
				icon: MessageCircleReply,
			},
			{ name: "Confirmed Events", href: "/dashboard/alerts", icon: Siren },
		],
	},
	{
		// Feed inspectors. A signal only enters the pipeline when it is linked
		// or forwarded from here, which is why these stay reachable.
		label: "Sources",
		items: [
			{ name: "6767 Alerts", href: "/dashboard/eidsr-alerts", icon: Headset },
			{ name: "eCHIS Alerts", href: "/dashboard/echis-alerts", icon: Stethoscope },
			{ name: "POE Alerts", href: "/dashboard/poe-alerts", icon: PlaneLanding },
		],
	},
	{
		label: "Insights",
		items: [
			{ name: "Map", href: "/dashboard/map", icon: MapIcon },
			{
				name: "Summaries / Reports",
				href: "/dashboard/reports",
				icon: FileBarChart,
			},
		],
	},
	{
		label: "Administration",
		items: [
			{ name: "Manage Users", href: "/dashboard/users", icon: UsersRound, adminOnly: true },
			{ name: "Profile", href: "/dashboard/profile", icon: CircleUser },
		],
	},
];

interface ModernSidebarProps {
	mobileOpen: boolean;
	onMobileClose: () => void;
	collapsed: boolean;
}

export function ModernSidebar({
	mobileOpen,
	onMobileClose,
	collapsed,
}: ModernSidebarProps) {
	const pathname = usePathname();
	// The pipeline queues are the same page under different ?stage= values, so
	// the active item cannot be decided on pathname alone — without the search
	// string every queue would highlight "Signal Register".
	const searchParams = useSearchParams();
	const currentUrl = useMemo(() => {
		const query = searchParams?.toString();
		return query ? `${pathname}?${query}` : pathname;
	}, [pathname, searchParams]);
	const mobilePanelRef = useRef<HTMLDivElement>(null);
	const closeButtonRef = useRef<HTMLButtonElement>(null);


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

	const getBadgeValue = (item: NavigationItem): string | null => {
		return item.badge ?? null;
	};

	const contentProps = {
		currentUrl,
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
				<SidebarContent {...contentProps} collapsed={collapsed} />
			</aside>
		</>
	);
}

function NavLink({
	item,
	currentUrl,
	getBadgeValue,
	collapsed,
	onNavigate,
}: {
	item: NavigationItem;
	currentUrl: string;
	getBadgeValue: (item: NavigationItem) => string | null;
	collapsed: boolean;
	onNavigate?: () => void;
}) {
	// Exact match including the query, so /signal-logs and
	// /signal-logs?stage=triage are different destinations — which they are.
	const isActive = currentUrl === item.href;
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
	currentUrl,
	getBadgeValue,
	collapsed,
	onNavigate,
}: {
	currentUrl: string;
	getBadgeValue: (item: NavigationItem) => string | null;
	collapsed: boolean;
	onNavigate?: () => void;
}) {
	// Role-gated nav: resolved after mount to avoid a hydration mismatch
	// (localStorage is client-only). The backend independently enforces these
	// admin-only routes (403), so this is UX, not the security boundary.
	const [canManage, setCanManage] = useState(false);
	useEffect(() => {
		setCanManage(canManageUsers(AuthService.getUser()));
	}, []);

	const visibleGroups = useMemo(
		() =>
			navigationGroups
				.map((group) => ({
					...group,
					items: group.items.filter(
						(item) => !item.adminOnly || canManage
					),
				}))
				.filter((group) => group.items.length > 0),
		[canManage]
	);

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
							HEALTH ALERT
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
					{visibleGroups.map((group, groupIndex) => (
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
									currentUrl={currentUrl}
									getBadgeValue={getBadgeValue}
									collapsed={collapsed}
									onNavigate={onNavigate}
								/>
							))}
						</div>
					))}
				</nav>
			</ScrollArea>
		</div>
	);
}
