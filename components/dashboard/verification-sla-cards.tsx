"use client";

import { memo } from "react";
import {
	AlarmClockOff,
	Gauge,
	Hourglass,
	ShieldCheck,
	Timer,
	type LucideIcon,
} from "lucide-react";

import {
	StatCardShell,
	type StatCardInk,
} from "@/components/dashboard/stat-card-shell";
import type { DashboardVerificationSla } from "@/lib/fetch-dashboard";

/**
 * The verification-SLA row: how signals in the selected scope are doing against
 * the 1-hour verification window. Counts come from the /dashboard/summary
 * aggregate, which uses the same clock as the alerts-list SLA row tints — so a
 * card here always reconciles with what the View Alerts list shows.
 *
 * Renders through the same StatCardShell as the workflow KPI cards above it, so
 * both rows stay identical in size and structure; only the card face carries
 * the MoH-requested colour coding (green / teal / amber / red).
 */

/** White ink on a coloured gradient face (green/teal/red cards). */
function whiteInk(face: string): StatCardInk {
	return {
		face: `border-0 ${face}`,
		title: "text-white/90",
		value: "text-white",
		sub: "text-white/85",
		chipBg: "bg-white/25",
		chipText: "text-white",
		skeleton: "bg-white/40",
	};
}

/** Dark ink for the amber card — white on yellow would be unreadable. */
const AMBER_INK: StatCardInk = {
	face: "border-0 bg-gradient-to-br from-amber-300 to-amber-500",
	title: "text-amber-950/90",
	value: "text-amber-950",
	sub: "text-amber-950/85",
	chipBg: "bg-amber-950/15",
	chipText: "text-amber-950",
	skeleton: "bg-amber-950/20",
};

interface SlaCardSpec {
	key: keyof DashboardVerificationSla;
	title: string;
	/** What the number means — shown as a native tooltip. */
	hint: string;
	/** Which population the share caption is computed against. */
	denominator: "verified" | "pending";
	denominatorLabel: string;
	icon: LucideIcon;
	ink: StatCardInk;
}

const SLA_CARDS: SlaCardSpec[] = [
	{
		key: "verifiedWithinHour",
		title: "Verified within an hour",
		hint: "Verified, and verification came within 60 minutes of the signal being reported.",
		denominator: "verified",
		denominatorLabel: "of verified signals",
		icon: ShieldCheck,
		ink: whiteInk("bg-gradient-to-br from-emerald-500 to-emerald-700"),
	},
	{
		key: "pendingUnderHour",
		title: "Not verified — under an hour",
		hint: "Still pending, but reported no more than an hour ago — inside the verification window.",
		denominator: "pending",
		denominatorLabel: "of pending signals",
		icon: Timer,
		ink: whiteInk("bg-gradient-to-br from-teal-500 to-cyan-700"),
	},
	{
		key: "pendingOverHour",
		title: "Not verified for > an hour",
		hint: "Still pending more than an hour after reporting — the verification window has been missed.",
		denominator: "pending",
		denominatorLabel: "of pending signals",
		icon: Hourglass,
		ink: AMBER_INK,
	},
	{
		key: "pendingOver24h",
		title: "Not verified within 24 hours",
		hint: "Still pending more than 24 hours after reporting.",
		denominator: "pending",
		denominatorLabel: "of pending signals",
		icon: AlarmClockOff,
		ink: whiteInk("bg-gradient-to-br from-red-500 to-rose-700"),
	},
];

interface VerificationSlaCardsProps {
	sla: DashboardVerificationSla | undefined;
	/** Verified-signals total in scope — denominator for the green card. */
	verifiedTotal: number;
	/** Pending (unverified) total in scope — denominator for the other cards. */
	pendingTotal: number;
	isLoading?: boolean;
}

/** "42 min" / "1.6 h" / "—" for the median-turnaround value. */
function formatMinutes(minutes: number): string {
	if (minutes < 0) return "—";
	if (minutes < 60) return `${minutes} min`;
	return `${(minutes / 60).toFixed(1)} h`;
}

export const VerificationSlaCards = memo<VerificationSlaCardsProps>(
	({ sla, verifiedTotal, pendingTotal, isLoading }) => {
		const teamVerified = sla?.teamVerified ?? 0;
		const teamWithinHour = sla?.teamVerifiedWithinHour ?? 0;
		const teamPct =
			teamVerified > 0 ? Math.round((teamWithinHour / teamVerified) * 100) : 0;

		return (
			<div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
				{SLA_CARDS.map((spec) => {
					const value = sla?.[spec.key] ?? 0;
					const denom =
						spec.denominator === "verified" ? verifiedTotal : pendingTotal;
					const pct =
						denom > 0 ? Math.min(100, Math.round((value / denom) * 100)) : 0;
					const subText =
						denom > 0
							? `${pct}% ${spec.denominatorLabel}`
							: `no ${spec.denominator} signals in scope`;

					return (
						<StatCardShell
							key={spec.key}
							title={spec.title}
							value={value.toLocaleString()}
							subText={subText}
							icon={spec.icon}
							ink={spec.ink}
							hint={spec.hint}
							isLoading={isLoading}
						/>
					);
				})}

				{/* Team turnaround — the system-arrival clock, live-entered rows only. */}
				<StatCardShell
					title="Team turnaround (median)"
					value={formatMinutes(sla?.teamMedianMinutes ?? -1)}
					subText={
						teamVerified > 0
							? `${teamPct}% verified within 1h of arrival (${teamWithinHour}/${teamVerified})`
							: "no live-entered verified signals"
					}
					icon={Gauge}
					ink={whiteInk("bg-gradient-to-br from-indigo-500 to-violet-700")}
					hint="Median time from a signal ARRIVING in the system (created_at) to its verification. Only live-entered signals count — imported/synced rows are excluded because their created_at is the import moment, not a real arrival."
					isLoading={isLoading}
				/>
			</div>
		);
	}
);

VerificationSlaCards.displayName = "VerificationSlaCards";
