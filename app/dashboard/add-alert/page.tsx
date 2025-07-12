"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardAddAlertPage() {
	const router = useRouter();

	useEffect(() => {
		// Redirect to the public add alert form
		router.push("/add-alert");
	}, [router]);

	return (
		<div className="min-h-screen flex items-center justify-center">
			<div className="text-center">
				<div className="animate-spin rounded-full h-32 w-32 border-b-2 border-uganda-red mx-auto"></div>
				<p className="mt-4 text-gray-600">
					Redirecting to add alert form...
				</p>
			</div>
		</div>
	);
}
