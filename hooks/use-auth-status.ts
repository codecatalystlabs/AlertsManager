"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AuthService } from "@/lib/auth";
import { AUTH_STATUS_CHANGE_EVENT } from "@/lib/auth-events";

export type AuthStatus = {
	isAuthenticated: boolean;
	isReady: boolean;
};

const AUTH_CHECK_TIMEOUT_MS = 2000;

const SERVER_AUTH_STATUS: AuthStatus = {
	isAuthenticated: false,
	isReady: false,
};

const FORCED_READY_STATUS: AuthStatus = {
	isAuthenticated: false,
	isReady: true,
};

/** Cached client snapshot — useSyncExternalStore requires referential stability. */
let clientSnapshot: AuthStatus = FORCED_READY_STATUS;

function readAuthStatus(): boolean {
	try {
		return AuthService.isAuthenticated();
	} catch {
		return false;
	}
}

function syncClientSnapshot(): AuthStatus {
	const isAuthenticated = readAuthStatus();
	if (
		clientSnapshot.isAuthenticated !== isAuthenticated ||
		!clientSnapshot.isReady
	) {
		clientSnapshot = { isAuthenticated, isReady: true };
	}
	return clientSnapshot;
}

function getClientAuthStatus(): AuthStatus {
	return syncClientSnapshot();
}

function subscribe(onStoreChange: () => void): () => void {
	if (typeof window === "undefined") {
		return () => {};
	}

	const onStorage = (event: StorageEvent) => {
		if (
			event.key === null ||
			event.key === "uganda_health_auth_token" ||
			event.key === "uganda_health_user"
		) {
			const prev = clientSnapshot;
			syncClientSnapshot();
			if (prev !== clientSnapshot) onStoreChange();
		}
	};

	const onAuthChange = () => {
		const prev = clientSnapshot;
		syncClientSnapshot();
		if (prev !== clientSnapshot) onStoreChange();
	};

	window.addEventListener("storage", onStorage);
	window.addEventListener(AUTH_STATUS_CHANGE_EVENT, onAuthChange);

	return () => {
		window.removeEventListener("storage", onStorage);
		window.removeEventListener(AUTH_STATUS_CHANGE_EVENT, onAuthChange);
	};
}

/**
 * Client auth from localStorage. Server render stays not-ready; after hydration
 * the client snapshot is always ready (useSyncExternalStore — no useEffect needed).
 */
export function useAuthStatus(): AuthStatus {
	const status = useSyncExternalStore(
		subscribe,
		getClientAuthStatus,
		() => SERVER_AUTH_STATUS
	);

	const [forcedReady, setForcedReady] = useState(false);

	// Proactively drop an expired/invalid token from storage. Done here in an
	// effect (not in the store's getSnapshot) so the snapshot read stays pure.
	useEffect(() => {
		AuthService.clearSessionIfExpired();
	}, []);

	useEffect(() => {
		if (status.isReady) return;
		const id = window.setTimeout(() => setForcedReady(true), AUTH_CHECK_TIMEOUT_MS);
		return () => window.clearTimeout(id);
	}, [status.isReady]);

	if (forcedReady && !status.isReady) {
		return FORCED_READY_STATUS;
	}

	return status;
}

/** Convenience hook for pages that only need the authenticated boolean. */
export function useIsAuthenticated(): boolean {
	return useAuthStatus().isAuthenticated;
}
