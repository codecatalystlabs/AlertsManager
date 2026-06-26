import React, { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCardConfig } from '@/constants/dashboard';
import { AlertCounts } from '@/app/dashboard/types';
import { cn } from '@/lib/utils';

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
        return `${data.total} signals minus ${data.discarded} discarded`;
      case 'total':
        return `${data.verified} verified, ${data.notVerified} unverified`;
      default:
        return '';
    }
  };

  const SubIcon = Icon;

  return (
    <Card
      className={cn(
        'border border-gray-200 bg-white transition-shadow hover:shadow-md',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-gray-500">{title}</p>
            {isLoading ? (
              <Skeleton className="mt-1.5 h-6 w-16" />
            ) : (
              <p className="mt-0.5 text-xl font-bold text-gray-900">{getValue()}</p>
            )}
          </div>
          <div
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
              chip.bg
            )}
          >
            <Icon className={cn('h-4 w-4', chip.text)} />
          </div>
        </div>
        {isLoading ? (
          <Skeleton className="mt-2 h-3 w-24" />
        ) : (
          getSubText() && (
            <div className="mt-1.5 flex items-center gap-1 text-[11px] leading-tight text-gray-500">
              <SubIcon className={cn('h-3 w-3 shrink-0', chip.text)} />
              <span className="truncate">{getSubText()}</span>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
});

StatsCard.displayName = 'StatsCard';
