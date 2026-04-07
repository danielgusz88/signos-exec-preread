'use client';

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className, hover, onClick }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white p-5 shadow-sm',
        hover && 'cursor-pointer transition-all hover:border-brand-500/30 hover:shadow-md',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export function CardHeader({ title, subtitle, action, className }: CardHeaderProps) {
  return (
    <div className={cn('mb-4 flex items-start justify-between', className)}>
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  trend?: number;
  trendLabel?: string;
  icon?: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  valueColor?: string;
}

export function MetricCard({
  label,
  value,
  trend,
  trendLabel,
  icon,
  className,
  size = 'md',
  valueColor,
}: MetricCardProps) {
  const isPositive = trend !== undefined && trend > 0;
  const isNegative = trend !== undefined && trend < 0;

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</p>
          <p
            className={cn(
              'mt-1.5 font-semibold',
              size === 'sm' && 'text-xl',
              size === 'md' && 'text-2xl',
              size === 'lg' && 'text-3xl',
              valueColor || 'text-gray-900'
            )}
          >
            {value}
          </p>
          {trend !== undefined && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                  isPositive && 'bg-emerald-50 text-emerald-600',
                  isNegative && 'bg-red-50 text-red-600',
                  !isPositive && !isNegative && 'bg-gray-100 text-gray-500'
                )}
              >
                {isPositive ? '↑' : isNegative ? '↓' : '→'} {Math.abs(trend).toFixed(1)}%
              </span>
              {trendLabel && <span className="text-[10px] text-gray-500">{trendLabel}</span>}
            </div>
          )}
        </div>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
    </Card>
  );
}

interface GradeProps {
  grade: string;
  size?: 'sm' | 'md';
}

export function GradeBadge({ grade, size = 'sm' }: GradeProps) {
  const colorMap: Record<string, string> = {
    'A+': 'bg-emerald-50 text-emerald-600 border-emerald-200',
    'A': 'bg-emerald-50 text-emerald-600 border-emerald-200',
    'B+': 'bg-blue-50 text-blue-600 border-blue-200',
    'B': 'bg-blue-50 text-blue-600 border-blue-200',
    'B-': 'bg-blue-50 text-blue-600 border-blue-200',
    'C+': 'bg-yellow-50 text-yellow-600 border-yellow-200',
    'C': 'bg-yellow-50 text-yellow-600 border-yellow-200',
    'D': 'bg-orange-50 text-orange-600 border-orange-200',
    'F': 'bg-red-50 text-red-600 border-red-200',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-md border font-bold',
        size === 'sm' ? 'h-6 w-8 text-[10px]' : 'h-8 w-10 text-xs',
        colorMap[grade] || 'bg-gray-100 text-gray-500 border-gray-200'
      )}
    >
      {grade}
    </span>
  );
}
