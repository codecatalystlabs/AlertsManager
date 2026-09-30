import { canTakeStep, type SignalActions } from "@/lib/access";
import { altCode } from "@/lib/alt-code";
import { type ColumnDef } from "@tanstack/react-table";
import { AlertLog } from "@/hooks/use-call-logs-data";
import { sourceOfAlertOptions } from "@/lib/source-of-alert";
import {
	SortableHeader,
	dateRangeFilter,
	exactStringFilter,
	textIncludesFilter,
} from "@/components/ui/data-table";
import {
	MoreHorizontal,
	Eye,
	Edit,
	Shield,
	ShieldQuestion,
	ShieldAlert,
	MessageCircleReply,
	FileDown,
	Check,
} from "lucide-react";
import { alertResponse } from "@/constants";
import {
	downloadAlertConfirmationPdf,
	type AlertPdfData,
} from "@/lib/alert-pdf";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { SignalOriginBadge } from "@/components/signal-origin-badge";
import { DiscardLevelBadge } from "@/components/triage";
import { verificationBlockedReason } from "@/lib/alert-triage";
import { nextAction, type NextActionKey } from "@/lib/next-action";
import {
	VERIFICATION_ESCALATED_FIELD,
	VERIFICATION_LEVEL_DESK,
	VERIFICATION_LEVEL_FIELD,
	type VerificationLevel,
} from "@/lib/verification-options";
import { RiskBadge } from "@/components/risk";
import { feedbackIsReached } from "@/lib/alert-feedback";
import {
	PENDING_BADGE_CLASS,
	VerificationBadge,
	statusBadgeClass,
} from "@/components/ui/status-badges";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const CALL_LOGS_CONFIG = {
	PAGE_TITLE: "Signal Register",
	PAGE_DESCRIPTION: "Every signal reported into the system, at every stage of the EBS steps",
	ITEMS_PER_PAGE: 10,
	EXPORT_FILENAME_PREFIX: "signal_logs_export",
	/** The "Export All Signals" download — triaged, verified AND risk-assessed. */
	PROCESSED_EXPORT_FILENAME_PREFIX: "processed_signals_export",
} as const;

export const STATUS_FILTER_OPTIONS = [
	{ value: "all", label: "All Status" },
	{ value: "alive", label: "Alive" },
	{ value: "other", label: "Other Status" },
	{ value: "dead", label: "Dead" },
	{ value: "unknown", label: "Unknown" },
] as const;

export const VERIFICATION_FILTER_OPTIONS = [
	{ value: "all", label: "All Verification" },
	{ value: "verified", label: "Verified" },
	{ value: "pending", label: "Pending Verification" },
] as const;

export const SEX_FILTER_OPTIONS = [
	{ value: "all", label: "All Sexes" },
	{ value: "Male", label: "Male" },
	{ value: "Female", label: "Female" },
] as const;

export type CallLogsStatFilter = "alive" | "other" | "verified" | "pending";

export interface CallLogsFilterState {
	status: string;
	source: string;
	/**
	 * Which door the signal came in through: "all" | "6767" | "echis" | "poe" |
	 * "direct" (lib/signal-origin.ts). Set by the "Came in via" chips above the
	 * table, or by an ?origin= link such as the 6767 page's post-sync button.
	 */
	origin: string;
	search: string;
	verification: string;
	/** Selected region name, or "all" for no region filter. */
	region: string;
	/** Selected district name, or "all" for no district filter. */
	district: string;
	/** Selected division/subcounty name, or "all" for no division filter. */
	division: string;
	/** Inclusive start of the call date range (YYYY-MM-DD); "" means unbounded. */
	fromDate: string;
	/** Inclusive end of the call date range (YYYY-MM-DD); "" means unbounded. */
	toDate: string;
	/** Case sex ("all" | "Male" | "Female"). */
	sex: string;
	/** Inclusive minimum case age, or "" for unbounded. */
	ageMin: string;
	/** Inclusive maximum case age, or "" for unbounded. */
	ageMax: string;
	/** Triage priority: "all" | "High" | "Medium" | "Low" | "untriaged". */
	priority: string;
	/**
	 * Triage decision: "all" | "Forwarded to Verification" | "Logged" |
	 * "Discarded" | "untriaged". Filtering on Discarded is how the register
	 * shows what triage rejected.
	 */
	triageDecision: string;
	/**
	 * EBS steps stage queue, set from the ?stage= URL param rather than the
	 * filter bar — it is a destination ("Awaiting triage"), not a refinement of
	 * one. Empty means the whole register.
	 */
	stage: string;
	/** Partial match on the call taker; "" means no filter. */
	callTaker: string;
	/** Partial match on the assigned user; "" means no filter. */
	assignedTo: string;
	/** Partial match on the verifying user; "" means no filter. */
	verifiedBy: string;
}

