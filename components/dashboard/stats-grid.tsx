"use client";

import React, { memo, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { StatsCard } from './stats-card';
import { StatCardConfig, STAT_CARDS } from '@/constants/dashboard';
import { AlertCounts } from '@/app/dashboard/types';

interface StatsGridProps {
  alertCounts: AlertCounts;
  /** Loading state for the range/all-time KPI cards (Total, Verified, …). */
  kpiLoading?: boolean;
}

export const StatsGrid = memo<StatsGridProps>(({
  alertCounts,
  kpiLoading = false,
}) => {
  const router = useRouter();

  const statsData = useMemo(() => alertCounts, [alertCounts]);

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
      isLoading={kpiLoading}
      onClick={() => handleCardClick(config)}
    />
  );

  return (
    // Five workflow cards: signals first, actionable alerts last.
    <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {STAT_CARDS.map(renderStatCard)}
    </div>
  );
});

StatsGrid.displayName = 'StatsGrid';
