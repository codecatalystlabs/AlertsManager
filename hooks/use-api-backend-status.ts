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

const PROBE_INTERVAL_MS = 60_000;

async function probeBackend(): Promise<BackendStatusState> {
	const apiBase = getClientApiBaseUrl();

	try {
		const response = await fetch(`${apiBase}/alerts?page=1&limit=1`, {
			method: "GET",
			cache: "no-store",
		});

		if (response.status === 401 || response.status === 403) {
			return { status: "online", label: "Backend online" };
		}

		if (response.ok) {
			return { status: "online", label: "Backend online" };
		}

		const bodyText = await response.text().catch(() => "");
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

/** Dev-only probe: lightweight paginated request; skips body on success. */
export function useApiBackendStatus(enabled = process.env.NODE_ENV === "development") {
	const [state, setState] = useState<BackendStatusState>({
		status: enabled ? "checking" : "online",
		label: enabled ? "Checking backend…" : "System online",
	});

	const refresh = useCallback(async () => {
		if (!enabled) return;
		if (typeof document !== "undefined" && document.visibilityState === "hidden") {
			return;
		}
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
		}, PROBE_INTERVAL_MS);

		const onVisibility = () => {
			if (document.visibilityState === "visible") {
				void refresh();
			}
		};
		document.addEventListener("visibilitychange", onVisibility);

		return () => {
			window.clearInterval(interval);
			document.removeEventListener("visibilitychange", onVisibility);
		};
	}, [enabled, refresh]);

	return { ...state, refresh };
}
