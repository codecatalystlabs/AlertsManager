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
import { MohLogo } from "@/components/moh-logo";
import { UserMenu } from "@/components/user-menu";

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
			<div className="min-h-screen bg-background">
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
					<header className="sticky top-0 z-40 flex h-14 items-center gap-x-3 border-b border-border bg-background/85 backdrop-blur-md px-4 md:px-6 lg:px-8">
						<Button
							variant="ghost"
							size="sm"
							className="lg:hidden text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-sm"
							onClick={openMobile}
							aria-expanded={mobileOpen}
							aria-controls="mobile-sidebar"
							aria-label="Open navigation menu"
						>
							<Menu className="h-4 w-4" strokeWidth={1.75} />
						</Button>
						<div className="flex flex-1 items-center justify-between gap-x-4 self-stretch">
							<div className="flex items-center min-w-0 gap-3">
								<MohLogo size="xs" />
								<span className="hidden md:inline mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
									Surveillance / Command Center
								</span>
							</div>
							<div className="flex items-center gap-5 shrink-0">
								{process.env.NODE_ENV === "development" ? (
									<ApiBackendStatus />
								) : (
									<div className="hidden sm:flex sm:items-center gap-2">
										<div className="h-1.5 w-1.5 bg-accent-green rounded-full animate-pulse-soft" />
										<span className="mono text-[10px] uppercase tracking-widest font-bold text-foreground">
											System Online
										</span>
									</div>
								)}
								<span
									className="hidden md:block h-5 w-px bg-foreground/10"
									aria-hidden="true"
								/>
								<UserMenu
									collapsed={collapsed}
									onToggleCollapsed={toggleCollapsed}
								/>
							</div>
						</div>
					</header>

					<main className="px-6 md:px-12 py-8">
						<div className="mx-auto max-w-7xl">{children}</div>
					</main>

					<footer className="border-t border-border px-6 md:px-12 py-6 mt-12">
						<div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
							<div className="flex items-center gap-2.5">
								<MohLogo size="xs" />
								<p className="mono text-[10px] uppercase tracking-tighter text-muted-foreground">
									Ministry of Health · Republic of Uganda · National Surveillance
								</p>
							</div>
							<p className="mono text-[10px] uppercase tracking-tighter text-muted-foreground">
								v.2026.05 — MOH
							</p>
						</div>
					</footer>
				</div>
			</div>
		</AuthWrapper>
	);
}
