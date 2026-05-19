"use client";

import type React from "react";

import { Button } from "@/components/ui/button";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { ModernSidebar } from "@/components/modern-sidebar";
import { AuthWrapper } from "@/components/auth-wrapper";
import {
	useSidebarState,
	getMainContentPaddingClass,
} from "@/hooks/use-sidebar-state";
import { cn } from "@/lib/utils";
import { ApiBackendStatus } from "@/components/api-backend-status";

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const {
		mobileOpen,
		openMobile,
		closeMobile,
		collapsed,
		toggleCollapsed,
		hydrated,
	} = useSidebarState();

	return (
		<AuthWrapper>
			<div className="min-h-screen bg-gray-50/50">
				<ModernSidebar
					mobileOpen={mobileOpen}
					onMobileClose={closeMobile}
					collapsed={collapsed}
					onToggleCollapsed={toggleCollapsed}
				/>

				<div
					className={cn(
						"transition-[padding] duration-300 ease-in-out",
						hydrated
							? getMainContentPaddingClass(collapsed)
							: "lg:pl-72"
					)}
				>
					<div className="sticky top-0 z-40 flex h-16 items-center gap-x-4 border-b border-gray-200/50 bg-white/80 backdrop-blur-xl px-4 shadow-sm sm:gap-x-6 sm:px-8">
						<Button
							variant="ghost"
							size="sm"
							className="lg:hidden"
							onClick={openMobile}
							aria-expanded={mobileOpen}
							aria-controls="mobile-sidebar"
							aria-label="Open navigation menu"
						>
							<Menu className="h-5 w-5" />
						</Button>
						<Button
							variant="ghost"
							size="sm"
							className="hidden lg:inline-flex"
							onClick={toggleCollapsed}
							aria-expanded={!collapsed}
							aria-controls="desktop-sidebar"
							aria-label={
								collapsed
									? "Expand sidebar"
									: "Collapse sidebar"
							}
						>
							{collapsed ? (
								<PanelLeftOpen className="h-5 w-5" />
							) : (
								<PanelLeftClose className="h-5 w-5" />
							)}
						</Button>
						<div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
							<div className="flex flex-1 items-center min-w-0">
								<h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
									Health Alert Management System
								</h1>
							</div>
							<div className="flex items-center gap-x-4 lg:gap-x-6 shrink-0">
								{process.env.NODE_ENV === "development" ? (
									<ApiBackendStatus />
								) : (
									<div className="hidden sm:flex sm:items-center sm:space-x-2">
										<div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
										<span className="text-sm text-gray-700">
											System Online
										</span>
									</div>
								)}
							</div>
						</div>
					</div>

					<main className="py-8">
						<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
							{children}
						</div>
					</main>
				</div>
			</div>
		</AuthWrapper>
	);
}
