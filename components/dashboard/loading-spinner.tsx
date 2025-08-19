import React, { memo } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
};

export const LoadingSpinner = memo<LoadingSpinnerProps>(({ 
  message = 'Loading...', 
  size = 'md',
  className 
}) => {
  return (
    <div className={cn('flex items-center justify-center h-64', className)}>
      <div className="text-center">
        <Loader2 className={cn(
          sizeClasses[size],
          'animate-spin text-uganda-red mx-auto mb-4'
        )} />
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
});

LoadingSpinner.displayName = 'LoadingSpinner';
