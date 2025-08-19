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
}

export const StatsCard = memo<StatsCardProps>(({ config, data, onClick, className }) => {
  const { title, key, icon: Icon, gradient, iconBg, textColor, isPercentage } = config;
  
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
        `bg-gradient-to-br ${gradient} border-opacity-50 hover:shadow-lg transition-all duration-300`,
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className={cn('text-sm font-medium mb-1', textColor.replace('700', '600'))}>
              {title}
            </p>
            <p className={cn('text-3xl font-bold', textColor)}>
              {getValue()}
            </p>
            {getSubText() && (
              <div className="flex items-center mt-2">
                <SubIcon className={cn('h-4 w-4 mr-1', textColor.replace('700', '600'))} />
                <span className={cn('text-xs', textColor.replace('700', '600'))}>
                  {getSubText()}
                </span>
              </div>
            )}
          </div>
          <div className={cn('h-16 w-16 rounded-2xl flex items-center justify-center shadow-lg', iconBg)}>
            <Icon className="h-8 w-8 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

StatsCard.displayName = 'StatsCard';
