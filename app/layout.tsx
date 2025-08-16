import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
	title: "Uganda Health Alert System - Ministry of Health",
	description:
		"Report health alerts and monitor disease surveillance in Uganda",
	generator: "Uganda Health Alert System",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body>
				{children}
				<Toaster />
			</body>
		</html>
	);
}
