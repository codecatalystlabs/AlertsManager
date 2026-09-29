"use client";

import { useCallback, useEffect, useState } from "react";
import {
	fetchPermissionCatalogue,
	fetchRoles,
	type PermissionGroup,
	type Role,
} from "@/lib/access-api";

/**
 * The roles and the permission catalogue behind the Users & Access screens.
 *
 * Plain state rather than SWR on purpose: SWR's cache is persisted to browser
 * storage (lib/swr-cache-provider.ts), and account and role lists have no
 * business outliving the page in someone's storage.
 */

export interface Loaded<T> {
	data: T;
	loading: boolean;
	error: string | null;
	reload: () => void;
}

function useLoaded<T>(load: () => Promise<T>, empty: T, enabled: boolean): Loaded<T> {
	const [data, setData] = useState<T>(empty);
	const [loading, setLoading] = useState(enabled);
	const [error, setError] = useState<string | null>(null);
	const [version, setVersion] = useState(0);

	useEffect(() => {
		if (!enabled) {
			setLoading(false);
			return;
		}
		let cancelled = false;
		setLoading(true);
		load()
			.then((value) => {
				if (cancelled) return;
				setData(value);
				setError(null);
			})
			.catch((err) => {
				if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
		// `load` is a module-level function; `version` forces a reload.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [enabled, version]);

	const reload = useCallback(() => setVersion((v) => v + 1), []);
	return { data, loading, error, reload };
}

const NO_ROLES: Role[] = [];
const NO_GROUPS: PermissionGroup[] = [];

/** Every role (GET /roles). Needs users.view or roles.manage. */
export function useRoles(enabled: boolean): Loaded<Role[]> {
	return useLoaded(fetchRoles, NO_ROLES, enabled);
}

/** The permission catalogue (GET /permissions). Needs users.view or roles.manage. */
export function usePermissionCatalogue(enabled: boolean): Loaded<PermissionGroup[]> {
	return useLoaded(fetchPermissionCatalogue, NO_GROUPS, enabled);
}
