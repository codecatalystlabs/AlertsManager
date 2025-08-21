import React, { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PhoneIncoming, PhoneOutgoing, PhoneCall, Phone } from "lucide-react";

interface CallLogsStatsProps {
	stats: {
		alive: number;
		other: number;
		verified: number;
		pending: number;
	};
}

interface StatCardProps {
	title: string;
	value: number;
	icon: React.ComponentType<{ className?: string }>;
	borderColor: string;
	textColor: string;
	iconColor: string;
}

const StatCard = memo<StatCardProps>(
	({ title, value, icon: Icon, borderColor, textColor, iconColor }) => (
		<Card className={`border-l-4 ${borderColor}`}>
			<CardContent className="p-6">
				<div className="flex items-center">
					<Icon className={`h-8 w-8 ${iconColor}`} />
					<div className="ml-4">
						<p className="text-sm font-medium text-gray-600">
							{title}
						</p>
						<p className={`text-2xl font-bold ${textColor}`}>
							{value}
						</p>
					</div>
				</div>
			</CardContent>
		</Card>
	)
);

StatCard.displayName = "StatCard";

export const CallLogsStats = memo<CallLogsStatsProps>(({ stats }) => {
	const statCards = [
		{
			title: "Cases Alive",
			value: stats.alive,
			icon: PhoneIncoming,
			borderColor: "border-l-green-500",
			textColor: "text-green-600",
			iconColor: "text-green-600",
		},
		{
			title: "Other Status",
			value: stats.other,
			icon: PhoneOutgoing,
			borderColor: "border-l-red-500",
			textColor: "text-red-600",
			iconColor: "text-red-600",
		},
		{
			title: "Verified",
			value: stats.verified,
			icon: PhoneCall,
			borderColor: "border-l-blue-500",
			textColor: "text-blue-600",
			iconColor: "text-blue-600",
		},
		{
			title: "Pending Verification",
			value: stats.pending,
			icon: Phone,
			borderColor: "border-l-yellow-500",
			textColor: "text-yellow-600",
			iconColor: "text-yellow-600",
		},
	];

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
			{statCards.map((card) => (
				<StatCard
					key={card.title}
					{...card}
				/>
			))}
		</div>
	);
});

CallLogsStats.displayName = "CallLogsStats";
