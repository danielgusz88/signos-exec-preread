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
        'rounded-xl border border-white/[0.06] bg-surface-2 p-5',
        hover && 'cursor-pointer transition-all hover:border-brand-500/30 hover:bg-surface-3',
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
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-zinc-400">{subtitle}</p>}
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
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</p>
          <p
            className={cn(
              'mt-1.5 font-semibold',
              size === 'sm' && 'text-xl',
              size === 'md' && 'text-2xl',
              size === 'lg' && 'text-3xl',
              valueColor || 'text-white'
            )}
          >
            {value}
          </p>
          {trend !== undefined && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                  isPositive && 'bg-emerald-500/10 text-emerald-400',
                  isNegative && 'bg-red-500/10 text-red-400',
                  !isPositive && !isNegative && 'bg-zinc-500/10 text-zinc-400'
                )}
              >
                {isPositive ? '↑' : isNegative ? '↓' : '→'} {Math.abs(trend).toFixed(1)}%
              </span>
              {trendLabel && <span className="text-[10px] text-zinc-500">{trendLabel}</span>}
            </div>
          )}
        </div>
        {icon && <div className="text-zinc-600">{icon}</div>}
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
    'A+': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    'A': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    'B+': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    'B': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    'B-': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    'C+': 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    'C': 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    'D': 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    'F': 'bg-red-500/15 text-red-400 border-red-500/30',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-md border font-bold',
        size === 'sm' ? 'h-6 w-8 text-[10px]' : 'h-8 w-10 text-xs',
        colorMap[grade] || 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30'
      )}
    >
      {grade}
    </span>
  );
}
