'use client';

import { Card, CardHeader, MetricCard } from '@/components/ui/card';
import { DataSourceRequired, EmptySection } from '@/components/ui/data-source-required';
import { cn, formatPercent, formatNumber, formatCompact } from '@/lib/utils';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Loader2,
  RefreshCw,
  BarChart3,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

interface ModeData {
  connected: boolean;
  error?: string;
  kpis?: {
    activeSubscribers: number;
    currentMRR: number;
    peakMRR: number;
    peakActiveMonth: string;
  };
  mrr?: {
    monthlyMRR: Array<{ month: string; mrr: number }>;
    currentMRR: number;
    peakMRR: number;
    latestMonth: string;
  };
  churn?: {
    planBreakdown: Array<{ plan: string; activeCount: number; label: string }>;
  };
}

export default function RevenuePage() {
  const [data, setData] = useState<ModeData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/data/mode');
      const json = await res.json();
      setData(json);
    } catch {
      setData({ connected: false, error: 'Failed to fetch' });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isConnected = data?.connected === true;
  const kpis = data?.kpis;
  const mrr = data?.mrr;
  const planBreakdown = data?.churn?.planBreakdown || [];

  // MRR calculations
  const monthlyMRR = mrr?.monthlyMRR || [];
  const current = monthlyMRR[monthlyMRR.length - 1];
  const previous = monthlyMRR.length > 1 ? monthlyMRR[monthlyMRR.length - 2] : null;
  const mrrChange = current && previous && previous.mrr > 0
    ? ((current.mrr - previous.mrr) / previous.mrr) * 100
    : 0;

  // ARR estimate
  const currentARR = (kpis?.currentMRR || 0) * 12;

  return (
    <div className="p-6 pb-20">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-gray-900">Revenue & Shopify</h1>
          {isConnected && (
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
              MODE MRR DATA LIVE
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500">
          Order analytics, revenue breakdown, payment health, and discount impact
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 text-brand-400 animate-spin" />
          <span className="ml-3 text-sm text-gray-500">Loading revenue data...</span>
        </div>
      )}

      {/* Shopify requirement */}
      {!loading && (
        <DataSourceRequired
          title="Full Shopify Revenue Analytics"
          description="Connect your Shopify store for detailed order-level analytics, payment health, discount impact, and product-level revenue breakdowns. MRR data below is from Mode Analytics."
          className="mb-8"
          compact={isConnected}
          sources={[
            {
              name: 'Shopify',
              description: 'Orders, subscriptions, products, payments, discounts, and customer data',
              envVars: ['SHOPIFY_ACCESS_TOKEN', 'SHOPIFY_STORE_DOMAIN'],
              status: 'not_configured',
            },
          ]}
        />
      )}

      {/* MRR data from Mode */}
      {!loading && isConnected && kpis && mrr && (
        <>
          {/* Refresh */}
          <div className="flex justify-end mb-4">
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-200 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </button>
          </div>

          {/* ═══ MRR KPIs ═══ */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4 mb-8">
            <MetricCard
              label="Current MRR"
              value={formatCompact(kpis.currentMRR)}
              trend={mrrChange}
              trendLabel="vs prior month"
              icon={<DollarSign className="h-5 w-5" />}
            />
            <MetricCard
              label="Estimated ARR"
              value={formatCompact(currentARR)}
              icon={<TrendingUp className="h-5 w-5" />}
            />
            <MetricCard
              label="Peak MRR"
              value={formatCompact(kpis.peakMRR)}
              icon={<BarChart3 className="h-5 w-5" />}
            />
            <MetricCard
              label="Active Subscribers"
              value={formatNumber(kpis.activeSubscribers)}
              icon={<DollarSign className="h-5 w-5" />}
            />
          </div>

          {/* ═══ MRR Trend ═══ */}
          <Card className="mb-8">
            <CardHeader
              title="Monthly Recurring Revenue (MRR)"
              subtitle={`Full history from Mode · Peak: ${formatCompact(mrr.peakMRR)}`}
            />
            <div className="h-[280px] flex items-end gap-0.5 px-1">
              {monthlyMRR.map((m) => {
                const maxMRR = Math.max(...monthlyMRR.map((x) => x.mrr));
                const height = maxMRR > 0 ? (m.mrr / maxMRR) * 100 : 0;
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center group relative">
                    <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                      <div className="rounded-lg bg-white border border-gray-200 px-3 py-2 text-xs whitespace-nowrap shadow-xl">
                        <p className="font-semibold text-gray-900">{m.month}</p>
                        <p className="text-emerald-400">{formatCompact(m.mrr)}</p>
                      </div>
                    </div>
                    <div
                      className="w-full rounded-t bg-emerald-500/50 hover:bg-emerald-500/70 transition-all cursor-pointer"
                      style={{ height: `${height}%`, minHeight: m.mrr > 0 ? '4px' : '0' }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex gap-0.5 px-1 mt-2">
              {monthlyMRR.map((m, i) => (
                <div key={m.month} className="flex-1 text-center">
                  {i % 4 === 0 && (
                    <span className="text-[8px] text-gray-400">{m.month.slice(2)}</span>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* ═══ MRR Month-over-Month Table ═══ */}
          <Card className="mb-8">
            <CardHeader title="MRR Month-over-Month" subtitle="Historical monthly recurring revenue changes" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                    <th className="py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">MRR</th>
                    <th className="py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Change</th>
                    <th className="py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">% Change</th>
                    <th className="py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-40">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyMRR.slice(-18).map((m, i, arr) => {
                    const prev = i > 0 ? arr[i - 1] : null;
                    const change = prev ? m.mrr - prev.mrr : 0;
                    const changePct = prev && prev.mrr > 0 ? (change / prev.mrr) * 100 : 0;
                    const maxMRR = Math.max(...arr.map((x) => x.mrr));
                    const barWidth = maxMRR > 0 ? (m.mrr / maxMRR) * 100 : 0;

                    return (
                      <tr key={m.month} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-2.5 text-xs font-medium text-gray-700">{m.month}</td>
                        <td className="py-2.5 text-right text-xs font-semibold text-gray-900">{formatCompact(m.mrr)}</td>
                        <td className={cn('py-2.5 text-right text-xs font-medium', change >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                          {i > 0 ? `${change >= 0 ? '+' : ''}${formatCompact(change)}` : '—'}
                        </td>
                        <td className={cn('py-2.5 text-right text-xs font-medium', changePct >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                          {i > 0 ? `${changePct >= 0 ? '+' : ''}${changePct.toFixed(1)}%` : '—'}
                        </td>
                        <td className="py-2.5">
                          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-emerald-500 transition-all"
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* ═══ Shopify-dependent sections ═══ */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 mb-8">
            <EmptySection
              title="Revenue by Order Type"
              integrations={['Shopify']}
              className="min-h-[320px]"
            />
            <EmptySection
              title="Revenue & AOV Trend"
              integrations={['Shopify']}
              className="min-h-[320px]"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 mb-8">
            <EmptySection
              title="Revenue by Product"
              integrations={['Shopify']}
              className="min-h-[280px]"
            />
            <EmptySection
              title="Payment Health & Dunning"
              integrations={['Shopify']}
              className="min-h-[280px]"
            />
          </div>

          <EmptySection
            title="Discount Impact on LTV"
            integrations={['Shopify']}
            className="min-h-[200px]"
          />
        </>
      )}

      {/* If not connected to Mode at all, show Shopify placeholders */}
      {!loading && !isConnected && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-8">
            {['Monthly Revenue', 'Total Orders', 'Avg Order Value', 'Payment Success Rate'].map((label) => (
              <div
                key={label}
                className="rounded-xl border border-dashed border-gray-200/50 bg-white/[0.01] p-5"
              >
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-gray-400">—</p>
                <p className="mt-1 text-[10px] text-gray-400">Shopify integration required</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 mb-8">
            <EmptySection title="Revenue by Order Type" integrations={['Shopify']} className="min-h-[320px]" />
            <EmptySection title="Revenue & AOV Trend" integrations={['Shopify']} className="min-h-[320px]" />
          </div>
        </>
      )}
    </div>
  );
}