export const CALL_LOGS_INITIAL_FILTERS: CallLogsFilterState = {
	status: "all",
	source: "all",
	origin: "all",
	priority: "all",
	triageDecision: "all",
	stage: "",
	search: "",
	verification: "all",
	region: "all",
	district: "all",
	division: "all",
	fromDate: "",
	toDate: "",
	sex: "all",
	ageMin: "",
	ageMax: "",
	callTaker: "",
	assignedTo: "",
	verifiedBy: "",
};

// Clicking a stat card resets the non-date filters (source, search, and the
// advanced demographic/staff filters) so the card shows a clean slice, while
// the user's selected date range is preserved (presets are merged into the
// current filters).
const STAT_PRESET_RESET: Partial<CallLogsFilterState> = {
	source: "all",
	search: "",
	sex: "all",
	ageMin: "",
	ageMax: "",
	callTaker: "",
	assignedTo: "",
	verifiedBy: "",
};

export const STAT_FILTER_PRESETS: Record<
	CallLogsStatFilter,
	Partial<CallLogsFilterState>
> = {
	alive: { ...STAT_PRESET_RESET, status: "alive", verification: "all" },
	other: { ...STAT_PRESET_RESET, status: "other", verification: "all" },
	verified: { ...STAT_PRESET_RESET, status: "all", verification: "verified" },
	pending: { ...STAT_PRESET_RESET, status: "all", verification: "pending" },
};

export function getActiveStatFromFilters(
	filters: CallLogsFilterState
): CallLogsStatFilter | null {
	// Any advanced filter being active means the view no longer matches a
	// single stat card, so none should be highlighted.
	if (
		filters.search ||
		filters.source !== "all" ||
		filters.sex !== "all" ||
		filters.ageMin ||
		filters.ageMax ||
		filters.callTaker ||
		filters.assignedTo ||
		filters.verifiedBy
	)
		return null;
	if (filters.status === "alive" && filters.verification === "all")
		return "alive";
	if (filters.status === "other" && filters.verification === "all")
		return "other";
	if (filters.status === "all" && filters.verification === "verified")
		return "verified";
	if (filters.status === "all" && filters.verification === "pending")
		return "pending";
	return null;
}

// Mirrors the canonical source list (lib/source-of-alert.ts) so the filter
// always offers every source the add-alert form does — and never drifts out of
// sync (this is why Point Of Entry / Schools had gone missing). A function, not
// a constant: the list is admin-managed and loads at runtime, so a module-scope
// array would freeze the fallback values. Callers rendering it should also call
// useSourceOfAlertOptions() so they re-render when the list arrives.
export function sourceFilterOptions(): { value: string; label: string }[] {
	return [
		{ value: "all", label: "All Sources" },
		...sourceOfAlertOptions().map((name) => ({ value: name, label: name })),
	];
}

export interface CallLogsTableCallbacks {
	onViewDetails: (alert: AlertLog) => void;
	onEditAlert: (alert: AlertLog) => void;
	/**
	 * Open verification at a LEVEL: the desk (by phone, the default) or the
	 * field (a site visit). Same question, same dialog — see
	 * components/alert-verification-dialog.tsx.
	 */
	onVerifyAlert: (alert: AlertLog, level?: VerificationLevel) => void;
	/** Open the triage dialog (EBS step 2 — assign the priority that sets the
	 *  verification deadline). */
	onTriageAlert: (alert: AlertLog) => void;
	/** Open the risk-assessment dialog (EBS step 4 — score a confirmed event
	 *  and select the mandated response level). */
	onAssessRisk: (alert: AlertLog) => void;
	/** Open the reporter-feedback dialog (EBS step 7 — close the loop). */
	onRecordFeedback: (alert: AlertLog) => void;
	/**
	 * Open the spot-report composer (EBS step 5 — the written alert). Offered
	 * once a signal has been risk-assessed, because the level and the response
	 * it mandates are half of what the report exists to communicate.
	 */
	onDeleteAlert: (alertId: number) => Promise<void>;
	/** What the signed-in account's role allows; actions it lacks are not offered. */
	can: SignalActions;
}

