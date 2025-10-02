import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
    period?: string; // e.g., "vs last month", "vs last week"
  };
  subtitle?: string;
  format?: 'number' | 'currency' | 'percentage' | 'days';
  status?: 'success' | 'warning' | 'danger' | 'info';
  className?: string;
  description?: string;
  loading?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  subtitle,
  format = 'number',
  status,
  className = '',
  description,
  loading = false
}) => {
  const formatValue = (val: number | string, formatType: string): string => {
    if (typeof val === 'string') return val;
    
    switch (formatType) {
      case 'currency':
        return `$${val.toLocaleString()}`;
      case 'percentage':
        return `${val}%`;
      case 'days':
        return `${val} ${val === 1 ? 'day' : 'days'}`;
      case 'number':
      default:
        return val.toLocaleString();
    }
  };

  const getStatusColor = (statusType?: string) => {
    switch (statusType) {
      case 'success':
        return 'text-green-600 dark:text-green-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'danger':
        return 'text-red-600 dark:text-red-400';
      case 'info':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-primary';
    }
  };

  const getCardBorderColor = (statusType?: string) => {
    switch (statusType) {
      case 'success':
        return 'border-l-green-500';
      case 'warning':
        return 'border-l-yellow-500';
      case 'danger':
        return 'border-l-red-500';
      case 'info':
        return 'border-l-blue-500';
      default:
        return '';
    }
  };

  const getTrendIcon = (isPositive: boolean, trendValue: number) => {
    if (trendValue === 0) return Minus;
    return isPositive ? TrendingUp : TrendingDown;
  };

  if (loading) {
    return (
      <Card className={`bg-gradient-card border-border/50 shadow-card ${className}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="h-4 w-24 bg-muted animate-pulse rounded"></div>
          <div className="h-4 w-4 bg-muted animate-pulse rounded"></div>
        </CardHeader>
        <CardContent>
          <div className="h-8 w-20 bg-muted animate-pulse rounded mb-2"></div>
          <div className="h-3 w-16 bg-muted animate-pulse rounded"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-gradient-card border-border/50 shadow-card hover:shadow-elevated transition-all duration-300 border-l-4 ${getCardBorderColor(status)} ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          {subtitle && (
            <p className="text-xs text-muted-foreground/80">
              {subtitle}
            </p>
          )}
        </div>
        <div className={`p-2 rounded-full bg-muted/20 ${getStatusColor(status)}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-2">
        <div className="flex items-end justify-between">
          <div className="text-2xl font-bold text-foreground">
            {formatValue(value, format)}
          </div>
          
          {trend && (
            <div className="flex items-center space-x-1">
              <div className={`text-xs flex items-center px-2 py-1 rounded-full ${
                trend.isPositive 
                  ? 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/20' 
                  : 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/20'
              }`}>
                {React.createElement(getTrendIcon(trend.isPositive, trend.value), {
                  className: "h-3 w-3 mr-1"
                })}
                {Math.abs(trend.value)}%
              </div>
            </div>
          )}
        </div>

        {trend?.period && (
          <p className="text-xs text-muted-foreground">
            {trend.period}
          </p>
        )}

        {description && (
          <p className="text-xs text-muted-foreground border-t border-border/50 pt-2">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

// Specialized metric cards for dispute system
export const DisputeMetricCard: React.FC<{
  title: string;
  count: number;
  total: number;
  icon: LucideIcon;
  status?: 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}> = ({ title, count, total, icon: Icon, status, className = '' }) => {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  
  return (
    <MetricCard
      title={title}
      value={count}
      icon={Icon}
      subtitle={`${percentage}% of total disputes`}
      status={status}
      className={className}
    />
  );
};

export const AmountMetricCard: React.FC<{
  title: string;
  amount: number;
  icon: LucideIcon;
  trend?: { value: number; isPositive: boolean; period?: string };
  className?: string;
}> = ({ title, amount, icon, trend, className = '' }) => {
  return (
    <MetricCard
      title={title}
      value={amount}
      icon={icon}
      format="currency"
      trend={trend}
      className={className}
    />
  );
};

export const TimeMetricCard: React.FC<{
  title: string;
  days: number;
  icon: LucideIcon;
  status?: 'success' | 'warning' | 'danger';
  className?: string;
}> = ({ title, days, icon, status, className = '' }) => {
  return (
    <MetricCard
      title={title}
      value={days}
      icon={icon}
      format="days"
      status={status}
      className={className}
    />
  );
};