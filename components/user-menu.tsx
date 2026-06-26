"use client";

import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";

import { AuthService } from "@/lib/auth";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function getInitials(name: string): string {
	if (!name) return "AU";
	const parts = name.trim().split(/\s+/);
	return parts.length > 1
		? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
		: parts[0].substring(0, 2).toUpperCase();
}

/**
 * Account menu shown at the top-right of the dashboard. Replaces the old
 * sidebar-footer user card: shows the signed-in user and exposes Sign Out.
 */
export function UserMenu() {
	const [user, setUser] = useState<ReturnType<typeof AuthService.getUser>>(
		null
	);
	const [isLoggingOut, setIsLoggingOut] = useState(false);

	useEffect(() => {
		setUser(AuthService.getUser());
	}, []);

	const displayName = (() => {
		if (!user) return "Admin User";
		const full = [user.firstName, user.lastName]
			.filter(Boolean)
			.join(" ")
			.trim();
		return full || user.username || "Admin User";
	})();

	const email =
		user?.email ||
		(user ? `${user.username}@health.go.ug` : "admin@health.go.ug");

	const initials = getInitials(displayName);

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

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className="flex items-center gap-2 rounded-full py-0.5 pl-0.5 pr-1 text-left transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uganda-red focus-visible:ring-offset-1 sm:pr-2"
					aria-label="Open account menu"
				>
					<span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-uganda-yellow to-uganda-red text-xs font-semibold text-white">
						{initials}
						<span
							className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-success"
							aria-label="Online"
						/>
					</span>
					<span className="hidden max-w-[10rem] truncate text-sm font-semibold leading-tight text-gray-900 sm:block">
						{displayName}
					</span>
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuLabel className="font-normal">
					<p className="truncate text-sm font-semibold text-gray-900">
						{displayName}
					</p>
					<p className="truncate text-xs font-normal text-gray-500">
						{email}
					</p>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onClick={(e) => {
						// Keep the menu logic in our handler, not Radix's close-on-select.
						e.preventDefault();
						handleLogout();
					}}
					disabled={isLoggingOut}
					className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
				>
					<LogOut className="mr-2 h-4 w-4" />
					{isLoggingOut ? "Signing Out..." : "Sign Out"}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
