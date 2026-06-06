import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Activity, Clock, RefreshCw } from 'lucide-react';

interface WelcomeSectionProps {
  onRefresh: () => void;
  lastUpdated?: Date;
  isRefreshing?: boolean;
}

export const WelcomeSection = memo<WelcomeSectionProps>(({
  onRefresh,
  lastUpdated = new Date(),
  isRefreshing = false,
}) => {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex items-start gap-3">
        <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-uganda-red to-uganda-yellow text-white shadow-sm sm:flex">
          <Activity className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-gray-900 sm:text-xl">
            Health Alert Dashboard
          </h1>
          <p className="text-sm text-gray-500">
            Monitor and manage health alerts across Uganda in real-time
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              System Active
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
      <Button
        onClick={onRefresh}
        variant="outline"
        size="sm"
        className="shrink-0 gap-2 self-start sm:self-center"
        disabled={isRefreshing}
      >
        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        {isRefreshing ? 'Refreshing...' : 'Refresh'}
      </Button>
    </div>
  );
});

WelcomeSection.displayName = 'WelcomeSection';