/** Resolve a response code (e.g. "ViralHemorrhagicFever") to its display name. */
function responseDisplayName(code?: string | null): string {
	if (!code) return "";
	return alertResponse.find((d) => d.code === code)?.name ?? code;
}

/**
 * Parse an ISO timestamp to a Date, returning undefined for missing/invalid
 * values. An Invalid Date must never reach the PDF generator: alertPdfFilename
 * calls .toISOString() on it unconditionally, which throws.
 */
function parseTimestamp(value?: string | null): Date | undefined {
	if (!value) return undefined;
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? undefined : d;
}

/**
 * Map a call-logs row to the shape the shared alert PDF generator expects.
 * Field sourcing mirrors the AlertDetailsDialog so the exported PDF matches
 * what the user sees in "View details".
 */
export function alertLogToPdfData(alert: AlertLog): AlertPdfData {
	return {
		referenceId: alert.id,
		submittedAt: parseTimestamp(alert.createdAt),
		date: alert.date,
		time: alert.time,
		status: alert.status,
		callTaker: alert.callTaker,
		alertReportedBefore: alert.alertReportedBefore,
		personReporting: alert.personReporting,
		contactNumber: alert.contactNumber,
		sourceOfAlert: alert.sourceOfAlert,
		response: responseDisplayName(alert.response),
		region: alert.region,
		district: alert.alertCaseDistrict,
		subCounty: alert.subCounty,
		village: alert.alertCaseVillage,
		parish: alert.alertCaseParish,
		caseName: alert.alertCaseName,
		caseAge: alert.alertCaseAge,
		caseSex: alert.alertCaseSex,
		nextOfKinName: alert.pointOfContactName,
		nextOfKinPhone: alert.pointOfContactPhone,
		caseDescription: alert.history,
		narrative: alert.narrative,
		symptoms: alert.symptoms
			? alert.symptoms
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean)
			: [],
	};
}

/** Columns the register only shows in some of its views. */
export interface CallLogsTableColumnOptions {
	/**
	 * Show "Discarded at" — which gate closed the signal, and why.
	 *
	 * Only on the Triaged tab's Discarded half. Everywhere else every row would
	 * answer blank, and a column that is empty on the list you are actually
	 * working is worse than no column: it costs width and teaches the reader to
	 * skip past it.
	 */
	showDiscardLevel?: boolean;
	/**
	 * Show the "Risk" column.
	 *
	 * Only on the Risk Assessed list (?stage=feedback), the one place where
	 * every row carries a level. Everywhere else the column is a wall of "Not
	 * assessed" — on the queues by definition, since a signal reaches them
	 * BEFORE assessment — which reads as missing data rather than as the
	 * pipeline working, and costs width the worklist columns need.
	 */
	showRisk?: boolean;
	/**
	 * Show the "Verified" column.
	 *
	 * Same rule as Risk and Response. On the register's default list and inside
	 * the Triaged tab, verification has not happened yet by construction — every
	 * row answers "Pending", so the column is a wall of identical badges that
	 * costs width and says nothing. On the Discarded half the "Discarded at"
	 * column already names which gate closed the signal, which is the same fact
	 * with the reason attached.
	 */
	showVerification?: boolean;
	/**
	 * Show the "Response" column.
	 *
	 * Same rule as the Risk column, for the same reason: the response a signal
	 * mandates is settled at risk assessment, so on every earlier queue this
	 * column is a wall of orange "Pending" badges — flagging work that is not
	 * owed yet, on rows that cannot have an answer.
	 */
	showResponse?: boolean;
}

