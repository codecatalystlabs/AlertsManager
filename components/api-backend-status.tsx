"use client";

import { cn } from "@/lib/utils";
import { useApiBackendStatus } from "@/hooks/use-api-backend-status";

const STATUS_STYLES = {
	offline: "bg-destructive",
	error: "bg-warning",
} as const;

/**
 * Surfaces the backend probe ONLY when it has something wrong to report.
 *
 * A green "Backend online" pill is a developer's reassurance, not a user's:
 * everyone else reads a permanent status light as a thing to worry about, and a
 * healthy backend is the unremarkable case. The in-flight "checking" state is
 * hidden for the same reason — it flashes on every load and says nothing has
 * gone wrong yet. Offline and error stay, because those change what the numbers
 * on the page are worth.
 */
export function ApiBackendStatus() {
	const { status, label, detail } = useApiBackendStatus();

	if (status === "online" || status === "checking") return null;

	return (
		<div
			className="hidden sm:flex sm:items-center sm:space-x-2"
			title={detail}
			role="status"
		>
			<div className={cn("h-2 w-2 rounded-full", STATUS_STYLES[status])} />
			<span className="text-sm text-gray-700">{label}</span>
		</div>
	);
}
