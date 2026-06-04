"use client";

import React, { useState } from "react";
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
import { Loader2 } from "lucide-react";
import type { EidsrMessage } from "@/lib/eidsr-message-normalize";
import { useToast } from "@/hooks/use-toast";

interface EidsrMessageDeleteDialogProps {
	isOpen: boolean;
	onClose: () => void;
	message: EidsrMessage | null;
	onConfirm: (id: number) => Promise<void>;
}

export function EidsrMessageDeleteDialog({
	isOpen,
	onClose,
	message,
	onConfirm,
}: EidsrMessageDeleteDialogProps) {
	const { toast } = useToast();
	const [deleting, setDeleting] = useState(false);

	const handleDelete = async () => {
		if (!message) return;
		setDeleting(true);
		try {
			await onConfirm(message.id);
			toast({
				title: "Message deleted",
				description: `EIDSR SMS #${message.id} was removed.`,
			});
			onClose();
		} catch (err) {
			const msg =
				err instanceof Error ? err.message : "Failed to delete message";
			toast({ title: "Delete failed", description: msg, variant: "destructive" });
		} finally {
			setDeleting(false);
		}
	};

	return (
		<AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete EIDSR message?</AlertDialogTitle>
					<AlertDialogDescription>
						This permanently deletes SMS message #{message?.id}
						{message?.personReporting
							? ` from ${message.personReporting}`
							: ""}
						. This cannot be undone.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						onClick={(e) => {
							e.preventDefault();
							void handleDelete();
						}}
						disabled={deleting}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
						{deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
						Delete
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
