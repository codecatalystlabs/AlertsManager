/**
 * Dashboard chart data aggregations.
 *
 * Critical analysis (data semantics & limitations):
 * - Verification counts use `isVerified` (boolean), not the string `verified` field.
 * - Dashboard KPI wording treats rows as signals; actionable alerts are derived
 *   from verified signals after removing discarded outcomes.
 * - Sidebar "Call Logs" badge is hardcoded ("3") and does not reflect live call-log data.
 * - Zero "today" metrics can mean no alerts filed today OR timezone skew (UTC vs EAT).
 * - Status breakdown treats Unknown/Pending together; other statuses roll into "Other".
 */

import { CallLogAlert } from '@/app/dashboard/types';
import { deriveAlertOutcome } from '@/lib/alert-outcome';
import { DESK_VERIFICATION_OPTIONS } from '@/lib/verification-options';

export interface ChartCountItem {
	key: string;
	label: string;
	count: number;
	color?: string;
}

export interface TimelineItem {
	period: string;
	label: string;
	count: number;
}

export interface DistrictCountItem {
	district: string;
	count: number;
}

const MONTH_NAMES = [
	'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
	'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const OTHER_OUTCOMES_LABEL = "Others";

const OUTCOME_COLORS: Record<string, string> = {
	"Field Case Verification": "#0066CC",
	Discarded: "#D90000",
	"Validated for EMS Evacuation": "#7c3aed",
	"Mortality Surveillance/Supervised Burial": "#111827",
	"Sample Collected": "#16a34a",
	[OTHER_OUTCOMES_LABEL]: "#6b7280",
};

function keyFromLabel(label: string): string {
	return label
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

function parseAlertDate(alert: CallLogAlert): Date | null {
	const d = new Date(alert.date);
	return Number.isNaN(d.getTime()) ? null : d;
}

function toDateKey(date: Date): string {
	return date.toISOString().split('T')[0];
}

export function getVerificationBreakdown(alerts: CallLogAlert[]): ChartCountItem[] {
	const verified = alerts.filter((a) => a.isVerified === true).length;
	const notVerified = alerts.filter((a) => a.isVerified === false).length;

	return [
		{ key: 'verified', label: 'Verified Signals', count: verified },
		{ key: 'notVerified', label: 'Unverified Signals', count: notVerified },
	];
}

export function getStatusDistribution(alerts: CallLogAlert[]): ChartCountItem[] {
	const alive = alerts.filter((a) => a.status === 'Alive').length;
	const dead = alerts.filter((a) => a.status === 'Dead').length;
	const unknown = alerts.filter(
		(a) => a.status === 'Unknown' || a.status === 'Pending'
	).length;
	const categorized = alive + dead + unknown;
	const other = alerts.length - categorized;

	const items: ChartCountItem[] = [
		{ key: 'alive', label: 'Alive', count: alive },
		{ key: 'dead', label: 'Dead', count: dead },
		{ key: 'unknown', label: 'Unknown / Pending', count: unknown },
	];

	if (other > 0) {
		items.push({ key: 'other', label: 'Other', count: other });
	}

	return items.filter((item) => item.count > 0);
}

export function getVerificationOutcomeBreakdown(
	alerts: CallLogAlert[]
): ChartCountItem[] {
	const counts = new Map<string, number>();
	const allowedOutcomes = new Set<string>(DESK_VERIFICATION_OPTIONS);

	for (const option of DESK_VERIFICATION_OPTIONS) {
		counts.set(option, 0);
	}
	counts.set(OTHER_OUTCOMES_LABEL, 0);

	for (const alert of alerts) {
		if (!alert.isVerified) continue;

		const outcome = deriveAlertOutcome(alert);
		const label = allowedOutcomes.has(outcome) ? outcome : OTHER_OUTCOMES_LABEL;
		counts.set(label, (counts.get(label) ?? 0) + 1);
	}

	return Array.from(counts.entries())
		.map(([label, count]) => ({
			key: keyFromLabel(label),
			label,
			count,
			color: OUTCOME_COLORS[label] ?? "#475569",
		}));
}

export function getAlertsOverTime(alerts: CallLogAlert[]): TimelineItem[] {
	const validDates = alerts
		.map(parseAlertDate)
		.filter((d): d is Date => d !== null);

	if (validDates.length === 0) {
		return [];
	}

	const minTime = Math.min(...validDates.map((d) => d.getTime()));
	const maxTime = Math.max(...validDates.map((d) => d.getTime()));
	const spanDays = (maxTime - minTime) / (1000 * 60 * 60 * 24);

	if (spanDays > 60) {
		const buckets: Record<string, number> = {};

		for (const alert of alerts) {
			const d = parseAlertDate(alert);
			if (!d) continue;
			const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
			buckets[key] = (buckets[key] || 0) + 1;
		}

		return Object.entries(buckets)
			.sort(([a], [b]) => a.localeCompare(b))
			.slice(-12)
			.map(([period, count]) => {
				const [year, month] = period.split('-');
				return {
					period,
					label: `${MONTH_NAMES[Number(month) - 1]} ${year.slice(2)}`,
					count,
				};
			});
	}

	const end = new Date();
	end.setHours(0, 0, 0, 0);
	const buckets: Record<string, number> = {};

	for (let i = 29; i >= 0; i--) {
		const d = new Date(end);
		d.setDate(d.getDate() - i);
		buckets[toDateKey(d)] = 0;
	}

	for (const alert of alerts) {
		const d = parseAlertDate(alert);
		if (!d) continue;
		const key = toDateKey(d);
		if (key in buckets) {
			buckets[key]++;
		}
	}

	return Object.entries(buckets).map(([period, count]) => {
		const d = new Date(period);
		return {
			period,
			label: `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`,
			count,
		};
	});
}

export function getTopDistricts(
	alerts: CallLogAlert[],
	limit = 8
): DistrictCountItem[] {
	const counts: Record<string, number> = {};

	for (const alert of alerts) {
		const district = alert.alertCaseDistrict?.trim() || 'Unknown';
		counts[district] = (counts[district] || 0) + 1;
	}

	return Object.entries(counts)
		.sort(([, a], [, b]) => b - a)
		.slice(0, limit)
		.map(([district, count]) => ({ district, count }));
}

export function getTimelineGranularity(alerts: CallLogAlert[]): 'daily' | 'monthly' {
	const validDates = alerts
		.map(parseAlertDate)
		.filter((d): d is Date => d !== null);

	if (validDates.length === 0) return 'daily';

	const minTime = Math.min(...validDates.map((d) => d.getTime()));
	const maxTime = Math.max(...validDates.map((d) => d.getTime()));
	const spanDays = (maxTime - minTime) / (1000 * 60 * 60 * 24);

	return spanDays > 60 ? 'monthly' : 'daily';
}
