"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import useSWR, { useSWRConfig } from "swr";
import {
	LOOKUP_CHANNEL_OF_REPORTING,
	LOOKUP_KINDS,
	LOOKUP_SOURCE_OF_ALERT,
	fetchEbsSignals,
	fetchLookupOptions,
	type LookupKind,
	type LookupOption,
} from "@/lib/lookup-options";
import {
	ebsSignalStore,
	setEbsSignals,
	type EbsSignal,
	type EbsSignalRow,
} from "@/lib/ebs-signals";
import {
	setSourceOfAlertOptions,
	sourceOfAlertStore,
} from "@/lib/source-of-alert";
import {
	channelOfReportingStore,
	setChannelOfReportingOptions,
} from "@/lib/channel-of-reporting";

/** SWR key for one option list. Exported so mutations can revalidate it. */
export function lookupOptionsKey(kind: LookupKind): [string, LookupKind] {
	return ["lookup-options", kind];
}

const REGISTRY_SETTERS: Record<LookupKind, (options: LookupOption[]) => void> = {
	[LOOKUP_SOURCE_OF_ALERT]: setSourceOfAlertOptions,
	[LOOKUP_CHANNEL_OF_REPORTING]: setChannelOfReportingOptions,
};

const REGISTRY_STORES = {
	[LOOKUP_SOURCE_OF_ALERT]: sourceOfAlertStore,
	[LOOKUP_CHANNEL_OF_REPORTING]: channelOfReportingStore,
} as const;

/**
 * Load one admin-managed option list and push it into its module registry, so
 * the synchronous helpers (normalizeSourceOfAlert, sourceFilterValues, exports,
 * column filters) resolve against the live list too.
 *
 * Always fetched WITH retired options: a retired option is hidden from pickers
 * but its aliases still have to normalise the rows that carry it.
 */
export function useLookupOptions(kind: LookupKind) {
	const { data, error, isLoading, mutate } = useSWR(
		lookupOptionsKey(kind),
		() => fetchLookupOptions(kind, true),
		{
			// The lists change only when an admin edits them; don't refetch on
			// every window focus across every page that renders a picker.
			revalidateOnFocus: false,
		}
	);

	// Push into the module registry AFTER commit, never during render: the store
	// notifies its subscribers synchronously, and doing that mid-render would be
	// updating other components while this one renders. Covers a cached SWR hit
	// as well as a fresh fetch, and is a no-op when the list is unchanged.
	useEffect(() => {
		if (data && data.length > 0) REGISTRY_SETTERS[kind](data);
	}, [data, kind]);

	return {
		options: useMemo(() => data ?? [], [data]),
		loading: isLoading,
		error: error
			? error instanceof Error
				? error.message
				: "Failed to load options"
			: null,
		reload: mutate,
	};
}

/** SWR key for the EBS signal list. */
export const EBS_SIGNALS_KEY = "ebs-signals";

/**
 * Load the admin-managed EBS signal list (Annex I / Annex II) and push it into
 * the module registry behind normalizeSignalCode / findSignal / signalSummary.
 *
 * Always fetched WITH retired signals: one that has left the Annex must not be
 * offered for new classifications, but the alerts already classified under it
 * still have to resolve to a definition.
 */
export function useEbsSignalOptions() {
	const { data, error, isLoading, mutate } = useSWR(
		EBS_SIGNALS_KEY,
		() => fetchEbsSignals(true),
		{ revalidateOnFocus: false }
	);

	// After commit, never during render — the store notifies synchronously.
	useEffect(() => {
		if (data && data.length > 0) setEbsSignals(data);
	}, [data]);

	return {
		signals: useMemo<EbsSignalRow[]>(() => data ?? [], [data]),
		loading: isLoading,
		error: error
			? error instanceof Error
				? error.message
				: "Failed to load EBS signals"
			: null,
		reload: mutate,
	};
}

/**
 * Mount once (see app/providers.tsx) to hydrate every option registry for the
 * whole app — including the PUBLIC report form, which reads the same lists.
 */
export function useHydrateLookupOptions(): void {
	useLookupOptions(LOOKUP_SOURCE_OF_ALERT);
	useLookupOptions(LOOKUP_CHANNEL_OF_REPORTING);
	useEbsSignalOptions();
}

/** Reactive read of one registry's selectable names, in admin-defined order. */
function useRegistryNames(kind: LookupKind): string[] {
	const store = REGISTRY_STORES[kind];
	const getSnapshot = useCallback(() => store.get().names, [store]);
	return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

/** Selectable "Source of Alert" names; re-renders when the admin list loads. */
export function useSourceOfAlertOptions(): string[] {
	return useRegistryNames(LOOKUP_SOURCE_OF_ALERT);
}

/** Selectable "Channel of Reporting" names; re-renders when the list loads. */
export function useChannelOfReportingOptions(): string[] {
	return useRegistryNames(LOOKUP_CHANNEL_OF_REPORTING);
}

/**
 * The EBS signals a picker may offer (retired ones excluded), in admin-defined
 * order. Re-renders when the admin list loads or changes.
 */
export function useEbsSignals(): EbsSignal[] {
	const getSnapshot = useCallback(() => ebsSignalStore.get().selectable, []);
	return useSyncExternalStore(
		ebsSignalStore.subscribe,
		getSnapshot,
		getSnapshot
	);
}

/**
 * Revalidate every option list, EBS signals included — call after an admin
 * create/update/delete so every open picker and the module registries pick the
 * change up immediately.
 */
export function useInvalidateLookupOptions(): () => Promise<void> {
	const { mutate } = useSWRConfig();
	return useCallback(async () => {
		await Promise.all([
			...LOOKUP_KINDS.map((kind) => mutate(lookupOptionsKey(kind))),
			mutate(EBS_SIGNALS_KEY),
		]);
	}, [mutate]);
}
