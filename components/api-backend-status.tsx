"use client";

import { cn } from "@/lib/utils";
import { useApiBackendStatus } from "@/hooks/use-api-backend-status";

const STATUS_STYLES = {
	checking: "bg-warning",
	online: "bg-success",
	offline: "bg-destructive",
	error: "bg-warning",
} as const;

export function ApiBackendStatus() {
	const { status, label, detail } = useApiBackendStatus();

	return (
		<div
			className="hidden sm:flex sm:items-center sm:space-x-2"
			title={detail}
		>
			<div
				className={cn(
					"h-2 w-2 rounded-full",
					STATUS_STYLES[status],
					status === "checking" && "animate-pulse"
				)}
			/>
			<span className="text-sm text-gray-700">{label}</span>
		</div>
	);
}
