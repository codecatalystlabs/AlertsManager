import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { DetailGrid, type DetailGridRow } from "@/components/ui/detail-fields";
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
	const rows: DetailGridRow[] = [
		{ label: "Ref code", value: alert.refCode },
		{ label: "Source ID", value: String(alert.externalSourceId) },
		{ label: "Full name", value: alert.fullName },
		{ label: "Passport", value: alert.passportNumber },
		{ label: "Nationality", value: alert.nationality },
		{ label: "Sex", value: alert.sex },
		{ label: "Port of entry", value: alert.portOfEntry },
		{ label: "Flight", value: alert.flightNumber },
		{ label: "Country of embarkation", value: alert.countryOfEmbarkation },
		{ label: "Arrival", value: alert.arrivalDate ?? "—" },
		{ label: "Phone (Uganda)", value: alert.phoneUganda },
		{ label: "Email", value: alert.email || "—" },
		{ label: "Risk", value: `${alert.riskLevel} (${alert.riskScore})` },
		{ label: "Symptoms", value: alert.symptomsText || "—", span: true },
		{ label: "Verified", value: alert.isVerified ? "Yes" : "No" },
		{ label: "Created", value: alert.createdAtRemote ?? "—" },
	];
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>POE alert #{alert.id}</DialogTitle>
				</DialogHeader>
				{/* Compact two-column grid so the ~16 fields don't stack into a tall
				    single column. "Symptoms" can be long, so it spans both columns. */}
				<DetailGrid rows={rows} />
			</DialogContent>
		</Dialog>
	);
}
