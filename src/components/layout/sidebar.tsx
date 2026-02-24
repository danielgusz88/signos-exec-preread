'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingDown,
  Users,
  FlaskConical,
  ShoppingBag,
  Mail,
  Database,
  Settings,
  Zap,
  Funnel,
  Calculator,
  DollarSign,
  Video,
} from 'lucide-react';

const navigation = [
  { name: 'LTV Command Center', href: '/', icon: BarChart3 },
  { name: 'Acquisition Funnel', href: '/funnel', icon: Funnel },
  { name: 'LTV Deep Dive', href: '/ltv', icon: Calculator },
  { name: 'Revenue & Shopify', href: '/revenue', icon: DollarSign },
  { name: 'Churn Waterfall', href: '/churn', icon: TrendingDown },
  { name: 'Cohort Analysis', href: '/cohorts', icon: Users },
  { name: 'Product Mix & Attach', href: '/products', icon: ShoppingBag },
  { name: 'Scenario Simulator', href: '/simulator', icon: FlaskConical },
  { name: 'Email Intelligence', href: '/email', icon: Mail },
  { name: 'Content Engine', href: '/content-engine', icon: Video },
  { name: 'Data Hub', href: '/data', icon: Database },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [configuredCount, setConfiguredCount] = useState<number | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch('/api/data/status');
        const data = await res.json();
        setConfiguredCount(data.summary?.configured || 0);
        setTotalCount(data.summary?.total || 0);
      } catch {
        setConfiguredCount(0);
      }
    }
    checkStatus();
  }, []);

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-white/[0.06] bg-surface-1">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-white/[0.06] px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-600">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-white">FunnelAI</h1>
          <p className="text-[10px] text-zinc-500">LTV Intelligence Platform</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all',
                isActive
                  ? 'bg-brand-600/10 text-brand-400 font-medium'
                  : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
              )}
            >
              <item.icon className={cn('h-4 w-4', isActive ? 'text-brand-400' : 'text-zinc-500')} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer - real integration status */}
      <div className="border-t border-white/[0.06] p-4">
        {configuredCount === null ? (
          <div className="flex items-center gap-2 rounded-lg bg-zinc-500/10 px-3 py-2">
            <div className="h-2 w-2 rounded-full bg-zinc-500 animate-pulse" />
            <span className="text-[11px] text-zinc-500">Checking integrations...</span>
          </div>
        ) : configuredCount > 0 ? (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-[11px] text-emerald-400">
              {configuredCount}/{totalCount} integrations configured
            </span>
          </div>
        ) : (
          <Link href="/settings" className="block">
            <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 hover:bg-amber-500/15 transition-colors">
              <div className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-[11px] text-amber-400">No integrations configured</span>
            </div>
          </Link>
        )}
      </div>
    </aside>
  );
}
