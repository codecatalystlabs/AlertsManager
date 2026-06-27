"use client";

import { memo } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2, TriangleAlert } from "lucide-react";

interface DeleteAlertDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Display code, e.g. "ALT6178". */
	alertCode: string;
	/** Optional case name shown for context. */
	caseName?: string | null;
	/** True while the delete request is in flight (drives the spinner + lock). */
	isDeleting: boolean;
	onConfirm: () => void;
}

/**
 * Polished, theme-aligned confirmation for deleting an alert. Rendered as a
 * sibling of the row's dropdown (controlled by `open`) rather than nested inside
 * DropdownMenuContent — nesting an AlertDialog in the menu breaks focus/portal
 * handoff and left the destructive action button invisible.
 */
export const DeleteAlertDialog = memo<DeleteAlertDialogProps>(
	({ open, onOpenChange, alertCode, caseName, isDeleting, onConfirm }) => (
		<AlertDialog
			open={open}
			onOpenChange={(next) => {
				// Don't let the dialog close while a delete is mid-flight.
				if (!isDeleting) onOpenChange(next);
			}}
		>
			<AlertDialogContent className="max-w-md">
				<AlertDialogHeader>
					<div className="flex items-start gap-4">
						<span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-destructive/10">
							<TriangleAlert className="h-5 w-5 text-destructive" />
						</span>
						<div className="space-y-1.5">
							<AlertDialogTitle>Delete this alert?</AlertDialogTitle>
							<AlertDialogDescription>
								<span className="font-semibold text-foreground">
									{alertCode}
								</span>
								{caseName ? ` — ${caseName}` : ""} will be permanently
								removed from the server. This action cannot be undone.
							</AlertDialogDescription>
						</div>
					</div>
				</AlertDialogHeader>
				<AlertDialogFooter className="mt-1">
					<AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						onClick={(e) => {
							// Keep the dialog mounted through the async delete; the
							// caller closes it on success.
							e.preventDefault();
							onConfirm();
						}}
						disabled={isDeleting}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-destructive"
					>
						{isDeleting ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Trash2 className="h-4 w-4" />
						)}
						{isDeleting ? "Deleting…" : "Delete alert"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
);
DeleteAlertDialog.displayName = "DeleteAlertDialog";
