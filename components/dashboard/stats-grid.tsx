import React, { memo, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { StatsCard } from './stats-card';
import { StatCardConfig, STAT_CARDS, ADDITIONAL_STATS } from '@/constants/dashboard';
import { AlertCounts } from '@/app/dashboard/types';

interface StatsGridProps {
  alertCounts: AlertCounts;
  todayAlerts: number;
  todayVerified: number;
}

export const StatsGrid = memo<StatsGridProps>(({ 
  alertCounts, 
  todayAlerts, 
  todayVerified 
}) => {
  const router = useRouter();

  const statsData = useMemo(() => ({
    ...alertCounts,
    todayAlerts,
    todayVerified,
    verificationRate: alertCounts.total > 0 
      ? Math.round((alertCounts.verified / alertCounts.total) * 100) 
      : 0,
  }), [alertCounts, todayAlerts, todayVerified]);

  const handleCardClick = (config: StatCardConfig) => {
    if (config.route) {
      router.push(config.route);
    }
  };

  const renderStatCard = (config: StatCardConfig) => (
    <StatsCard
      key={config.id}
      config={config}
      data={statsData}
      onClick={() => handleCardClick(config)}
    />
  );

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {STAT_CARDS.map(renderStatCard)}
      </div>

      {/* Additional Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {ADDITIONAL_STATS.map(renderStatCard)}
      </div>
    </div>
  );
});

StatsGrid.displayName = 'StatsGrid';
