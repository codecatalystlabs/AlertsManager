"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AuthService } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import {
	LogOut,
	User as UserIcon,
	PanelLeftClose,
	PanelLeftOpen,
} from "lucide-react";

interface UserMenuProps {
	collapsed: boolean;
	onToggleCollapsed: () => void;
}

function getInitials(name: string) {
	if (!name) return "AU";
	const parts = name.trim().split(/\s+/);
	if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserMenu({ collapsed, onToggleCollapsed }: UserMenuProps) {
	const [user, setUser] = useState<ReturnType<typeof AuthService.getUser>>(null);
	const [isLoggingOut, setIsLoggingOut] = useState(false);

	useEffect(() => {
		setUser(AuthService.getUser());
	}, []);

	const fullName = user
		? [user.firstName, user.lastName].filter(Boolean).join(" ").trim()
		: "";
	const displayName = fullName || user?.username || "Admin User";
	const displayEmail =
		user?.email ||
		(user?.username ? `${user.username}@health.go.ug` : "admin@health.go.ug");
	const initials = getInitials(displayName);

	const handleLogout = async () => {
		if (isLoggingOut) return;
		try {
			setIsLoggingOut(true);
			await AuthService.logout();
		} catch {
			// ignore; redirect either way
		} finally {
			window.location.href = "/add-alert";
		}
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					aria-label="Open user menu"
					className="group inline-flex items-center gap-2 rounded-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-foreground"
				>
					<span
						className={cn(
							"flex h-8 w-8 items-center justify-center rounded-sm bg-foreground text-background mono text-[11px] font-semibold tracking-tight"
						)}
					>
						{initials}
					</span>
					<span
						className="absolute -mt-6 ml-7 h-1.5 w-1.5 rounded-full bg-accent-green animate-pulse-soft"
						aria-label="Online"
					/>
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				sideOffset={8}
				className="w-64 rounded-sm border border-foreground/[0.08] p-0"
			>
				{/* Identity header */}
				<div className="px-4 py-4 border-b border-foreground/[0.08]">
					<div className="flex items-center gap-3">
						<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-foreground text-background mono text-xs font-semibold">
							{initials}
						</span>
						<div className="min-w-0">
							<p className="text-sm font-medium text-foreground truncate">
								{displayName}
							</p>
							<p className="mono text-[10px] uppercase tracking-tight text-muted-foreground truncate">
								{displayEmail}
							</p>
						</div>
					</div>
					<div className="mt-3 inline-flex items-center gap-2">
						<span className="h-1.5 w-1.5 rounded-full bg-accent-green animate-pulse-soft" />
						<span className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
							Signed in
						</span>
					</div>
				</div>

				{/* Theme switcher */}
				<div className="px-4 py-3 border-b border-foreground/[0.08] flex items-center justify-between gap-3">
					<span className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
						Theme
					</span>
					<ThemeToggle />
				</div>

				{/* Actions */}
				<div className="p-1">
					<Link href="/dashboard/profile" className="block">
						<DropdownMenuItem className="gap-2.5 text-sm cursor-pointer rounded-sm focus:bg-foreground/5">
							<UserIcon
								className="h-3.5 w-3.5 text-muted-foreground"
								strokeWidth={1.75}
							/>
							<span className="flex-1">Profile</span>
							<span className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
								⌘P
							</span>
						</DropdownMenuItem>
					</Link>
					<DropdownMenuItem
						onSelect={(e) => {
							e.preventDefault();
							onToggleCollapsed();
						}}
						className="gap-2.5 text-sm cursor-pointer rounded-sm focus:bg-foreground/5"
					>
						{collapsed ? (
							<PanelLeftOpen
								className="h-3.5 w-3.5 text-muted-foreground"
								strokeWidth={1.75}
							/>
						) : (
							<PanelLeftClose
								className="h-3.5 w-3.5 text-muted-foreground"
								strokeWidth={1.75}
							/>
						)}
						<span className="flex-1">
							{collapsed ? "Expand sidebar" : "Collapse sidebar"}
						</span>
					</DropdownMenuItem>
				</div>

				<DropdownMenuSeparator className="my-0" />

				<div className="p-1">
					<DropdownMenuItem
						onSelect={(e) => {
							e.preventDefault();
							handleLogout();
						}}
						disabled={isLoggingOut}
						className="gap-2.5 text-sm cursor-pointer rounded-sm text-accent-red focus:text-accent-red focus:bg-accent-red/5"
					>
						<LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
						<span>{isLoggingOut ? "Signing out…" : "Sign out"}</span>
					</DropdownMenuItem>
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
