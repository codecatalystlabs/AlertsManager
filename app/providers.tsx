"use client";

import { useEffect, useState } from "react";
import { SWRConfig } from "swr";
import { sessionStorageProvider } from "@/lib/swr-cache-provider";
import { useHydrateLookupOptions } from "@/hooks/use-lookup-options";

/**
 * Loads the admin-managed dropdown lists (source of alert, channel of
 * reporting) into their module registries once for the whole app — the PUBLIC
 * report form included. Renders nothing; it exists so every picker and every
 * synchronous normalisation helper reads the same live lists.
 */
function LookupOptionsHydrator() {
	useHydrateLookupOptions();
	return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
	const [hydrated, setHydrated] = useState(false);

	useEffect(() => {
		setHydrated(true);
	}, []);

	return (
		<SWRConfig
			key={hydrated ? "persisted" : "initial"}
			value={{
				...(hydrated ? { provider: sessionStorageProvider } : {}),
				revalidateOnFocus: true,
				revalidateOnReconnect: true,
				keepPreviousData: true,
				dedupingInterval: 2000,
				onError: (error) => {
					if (process.env.NODE_ENV === "development") {
						console.error("[swr]", error);
					}
				},
			}}
		>
			<LookupOptionsHydrator />
			{children}
		</SWRConfig>
	);
}
