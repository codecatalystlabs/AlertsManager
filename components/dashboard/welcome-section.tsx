import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Clock, RefreshCw } from 'lucide-react';

interface WelcomeSectionProps {
  onRefresh: () => void;
  lastUpdated?: Date;
  isRefreshing?: boolean;
}

export const WelcomeSection = memo<WelcomeSectionProps>(({ 
  onRefresh, 
  lastUpdated = new Date(), 
  isRefreshing = false 
}) => {
  return (
    <div className="bg-gradient-to-r from-uganda-red via-uganda-red to-uganda-yellow rounded-2xl p-8 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-black/10"></div>
      <div className="relative">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">
              Welcome to Health Alert Dashboard
            </h1>
            <p className="text-white/90 text-lg">
              Monitor and manage health alerts across Uganda in real-time
            </p>
            <div className="mt-6 flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <div className="h-3 w-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm">System Active</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
          <Button
            onClick={onRefresh}
            variant="outline"
            className="border-white/30 text-black hover:bg-white/10 transition-colors"
            size="sm"
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>
    </div>
  );
});

WelcomeSection.displayName = 'WelcomeSection';
