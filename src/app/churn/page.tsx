'use client';

import { Card, CardHeader, MetricCard } from '@/components/ui/card';
import { DataSourceRequired } from '@/components/ui/data-source-required';
import { cn, formatPercent, formatNumber } from '@/lib/utils';
import {
  TrendingDown,
  TrendingUp,
  Users,
  Activity,
  Loader2,
  RefreshCw,
  Lightbulb,
  AlertTriangle,
  ArrowDown,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

interface MonthlyChurn {
  month: string;
  newSubs: number;
  lostSubs: number;
  activeEnd: number;
  activeStart: number;
  churnRate: number;
}

interface ModeData {
  connected: boolean;
  error?: string;
  kpis?: {
    activeSubscribers: number;
    monthlyChurnRate: number;
    avgChurn3Month: number;
    peakActiveUsers: number;
    peakActiveMonth: string;
    totalLifetimeUsers: number;
  };
  churn?: {
    monthlyChurn: MonthlyChurn[];
    planBreakdown: Array<{ plan: string; activeCount: number; label: string }>;
    statusCounts: Record<string, number>;
  };
}

export default function ChurnPage() {
  const [data, setData] = useState<ModeData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/data/mode');
      const json = await res.json();
      setData(json);
    } catch {
      setData({ connected: false, error: 'Failed to fetch Mode data' });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isConnected = data?.connected === true;
  const churn = data?.churn;
  const kpis = data?.kpis;

  // Compute additional churn insights
  const monthlyChurn = churn?.monthlyChurn || [];
  const recent12 = monthlyChurn.slice(-12);
  const worstMonth = recent12.reduce((worst, m) => (m.churnRate > (worst?.churnRate || 0) ? m : worst), recent12[0]);
  const bestMonth = recent12.filter(m => m.churnRate > 0).reduce((best, m) => (m.churnRate < (best?.churnRate || 100) ? m : best), recent12[0]);

  // Net subscriber growth
  const netGrowthRecent = recent12.map((m) => ({
    month: m.month,
    netGrowth: m.newSubs - m.lostSubs,
    newSubs: m.newSubs,
    lostSubs: m.lostSubs,
  }));

  return (
    <div className="p-6 pb-20">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-white">Churn Waterfall</h1>
          {isConnected && (
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
              MODE LIVE — {formatNumber(kpis?.totalLifetimeUsers || 0)} users tracked
            </span>
          )}
        </div>
        <p className="text-sm text-zinc-400">
          Where customers drop off and why — subscription churn analysis from Mode Analytics.
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 text-brand-400 animate-spin" />
          <span className="ml-3 text-sm text-zinc-400">Loading churn data from Mode...</span>
        </div>
      )}

      {/* Not connected */}
      {!loading && !isConnected && (
        <DataSourceRequired
          title="Churn Analysis Data"
          description="Churn waterfall analysis requires subscription lifecycle data from Mode Analytics. Connect Mode to view real monthly churn rates, subscriber trends, and drop-off patterns."
          className="mb-8"
          sources={[
            {
              name: 'Mode Analytics',
              description: 'Retention reports, churn analysis queries, and lifecycle stage tracking',
              envVars: ['MODE_API_TOKEN', 'MODE_API_SECRET', 'MODE_WORKSPACE'],
              status: 'not_configured',
            },
          ]}
        />
      )}

      {/* Connected */}
      {!loading && isConnected && kpis && churn && (
        <>
          {/* Refresh */}
          <div className="flex justify-end mb-4">
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-white/[0.08] transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </button>
          </div>

          {/* ═══ Churn KPIs ═══ */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4 mb-8">
            <MetricCard
              label="Current Churn Rate"
              value={formatPercent(kpis.monthlyChurnRate)}
              icon={<TrendingDown className="h-5 w-5" />}
              valueColor={kpis.monthlyChurnRate <= 5 ? 'text-emerald-400' : kpis.monthlyChurnRate <= 10 ? 'text-amber-400' : 'text-red-400'}
            />
            <MetricCard
              label="3-Month Avg Churn"
              value={formatPercent(kpis.avgChurn3Month)}
              icon={<Activity className="h-5 w-5" />}
              valueColor={kpis.avgChurn3Month <= 5 ? 'text-emerald-400' : kpis.avgChurn3Month <= 10 ? 'text-amber-400' : 'text-red-400'}
            />
            <MetricCard
              label="Active Subscribers"
              value={formatNumber(kpis.activeSubscribers)}
              icon={<Users className="h-5 w-5" />}
            />
            <MetricCard
              label="Peak Active"
              value={formatNumber(kpis.peakActiveUsers)}
              icon={<TrendingUp className="h-5 w-5" />}
            />
          </div>

          {/* ═══ Waterfall Chart - Net Subscriber Movement ═══ */}
          <Card className="mb-8">
            <CardHeader
              title="Subscriber Waterfall — Monthly Net Movement"
              subtitle="Green: new subscribers outpace churn · Red: churn exceeds new subs"
            />
            <div className="h-[300px] flex flex-col">
              <div className="flex-1 flex items-center gap-1 px-2 relative">
                {/* Zero line */}
                <div className="absolute left-0 right-0 top-1/2 border-t border-white/[0.08]" />
                <div className="absolute left-0 top-1/2 -translate-y-1/2">
                  <span className="text-[8px] text-zinc-600">0</span>
                </div>

                {netGrowthRecent.map((m) => {
                  const maxAbsGrowth = Math.max(...netGrowthRecent.map((x) => Math.abs(x.netGrowth)), 1);
                  const height = (Math.abs(m.netGrowth) / maxAbsGrowth) * 45; // 45% max of container
                  const isPositive = m.netGrowth >= 0;

                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center group relative h-full justify-center">
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                        <div className="rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-xs whitespace-nowrap shadow-xl">
                          <p className="font-semibold text-white">{m.month}</p>
                          <p className="text-emerald-400">New: +{formatNumber(m.newSubs)}</p>
                          <p className="text-red-400">Lost: -{formatNumber(m.lostSubs)}</p>
                          <p className={cn('font-bold', isPositive ? 'text-emerald-400' : 'text-red-400')}>
                            Net: {isPositive ? '+' : ''}{formatNumber(m.netGrowth)}
                          </p>
                        </div>
                      </div>

                      {isPositive ? (
                        <div className="flex flex-col items-center" style={{ height: '50%', justifyContent: 'flex-end' }}>
                          <div
                            className="w-full rounded-t bg-emerald-500/60 hover:bg-emerald-500/80 transition-all cursor-pointer"
                            style={{ height: `${height}%`, minHeight: m.netGrowth > 0 ? '4px' : '0' }}
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center" style={{ height: '50%', justifyContent: 'flex-start' }}>
                          <div
                            className="w-full rounded-b bg-red-500/60 hover:bg-red-500/80 transition-all cursor-pointer"
                            style={{ height: `${height}%`, minHeight: m.netGrowth < 0 ? '4px' : '0' }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* X labels */}
              <div className="flex gap-1 px-2 mt-1">
                {netGrowthRecent.map((m) => (
                  <div key={m.month} className="flex-1 text-center">
                    <span className="text-[8px] text-zinc-600">{m.month.slice(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* ═══ New vs Lost Breakdown ═══ */}
          <Card className="mb-8">
            <CardHeader
              title="Monthly New vs Lost Subscribers"
              subtitle="Stacked comparison showing acquisition vs churn volume"
            />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Month</th>
                    <th className="py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">New Subs</th>
                    <th className="py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">Lost Subs</th>
                    <th className="py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">Net</th>
                    <th className="py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">Active End</th>
                    <th className="py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">Churn %</th>
                    <th className="py-3 text-center text-xs font-medium text-zinc-500 uppercase tracking-wider w-32">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyChurn.slice(-18).map((m) => {
                    const net = m.newSubs - m.lostSubs;
                    const maxChurn = 20;
                    const churnBarWidth = Math.min((m.churnRate / maxChurn) * 100, 100);
                    return (
                      <tr key={m.month} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                        <td className="py-2.5 text-xs font-medium text-zinc-300">{m.month}</td>
                        <td className="py-2.5 text-right text-xs text-emerald-400 font-medium">+{formatNumber(m.newSubs)}</td>
                        <td className="py-2.5 text-right text-xs text-red-400 font-medium">-{formatNumber(m.lostSubs)}</td>
                        <td className={cn('py-2.5 text-right text-xs font-bold', net >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                          {net >= 0 ? '+' : ''}{formatNumber(net)}
                        </td>
                        <td className="py-2.5 text-right text-xs text-zinc-300 font-semibold">{formatNumber(m.activeEnd)}</td>
                        <td className={cn(
                          'py-2.5 text-right text-xs font-semibold',
                          m.churnRate <= 5 ? 'text-emerald-400' : m.churnRate <= 10 ? 'text-amber-400' : 'text-red-400'
                        )}>
                          {formatPercent(m.churnRate)}
                        </td>
                        <td className="py-2.5">
                          <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                m.churnRate <= 5 ? 'bg-emerald-500' : m.churnRate <= 10 ? 'bg-amber-500' : 'bg-red-500'
                              )}
                              style={{ width: `${churnBarWidth}%` }}
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

          {/* ═══ Insights ═══ */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3 mb-8">
            {/* Worst Month */}
            {worstMonth && (
              <Card className="border-red-500/20 bg-red-500/[0.02]">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <h3 className="text-sm font-semibold text-red-400">Highest Churn (12mo)</h3>
                </div>
                <p className="text-2xl font-bold text-white">{formatPercent(worstMonth.churnRate)}</p>
                <p className="text-xs text-zinc-400 mt-1">
                  {worstMonth.month} — Lost {formatNumber(worstMonth.lostSubs)} of {formatNumber(worstMonth.activeStart)} active subs
                </p>
              </Card>
            )}

            {/* Best Month */}
            {bestMonth && (
              <Card className="border-emerald-500/20 bg-emerald-500/[0.02]">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingDown className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-emerald-400">Lowest Churn (12mo)</h3>
                </div>
                <p className="text-2xl font-bold text-white">{formatPercent(bestMonth.churnRate)}</p>
                <p className="text-xs text-zinc-400 mt-1">
                  {bestMonth.month} — Lost {formatNumber(bestMonth.lostSubs)} of {formatNumber(bestMonth.activeStart)} active subs
                </p>
              </Card>
            )}

            {/* Churn Intervention */}
            <Card className="border-brand-500/20 bg-gradient-to-br from-brand-500/[0.03] to-transparent">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="h-4 w-4 text-brand-400" />
                <h3 className="text-sm font-semibold text-brand-400">Churn Intervention</h3>
              </div>
              <p className="text-xs text-zinc-400">
                {kpis.avgChurn3Month > 10
                  ? `With ${formatPercent(kpis.avgChurn3Month)} avg monthly churn, reducing churn by just 2% would retain ~${formatNumber(Math.round(kpis.activeSubscribers * 0.02))} additional subscribers per month, adding significant LTV.`
                  : kpis.avgChurn3Month > 5
                  ? `Churn averaging ${formatPercent(kpis.avgChurn3Month)} — focus on Month 3-6 retention interventions and renewal incentives to get below 5%.`
                  : `Excellent churn at ${formatPercent(kpis.avgChurn3Month)} — focus on expansion revenue and upsell to maximize per-user LTV.`}
              </p>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
