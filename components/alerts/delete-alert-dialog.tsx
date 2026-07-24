"use client";

import { memo } from "react";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";

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
 * Confirmation for deleting an alert. Thin wrapper over the shared
 * ConfirmDeleteDialog with alert-specific copy.
 */
export const DeleteAlertDialog = memo<DeleteAlertDialogProps>(
	({ open, onOpenChange, alertCode, caseName, isDeleting, onConfirm }) => (
		<ConfirmDeleteDialog
			open={open}
			onOpenChange={onOpenChange}
			isDeleting={isDeleting}
			onConfirm={onConfirm}
			confirmLabel="Delete alert"
			confirmingLabel="Deleting…"
			title="Delete this alert?"
			description={
				<>
					<span className="font-semibold text-foreground">{alertCode}</span>
					{caseName ? ` — ${caseName}` : ""} will be permanently removed from
					the server. This action cannot be undone.
				</>
			}
		/>
	)
);
DeleteAlertDialog.displayName = "DeleteAlertDialog";
