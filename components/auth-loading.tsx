import { LoadingSpinner } from "@/components/dashboard/loading-spinner";

interface AuthLoadingProps {
	message: string;
}

export function AuthLoading({ message }: AuthLoadingProps) {
	return <LoadingSpinner variant="page" message={message} />;
}
