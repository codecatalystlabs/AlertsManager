"use client";

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
    // One even grid: 6 cards lay out as 2 tidy rows of 3 on desktop (was an
    // uneven 4-over-3 split). Falls back to 2 columns on tablet, 1 on mobile.
    <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[...STAT_CARDS, ...ADDITIONAL_STATS].map(renderStatCard)}
    </div>
  );
});

StatsGrid.displayName = 'StatsGrid';
