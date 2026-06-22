"use client";

import { useEffect, useState } from "react";
import { SWRConfig } from "swr";
import { sessionStorageProvider } from "@/lib/swr-cache-provider";


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
