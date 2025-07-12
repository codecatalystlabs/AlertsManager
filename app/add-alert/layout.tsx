import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Report Health Alert - Uganda Health Alert System",
	description:
		"Report a health alert to the Ministry of Health Uganda surveillance system",
};

export default function AddAlertLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <>{children}</>;
}
