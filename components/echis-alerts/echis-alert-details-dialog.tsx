import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { DetailGrid, type DetailGridRow } from "@/components/ui/detail-fields";
import type { EchisAlertRow } from "@/lib/fetch-ndw-alerts";

interface EchisAlertDetailsDialogProps {
	alert: EchisAlertRow | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function EchisAlertDetailsDialog({
	alert,
	open,
	onOpenChange,
}: EchisAlertDetailsDialogProps) {
	if (!alert) return null;
	// "fever_and_bleeding" → "Fever and bleeding"
	const signal = (alert.signalReported || "").replaceAll("_", " ");
	const rows: DetailGridRow[] = [
		{ label: "Date", value: alert.date ?? "—" },
		{
			label: "Signal reported",
			value: signal ? signal[0].toUpperCase() + signal.slice(1) : "—",
		},
		{ label: "Region", value: alert.region || "—" },
		{ label: "District", value: alert.district },
		{ label: "County", value: alert.county || "—" },
		{ label: "Sub-county", value: alert.subCounty || "—" },
		{ label: "Health facility", value: alert.healthFacility || "—" },
		{ label: "Parish", value: alert.parish || "—" },
		{ label: "Village", value: alert.village || "—" },
		{ label: "VHT name", value: alert.vhtName || "—" },
		{ label: "VHT phone", value: alert.vhtPhone || "—" },
		{ label: "Verification status", value: alert.verificationStatus || "—" },
		{ label: "Person in VHT area", value: alert.personInVhtArea || "—" },
		{ label: "Description", value: alert.briefDescription, span: true },
		{
			label: "Additional info",
			value: alert.additionalInformation || "—",
			span: true,
		},
		{ label: "Record hash", value: alert.recordHash || "—", span: true },
	];
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>eCHIS alert #{alert.id}</DialogTitle>
				</DialogHeader>
				{/* Compact two-column grid; long free-text/hash fields span both. */}
				<DetailGrid rows={rows} />
			</DialogContent>
		</Dialog>
	);
}
