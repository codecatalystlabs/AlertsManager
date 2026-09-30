"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthLoading } from "@/components/auth-loading";
import { useAuthStatus } from "@/hooks/use-auth-status";
import { AuthService } from "@/lib/auth";
import { firstOpenPath } from "@/lib/access";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import Image from "next/image";

/** Why the last session ended, when the API ended it (?reason=). */
const SIGNED_OUT_BECAUSE: Record<string, string> = {
	inactive: "Your account has been deactivated. Ask an administrator to reactivate it.",
	no_role: "Your account has no access role assigned. Ask an administrator to assign one.",
};

export default function LoginPage() {
	const router = useRouter();
	const { isAuthenticated, isReady } = useAuthStatus();
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	// Read after mount: the page is prerendered without the query string.
	useEffect(() => {
		const reason = new URLSearchParams(window.location.search).get("reason") ?? "";
		if (SIGNED_OUT_BECAUSE[reason]) setError(SIGNED_OUT_BECAUSE[reason]);
	}, []);

	useEffect(() => {
		if (isReady && isAuthenticated) {
			router.replace(firstOpenPath(AuthService.getUser()));
		}
	}, [isReady, isAuthenticated, router]);

	const handleSubmit = async (e: React.SubmitEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError(null);
		setSuccess(null);

		try {
			const response = await AuthService.login({ username, password });

			if (response.token) {
				setSuccess("Login successful! Redirecting...");
				// Land on the first page this account may open.
				router.replace(firstOpenPath(response.user ?? null));
			} else {
				setError("Login failed. No token received.");
			}
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "An error occurred during login"
			);
		} finally {
			setIsLoading(false);
		}
	};

	if (isReady && isAuthenticated) {
		return <AuthLoading message="Redirecting to dashboard..." />;
	}

	return (
		<div className="min-h-screen  bg-cover bg-center flex items-center justify-center relative">
			{/* Background Image */}
			<div className="absolute inset-0 z-0">
				<Image
					src="/covid.jpg"
					alt="Uganda Health Ministry Background"
					fill
					className="object-cover opacity-20"
				/>
				<div className="absolute inset-0 bg-gradient-to-br from-uganda-black/30 via-uganda-red/40 to-uganda-yellow/40"></div>
			</div>

			{/* Login Form */}
			<Card className="w-full max-w-sm mx-4 z-10 shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
				<CardHeader className="flex flex-row items-center">
					<div className="mx-auto rounded-full flex items-center justify-center">
						<Image
							src="/logo.png"
							alt="Uganda Health Ministry Logo"
							width={150}
							height={150}
						/>
					</div>
				
					<div>

					<CardTitle className="text-gray-600">
						Ministry of Health Uganda 
					</CardTitle>
					<CardDescription className="text-gray-600">
					  Alert Management Portal

						</CardDescription>
					</div>
				</CardHeader>
				<CardContent>
					<form
						onSubmit={handleSubmit}
						className="space-y-4"
					>
						{error && (
							<Alert className="surface-danger">
								<AlertCircle className="h-4 w-4 text-destructive" />
								<AlertDescription className="text-destructive">
									{error}
								</AlertDescription>
							</Alert>
						)}

						{success && (
							<Alert className="surface-success">
								<CheckCircle2 className="h-4 w-4 text-success" />
								<AlertDescription className="text-success">
									{success}
								</AlertDescription>
							</Alert>
						)}

						<div className="space-y-2">
							<Label
								htmlFor="username"
								className="text-uganda-black font-medium"
							>
								Username
							</Label>
							<Input
								id="username"
								type="text"
								placeholder="Enter your username"
								value={username}
								onChange={(e) =>
									setUsername(e.target.value)
								}
								required
								disabled={isLoading}
								className="h-10 border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow"
							/>
						</div>
						<div className="space-y-2">
							<Label
								htmlFor="password"
								className="text-uganda-black font-medium"
							>
								Password
							</Label>
							<PasswordInput
								id="password"
								placeholder="Enter your password"
								value={password}
								onChange={(e) =>
									setPassword(e.target.value)
								}
								required
								disabled={isLoading}
								className="h-10 border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow"
							/>
						</div>
						<Button
							type="submit"
							className="w-full bg-gradient-to-r from-uganda-red to-uganda-yellow hover:from-uganda-red/90 hover:to-uganda-yellow/90 text-white font-semibold py-2 px-4 rounded-md transition-all duration-200"
							disabled={
								isLoading || !username || !password
							}
						>
							{isLoading ? "Signing In..." : "Sign In"}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
