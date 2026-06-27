import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { PoeAlertRow } from "@/lib/fetch-ndw-alerts";

interface PoeAlertDetailsDialogProps {
	alert: PoeAlertRow | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function PoeAlertDetailsDialog({
	alert,
	open,
	onOpenChange,
}: PoeAlertDetailsDialogProps) {
	if (!alert) return null;
	const rows: [string, string][] = [
		["Ref code", alert.refCode],
		["Source ID", String(alert.externalSourceId)],
		["Full name", alert.fullName],
		["Passport", alert.passportNumber],
		["Nationality", alert.nationality],
		["Sex", alert.sex],
		["Port of entry", alert.portOfEntry],
		["Flight", alert.flightNumber],
		["Country of embarkation", alert.countryOfEmbarkation],
		["Arrival", alert.arrivalDate ?? "—"],
		["Phone (Uganda)", alert.phoneUganda],
		["Email", alert.email || "—"],
		["Risk", `${alert.riskLevel} (${alert.riskScore})`],
		["Symptoms", alert.symptomsText || "—"],
		["Verified", alert.isVerified ? "Yes" : "No"],
		["Created", alert.createdAtRemote ?? "—"],
	];
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>POE alert #{alert.id}</DialogTitle>
				</DialogHeader>
				{/* Compact two-column grid so the ~16 fields don't stack into a tall
				    single column. "Symptoms" can be long, so it spans both columns. */}
				<dl className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
					{rows.map(([k, v]) => (
						<div
							key={k}
							className={`min-w-0 ${k === "Symptoms" ? "col-span-2" : ""}`}
						>
							<dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
								{k}
							</dt>
							<dd className="break-words font-medium">{v || "—"}</dd>
						</div>
					))}
				</dl>
			</DialogContent>
		</Dialog>
	);
}
