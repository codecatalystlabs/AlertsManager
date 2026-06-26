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
    <Alert className="surface-danger">
      <AlertCircle className="h-4 w-4 text-destructive" />
      <AlertDescription className="text-destructive flex items-center justify-between">
        <span>{error}</span>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            disabled={retrying}
            className="ml-4 border-destructive/30 text-destructive hover:bg-destructive/10"
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