export const createCallLogsTableColumns = (
	callbacks: CallLogsTableCallbacks,
	options: CallLogsTableColumnOptions = {}
): ColumnDef<AlertLog>[] => [
		{
			accessorKey: "id",
			filterFn: textIncludesFilter,
			meta: {
				filterLabel: "Signal ID",
				filterPlaceholder: "ALT number",
			},
			header: ({ column }) => (
			<SortableHeader column={column}>Signal ID</SortableHeader>
		),
			cell: ({ row }) => {
				return (
					<span className="whitespace-nowrap font-mono text-xs">
						{altCode(Number(row.getValue("id")))}
					</span>
				);
			},
		},
		{
			id: "nextAction",
			header: "Next step",
			enableSorting: false,
			enableColumnFilter: false,
			// The pipeline's next move, as a button. The menu beside it still holds
			// every action; this one says which is actually due, so the queue reads
			// as work rather than as rows.
			cell: ({ row }) => (
				<NextStepButton alert={row.original} callbacks={callbacks} />
			),
		},
		// Spread, not a filtered array — see the note on "Discarded at" below.
		...(options.showRisk
			? [
				{
					id: "risk",
					accessorKey: "riskLevel",
					header: "Risk",
					enableSorting: false,
					meta: { filterLabel: "Risk" },
					// The assessed risk level: what drives how fast and how hard the
					// team responds.
					cell: ({ row }) => <RiskBadge level={row.original.riskLevel} />,
				} satisfies ColumnDef<AlertLog>,
			]
			: []),
		// Spread rather than a filtered array: an entry that is not wanted must not
		// exist at all, or TanStack sizes a hole for it.
		...(options.showDiscardLevel
			? [
				{
					id: "discardLevel",
					header: "Discarded at",
					enableSorting: false,
					// Derived from two columns (triage_decision, verification_outcome),
					// so there is no single server field to filter it by. The two
					// halves of the split ARE the filter.
					enableColumnFilter: false,
					// Which gate threw the signal out. The same count means opposite
					// things at the two levels — a pile discarded at triage is a
					// duplicate/reporting-quality problem, a pile discarded at
					// verification is response capacity spent on nothing — so the
					// level belongs on the row, not behind a click.
					cell: ({ row }) => <DiscardLevelBadge signal={row.original} />,
				} satisfies ColumnDef<AlertLog>,
			]
			: []),
		{
			accessorKey: "date",
			filterFn: dateRangeFilter,
			meta: {
				filterLabel: "Date",
				filterVariant: "dateRange",
			},
			header: ({ column }) => (
			<SortableHeader column={column}>Date</SortableHeader>
		),
			cell: ({ row }) => {
				const date = new Date(row.getValue("date"));
				return (
					<div className="text-sm">{date.toLocaleDateString()}</div>
				);
			},
		},
		{
			accessorKey: "time",
			header: "Time",
			filterFn: textIncludesFilter,
			meta: {
				filterPlaceholder: "Time",
			},
			cell: ({ row }) => {
				const time = new Date(row.getValue("time"));
				return (
					<div className="whitespace-nowrap font-mono text-xs">
						{time.toLocaleTimeString()}
					</div>
				);
			},
		},
		{
			accessorKey: "personReporting",
			meta: {
				filterLabel: "Reporter",
				filterPlaceholder: "Reporter name",
			},
			header: ({ column }) => (
			<SortableHeader column={column}>Reporter</SortableHeader>
		),
			cell: ({ row }) => {
				const reporter = row.getValue("personReporting") as string;
				return (
					<div className="font-medium">
						{reporter || "Not specified"}
					</div>
				);
			},
		},
		{
			accessorKey: "contactNumber",
			header: "Contact Number",
			meta: {
				filterPlaceholder: "Phone number",
			},
			cell: ({ row }) => {
				const contact = row.getValue("contactNumber") as string;
				return (
					<div className="font-mono text-sm">
						{contact || "Not provided"}
					</div>
				);
			},
		},
		{
			accessorKey: "sourceOfAlert",
			header: "Source",
			filterFn: exactStringFilter,
			meta: {
				filterVariant: "select",
				filterOptions: sourceFilterOptions().filter(
					(option) => option.value !== "all"
				),
			},
			cell: ({ row }) => {
				const source = row.getValue("sourceOfAlert") as string;
				return (
					<div className="min-w-[160px]">
						<Badge variant="outline" className="text-xs">
							{source}
						</Badge>
					</div>
				);
			},
		},
		{
			// Which door the signal came in through. The 6767 flag is the one
			// people scan for: those signals now arrive by themselves, logged on
			// sync, so the list has to say which rows nobody typed in. Filtered
			// by the "Came in via" chips above the table, not a header funnel —
			// one control per filter.
			id: "origin",
			header: "Came in via",
			enableSorting: false,
			enableColumnFilter: false,
			cell: ({ row }) => (
				<SignalOriginBadge
					alertFrom={row.original.alertFrom}
					arrivedAt={row.original.forwardedAt || row.original.createdAt}
				/>
			),
		},
		{
			accessorKey: "alertCaseDistrict",
			header: "District",
			meta: {
				filterPlaceholder: "District",
			},
			cell: ({ row }) => {
				const district = row.getValue("alertCaseDistrict") as string;
				return (
					<div className="text-sm">{district || "Not specified"}</div>
				);
			},
		},
		{
			accessorKey: "status",
			header: "Status",
			filterFn: exactStringFilter,
			meta: {
				filterVariant: "select",
				filterOptions: STATUS_FILTER_OPTIONS.filter(
					(option) =>
						option.value !== "all" && option.value !== "other"
				).map((option) => ({
					value:
						option.value === "alive"
							? "Alive"
							: option.value === "dead"
								? "Dead"
								: "Unknown",
					label: option.label,
				})),
			},
			cell: ({ row }) => {
				const status = row.getValue("status") as string;
				return (
					<Badge variant="secondary" className={statusBadgeClass(status)}>
						{status}
					</Badge>
				);
			},
		},
		// Spread, not a filtered array — see the note on "Discarded at" below.
		...(options.showResponse
			? [
				{
					accessorKey: "response",
					header: "Response",
					meta: {
						filterPlaceholder: "Response",
					},
					cell: ({ row }) => {
						const response = row.getValue("response") as string;
						return response ? (
							<Badge variant="secondary" className="text-xs">
								{response}
							</Badge>
						) : (
							<Badge className={`${PENDING_BADGE_CLASS} text-xs`}>
								Pending
							</Badge>
						);
					},
				} satisfies ColumnDef<AlertLog>,
			]
			: []),
		// Spread, not a filtered array — see the note on "Discarded at" below.
		...(options.showVerification
			? [
				{
					accessorKey: "isVerified",
					header: "Verified",
					filterFn: exactStringFilter,
					meta: {
						filterVariant: "select",
						filterOptions: [
							{ value: "true", label: "Verified" },
							{ value: "false", label: "Pending" },
						],
					},
					cell: ({ row }) => (
						<VerificationBadge
							verified={row.getValue("isVerified") as boolean}
						/>
					),
				} satisfies ColumnDef<AlertLog>,
			]
			: []),
		{
			id: "actions",
			enableColumnFilter: false,
			cell: ({ row }) => {
				const alertItem = row.original;

				return (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								className="h-6 w-6 p-0"
							>
								<span className="sr-only">Open menu</span>
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuLabel>Actions</DropdownMenuLabel>
							<DropdownMenuItem
								onClick={() =>
									navigator.clipboard.writeText(
										alertItem.id.toString()
									)
								}
							>
								Copy signal ID
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={() =>
									callbacks.onViewDetails(alertItem)
								}
							>
								<Eye className="h-4 w-4 mr-2" />
								View details
							</DropdownMenuItem>
							{callbacks.can.edit && (
								<DropdownMenuItem
									onClick={() =>
										callbacks.onEditAlert(alertItem)
									}
								>
									<Edit className="h-4 w-4 mr-2" />
									Edit signal
								</DropdownMenuItem>
							)}
							{/* Only once the signal has actually REACHED step 7. A confirmed
						    event still waiting on its risk assessment owes feedback
						    eventually, but offering it here puts two competing actions on
						    one row and closes the loop on an event nobody has scored —
						    see feedbackIsReached. */}
							{callbacks.can.feedback && feedbackIsReached(alertItem) && (
								<DropdownMenuItem
									onClick={() =>
										callbacks.onRecordFeedback(alertItem)
									}
									className={
										alertItem.feedbackGivenAt
											? undefined
											: "text-uganda-red focus:text-uganda-red"
									}
								>
									<MessageCircleReply className="h-4 w-4 mr-2" />
									{alertItem.feedbackGivenAt
										? "Feedback given"
										: "Record feedback"}
								</DropdownMenuItem>
							)}
							{callbacks.can.riskAssess && alertItem.verificationOutcome === "Confirmed" && (
								<DropdownMenuItem
									onClick={() =>
										callbacks.onAssessRisk(alertItem)
									}
								>
									<ShieldAlert className="h-4 w-4 mr-2" />
									{alertItem.riskLevel ? "Re-assess risk" : "Assess risk"}
								</DropdownMenuItem>
							)}
							{/* NOTE: "Generate spot report" was moved off this menu
						    (2026-08-28) to the Alerts list, which holds only signals
						    that finished the pipeline. It was offered here on any
						    scored signal, but a row on the register still has work
						    due on it, and a report written mid-pipeline states a
						    conclusion nobody has reached yet. */}
							{callbacks.can.triage && !alertItem.isVerified && (
								<DropdownMenuItem
									onClick={() =>
										callbacks.onTriageAlert(alertItem)
									}
								>
									<ShieldQuestion className="h-4 w-4 mr-2" />
									{alertItem.priority || alertItem.triageDecision ? "Re-triage" : "Triage"}
								</DropdownMenuItem>
							)}
							{/* Triage is a MANDATORY gate: the server rejects verification
						    of a signal that has not been forwarded. Disabling the
						    action here says so before the click rather than after,
						    with the reason in the tooltip. */}
							{callbacks.can.verify && !alertItem.isVerified &&
								(() => {
									const blocked = verificationBlockedReason(
										alertItem.triageDecision,
										alertItem.priority
									);
									// Once the desk has escalated, the desk is finished
									// with this signal — the only verification left to
									// record is the visit's.
									const escalated =
										(alertItem.verificationOutcome ?? "").trim() ===
										VERIFICATION_ESCALATED_FIELD;
									return (
										<DropdownMenuItem
											disabled={Boolean(blocked)}
											title={blocked || undefined}
											onClick={() =>
												callbacks.onVerifyAlert(
													alertItem,
													escalated
														? VERIFICATION_LEVEL_FIELD
														: VERIFICATION_LEVEL_DESK
												)
											}
											className={
												blocked
													? undefined
													: "text-green-600 focus:text-green-600"
											}
										>
											<Shield className="h-4 w-4 mr-2" />
											{blocked
												? "Verify — triage first"
												: escalated
												? "Record field verification"
												: "Verify signal"}
										</DropdownMenuItem>
									);
								})()}
							{callbacks.can.delete && (
								<>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										className="text-red-600 focus:text-red-600"
										onClick={() =>
											callbacks.onDeleteAlert(alertItem.id)
										}
									>
										Delete signal
									</DropdownMenuItem>
								</>
							)}
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={() => {
									void downloadAlertConfirmationPdf(
										alertLogToPdfData(alertItem)
									).catch((err) => {
										console.error(
											"Failed to export alert PDF",
											err
										);
									});
								}}
							>
								<FileDown className="h-4 w-4 mr-2" />
								Export to PDF
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				);
			},
		},
	];

