import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorAlertProps {
	error: string;
	onRetry?: () => void;
	retrying?: boolean;
}

export const ErrorAlert = memo<ErrorAlertProps>(
	({ error, onRetry, retrying = false }) => {
		return (
			<div
				role="alert"
				className="relative editorial-card border-l-2 border-l-accent-red px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-reveal"
			>
				<div className="flex items-start gap-3">
					<AlertCircle
						className="h-4 w-4 text-accent-red mt-0.5 shrink-0"
						strokeWidth={1.75}
					/>
					<div>
						<p className="mono text-[10px] uppercase tracking-widest font-bold text-accent-red mb-1">
							Data feed error
						</p>
						<p className="text-sm text-foreground/80 leading-relaxed">
							{error}
						</p>
					</div>
				</div>
				{onRetry && (
					<Button
						onClick={onRetry}
						disabled={retrying}
						className="px-4 py-2 bg-foreground text-background text-xs font-medium hover:opacity-90 rounded-sm gap-2 h-auto shrink-0 self-start sm:self-auto"
					>
						<RefreshCw
							className={`h-3.5 w-3.5 ${retrying ? "animate-spin" : ""}`}
							strokeWidth={1.75}
						/>
						<span className="mono uppercase tracking-widest">
							{retrying ? "Retrying" : "Retry"}
						</span>
					</Button>
				)}
			</div>
		);
	}
);

ErrorAlert.displayName = "ErrorAlert";
