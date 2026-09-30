"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangleIcon, ArrowLeft } from "lucide-react";
import { AuthService } from "@/lib/auth";
import Link from "next/link";
import {
	AddAlertForm,
	type AlertPayload,
} from "@/components/add-alert-form";

export default function DashboardAddAlertPage() {
	const router = useRouter();

	const submitAlert = async (payload: AlertPayload) => {
		const created = await AuthService.createAlert(payload);
		return created?.id ?? null;
	};

	return (
		<div className="max-w-6xl mx-auto space-y-3">
			{/* Header */}
			<div className="flex items-center gap-3">
				<Link href="/dashboard/alerts">
					<Button variant="outline" size="sm">
						<ArrowLeft className="w-4 h-4 mr-2" />
						Back to Alerts
					</Button>
				</Link>
				<div>
					<h1 className="text-lg font-bold leading-tight text-uganda-black">
						Create New Alert
					</h1>
					<p className="text-xs text-gray-600">
						Add a new health alert to the system
					</p>
				</div>
			</div>

			{/* Main Form */}
			<Card className="shadow-lg border-0">
				<CardHeader className="bg-gradient-to-r from-uganda-red to-uganda-yellow py-2 text-white">
					<CardTitle className="text-base font-bold flex items-center gap-2">
						<AlertTriangleIcon className="h-5 w-5" />
						Alert Information
					</CardTitle>
				</CardHeader>
				<CardContent className="pt-3">
					<AddAlertForm
						audience="staff"
						submitAlert={submitAlert}
						successMessage="Alert created successfully! The alert has been added to the system."
						onSuccess={() => {
							setTimeout(() => {
								router.push("/dashboard/alerts");
							}, 2000);
						}}
						renderActions={(isSubmitting) => (
							<div className="flex justify-end gap-2 pt-3 border-t">
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() =>
										router.push("/dashboard/alerts")
									}
								>
									Cancel
								</Button>
								<Button
									type="submit"
									disabled={isSubmitting}
									size="sm"
									className="bg-gradient-to-r from-uganda-red to-uganda-yellow hover:from-uganda-red/90 hover:to-uganda-yellow/90 text-white px-6"
								>
									{isSubmitting
										? "Creating Alert..."
										: "Create Alert"}
								</Button>
							</div>
						)}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
