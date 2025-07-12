"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { ModernSidebar } from "@/components/modern-sidebar";
import { AuthWrapper } from "@/components/auth-wrapper";

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const [sidebarOpen, setSidebarOpen] = useState(false);

	return (
		<AuthWrapper>
			<div className="min-h-screen bg-gray-50/50">
				<ModernSidebar
					sidebarOpen={sidebarOpen}
					setSidebarOpen={setSidebarOpen}
				/>

				{/* Main content */}
				<div className="lg:pl-72">
					{/* Top bar */}
					<div className="sticky top-0 z-40 flex h-16 items-center gap-x-4 border-b border-gray-200/50 bg-white/80 backdrop-blur-xl px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
						<Button
							variant="ghost"
							size="sm"
							className="lg:hidden"
							onClick={() => setSidebarOpen(true)}
						>
							<Menu className="h-5 w-5" />
						</Button>
						<div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
							<div className="flex flex-1 items-center">
								<h1 className="text-xl font-semibold text-gray-900">
									Health Alert Management System
								</h1>
							</div>
							<div className="flex items-center gap-x-4 lg:gap-x-6">
								<div className="hidden sm:flex sm:items-center sm:space-x-2">
									<div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
									<span className="text-sm text-gray-700">
										System Online
									</span>
								</div>
							</div>
						</div>
					</div>

					{/* Page content */}
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