/** How long a signal has been with the field team, as "3d" / "2h". */
function daysSince(value?: string | null): string {
	if (!value) return "";
	const then = new Date(value).getTime();
	if (Number.isNaN(then)) return "";
	const hours = Math.floor((Date.now() - then) / 3_600_000);
	if (hours < 1) return "just now";
	if (hours < 24) return `${hours}h`;
	return `${Math.floor(hours / 24)}d`;
}

/** Who escalated it, when, and what they asked for — the row's tooltip. */
function escalationTitle(alert: AlertLog): string {
	const parts = ["The desk could not conclude and sent this for field verification."];
	if (alert.escalatedToFieldBy) parts.push(`Escalated by ${alert.escalatedToFieldBy}.`);
	if (alert.fieldVerificationRequest)
		parts.push(`Asked to check: ${alert.fieldVerificationRequest}`);
	return parts.join(" ");
}

/** What a row says when its next step is one the account cannot take. */
const WAITING_ON: Partial<Record<NextActionKey, string>> = {
	triage: "Awaiting triage",
	retriage: "Triaged",
	verify: "Awaiting verification",
	"field-verify": "With the field team",
	"assess-risk": "Awaiting risk assessment",
	feedback: "Awaiting feedback",
};

/**
 * The single action this signal is actually waiting on.
 *
 * Derived from the pipeline order rather than from what a role is permitted to
 * click, so the button answers "what does this signal need?" — the question a
 * focal person working a queue is actually asking. When a signal is off the
 * pipeline or finished, the row says so plainly instead of offering a move that
 * would be rejected.
 */
