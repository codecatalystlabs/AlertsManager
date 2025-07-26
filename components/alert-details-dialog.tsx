"use client";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
	AlertTriangleIcon,
	UserIcon,
	MapPinIcon,
	PhoneIcon,
	CalendarIcon,
	ClockIcon,
	CheckCircleIcon,
	XCircleIcon,
} from "lucide-react";
import { Label } from "@/components/ui/label";

interface AlertDetailsDialogProps {
	isOpen: boolean;
	onClose: () => void;
	alert: any;
}

export function AlertDetailsDialog({
	isOpen,
	onClose,
	alert,
}: AlertDetailsDialogProps) {
	if (!alert) return null;

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString();
	};

	const formatTime = (timeString: string) => {
		return new Date(timeString).toLocaleTimeString();
	};

	return (
		<Dialog
			open={isOpen}
			onOpenChange={onClose}
		>
			<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<AlertTriangleIcon className="h-5 w-5 text-uganda-red" />
						Alert Details - ALT
						{String(alert.id).padStart(3, "0")}
					</DialogTitle>
					<DialogDescription>
						Complete information about this health alert
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6">
					{/* Status and Verification */}
					<div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
						<div className="flex items-center gap-4">
							<Badge
								variant={
									alert.status === "Alive"
										? "default"
										: "destructive"
								}
								className={
									alert.status === "Alive"
										? "bg-green-100 text-green-800"
										: "bg-red-100 text-red-800"
								}
							>
								{alert.status || "Pending"}
							</Badge>
							<Badge
								variant={
									alert.isVerified
										? "default"
										: "destructive"
								}
								className={
									alert.isVerified
										? "bg-green-100 text-green-800"
										: "bg-yellow-100 text-yellow-800"
								}
							>
								{alert.isVerified
									? "Verified"
									: "Pending Verification"}
							</Badge>
						</div>
						<div className="flex items-center gap-2 text-sm text-gray-600">
							<CalendarIcon className="h-4 w-4" />
							{formatDate(alert.date)}
							<ClockIcon className="h-4 w-4 ml-2" />
							{formatTime(alert.time)}
						</div>
					</div>

					{/* Basic Information */}
					<div className="space-y-4">
						<div className="flex items-center gap-3">
							<CalendarIcon className="h-5 w-5 text-uganda-red" />
							<h3 className="text-lg font-semibold">
								Basic Information
							</h3>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<Label className="text-sm font-medium text-gray-600">
									Alert Reported Before
								</Label>
								<p className="text-sm">
									{alert.alertReportedBefore ||
										"Not specified"}
								</p>
							</div>
							<div>
								<Label className="text-sm font-medium text-gray-600">
									Response Type
								</Label>
								<p className="text-sm">
									{alert.response || "Not specified"}
								</p>
							</div>
						</div>
					</div>

					<Separator />

					{/* Reporter Information */}
					<div className="space-y-4">
						<div className="flex items-center gap-3">
							<UserIcon className="h-5 w-5 text-uganda-red" />
							<h3 className="text-lg font-semibold">
								Reporter Information
							</h3>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<Label className="text-sm font-medium text-gray-600">
									Reporter Name
								</Label>
								<p className="text-sm">
									{alert.personReporting ||
										"Not specified"}
								</p>
							</div>
							<div>
								<Label className="text-sm font-medium text-gray-600">
									Contact Number
								</Label>
								<p className="text-sm flex items-center gap-2">
									<PhoneIcon className="h-4 w-4" />
									{alert.contactNumber ||
										"Not provided"}
								</p>
							</div>
							<div>
								<Label className="text-sm font-medium text-gray-600">
									Source of Alert
								</Label>
								<Badge
									variant="outline"
									className="text-xs"
								>
									{alert.sourceOfAlert ||
										"Not specified"}
								</Badge>
							</div>
						</div>
					</div>

					<Separator />

					{/* Location Information */}
					<div className="space-y-4">
						<div className="flex items-center gap-3">
							<MapPinIcon className="h-5 w-5 text-uganda-red" />
							<h3 className="text-lg font-semibold">
								Location Information
							</h3>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<Label className="text-sm font-medium text-gray-600">
									District
								</Label>
								<p className="text-sm">
									{alert.alertCaseDistrict ||
										"Not specified"}
								</p>
							</div>
							<div>
								<Label className="text-sm font-medium text-gray-600">
									Subcounty/Division
								</Label>
								<p className="text-sm">
									{alert.subCounty ||
										"Not specified"}
								</p>
							</div>
							<div>
								<Label className="text-sm font-medium text-gray-600">
									Village
								</Label>
								<p className="text-sm">
									{alert.alertCaseVillage ||
										"Not specified"}
								</p>
							</div>
							<div>
								<Label className="text-sm font-medium text-gray-600">
									Parish
								</Label>
								<p className="text-sm">
									{alert.alertCaseParish ||
										"Not specified"}
								</p>
							</div>
						</div>
					</div>

					<Separator />

					{/* Case Information */}
					<div className="space-y-4">
						<div className="flex items-center gap-3">
							<AlertTriangleIcon className="h-5 w-5 text-uganda-red" />
							<h3 className="text-lg font-semibold">
								Case Information
							</h3>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div>
								<Label className="text-sm font-medium text-gray-600">
									Patient Name
								</Label>
								<p className="text-sm">
									{alert.alertCaseName ||
										"Not specified"}
								</p>
							</div>
							<div>
								<Label className="text-sm font-medium text-gray-600">
									Patient Age
								</Label>
								<p className="text-sm">
									{alert.alertCaseAge ||
										"Not specified"}{" "}
									years
								</p>
							</div>
							<div>
								<Label className="text-sm font-medium text-gray-600">
									Patient Sex
								</Label>
								<p className="text-sm">
									{alert.alertCaseSex ||
										"Not specified"}
								</p>
							</div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<Label className="text-sm font-medium text-gray-600">
									Next of Kin Name
								</Label>
								<p className="text-sm">
									{alert.pointOfContactName ||
										"Not specified"}
								</p>
							</div>
							<div>
								<Label className="text-sm font-medium text-gray-600">
									Next of Kin Phone
								</Label>
								<p className="text-sm">
									{alert.pointOfContactPhone ||
										"Not provided"}
								</p>
							</div>
						</div>

						<div>
							<Label className="text-sm font-medium text-gray-600">
								Case Description
							</Label>
							<p className="text-sm mt-1 p-3 bg-gray-50 rounded-lg">
								{alert.history ||
									"No description provided"}
							</p>
						</div>

						{alert.narrative && (
							<div>
								<Label className="text-sm font-medium text-gray-600">
									Additional Notes
								</Label>
								<p className="text-sm mt-1 p-3 bg-gray-50 rounded-lg">
									{alert.narrative}
								</p>
							</div>
						)}
					</div>

					{/* Symptoms */}
					{alert.symptoms && (
						<>
							<Separator />
							<div className="space-y-4">
								<div className="flex items-center gap-3">
									<CheckCircleIcon className="h-5 w-5 text-uganda-red" />
									<h3 className="text-lg font-semibold">
										Signs and Symptoms
									</h3>
								</div>
								<div className="flex flex-wrap gap-2">
									{alert.symptoms
										.split(", ")
										.map(
											(
												symptom: string,
												index: number
											) => (
												<Badge
													key={index}
													variant="secondary"
													className="bg-uganda-yellow/20 text-uganda-black"
												>
													{symptom}
												</Badge>
											)
										)}
								</div>
							</div>
						</>
					)}

					{/* Verification Information */}
					{alert.isVerified && (
						<>
							<Separator />
							<div className="space-y-4">
								<div className="flex items-center gap-3">
									<CheckCircleIcon className="h-5 w-5 text-green-600" />
									<h3 className="text-lg font-semibold text-green-600">
										Verification Information
									</h3>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div>
										<Label className="text-sm font-medium text-gray-600">
											Verified By
										</Label>
										<p className="text-sm">
											{alert.verifiedBy ||
												"Not specified"}
										</p>
									</div>
									<div>
										<Label className="text-sm font-medium text-gray-600">
											CIF Number
										</Label>
										<p className="text-sm">
											{alert.cifNo ||
												"Not specified"}
										</p>
									</div>
									{alert.verificationDate && (
										<div>
											<Label className="text-sm font-medium text-gray-600">
												Verification Date
											</Label>
											<p className="text-sm">
												{formatDate(
													alert.verificationDate
												)}
											</p>
										</div>
									)}
									{alert.verificationTime && (
										<div>
											<Label className="text-sm font-medium text-gray-600">
												Verification Time
											</Label>
											<p className="text-sm">
												{formatTime(
													alert.verificationTime
												)}
											</p>
										</div>
									)}
								</div>

								{alert.actions && (
									<div>
										<Label className="text-sm font-medium text-gray-600">
											Actions Taken
										</Label>
										<p className="text-sm mt-1 p-3 bg-gray-50 rounded-lg">
											{alert.actions}
										</p>
									</div>
								)}

								{alert.feedback && (
									<div>
										<Label className="text-sm font-medium text-gray-600">
											Feedback
										</Label>
										<p className="text-sm mt-1 p-3 bg-gray-50 rounded-lg">
											{alert.feedback}
										</p>
									</div>
								)}
							</div>
						</>
					)}

					{/* System Information */}
					<Separator />
					<div className="space-y-4">
						<h3 className="text-lg font-semibold">
							System Information
						</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
							<div>
								<Label className="text-sm font-medium text-gray-600">
									Created At
								</Label>
								<p className="text-sm">
									{alert.createdAt
										? formatDate(alert.createdAt)
										: "Not available"}
								</p>
							</div>
							<div>
								<Label className="text-sm font-medium text-gray-600">
									Last Updated
								</Label>
								<p className="text-sm">
									{alert.updatedAt
										? formatDate(alert.updatedAt)
										: "Not available"}
								</p>
							</div>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
