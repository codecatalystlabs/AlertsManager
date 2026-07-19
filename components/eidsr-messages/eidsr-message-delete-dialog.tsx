"use client";

import { useState } from "react";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
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
		<ConfirmDeleteDialog
			open={isOpen}
			onOpenChange={(open) => !open && onClose()}
			isDeleting={deleting}
			onConfirm={() => void handleDelete()}
			withIcon={false}
			title="Delete EIDSR message?"
			description={
				<>
					This permanently deletes SMS message #{message?.id}
					{message?.personReporting
						? ` from ${message.personReporting}`
						: ""}
					. This cannot be undone.
				</>
			}
		/>
	);
}
