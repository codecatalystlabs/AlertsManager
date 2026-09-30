import { Biohazard, Send, ShieldCheck, Thermometer } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DetailGrid, type DetailGridRow } from "@/components/ui/detail-fields";
import { NdwStatusCell, ndwForwardLabel } from "@/components/ndw-alerts/ndw-signals-table";
import type { PoeAlertRow } from "@/lib/fetch-ndw-alerts";
import { formatDate, formatDateTime } from "@/lib/format-date";
import { EXPOSURE_QUESTIONS, poeRiskPill, poeScreening } from "@/lib/poe-screening";
import { cn } from "@/lib/utils";

interface PoeAlertDetailsDialogProps {
	alert: PoeAlertRow | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Shown as footer actions when the role allows them (and the row is synced). */
	onForward?: (row: PoeAlertRow) => void;
	onVerify?: (row: PoeAlertRow) => void;
}

const PILL = "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium";

/**
 * One traveller: what they declared first (symptoms, exposures, risk), then
 * who they are, their trip and how to reach them, with Forward / Verify at
 * hand so the officer can act without going back to the table.
 */
export function PoeAlertDetailsDialog({
	alert,
	open,
	onOpenChange,
	onForward,
	onVerify,
}: PoeAlertDetailsDialogProps) {
	if (!alert) return null;
	const s = poeScreening(alert);
	const answered = new Set(s.exposures);
	const clean = s.symptoms.length === 0 && s.exposureCount === 0;

	const rows: DetailGridRow[] = [
		{ label: "Passport", value: alert.passportNumber || "—" },
		{ label: "Nationality", value: alert.nationality || "—" },
		{ label: "Sex", value: alert.sex ? alert.sex.charAt(0).toUpperCase() + alert.sex.slice(1) : "—" },
		{ label: "Phone (Uganda)", value: alert.phoneUganda || "—" },
		{ label: "Email", value: alert.email || "—" },
		{ label: "Address in Uganda", value: alert.addressInUganda || "—" },
		{ label: "Port of entry", value: alert.portOfEntry || "—" },
		{ label: "Flight", value: alert.flightNumber || "—" },
		{ label: "Embarked in", value: alert.countryOfEmbarkation || "—" },
		{ label: "Arrival", value: formatDate(alert.arrivalDate, "—") },
		{
			label: "Countries visited (21 days)",
			value: s.countriesVisited.length ? s.countriesVisited.join(", ") : "—",
			span: true,
		},
		{ label: "Declared", value: formatDateTime(alert.createdAtRemote, "—") },
		{ label: "Ref code", value: alert.refCode || "—" },
	];

	const canAct = !alert.live;
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{alert.fullName || "Traveller"}</DialogTitle>
					<DialogDescription>
						POE declaration {alert.refCode ? `· ${alert.refCode}` : ""} ·{" "}
						{formatDateTime(alert.createdAtRemote, "date unknown")}
					</DialogDescription>
				</DialogHeader>

				<section
					className={cn(
						"space-y-2 rounded-md border p-3",
						clean ? "bg-muted/30" : "border-amber-200 bg-amber-50/40"
					)}
				>
					<div className="flex flex-wrap items-center gap-2">
						<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							Health screening
						</p>
						{s.risk && (
							<span className={cn(PILL, "capitalize", poeRiskPill(s.risk))}>
								{s.risk} risk{alert.riskScore ? ` · ${alert.riskScore}` : ""}
							</span>
						)}
					</div>
					{clean ? (
						<p className="text-sm text-muted-foreground">
							No symptoms and no exposures declared.
						</p>
					) : (
						<>
							<div className="flex flex-wrap items-center gap-1.5">
								<Thermometer className="h-4 w-4 text-rose-600" />
								{s.symptoms.length ? (
									s.symptoms.map((sym) => (
										<span key={sym} className={cn(PILL, "border-rose-200 bg-rose-50 text-rose-700")}>
											{sym}
										</span>
									))
								) : (
									<span className="text-sm text-muted-foreground">No symptoms</span>
								)}
							</div>
							<ul className="grid gap-1 sm:grid-cols-2">
								{EXPOSURE_QUESTIONS.map((q) => {
									const yes = answered.has(q.label);
									return (
										<li
											key={q.key}
											className={cn(
												"flex items-center gap-1.5 text-sm",
												yes ? "font-medium text-amber-800" : "text-muted-foreground"
											)}
										>
											<Biohazard className={cn("h-3.5 w-3.5", yes ? "text-amber-600" : "opacity-40")} />
											{q.long}: {yes ? "Yes" : "No"}
										</li>
									);
								})}
							</ul>
						</>
					)}
				</section>

				<DetailGrid rows={rows} />

				<div className="flex items-center gap-2 text-sm">
					<span className="text-muted-foreground">Status</span>
					<NdwStatusCell row={alert} />
				</div>

				{canAct && (onForward || onVerify) && (
					<DialogFooter className="gap-2 sm:gap-2">
						{onForward && (
							<Button variant="outline" size="sm" className="gap-1.5" onClick={() => onForward(alert)}>
								<Send className="h-4 w-4" />
								{ndwForwardLabel(alert)}
							</Button>
						)}
						{onVerify && (
							<Button size="sm" className="gap-1.5" onClick={() => onVerify(alert)}>
								<ShieldCheck className="h-4 w-4" />
								Verify into alerts
							</Button>
						)}
					</DialogFooter>
				)}
			</DialogContent>
		</Dialog>
	);
}
