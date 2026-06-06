import React, { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { StatCardConfig } from '@/constants/dashboard';
import { AlertCounts } from '@/app/dashboard/types';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  config: StatCardConfig;
  data: AlertCounts & { todayAlerts: number; todayVerified: number; verificationRate: number };
  onClick?: () => void;
  className?: string;
  /** Show a placeholder skeleton in place of the value while data loads. */
  isLoading?: boolean;
}

// Soft tinted chip per config colour. Must be LITERAL class strings — Tailwind
// only generates CSS for class names it can see in source (no runtime `.replace`).
const CHIP_STYLES: Record<string, { bg: string; text: string }> = {
  'bg-green-500': { bg: 'bg-green-100', text: 'text-green-600' },
  'bg-red-500': { bg: 'bg-red-100', text: 'text-red-600' },
  'bg-blue-500': { bg: 'bg-blue-100', text: 'text-blue-600' },
  'bg-purple-500': { bg: 'bg-purple-100', text: 'text-purple-600' },
  'bg-indigo-500': { bg: 'bg-indigo-100', text: 'text-indigo-600' },
  'bg-teal-500': { bg: 'bg-teal-100', text: 'text-teal-600' },
};

const DEFAULT_CHIP = { bg: 'bg-gray-100', text: 'text-gray-600' };

export const StatsCard = memo<StatsCardProps>(({ config, data, onClick, className, isLoading }) => {
  const { title, key, icon: Icon, iconBg, isPercentage } = config;

  const chip = CHIP_STYLES[iconBg] ?? DEFAULT_CHIP;

  const getValue = (): string => {
    const value = data[key as keyof typeof data];
    
    if (key === 'verificationRate') {
      return data.total > 0 ? `${Math.round((data.verified / data.total) * 100)}%` : '0%';
    }
    
    if (isPercentage) {
      return `${value}%`;
    }
    
    return value.toLocaleString();
  };

  const getSubText = (): string => {
    switch (key) {
      case 'verified':
        return `${data.verified} of ${data.total} alerts`;
      case 'notVerified':
        return `${data.notVerified} of ${data.total} alerts`;
      case 'total':
        return `${data.verified} verified, ${data.notVerified} pending`;
      case 'verificationRate':
        return `${data.verified} of ${data.total} verified`;
      default:
        return '';
    }
  };

  const getSubIcon = () => {
    switch (key) {
      case 'verified':
        return Icon;
      case 'notVerified':
        return Icon;
      case 'total':
      case 'verificationRate':
        return Icon;
      default:
        return Icon;
    }
  };

  const SubIcon = getSubIcon();

  return (
    <Card
      className={cn(
        'border border-gray-200 bg-white transition-shadow hover:shadow-md',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            {isLoading ? (
              <div className="mt-2 h-7 w-20 animate-pulse rounded bg-gray-200" />
            ) : (
              <p className="mt-1 text-2xl font-bold text-gray-900">{getValue()}</p>
            )}
          </div>
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
              chip.bg
            )}
          >
            <Icon className={cn('h-5 w-5', chip.text)} />
          </div>
        </div>
        {isLoading ? (
          <div className="mt-3 h-3.5 w-28 animate-pulse rounded bg-gray-100" />
        ) : (
          getSubText() && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
              <SubIcon className={cn('h-3.5 w-3.5 shrink-0', chip.text)} />
              <span className="truncate">{getSubText()}</span>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
});

StatsCard.displayName = 'StatsCard';
