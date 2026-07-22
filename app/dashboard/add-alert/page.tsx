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
		<div className="max-w-6xl mx-auto space-y-4">
			{/* Header */}
			<div className="flex items-center space-x-4">
				<Link href="/dashboard/alerts">
					<Button variant="outline" size="sm">
						<ArrowLeft className="w-4 h-4 mr-2" />
						Back to Alerts
					</Button>
				</Link>
				<div>
					<h1 className="text-xl font-bold text-uganda-black">
						Create New Alert
					</h1>
					<p className="text-gray-600">
						Add a new health alert to the system
					</p>
				</div>
			</div>

			{/* Main Form */}
			<Card className="shadow-lg border-0">
				<CardHeader className="bg-gradient-to-r from-uganda-red to-uganda-yellow text-white">
					<CardTitle className="text-xl font-bold flex items-center gap-3">
						<AlertTriangleIcon className="h-6 w-6" />
						Alert Information
					</CardTitle>
				</CardHeader>
				<CardContent className="p-6">
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
							<div className="flex justify-end space-x-4 pt-6 border-t">
								<Button
									type="button"
									variant="outline"
									onClick={() =>
										router.push("/dashboard/alerts")
									}
								>
									Cancel
								</Button>
								<Button
									type="submit"
									disabled={isSubmitting}
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
