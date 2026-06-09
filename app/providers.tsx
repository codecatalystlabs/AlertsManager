"use client";

import { useEffect, useState } from "react";
import { SWRConfig } from "swr";
import { sessionStorageProvider } from "@/lib/swr-cache-provider";

/**
 * Global SWR configuration.
 *
 * - `provider`: sessionStorage-backed cache → instant paint on refresh.
 * - `keepPreviousData`: paging/filtering shows the previous result while the
 *   next one loads, so the table never flashes an empty/loading state.
 * - `revalidateOnFocus` / `revalidateOnReconnect`: refresh when the user returns
 *   to the tab or the network comes back.
 * - `dedupingInterval`: collapse identical requests fired within 2s into one.
 *
 * Each hook supplies its own fetcher (they take typed params, not URLs), so no
 * global `fetcher` is configured here.
 *
 * The persisted cache is attached only AFTER mount. On the server (and the first
 * client render) the cache is empty, so the markup matches and React can hydrate
 * cleanly; the `key` flip then rebuilds the cache from sessionStorage, painting
 * the persisted data on the next tick. The root layout stays mounted across
 * client-side navigations, so this happens once per full page load.
 */
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
			{children}
		</SWRConfig>
	);
}
