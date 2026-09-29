import { Send, ShieldCheck } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EchisSignalPill } from "@/components/echis-alerts/echis-alerts-table";
import { formatDate, formatDateTime } from "@/lib/format-date";
import { DetailGrid, type DetailGridRow } from "@/components/ui/detail-fields";
import { ForwardedDistrictBadge } from "@/components/forwarded-district-badge";
import type { EchisAlertRow } from "@/lib/fetch-ndw-alerts";

interface EchisAlertDetailsDialogProps {
	alert: EchisAlertRow | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Shown as footer actions when the role allows them (and the row is synced). */
	onForward?: (row: EchisAlertRow) => void;
	onVerify?: (row: EchisAlertRow) => void;
}

export function EchisAlertDetailsDialog({
	alert,
	open,
	onOpenChange,
	onForward,
	onVerify,
}: EchisAlertDetailsDialogProps) {
	if (!alert) return null;
	// "fever_and_bleeding" → "Fever and bleeding"
	const signal = (alert.signalReported || "").replaceAll("_", " ");
	const rows: DetailGridRow[] = [
		{
			label: "Reported",
			value: alert.reportedAt
				? formatDateTime(alert.reportedAt, "—")
				: formatDate(alert.date, "—"),
		},
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
					<DialogTitle className="flex flex-wrap items-center gap-2">
						<EchisSignalPill code={alert.signalReported} />
						<span>{alert.district || "District not recorded"}</span>
					</DialogTitle>
					<DialogDescription>
						eCHIS signal #{alert.id}
						{alert.vhtName ? ` · reported by VHT ${alert.vhtName}` : ""}
					</DialogDescription>
				</DialogHeader>
				{alert.forwardedToDistrict || alert.forwardedAlertId ? (
					<ForwardedDistrictBadge
						district={alert.forwardedToDistrict ?? ""}
						forwardedAlertId={alert.forwardedAlertId}
						forwardedAlert={alert.forwardedAlert}
					/>
				) : null}
				{/* Compact two-column grid; long free-text/hash fields span both. */}
				<DetailGrid rows={rows} />
				{!alert.live && (onForward || onVerify) && (
					<DialogFooter className="gap-2 sm:gap-2">
						{onForward && (
							<Button variant="outline" size="sm" className="gap-1.5" onClick={() => onForward(alert)}>
								<Send className="h-4 w-4" />
								Forward to district
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
