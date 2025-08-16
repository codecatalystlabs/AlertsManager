"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthService } from "@/lib/auth";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [isCheckingAuth, setIsCheckingAuth] = useState(true);

	useEffect(() => {
		// Check if user is already authenticated
		const checkAuth = () => {
			if (AuthService.isAuthenticated()) {
				window.location.href = "/dashboard";
			} else {
				setIsCheckingAuth(false);
			}
		};

		checkAuth();
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError(null);
		setSuccess(null);

		try {
			const response = await AuthService.login({ username, password });

			if (response.token) {
				setSuccess("Login successful! Redirecting to dashboard...");
				setTimeout(() => {
					window.location.href = "/dashboard";
				}, 1500);
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

	// Show loading state while checking authentication
	if (isCheckingAuth) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-32 w-32 border-b-2 border-uganda-red mx-auto"></div>
					<p className="mt-4 text-gray-600">
						Checking authentication...
					</p>
				</div>
			</div>
		);
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
			<Card className="w-full max-w-md mx-4 z-10 shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
				<CardHeader className="text-center space-y-4">
					<div className="mx-auto rounded-full flex items-center justify-center">
						<Image
							src="/logo.png"
							alt="Uganda Health Ministry Logo"
							width={150}
							height={150}
						/>
					</div>
					<CardTitle className="text-2xl font-bold text-uganda-black">
						Health Alert System
					</CardTitle>
					<CardDescription className="text-gray-600">
						Ministry of Health Uganda - Alert Management
						Portal
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form
						onSubmit={handleSubmit}
						className="space-y-4"
					>
						{error && (
							<Alert className="border-red-200 bg-red-50">
								<AlertCircle className="h-4 w-4 text-red-600" />
								<AlertDescription className="text-red-700">
									{error}
								</AlertDescription>
							</Alert>
						)}

						{success && (
							<Alert className="border-green-200 bg-green-50">
								<CheckCircle2 className="h-4 w-4 text-green-600" />
								<AlertDescription className="text-green-700">
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
								className="border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow"
							/>
						</div>
						<div className="space-y-2">
							<Label
								htmlFor="password"
								className="text-uganda-black font-medium"
							>
								Password
							</Label>
							<Input
								id="password"
								type="password"
								placeholder="Enter your password"
								value={password}
								onChange={(e) =>
									setPassword(e.target.value)
								}
								required
								disabled={isLoading}
								className="border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow"
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
