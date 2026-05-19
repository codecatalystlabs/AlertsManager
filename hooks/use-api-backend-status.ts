"use client";

import { useCallback, useEffect, useState } from "react";
import { getClientApiBaseUrl } from "@/lib/api-config";
import { isLikelyBackendUnreachable } from "@/lib/api-errors";

export type BackendStatus = "checking" | "online" | "offline" | "error";

interface BackendStatusState {
	status: BackendStatus;
	label: string;
	detail?: string;
}

const OFFLINE_DETAIL =
	"Go API not reachable on port 8089. Start the backend, then refresh.";

async function probeBackend(): Promise<BackendStatusState> {
	const apiBase = getClientApiBaseUrl();

	try {
		const response = await fetch(`${apiBase}/alerts`, {
			method: "GET",
			cache: "no-store",
		});
		const bodyText = await response.text().catch(() => "");

		if (response.status === 401 || response.status === 403) {
			return { status: "online", label: "Backend online" };
		}

		if (response.ok) {
			return { status: "online", label: "Backend online" };
		}

		if (isLikelyBackendUnreachable(response.status, bodyText)) {
			return {
				status: "offline",
				label: "Backend offline",
				detail: OFFLINE_DETAIL,
			};
		}

		return {
			status: "error",
			label: "Backend error",
			detail: `${response.status} ${response.statusText}`,
		};
	} catch {
		return {
			status: "offline",
			label: "Backend offline",
			detail: OFFLINE_DETAIL,
		};
	}
}

/** Dev-only probe: 401/200 means upstream is up; proxy 500 usually means :8089 is down. */
export function useApiBackendStatus(enabled = process.env.NODE_ENV === "development") {
	const [state, setState] = useState<BackendStatusState>({
		status: enabled ? "checking" : "online",
		label: enabled ? "Checking backend…" : "System online",
	});

	const refresh = useCallback(async () => {
		if (!enabled) return;
		setState((current) =>
			current.status === "checking"
				? current
				: { status: "checking", label: "Checking backend…" }
		);
		setState(await probeBackend());
	}, [enabled]);

	useEffect(() => {
		if (!enabled) return;
		void refresh();
		const interval = window.setInterval(() => {
			void refresh();
		}, 30_000);
		return () => window.clearInterval(interval);
	}, [enabled, refresh]);

	return { ...state, refresh };
}
