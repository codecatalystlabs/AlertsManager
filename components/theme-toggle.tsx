"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "light" | "dark" | "system";

const MODES: { value: Mode; label: string; icon: typeof Sun }[] = [
	{ value: "light", label: "Light", icon: Sun },
	{ value: "dark", label: "Dark", icon: Moon },
	{ value: "system", label: "System", icon: Monitor },
];

/**
 * Editorial three-segment theme switch — light / dark / system.
 * Mono labels, hairline track, no rounded pill. Defaults visually
 * to "system" until next-themes is hydrated to avoid SSR mismatch.
 */
export function ThemeToggle({ className }: { className?: string }) {
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => setMounted(true), []);

	const active = (mounted ? theme : "system") as Mode;

	return (
		<div
			role="radiogroup"
			aria-label="Color theme"
			className={cn(
				"inline-flex items-center gap-px p-0.5 rounded-sm border border-foreground/10 bg-foreground/[0.03]",
				className
			)}
		>
			{MODES.map(({ value, label, icon: Icon }) => {
				const isActive = active === value;
				return (
					<button
						key={value}
						type="button"
						role="radio"
						aria-checked={isActive}
						onClick={() => setTheme(value)}
						title={label}
						className={cn(
							"flex h-7 w-7 items-center justify-center rounded-sm transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-foreground",
							isActive
								? "bg-background text-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground"
						)}
					>
						<Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
						<span className="sr-only">{label}</span>
					</button>
				);
			})}
		</div>
	);
}

/**
 * Compact single-icon switch — flips between light/dark only.
 * Used inside menus where the segmented control is too wide.
 */
export function ThemeToggleCompact({ className }: { className?: string }) {
	const { resolvedTheme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => setMounted(true), []);

	const isDark = mounted && resolvedTheme === "dark";
	const next = isDark ? "light" : "dark";
	const Icon = isDark ? Sun : Moon;

	return (
		<button
			type="button"
			onClick={() => setTheme(next)}
			aria-label={`Switch to ${next} mode`}
			title={`Switch to ${next} mode`}
			className={cn(
				"inline-flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-foreground",
				className
			)}
		>
			<Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
		</button>
	);
}
