"use client";

import { useCallback, useEffect, useState } from "react";
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
	const [messages, setMessages] = useState<EidsrMessage[]>([]);
	const [stats, setStats] = useState<Record<string, number>>({});
	const [options, setOptions] = useState<EidsrMessageOptions>({});
	const [loading, setLoading] = useState(true);
	const [isSyncing, setIsSyncing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [verificationFilter, setVerificationFilter] = useState<
		"all" | "linked" | "unlinked"
	>("all");

	const loadStats = useCallback(async () => {
		try {
			const data = await getEidsrMessageStats();
			setStats(data);
		} catch {
			// Stats are supplementary; do not block the page
		}
	}, []);

	const loadOptions = useCallback(async () => {
		try {
			const data = await getEidsrMessageOptions();
			setOptions(data);
		} catch {
			// Options fall back to static lists in forms
		}
	}, []);

	const refetch = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const [list] = await Promise.all([
				getEidsrMessages({ all: true }),
				loadStats(),
			]);
			setMessages(list);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to load EIDSR messages"
			);
		} finally {
			setLoading(false);
		}
	}, [loadStats]);

	useEffect(() => {
		void loadOptions();
		void refetch();
	}, [refetch, loadOptions]);

	const syncFromRemote = useCallback(async () => {
		setIsSyncing(true);
		setError(null);
		try {
			await syncEidsrMessages();
			await refetch();
			return { ok: true as const };
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Failed to sync EIDSR messages";
			setError(message);
			return { ok: false as const, message };
		} finally {
			setIsSyncing(false);
		}
	}, [refetch]);

	const removeMessage = useCallback(
		async (id: number) => {
			await deleteEidsrMessage(id);
			setMessages((prev) => prev.filter((m) => m.id !== id));
			await loadStats();
		},
		[loadStats]
	);

	const refreshMessage = useCallback(async (id: number) => {
		const updated = await getEidsrMessage(id);
		setMessages((prev) =>
			prev.map((m) => (m.id === id ? updated : m))
		);
		return updated;
	}, []);

	const filteredMessages = messages.filter((m) => {
		if (verificationFilter === "linked") return m.linkedAlertId != null;
		if (verificationFilter === "unlinked") return m.linkedAlertId == null;
		return true;
	});

	const updateLocalMessage = useCallback((updated: EidsrMessage) => {
		setMessages((prev) =>
			prev.map((m) => (m.id === updated.id ? updated : m))
		);
	}, []);

	const markMessageVerified = useCallback(
		(id: number, linkedAlertId: number | null) => {
			setMessages((prev) =>
				prev.map((m) =>
					m.id === id
						? {
								...m,
								isVerified: true,
								linkedAlertId: linkedAlertId ?? m.linkedAlertId,
							}
						: m
				)
			);
			void loadStats();
		},
		[loadStats]
	);

	return {
		messages: filteredMessages,
		allMessages: messages,
		stats,
		options,
		loading,
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
