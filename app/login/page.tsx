"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLoading } from "@/components/auth-loading";
import { useAuthStatus } from "@/hooks/use-auth-status";
import { AuthService } from "@/lib/auth";
import { AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { MohLogo, MohBrand } from "@/components/moh-logo";
import { ThemeToggleCompact } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const inputCls =
	"h-11 text-sm bg-card border border-foreground/10 rounded-sm hover:border-foreground/30 focus:border-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0";
const labelCls =
	"mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground";

export default function LoginPage() {
	const router = useRouter();
	const { isAuthenticated, isReady } = useAuthStatus();
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	useEffect(() => {
		if (isReady && isAuthenticated) {
			router.replace("/dashboard");
		}
	}, [isReady, isAuthenticated, router]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError(null);
		setSuccess(null);

		try {
			const response = await AuthService.login({ username, password });

			if (response.token) {
				setSuccess("Login successful. Redirecting…");
				setTimeout(() => {
					window.location.href = "/dashboard";
				}, 900);
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
		return <AuthLoading message="Redirecting to dashboard…" />;
	}

	return (
		<div className="min-h-screen bg-background text-foreground">
			<div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1fr_minmax(420px,520px)]">
				{/* Editorial left rail */}
				<aside className="hidden lg:flex flex-col justify-between p-12 border-r border-border bg-foreground text-background">
					<MohBrand size="md" dark />


					<div className="space-y-8 max-w-md">
						<div className="flex items-center gap-3">
							<span className="h-1 w-8 bg-accent-yellow rounded-full" />
							<span className="mono text-[10px] uppercase tracking-widest font-bold text-background/60">
								Surveillance · Command Center
							</span>
						</div>
						<h1 className="serif text-5xl font-medium tracking-tight leading-[1.05] text-balance">
							A calm view of the country&rsquo;s health,{" "}
							<em className="italic text-accent-yellow">today.</em>
						</h1>
						<p className="text-sm text-background/70 leading-relaxed">
							Sign in to monitor and verify health alerts from across
							Uganda&rsquo;s 135 districts. Restricted to authorised
							personnel of the Ministry of Health and partner
							institutions.
						</p>
					</div>

					<div className="flex items-center justify-between mono text-[10px] uppercase tracking-tighter text-background/50">
						<span>v.2026.05 — Editorial release</span>
						<span>National Surveillance</span>
					</div>
				</aside>

				{/* Form panel */}
				<section className="relative flex flex-col px-6 md:px-12 py-8">
					<div className="absolute top-6 right-6 md:right-12">
						<ThemeToggleCompact />
					</div>
					{/* Mobile brand */}
					<MohBrand size="md" className="lg:hidden mb-10" />

					<div className="flex-1 flex items-center">
						<div className="w-full max-w-sm mx-auto animate-reveal">
							<div className="flex items-center gap-3 mb-5">
								<span className="h-1 w-8 bg-accent-red rounded-full" />
								<span className="mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
									Authentication
								</span>
							</div>
							<h2 className="serif text-4xl font-medium tracking-tight leading-tight text-foreground">
								Sign in
							</h2>
							<p className="mt-3 text-sm text-muted-foreground leading-relaxed">
								Enter your Ministry of Health credentials to
								continue.
							</p>

							{error && (
								<div className="mt-6 editorial-card border-l-2 border-l-accent-red px-4 py-3 flex items-start gap-3">
									<AlertCircle
										className="h-4 w-4 text-accent-red mt-0.5 shrink-0"
										strokeWidth={1.75}
									/>
									<p className="text-sm text-foreground/80 leading-relaxed">
										{error}
									</p>
								</div>
							)}
							{success && (
								<div className="mt-6 editorial-card border-l-2 border-l-accent-green px-4 py-3 flex items-start gap-3">
									<CheckCircle2
										className="h-4 w-4 text-accent-green mt-0.5 shrink-0"
										strokeWidth={1.75}
									/>
									<p className="text-sm text-foreground/80 leading-relaxed">
										{success}
									</p>
								</div>
							)}

							<form onSubmit={handleSubmit} className="mt-8 space-y-5">
								<div className="space-y-2">
									<Label htmlFor="username" className={labelCls}>
										Username
									</Label>
									<Input
										id="username"
										type="text"
										placeholder="surveillance.officer"
										value={username}
										onChange={(e) => setUsername(e.target.value)}
										required
										disabled={isLoading}
										className={inputCls}
										autoComplete="username"
									/>
								</div>
								<div className="space-y-2">
									<div className="flex items-baseline justify-between">
										<Label htmlFor="password" className={labelCls}>
											Password
										</Label>
									</div>
									<Input
										id="password"
										type="password"
										placeholder="••••••••"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										required
										disabled={isLoading}
										className={cn(inputCls, "mono tracking-widest")}
										autoComplete="current-password"
									/>
								</div>

								<Button
									type="submit"
									className="w-full px-5 h-11 bg-foreground text-background text-sm font-medium hover:opacity-90 rounded-sm gap-2 transition-opacity"
									disabled={isLoading || !username || !password}
								>
									<span className="mono uppercase tracking-widest font-bold text-xs">
										{isLoading ? "Signing in…" : "Sign in"}
									</span>
									{!isLoading && (
										<ArrowRight
											className="h-3.5 w-3.5"
											strokeWidth={1.75}
										/>
									)}
								</Button>
							</form>

							<div className="mt-10 pt-6 border-t border-foreground/[0.08]">
								<p className="mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
									Public reporters
								</p>
								<Link
									href="/add-alert"
									className="group inline-flex items-center gap-2 text-sm text-foreground hover:text-accent-red transition-colors"
								>
									<span className="underline underline-offset-4 decoration-foreground/20 group-hover:decoration-accent-red/40">
										File a health alert without signing in
									</span>
									<ArrowRight
										className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
										strokeWidth={1.75}
									/>
								</Link>
							</div>
						</div>
					</div>

					<p className="mt-8 mono text-[10px] uppercase tracking-tighter text-muted-foreground text-center lg:text-left">
						Restricted access · Activity is monitored
					</p>
				</section>
			</div>
		</div>
	);
}
