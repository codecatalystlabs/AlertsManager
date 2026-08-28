import React, { memo } from 'react';
import { StatCardConfig } from '@/constants/dashboard';
import { AlertCounts } from '@/app/dashboard/types';
import {
  StatCard,
  tintedInk,
  type StatTone,
} from '@/components/ui/stat-card';

interface StatsCardProps {
  config: StatCardConfig;
  data: AlertCounts;
  onClick?: () => void;
  className?: string;
  /** Show a placeholder skeleton in place of the value while data loads. */
  isLoading?: boolean;
}

// The config's palette class mapped to a semantic tone, so the tile follows the
// theme rather than the raw palette. A literal map, not a runtime `.replace`:
// Tailwind only generates CSS for class names it can see in source.
const ICON_TONES: Record<string, StatTone> = {
  'bg-green-500': 'success',
  'bg-red-500': 'destructive',
  'bg-blue-500': 'primary',
  'bg-purple-500': 'primary',
  'bg-indigo-500': 'primary',
  'bg-teal-500': 'success',
  'bg-amber-500': 'warning',
};

export const StatsCard = memo<StatsCardProps>(({ config, data, onClick, className, isLoading }) => {
  const { title, key, icon: Icon, iconBg } = config;

  const ink = tintedInk(ICON_TONES[iconBg] ?? 'muted');

  const getValue = (): string => {
    // Fall back to 0 if the count is missing — e.g. an older API response that
    // predates a newly added card field — so one absent key never crashes the
    // whole grid.
    const value = data[key as keyof typeof data] ?? 0;

    return value.toLocaleString();
  };

  const getSubText = (): string => {
    switch (key) {
      case 'verified':
        return `${data.verified} of ${data.total} verified`;
      case 'notVerified':
        return `${data.notVerified} pending verification`;
      case 'triaged':
        // The remainder is what still sits at the gate, which is the number a
        // desk acts on — so name it rather than restating the headline figure.
        return `${Math.max(0, data.total - data.triaged)} awaiting triage`;
      case 'discarded':
        return `${data.discarded} verified then discarded`;
      case 'alerts':
        return `${data.verified} verified − ${data.discarded} discarded`;
      case 'total':
        return `${data.verified} verified, ${data.notVerified} unverified`;
      default:
        return '';
    }
  };

  return (
    <StatCard
      title={title}
      value={getValue()}
      subText={getSubText()}
      icon={Icon}
      ink={ink}
      onClick={onClick}
      className={className}
      isLoading={isLoading}
    />
  );
});

StatsCard.displayName = 'StatsCard';