function NextStepButton({
	alert,
	callbacks,
}: {
	alert: AlertLog;
	callbacks: CallLogsTableCallbacks;
}) {
	const action = nextAction(alert);

	if (action.key === "none") {
		return (
			<span className="text-xs text-muted-foreground" title={action.hint}>
				—
			</span>
		);
	}

	// The step is due but this account's role cannot take it: say what the
	// signal is waiting on rather than offer a button the API would refuse.
	if (!canTakeStep(callbacks.can, action.key)) {
		return (
			<span
				className="whitespace-nowrap text-xs text-muted-foreground"
				title={`${action.hint} Your role does not include this step.`}
			>
				{WAITING_ON[action.key] ?? "—"}
			</span>
		);
	}

	const run: Record<NextActionKey, () => void> = {
		triage: () => callbacks.onTriageAlert(alert),
		retriage: () => callbacks.onTriageAlert(alert),
		verify: () => callbacks.onVerifyAlert(alert, VERIFICATION_LEVEL_DESK),
		"field-verify": () =>
			callbacks.onVerifyAlert(alert, VERIFICATION_LEVEL_FIELD),
		"assess-risk": () => callbacks.onAssessRisk(alert),
		feedback: () => callbacks.onRecordFeedback(alert),
		none: () => { },
	};

	// VERIFICATION IS THE ONE STEP WITH TWO DOORS. The desk is the usual one —
	// a phone call, minutes of work — but a team already travelling to the
	// village verifies better than any call, and forcing them through a desk
	// decision first would have them record an escalation to themselves.
	//
	// So a signal awaiting verification offers both, the desk emphasised and
	// the field beside it. Once the desk HAS escalated, only the field door is
	// left: nextAction returns "field-verify" and there is nothing to choose.
	// Escalated: the desk answered "I cannot tell from here", so the same
	// question is now with a field team. It stays in THIS queue — verification
	// is one gate, whoever is standing at it — and says so on the row, with how
	// long it has been waiting, because that wait is the thing worth seeing.
	if (action.key === "field-verify") {
		const waiting = daysSince(alert.escalatedToFieldAt);
		return (
			<div className="flex items-center gap-1">
				{/* The desk is DONE with this one — it answered the only way it
				    could, by saying it could not answer. Shown as a finished
				    step rather than as a button, so the row offers exactly one
				    move: the visit that is actually owed. */}
				<span
					title={escalationTitle(alert)}
					className="flex h-6 items-center gap-0.5 whitespace-nowrap rounded-md border border-success/30 bg-success/10 px-1.5 text-[11px] font-medium text-success"
				>
					<Check className="h-3 w-3" />
					Desk done
				</span>
				<Button
					size="sm"
					variant="default"
					title={escalationTitle(alert)}
					onClick={() => run["field-verify"]()}
					className="h-6 px-2 text-[11px] font-semibold shadow-sm shadow-primary/20 hover:shadow focus-visible:ring-primary"
				>
					Field verify
				</Button>
				{waiting && (
					<span
						className="whitespace-nowrap text-[10px] font-medium text-amber-700"
						title={`With the field team for ${waiting}.`}
					>
						{waiting}
					</span>
				)}
			</div>
		);
	}

	if (action.key === "verify") {
		return (
			<div className="flex items-center gap-1">
				<Button
					size="sm"
					variant="default"
					title="Verify from the desk — by phone, or from the records."
					onClick={() => run.verify()}
					className="h-6 px-2 text-[11px] font-semibold shadow-sm shadow-primary/20 hover:shadow focus-visible:ring-primary"
				>
					Desk verify
				</Button>
				<Button
					size="sm"
					variant="outline"
					title="Record a field verification — a visit that answers the same question on site."
					onClick={() => run["field-verify"]()}
					className="h-6 border-input px-2 text-[11px] font-medium text-foreground shadow-sm"
				>
					Field verify
				</Button>
			</div>
		);
	}

	// Solid and filled when there is work due. The muted fill this used to carry
	// sat within a couple of percent of the row behind it, so the one control
	// that says "this signal needs something from you" read as a label rather
	// than as something to press.
	//
	// The fill is the theme primary. An earlier version used a separate blue
	// so a column of red buttons would not read as a column of emergencies,
	// but a control the app paints in no other palette reads as foreign to it;
	// the site's own colour is what says "this belongs here, press it".
	//
	// The quiet variant is kept for Re-triage, which is a way back rather than
	// work waiting — but it is a bordered, raised button too, not text.
	return (
		<Button
			size="sm"
			variant={action.actionable ? "default" : "outline"}
			title={action.hint}
			onClick={() => run[action.key]()}
			className={cn(
				"h-6 px-2 text-[11px] shadow-sm",
				action.actionable
					? "font-semibold shadow-primary/20 hover:shadow focus-visible:ring-primary"
					: "border-input font-medium text-foreground"
			)}
		>
			{action.label}
		</Button>
	);
}
