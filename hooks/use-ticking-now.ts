import { useEffect, useState } from "react";

/**
 * A `Date` that advances on an interval, so anything derived from "now" re-renders
 * as time passes. Used by the alerts SLA tint: a pending alert's colour depends on
 * how long it has been in the system, so a row must be able to cross the 2h/6h
 * boundary (green → yellow → red) while the tab is just sitting open — the alerts
 * list otherwise only revalidates on focus, which would leave the tint stale.
 *
 * Defaults to a minute, which is the resolution the SLA bands need.
 */
export function useTickingNow(intervalMs = 60_000): Date {
	const [now, setNow] = useState(() => new Date());

	useEffect(() => {
		const id = setInterval(() => setNow(new Date()), intervalMs);
		return () => clearInterval(id);
	}, [intervalMs]);

	return now;
}
