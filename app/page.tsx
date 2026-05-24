"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/dashboard/loading-spinner";

export default function HomePage() {
	const router = useRouter();

	useEffect(() => {
		router.push("/add-alert");
	}, [router]);

	return <LoadingSpinner variant="page" message="Loading…" />;
}
