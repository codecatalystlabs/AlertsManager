import React, { memo } from 'react';
import { StatCardConfig } from '@/constants/dashboard';
import { AlertCounts } from '@/app/dashboard/types';
import {
  DEFAULT_STAT_INK,
  StatCardShell,
  type StatCardInk,
} from './stat-card-shell';

interface StatsCardProps {
  config: StatCardConfig;
  data: AlertCounts;
  onClick?: () => void;
  className?: string;
  /** Show a placeholder skeleton in place of the value while data loads. */
  isLoading?: boolean;
}

// Soft tinted chip per config colour. Must be LITERAL class strings — Tailwind
// only generates CSS for class names it can see in source (no runtime `.replace`).
const CHIP_STYLES: Record<string, { bg: string; text: string }> = {
  'bg-green-500': { bg: 'bg-success/15', text: 'text-success' },
  'bg-red-500': { bg: 'bg-destructive/15', text: 'text-destructive' },
  'bg-blue-500': { bg: 'bg-primary/15', text: 'text-primary' },
  'bg-purple-500': { bg: 'bg-primary/15', text: 'text-primary' },
  'bg-indigo-500': { bg: 'bg-primary/15', text: 'text-primary' },
  'bg-teal-500': { bg: 'bg-success/15', text: 'text-success' },
};

const DEFAULT_CHIP = { bg: 'bg-muted', text: 'text-muted-foreground' };

export const StatsCard = memo<StatsCardProps>(({ config, data, onClick, className, isLoading }) => {
  const { title, key, icon: Icon, iconBg } = config;

  const chip = CHIP_STYLES[iconBg] ?? DEFAULT_CHIP;
  const ink: StatCardInk = {
    ...DEFAULT_STAT_INK,
    chipBg: chip.bg,
    chipText: chip.text,
  };

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
        return `${data.verified} of ${data.total} signals verified`;
      case 'notVerified':
        return `${data.notVerified} signals pending triage`;
      case 'discarded':
        return `${data.discarded} verified signals discarded`;
      case 'alerts':
        return `${data.verified} verified minus ${data.discarded} discarded`;
      case 'total':
        return `${data.verified} verified, ${data.notVerified} unverified`;
      default:
        return '';
    }
  };

  return (
    <StatCardShell
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
