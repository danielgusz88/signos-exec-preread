'use client';

import { Card, CardHeader, MetricCard } from '@/components/ui/card';
import { DataSourceRequired, EmptySection } from '@/components/ui/data-source-required';
import { cn, formatPercent, formatNumber, formatCompact } from '@/lib/utils';
import {
  Users,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Repeat,
  BarChart3,
  Loader2,
  RefreshCw,
  Lightbulb,
  Zap,
  Activity,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

interface ModeData {
  connected: boolean;
  error?: string;
  kpis?: {
    activeSubscribers: number;
    activeChange: number;
    monthlyChurnRate: number;
    avgChurn3Month: number;
    currentMRR: number;
    peakMRR: number;
    renewalRate: number;
    totalLifetimeUsers: number;
    peakActiveUsers: number;
    peakActiveMonth: string;
    customerConversionRate: number;
  };
  churn?: {
    monthlyChurn: Array<{
      month: string;
      newSubs: number;
      lostSubs: number;
      activeEnd: number;
      activeStart: number;
      churnRate: number;
    }>;
    planBreakdown: Array<{
      plan: string;
      activeCount: number;
      label: string;
    }>;
    statusCounts: Record<string, number>;
  };
  mrr?: {
    monthlyMRR: Array<{
      month: string;
      mrr: number;
    }>;
  };
}

export default function DashboardPage() {
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
  const kpis = data?.kpis;
  const churn = data?.churn;
  const mrr = data?.mrr;

  return (
    <div className="p-6 pb-20">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-gray-900">LTV Command Center</h1>
          {isConnected && (
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
              MODE LIVE — {formatNumber(kpis?.totalLifetimeUsers || 0)} users
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500">
          Real-time lifetime value intelligence across acquisition, engagement, and retention.
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 text-brand-400 animate-spin" />
          <span className="ml-3 text-sm text-gray-500">Connecting to Mode Analytics...</span>
        </div>
      )}

      {/* Not connected */}
      {!loading && !isConnected && (
        <DataSourceRequired
          title="KPI Summary — Active Subscribers, Churn, MRR, Renewal Rate"
          description="Core unit economics require subscription data from Mode Analytics. Connect Mode to see real subscription churn, MRR trends, and renewal rates from your Snowflake data warehouse."
          className="mb-8"
          sources={[
            {
              name: 'Mode Analytics',
              description: 'Churn rates, MRR, renewal metrics, and customer lifecycle data (36K+ users)',
              envVars: ['MODE_API_TOKEN', 'MODE_API_SECRET', 'MODE_WORKSPACE'],
              status: 'not_configured',
            },
            {
              name: 'Meta Ads',
              description: 'Customer acquisition cost from Facebook/Instagram campaigns',
              envVars: ['META_ADS_ACCESS_TOKEN', 'META_ADS_ACCOUNT_ID'],
              status: 'not_configured',
            },
            {
              name: 'Google Ads',
              description: 'Customer acquisition cost from Google Search/Display campaigns',
              envVars: ['GOOGLE_ADS_DEVELOPER_TOKEN'],
              status: 'not_configured',
            },
          ]}
        />
      )}

      {/* Connected — Full Dashboard */}
      {!loading && isConnected && kpis && churn && mrr && (
        <>
          {/* Refresh */}
          <div className="flex justify-end mb-4">
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-200 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh Data
            </button>
          </div>

          {/* ═══ KPI Grid ═══ */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-5 mb-8">
            <MetricCard
              label="Active Subscribers"
              value={formatNumber(kpis.activeSubscribers)}
              trend={kpis.activeChange}
              trendLabel="vs prior month"
              icon={<Users className="h-5 w-5" />}
            />
            <MetricCard
              label="Monthly Churn Rate"
              value={formatPercent(kpis.monthlyChurnRate)}
              icon={<TrendingDown className="h-5 w-5" />}
              valueColor={kpis.monthlyChurnRate <= 5 ? 'text-emerald-400' : kpis.monthlyChurnRate <= 10 ? 'text-amber-400' : 'text-red-400'}
            />
            <MetricCard
              label="3-Mo Avg Churn"
              value={formatPercent(kpis.avgChurn3Month)}
              icon={<Activity className="h-5 w-5" />}
              valueColor={kpis.avgChurn3Month <= 5 ? 'text-emerald-400' : kpis.avgChurn3Month <= 10 ? 'text-amber-400' : 'text-red-400'}
            />
            <MetricCard
              label="Renewal Rate"
              value={formatPercent(kpis.renewalRate)}
              icon={<Repeat className="h-5 w-5" />}
              valueColor={kpis.renewalRate >= 30 ? 'text-emerald-400' : kpis.renewalRate >= 20 ? 'text-amber-400' : 'text-red-400'}
            />
            <MetricCard
              label="Customer Conversion"
              value={formatPercent(kpis.customerConversionRate)}
              icon={<BarChart3 className="h-5 w-5" />}
              valueColor={kpis.customerConversionRate >= 70 ? 'text-emerald-400' : 'text-amber-400'}
            />
          </div>

          {/* ═══ Active Subscribers Trend ═══ */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 mb-8">
            <Card>
              <CardHeader
                title="Active Subscribers (Monthly)"
                subtitle={`Peak: ${formatNumber(kpis.peakActiveUsers)} (${kpis.peakActiveMonth})`}
              />
              <div className="h-[280px] flex flex-col">
                {/* Simple bar chart using CSS */}
                <div className="flex-1 flex items-end gap-0.5 px-1">
                  {churn.monthlyChurn.slice(-24).map((m) => {
                    const maxActive = Math.max(...churn.monthlyChurn.slice(-24).map((x) => x.activeEnd));
                    const height = maxActive > 0 ? (m.activeEnd / maxActive) * 100 : 0;
                    return (
                      <div key={m.month} className="flex-1 flex flex-col items-center group relative">
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                          <div className="rounded-lg bg-white border border-gray-200 px-3 py-2 text-xs whitespace-nowrap shadow-xl">
                            <p className="font-semibold text-gray-900">{m.month}</p>
                            <p className="text-gray-500">Active: {formatNumber(m.activeEnd)}</p>
                            <p className="text-gray-500">New: +{formatNumber(m.newSubs)}</p>
                            <p className="text-gray-500">Lost: -{formatNumber(m.lostSubs)}</p>
                            <p className={cn('font-medium', m.churnRate <= 5 ? 'text-emerald-400' : m.churnRate <= 10 ? 'text-amber-400' : 'text-red-400')}>
                              Churn: {formatPercent(m.churnRate)}
                            </p>
                          </div>
                        </div>
                        <div
                          className={cn(
                            'w-full rounded-t transition-all cursor-pointer',
                            m.churnRate <= 5 ? 'bg-emerald-500/60 hover:bg-emerald-500/80' :
                            m.churnRate <= 10 ? 'bg-amber-500/60 hover:bg-amber-500/80' :
                            'bg-red-500/60 hover:bg-red-500/80'
                          )}
                          style={{ height: `${height}%`, minHeight: m.activeEnd > 0 ? '4px' : '0' }}
                        />
                      </div>
                    );
                  })}
                </div>
                {/* X-axis labels */}
                <div className="flex gap-0.5 px-1 mt-2">
                  {churn.monthlyChurn.slice(-24).map((m, i) => (
                    <div key={m.month} className="flex-1 text-center">
                      {i % 4 === 0 && (
                        <span className="text-[8px] text-gray-400">{m.month.slice(2)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mt-2 text-center">Bar color: 🟢 ≤5% churn · 🟡 5-10% · 🔴 &gt;10%</p>
            </Card>

            {/* Churn Rate Trend */}
            <Card>
              <CardHeader
                title="Monthly Churn Rate Trend"
                subtitle="Percentage of subscribers lost each month"
              />
              <div className="h-[280px] flex flex-col">
                <div className="flex-1 flex items-end gap-0.5 px-1 relative">
                  {/* Reference lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    {[20, 15, 10, 5, 0].map((pct) => (
                      <div key={pct} className="flex items-center gap-2 border-b border-white/[0.03]">
                        <span className="text-[8px] text-gray-500 w-6 text-right">{pct}%</span>
                      </div>
                    ))}
                  </div>
                  {churn.monthlyChurn.slice(-24).map((m) => {
                    const height = Math.min(m.churnRate / 20 * 100, 100);
                    return (
                      <div key={m.month} className="flex-1 flex flex-col items-center group relative z-10">
                        <div className="absolute bottom-full mb-2 hidden group-hover:block z-20">
                          <div className="rounded-lg bg-white border border-gray-200 px-3 py-2 text-xs whitespace-nowrap shadow-xl">
                            <p className="font-semibold text-gray-900">{m.month}</p>
                            <p className={cn('font-medium', m.churnRate <= 5 ? 'text-emerald-400' : m.churnRate <= 10 ? 'text-amber-400' : 'text-red-400')}>
                              Churn: {formatPercent(m.churnRate)}
                            </p>
                          </div>
                        </div>
                        <div
                          className={cn(
                            'w-full rounded-t transition-all cursor-pointer',
                            m.churnRate <= 5 ? 'bg-emerald-500/70' :
                            m.churnRate <= 10 ? 'bg-amber-500/70' :
                            'bg-red-500/70'
                          )}
                          style={{ height: `${height}%`, minHeight: m.churnRate > 0 ? '4px' : '0' }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-0.5 px-1 mt-2">
                  {churn.monthlyChurn.slice(-24).map((m, i) => (
                    <div key={m.month} className="flex-1 text-center">
                      {i % 4 === 0 && (
                        <span className="text-[8px] text-gray-400">{m.month.slice(2)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* ═══ Plan Distribution + Status ═══ */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 mb-8">
            {/* Plan Distribution */}
            <Card>
              <CardHeader title="Subscription Plan Mix" subtitle="Distribution of subscription types across all users" />
              <div className="space-y-2">
                {churn.planBreakdown.map((plan) => {
                  const totalPlans = churn.planBreakdown.reduce((s, p) => s + p.activeCount, 0);
                  const pct = totalPlans > 0 ? (plan.activeCount / totalPlans) * 100 : 0;
                  return (
                    <div key={plan.plan} className="flex items-center gap-3">
                      <div className="w-36 truncate">
                        <span className="text-xs font-medium text-gray-700">{plan.label}</span>
                      </div>
                      <div className="flex-1 h-6 rounded-lg bg-gray-100 overflow-hidden relative">
                        <div
                          className="h-full rounded-lg bg-brand-500 transition-all"
                          style={{ width: `${pct}%`, opacity: 0.6 }}
                        />
                        <span className="absolute inset-0 flex items-center px-3 text-[10px] font-medium text-white">
                          {formatNumber(plan.activeCount)} ({formatPercent(pct, 1)})
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Status Breakdown */}
            <Card>
              <CardHeader title="Subscriber Status" subtitle="Current status of all tracked subscribers" />
              <div className="space-y-4">
                {Object.entries(churn.statusCounts)
                  .sort(([, a], [, b]) => b - a)
                  .map(([status, count]) => {
                    const total = Object.values(churn.statusCounts).reduce((s, c) => s + c, 0);
                    const pct = total > 0 ? (count / total) * 100 : 0;
                    const colorMap: Record<string, string> = {
                      ACTIVE: 'bg-emerald-500',
                      EXPIRED: 'bg-zinc-500',
                      CANCELLED: 'bg-red-500',
                      PAUSED: 'bg-amber-500',
                    };
                    const textMap: Record<string, string> = {
                      ACTIVE: 'text-emerald-400',
                      EXPIRED: 'text-gray-500',
                      CANCELLED: 'text-red-400',
                      PAUSED: 'text-amber-400',
                    };
                    return (
                      <div key={status}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={cn('text-xs font-semibold', textMap[status] || 'text-gray-500')}>
                            {status}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatNumber(count)} ({formatPercent(pct, 1)})
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all', colorMap[status] || 'bg-zinc-600')}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </Card>
          </div>

          {/* ═══ MRR History ═══ */}
          <Card className="mb-8">
            <CardHeader
              title="Monthly Recurring Revenue (MRR)"
              subtitle={`Historical MRR — Peak: ${formatCompact(kpis.peakMRR)}`}
            />
            <div className="h-[220px] flex items-end gap-0.5 px-1">
              {mrr.monthlyMRR.map((m) => {
                const maxMRR = Math.max(...mrr.monthlyMRR.map((x) => x.mrr));
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
              {mrr.monthlyMRR.map((m, i) => (
                <div key={m.month} className="flex-1 text-center">
                  {i % 4 === 0 && (
                    <span className="text-[8px] text-gray-400">{m.month.slice(2)}</span>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* ═══ Still-needed integrations ═══ */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 mb-8">
            <EmptySection
              title="Channel Quality Matrix — LTV:CAC by Channel"
              integrations={['Meta Ads', 'Google Ads']}
              className="min-h-[280px]"
            />

            {/* AI Analysis */}
            <Card className="border-brand-500/20 bg-gradient-to-br from-brand-500/[0.03] to-transparent">
              <CardHeader title="AI Analysis" subtitle="Claude-generated insight digest" />
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 border border-brand-500/20 mb-4">
                  <Lightbulb className="h-5 w-5 text-brand-400" />
                </div>
                <h4 className="text-sm font-semibold text-gray-700 mb-1">AI Insights Coming Soon</h4>
                <p className="text-xs text-gray-500 max-w-sm mb-3">
                  Mode data is connected! Add the Anthropic API key to enable AI-powered insights that analyze churn patterns, MRR trends, and recommend high-impact programs.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 border border-gray-200">
                    <Zap className="h-2.5 w-2.5" />
                    ANTHROPIC_API_KEY
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
