"use client";

import { useEffect, useMemo, useState } from "react";
import { loadDistrictOptions } from "@/lib/district-options-cache";

export function useDistrictOptions(currentValue?: string) {
	const [districts, setDistricts] = useState<string[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;

		setLoading(true);
		setError(null);

		loadDistrictOptions()
			.then((list) => {
				if (cancelled) return;
				setDistricts(list);
			})
			.catch((err) => {
				if (cancelled) return;
				setError(
					err instanceof Error
						? err.message
						: "Failed to load districts"
				);
				setDistricts([]);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, []);

	const options = useMemo(() => {
		const trimmed = currentValue?.trim();
		if (!trimmed) return districts;
		if (districts.includes(trimmed)) return districts;
		return [trimmed, ...districts].sort((a, b) => a.localeCompare(b));
	}, [districts, currentValue]);

	return { districts: options, loading, error };
}
