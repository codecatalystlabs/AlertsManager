"use client";

import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import type { EidsrMessage } from "@/lib/eidsr-message-normalize";
import {
	deleteEidsrMessage,
	getEidsrMessage,
	getEidsrMessageOptions,
	getEidsrMessageStats,
	getEidsrMessages,
	syncEidsrMessages,
	type EidsrMessageOptions,
} from "@/lib/fetch-eidsr-messages";

export function useEidsrMessagesData() {
	const [isSyncing, setIsSyncing] = useState(false);
	const [verificationFilter, setVerificationFilter] = useState<
		"all" | "linked" | "unlinked"
	>("all");

	const listQuery = useSWR("eidsr-messages", () =>
		getEidsrMessages({ all: true })
	);
	const statsQuery = useSWR("eidsr-messages-stats", getEidsrMessageStats);
	const optionsQuery = useSWR("eidsr-messages-options", getEidsrMessageOptions);

	const messages = useMemo(() => listQuery.data ?? [], [listQuery.data]);
	const stats = statsQuery.data ?? {};
	const options: EidsrMessageOptions = optionsQuery.data ?? {};

	const error = listQuery.error
		? listQuery.error instanceof Error
			? listQuery.error.message
			: "Failed to load EIDSR messages"
		: null;

	/** Revalidate the stats panel (exposed for callers that mutate elsewhere). */
	const loadStats = useCallback(async () => {
		await statsQuery.mutate();
	}, [statsQuery]);

	const refetch = useCallback(async () => {
		await Promise.all([listQuery.mutate(), statsQuery.mutate()]);
	}, [listQuery, statsQuery]);

	const syncFromRemote = useCallback(async () => {
		setIsSyncing(true);
		try {
			await syncEidsrMessages();
			await refetch();
			return { ok: true as const };
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Failed to sync EIDSR messages";
			return { ok: false as const, message };
		} finally {
			setIsSyncing(false);
		}
	}, [refetch]);

	const removeMessage = useCallback(
		async (id: number) => {
			await deleteEidsrMessage(id);
			await listQuery.mutate(
				(prev) => (prev ?? []).filter((m) => m.id !== id),
				{ revalidate: false }
			);
			await statsQuery.mutate();
		},
		[listQuery, statsQuery]
	);

	const refreshMessage = useCallback(
		async (id: number) => {
			const updated = await getEidsrMessage(id);
			await listQuery.mutate(
				(prev) => (prev ?? []).map((m) => (m.id === id ? updated : m)),
				{ revalidate: false }
			);
			return updated;
		},
		[listQuery]
	);

	const updateLocalMessage = useCallback(
		(updated: EidsrMessage) => {
			void listQuery.mutate(
				(prev) => (prev ?? []).map((m) => (m.id === updated.id ? updated : m)),
				{ revalidate: false }
			);
		},
		[listQuery]
	);

	const markMessageVerified = useCallback(
		(id: number, linkedAlertId: number | null) => {
			void listQuery.mutate(
				(prev) =>
					(prev ?? []).map((m) =>
						m.id === id
							? {
									...m,
									isVerified: true,
									linkedAlertId: linkedAlertId ?? m.linkedAlertId,
								}
							: m
					),
				{ revalidate: false }
			);
			void statsQuery.mutate();
		},
		[listQuery, statsQuery]
	);

	const filteredMessages = useMemo(
		() =>
			messages.filter((m) => {
				if (verificationFilter === "linked") return m.linkedAlertId != null;
				if (verificationFilter === "unlinked") return m.linkedAlertId == null;
				return true;
			}),
		[messages, verificationFilter]
	);

	return {
		messages: filteredMessages,
		allMessages: messages,
		stats,
		options,
		loading: listQuery.isLoading,
		isSyncing,
		error,
		verificationFilter,
		setVerificationFilter,
		refetch,
		syncFromRemote,
		removeMessage,
		refreshMessage,
		updateLocalMessage,
		markMessageVerified,
		loadStats,
	};
}
