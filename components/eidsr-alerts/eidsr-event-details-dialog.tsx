import React, { memo } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DetailRow } from "@/components/ui/detail-fields";
import type { EidsrEvent } from "@/lib/fetch-eidsr-events";
import {
	EIDSR_DATA_VALUE_FIELDS,
	EIDSR_FIELD_LABELS,
	type EidsrDataValueKey,
	getEidsrDataValue,
} from "@/lib/eidsr-event-fields";

interface EidsrEventDetailsDialogProps {
	isOpen: boolean;
	onClose: () => void;
	event: EidsrEvent | null;
}

const SUMMARY_FIELDS: EidsrDataValueKey[] = [
	"reporterName",
	"disease",
	"sex",
	"age",
	"phone",
	"location",
	"source",
	"caseStatus",
	"verificationStatus",
	"symptomOnsetDate",
	"alertDate",
	"specimenStatus",
	"narrative",
];

export const EidsrEventDetailsDialog = memo<EidsrEventDetailsDialogProps>(
	({ isOpen, onClose, event }) => {
		if (!event) return null;

		const extraEntries = Object.entries(event.dataValues ?? {}).filter(
			([key]) =>
				!Object.values(EIDSR_DATA_VALUE_FIELDS).includes(
					key as (typeof EIDSR_DATA_VALUE_FIELDS)[EidsrDataValueKey]
				)
		);

		return (
			<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
				<DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>
							6767 Alert #{event.id}{" "}
							<span className="text-sm font-normal text-muted-foreground">
								({event.eventId})
							</span>
						</DialogTitle>
					</DialogHeader>

					<div className="flex flex-wrap gap-2">
						<Badge>{event.status}</Badge>
						<Badge variant="outline">Event {event.eventDate}</Badge>
						{event.deletedRemote && (
							<Badge variant="destructive">Deleted remotely</Badge>
						)}
					</div>

					<dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
						<div>
							<dt className="text-muted-foreground">Org unit</dt>
							<dd className="font-medium break-all">{event.orgUnit}</dd>
						</div>
						<div>
							<dt className="text-muted-foreground">Last updated (remote)</dt>
							<dd className="font-medium">{event.lastUpdatedRemote}</dd>
						</div>
						<div>
							<dt className="text-muted-foreground">Synced at</dt>
							<dd className="font-medium">{event.updatedAt}</dd>
						</div>
					</dl>

					<Separator />

					<div className="space-y-3">
						<h4 className="text-sm font-semibold">Alert details</h4>
						<dl className="grid grid-cols-1 gap-2 text-sm">
							{SUMMARY_FIELDS.map((field) => (
								<DetailRow
									key={field}
									label={EIDSR_FIELD_LABELS[field]}
									value={getEidsrDataValue(event, field)}
								/>
							))}
						</dl>
					</div>

					{extraEntries.length > 0 && (
						<>
							<Separator />
							<div className="space-y-2">
								<h4 className="text-sm font-semibold">Other data values</h4>
								<dl className="grid grid-cols-1 gap-2 text-sm">
									{extraEntries.map(([key, value]) => (
										<DetailRow
											key={key}
											label={key}
											value={value}
											labelClassName="break-all"
										/>
									))}
								</dl>
							</div>
						</>
					)}
				</DialogContent>
			</Dialog>
		);
	}
);

EidsrEventDetailsDialog.displayName = "EidsrEventDetailsDialog";
