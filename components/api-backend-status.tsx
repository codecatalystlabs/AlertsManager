"use client";

import { cn } from "@/lib/utils";
import { useApiBackendStatus } from "@/hooks/use-api-backend-status";

const STATUS_DOT = {
	checking: "bg-accent-yellow",
	online: "bg-accent-green",
	offline: "bg-accent-red",
	error: "bg-accent-yellow",
} as const;

const STATUS_TEXT = {
	checking: "text-muted-foreground",
	online: "text-foreground",
	offline: "text-accent-red",
	error: "text-foreground",
} as const;

export function ApiBackendStatus() {
	const { status, label, detail } = useApiBackendStatus();

	return (
		<div
			className="hidden sm:flex sm:items-center gap-2"
			title={detail}
		>
			<div
				className={cn(
					"h-1.5 w-1.5 rounded-full",
					STATUS_DOT[status],
					status === "checking" && "animate-pulse-soft"
				)}
			/>
			<span
				className={cn(
					"mono text-[10px] uppercase tracking-widest font-bold",
					STATUS_TEXT[status]
				)}
			>
				{label}
			</span>
		</div>
	);
}
