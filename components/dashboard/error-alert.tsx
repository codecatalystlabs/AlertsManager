import React, { memo } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorAlertProps {
  error: string;
  onRetry?: () => void;
  retrying?: boolean;
}

export const ErrorAlert = memo<ErrorAlertProps>(({ error, onRetry, retrying = false }) => {
  return (
    <Alert className="border-red-200 bg-red-50">
      <AlertCircle className="h-4 w-4 text-red-600" />
      <AlertDescription className="text-red-700 flex items-center justify-between">
        <span>{error}</span>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            disabled={retrying}
            className="ml-4 border-red-300 text-red-700 hover:bg-red-100"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${retrying ? 'animate-spin' : ''}`} />
            {retrying ? 'Retrying...' : 'Retry'}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
});

ErrorAlert.displayName = 'ErrorAlert';
