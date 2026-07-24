"use client";

/**
 * App-wide toasts, backed by react-hot-toast with the MoH colour scheme
 * (styled centrally in components/ui/toaster.tsx):
 *
 *   success → green   ·   loading/pending → orange   ·   error → red
 *
 * The `toast({ title, description, variant })` signature is kept from the old
 * shadcn implementation so every existing call site works unchanged:
 * `variant: "destructive"` renders a red error toast, anything else a green
 * success toast. New code can also import `react-hot-toast` directly (e.g.
 * `toast.loading(...)` for orange pending states) — both go through the same
 * styled <Toaster>.
 */

import * as React from "react";
import hotToast from "react-hot-toast";

interface CompatToastOptions {
	title?: React.ReactNode;
	description?: React.ReactNode;
	variant?: "default" | "destructive";
	/** Milliseconds; defaults per variant (4s success / 6s error). */
	duration?: number;
}

/** Title + optional description stacked, like the old shadcn toast body. */
function toastBody(
	title?: React.ReactNode,
	description?: React.ReactNode
): React.ReactElement {
	return React.createElement(
		"div",
		null,
		title
			? React.createElement(
					"p",
					{ className: "text-sm font-semibold leading-snug" },
					title
				)
			: null,
		description
			? React.createElement(
					"p",
					{ className: "mt-0.5 text-xs leading-snug opacity-90" },
					description
				)
			: null
	);
}

function toast({ title, description, variant, duration }: CompatToastOptions) {
	const body = toastBody(title, description);
	const id =
		variant === "destructive"
			? hotToast.error(body, { duration: duration ?? 6000 })
			: hotToast.success(body, { duration: duration ?? 4000 });
	return {
		id,
		dismiss: () => hotToast.dismiss(id),
	};
}

function useToast() {
	return {
		toast,
		dismiss: (toastId?: string) => hotToast.dismiss(toastId),
	};
}

export { useToast, toast };
