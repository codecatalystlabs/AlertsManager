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

export interface ConfirmDeleteDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: React.ReactNode;
	description: React.ReactNode;
	/** True while the delete request is in flight (drives the spinner + lock). */
	isDeleting: boolean;
	onConfirm: () => void;
	confirmLabel?: string;
	/** Label while deleting; defaults to `confirmLabel`. */
	confirmingLabel?: string;
	/** Show the destructive icon circle in the header. */
	withIcon?: boolean;
}

/**
 * Shared confirmation for a destructive delete. Owns the "don't close while a
 * delete is mid-flight" lock, the destructive-styled action button, and the
 * spinner — the pieces every per-feature delete dialog re-implemented. Rendered
 * as a controlled sibling of any triggering menu (never nested inside
 * DropdownMenuContent, which breaks the portal/focus handoff).
 */
export const ConfirmDeleteDialog = memo<ConfirmDeleteDialogProps>(
	({
		open,
		onOpenChange,
		title,
		description,
		isDeleting,
		onConfirm,
		confirmLabel = "Delete",
		confirmingLabel,
		withIcon = true,
	}) => (
		<AlertDialog
			open={open}
			onOpenChange={(next) => {
				if (!isDeleting) onOpenChange(next);
			}}
		>
			<AlertDialogContent className="max-w-md">
				<AlertDialogHeader>
					<div className={withIcon ? "flex items-start gap-4" : undefined}>
						{withIcon && (
							<span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-destructive/10">
								<TriangleAlert className="h-5 w-5 text-destructive" />
							</span>
						)}
						<div className="space-y-1.5">
							<AlertDialogTitle>{title}</AlertDialogTitle>
							<AlertDialogDescription>{description}</AlertDialogDescription>
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
						{isDeleting ? confirmingLabel ?? confirmLabel : confirmLabel}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
);
ConfirmDeleteDialog.displayName = "ConfirmDeleteDialog";
