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
			<DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>POE alert #{alert.id}</DialogTitle>
				</DialogHeader>
				<dl className="grid grid-cols-1 gap-2 text-sm">
					{rows.map(([k, v]) => (
						<div key={k}>
							<dt className="text-xs text-muted-foreground">{k}</dt>
							<dd className="whitespace-pre-wrap break-words">{v || "—"}</dd>
						</div>
					))}
				</dl>
			</DialogContent>
		</Dialog>
	);
}
