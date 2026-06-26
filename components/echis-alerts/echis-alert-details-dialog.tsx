import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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
	const rows: [string, string][] = [
		["Date", alert.date ?? "—"],
		["District", alert.district],
		["County", alert.county || "—"],
		["Sub-county", alert.subCounty || "—"],
		["Health facility", alert.healthFacility || "—"],
		["Parish", alert.parish || "—"],
		["Village", alert.village || "—"],
		["VHT name", alert.vhtName || "—"],
		["VHT phone", alert.vhtPhone || "—"],
		["Verification status", alert.verificationStatus || "—"],
		["Person in VHT area", alert.personInVhtArea || "—"],
		["Description", alert.briefDescription],
		["Additional info", alert.additionalInformation || "—"],
		["Record hash", alert.recordHash || "—"],
	];
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>eCHIS alert #{alert.id}</DialogTitle>
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
