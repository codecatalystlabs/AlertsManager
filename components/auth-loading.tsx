import { Loader2 } from "lucide-react";

interface AuthLoadingProps {
	message: string;
}

export function AuthLoading({ message }: AuthLoadingProps) {
	return (
		<div
			className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50"
			role="status"
			aria-live="polite"
			aria-busy="true"
		>
			<Loader2
				className="h-12 w-12 animate-spin text-uganda-red"
				aria-hidden="true"
			/>
			<p className="text-gray-600">{message}</p>
		</div>
	);
}
