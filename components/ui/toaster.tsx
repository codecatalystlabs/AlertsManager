"use client";

import { Toaster as HotToaster } from "react-hot-toast";

/**
 * The app's single toast outlet (mounted in the root layout), colour-coded by
 * outcome: success → green, loading/pending → orange, error → red.
 */
export function Toaster() {
	return (
		<HotToaster
			position="top-right"
			gutter={8}
			toastOptions={{
				style: {
					maxWidth: 420,
					borderRadius: "0.5rem",
					boxShadow:
						"0 4px 12px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1)",
					padding: "10px 14px",
					color: "#ffffff",
				},
				success: {
					duration: 4000,
					style: { background: "#16a34a" },
					iconTheme: { primary: "#ffffff", secondary: "#16a34a" },
				},
				error: {
					duration: 6000,
					style: { background: "#dc2626" },
					iconTheme: { primary: "#ffffff", secondary: "#dc2626" },
				},
				loading: {
					style: { background: "#ea580c" },
					iconTheme: { primary: "#ffffff", secondary: "#ea580c" },
				},
			}}
		/>
	);
}
