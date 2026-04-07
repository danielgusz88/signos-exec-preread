'use client';

import { Card, CardHeader, MetricCard } from '@/components/ui/card';
import { DataSourceRequired } from '@/components/ui/data-source-required';
import { cn, formatPercent, formatNumber } from '@/lib/utils';
import {
  Mail, Eye, MousePointer, DollarSign, RefreshCw, Loader2,
  TrendingDown, TrendingUp, AlertTriangle, CheckCircle2,
  ArrowDown, ChevronDown, ChevronUp, Filter, BarChart3,
  Send, ShieldAlert, UserX, Zap,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────

interface CampaignMetrics {
  totalSent: number;
  uniqueEmailSends: number;
  totalDelivered: number;
  uniqueDelivered: number;
  totalOpens: number;
  uniqueOpens: number;
  totalClicks: number;
  uniqueClicks: number;
  totalBounced: number;
  uniqueBounced: number;
  totalUnsubscribes: number;
  uniqueUnsubscribes: number;
  totalComplaints: number;
  totalPurchases: number;
  uniquePurchases: number;
  revenue: number;
  avgOrderValue: number;
  totalHoldout: number;
  totalSendSkips: number;
}

interface CampaignData {
  id: number;
  name: string;
  type: string;
  campaignState: string;
  workflowId: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  metrics: CampaignMetrics;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  clickToOpenRate: number;
  bounceRate: number;
  unsubRate: number;
  complaintRate: number;
}

interface FunnelData {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  purchased: number;
  deliveryDropOff: number;
  openDropOff: number;
  clickDropOff: number;
  conversionDropOff: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  clickToOpenRate: number;
}

interface SummaryData {
  totalCampaigns: number;
  activeCampaigns: number;
  significantCampaigns: number;
  totalSent: number;
  totalDelivered: number;
  totalUniqueOpens: number;
  totalUniqueClicks: number;
  totalBounced: number;
  totalUnsubs: number;
  totalComplaints: number;
  totalRevenue: number;
  totalPurchases: number;
  avgDeliveryRate: number;
  avgOpenRate: number;
  avgClickRate: number;
  avgBounceRate: number;
  avgUnsubRate: number;
  byType: Record<string, { count: number; sent: number; delivered: number; opens: number; clicks: number; unsubs: number; bounced: number }>;
  byState: Record<string, number>;
  tiers: { excellent: number; good: number; average: number; poor: number };
}

interface RankingEntry {
  id: number;
  name: string;
  openRate?: number;
  clickRate?: number;
  bounceRate?: number;
  sent: number;
}

interface ApiResponse {
  connected: boolean;
  error?: string;
  campaigns: CampaignData[];
  summary: SummaryData | null;
  funnel: FunnelData | null;
  rankings?: {
    bestByOpenRate: RankingEntry[];
    worstByOpenRate: RankingEntry[];
    bestByClickRate: RankingEntry[];
    highestBounceRate: RankingEntry[];
  };
}

// ── Funnel Step Component ──────────────────────────────────────────────────

function FunnelStep({
  label,
  value,
  total,
  dropOff,
  isFirst,
  color,
}: {
  label: string;
  value: number;
  total: number;
  dropOff: number;
  isFirst: boolean;
  color: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="flex-1 relative">
      {!isFirst && (
        <div className="absolute -left-6 top-1/2 -translate-y-1/2 flex flex-col items-center">
          <ArrowDown className="h-4 w-4 text-gray-400" />
          <span className="text-[9px] text-red-400 font-bold whitespace-nowrap mt-0.5">
            -{formatPercent(dropOff, 1)} drop
          </span>
        </div>
      )}
      <div className={cn('rounded-xl border p-4 text-center', color)}>
        <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500 mb-1">{label}</p>
        <p className="text-xl font-bold text-gray-900">{formatNumber(value)}</p>
        {!isFirst && (
          <p className="text-[10px] text-gray-500 mt-0.5">{formatPercent(pct, 1)} of sent</p>
        )}
      </div>
    </div>
  );
}

// ── Campaign Health Badge ──────────────────────────────────────────────────

function HealthBadge({ openRate, bounceRate }: { openRate: number; bounceRate: number }) {
  if (bounceRate > 20) return <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-400">CRITICAL</span>;
  if (openRate >= 50) return <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">EXCELLENT</span>;
  if (openRate >= 30) return <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-400">GOOD</span>;
  if (openRate >= 15) return <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400">AVERAGE</span>;
  return <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-400">POOR</span>;
}

// ── Main Page ──────────────────────────────────────────────────────────────

type SortField = 'sent' | 'openRate' | 'clickRate' | 'bounceRate' | 'unsubRate' | 'name';
type CampaignFilter = 'all' | 'Running' | 'Finished' | 'Ready' | 'Draft' | 'Archived';

export default function EmailPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('sent');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filter, setFilter] = useState<CampaignFilter>('all');
  const [showAll, setShowAll] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/integrations/iterable/campaigns');
      const json = await res.json();
      setData(json);
    } catch {
      setData({ connected: false, error: 'Failed to fetch', campaigns: [], summary: null, funnel: null });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const campaigns = data?.campaigns || [];
  const summary = data?.summary;
  const funnel = data?.funnel;
  const rankings = data?.rankings;
  const isConnected = data?.connected === true && campaigns.length > 0;

  // Filter and sort
  const filteredCampaigns = campaigns
    .filter((c) => filter === 'all' || c.campaignState === filter)
    .filter((c) => c.metrics.totalSent > 0) // Only show campaigns with data
    .sort((a, b) => {
      const mult = sortDir === 'desc' ? -1 : 1;
      switch (sortField) {
        case 'sent': return mult * (a.metrics.totalSent - b.metrics.totalSent);
        case 'openRate': return mult * (a.openRate - b.openRate);
        case 'clickRate': return mult * (a.clickRate - b.clickRate);
        case 'bounceRate': return mult * (a.bounceRate - b.bounceRate);
        case 'unsubRate': return mult * (a.unsubRate - b.unsubRate);
        case 'name': return mult * a.name.localeCompare(b.name);
        default: return 0;
      }
    });

  const displayedCampaigns = showAll ? filteredCampaigns : filteredCampaigns.slice(0, 25);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === 'desc' ? <ChevronDown className="h-3 w-3 inline ml-0.5" /> : <ChevronUp className="h-3 w-3 inline ml-0.5" />;
  };

  return (
    <div className="p-6 pb-20">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-gray-900">Email Intelligence</h1>
          {isConnected && (
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
              ITERABLE LIVE — {summary?.totalCampaigns} campaigns
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500">
          Comprehensive email performance analysis — efficacy, drop-off, engagement quality, and campaign health from Iterable.
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 text-brand-400 animate-spin" />
          <span className="ml-3 text-sm text-gray-500">Connecting to Iterable...</span>
        </div>
      )}

      {/* Not connected */}
      {!loading && !isConnected && (
        <DataSourceRequired
          title="Iterable Email Campaign Data"
          description="Connect Iterable to view real email campaign performance, engagement metrics, funnel analysis, and drop-off data. All data on this page is pulled directly from the Iterable API."
          sources={[
            {
              name: 'Iterable',
              description: 'Email campaigns, open/click rates, bounce rates, unsubscribes, revenue attribution',
              envVars: ['ITERABLE_API_KEY'],
              status: 'not_configured',
            },
          ]}
        />
      )}

      {/* Connected — Full Dashboard */}
      {!loading && isConnected && summary && funnel && (
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

          {/* ═══ Section 1: KPI Overview ═══ */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-5 mb-8">
            <MetricCard
              label="Total Emails Sent"
              value={formatNumber(summary.totalSent)}
              icon={<Send className="h-5 w-5" />}
            />
            <MetricCard
              label="Avg Open Rate"
              value={formatPercent(summary.avgOpenRate)}
              icon={<Eye className="h-5 w-5" />}
              valueColor={summary.avgOpenRate >= 30 ? 'text-emerald-400' : summary.avgOpenRate >= 15 ? 'text-amber-400' : 'text-red-400'}
            />
            <MetricCard
              label="Avg Click Rate"
              value={formatPercent(summary.avgClickRate)}
              icon={<MousePointer className="h-5 w-5" />}
              valueColor={summary.avgClickRate >= 5 ? 'text-emerald-400' : summary.avgClickRate >= 2 ? 'text-amber-400' : 'text-red-400'}
            />
            <MetricCard
              label="Avg Bounce Rate"
              value={formatPercent(summary.avgBounceRate)}
              icon={<ShieldAlert className="h-5 w-5" />}
              valueColor={summary.avgBounceRate <= 2 ? 'text-emerald-400' : summary.avgBounceRate <= 5 ? 'text-amber-400' : 'text-red-400'}
            />
            <MetricCard
              label="Total Unsubscribes"
              value={formatNumber(summary.totalUnsubs)}
              icon={<UserX className="h-5 w-5" />}
            />
          </div>

          {/* ═══ Section 2: Email Funnel — Drop-Off Analysis ═══ */}
          <Card className="mb-8">
            <CardHeader
              title="📧 Email Engagement Funnel"
              subtitle="Sent → Delivered → Opened → Clicked — Where are we losing people?"
            />
            <div className="grid grid-cols-4 gap-12 px-4 py-6">
              <FunnelStep
                label="Sent"
                value={funnel.sent}
                total={funnel.sent}
                dropOff={0}
                isFirst
                color="border-blue-500/20 bg-blue-500/[0.03]"
              />
              <FunnelStep
                label="Delivered"
                value={funnel.delivered}
                total={funnel.sent}
                dropOff={funnel.deliveryDropOff}
                isFirst={false}
                color="border-indigo-500/20 bg-indigo-500/[0.03]"
              />
              <FunnelStep
                label="Opened"
                value={funnel.opened}
                total={funnel.sent}
                dropOff={funnel.openDropOff}
                isFirst={false}
                color="border-purple-500/20 bg-purple-500/[0.03]"
              />
              <FunnelStep
                label="Clicked"
                value={funnel.clicked}
                total={funnel.sent}
                dropOff={funnel.clickDropOff}
                isFirst={false}
                color="border-emerald-500/20 bg-emerald-500/[0.03]"
              />
            </div>

            {/* Drop-off insights */}
            <div className="border-t border-gray-200 mt-2 pt-4 px-4 pb-2">
              <h4 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Drop-Off Analysis</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className={cn('rounded-lg p-3 border', funnel.deliveryDropOff > 10 ? 'border-red-500/20 bg-red-500/[0.03]' : 'border-gray-200 bg-gray-50')}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-medium text-gray-500">Delivery Drop-Off</span>
                    {funnel.deliveryDropOff > 10 && <AlertTriangle className="h-3 w-3 text-red-400" />}
                  </div>
                  <p className={cn('text-lg font-bold', funnel.deliveryDropOff > 10 ? 'text-red-400' : funnel.deliveryDropOff > 5 ? 'text-amber-400' : 'text-emerald-400')}>
                    {formatPercent(funnel.deliveryDropOff)}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-1">
                    {funnel.deliveryDropOff > 10
                      ? '⚠️ High bounce rate — clean email list recommended'
                      : funnel.deliveryDropOff > 5
                      ? 'Moderate — review bounce reasons'
                      : '✅ Healthy delivery rate'}
                  </p>
                </div>
                <div className={cn('rounded-lg p-3 border', funnel.openDropOff > 70 ? 'border-red-500/20 bg-red-500/[0.03]' : 'border-gray-200 bg-gray-50')}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-medium text-gray-500">Open Drop-Off</span>
                    {funnel.openDropOff > 70 && <AlertTriangle className="h-3 w-3 text-red-400" />}
                  </div>
                  <p className={cn('text-lg font-bold', funnel.openDropOff > 70 ? 'text-red-400' : funnel.openDropOff > 50 ? 'text-amber-400' : 'text-emerald-400')}>
                    {formatPercent(funnel.openDropOff)}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-1">
                    {funnel.openDropOff > 70
                      ? '⚠️ Low open rates — improve subject lines & send timing'
                      : funnel.openDropOff > 50
                      ? 'Typical range — test subject lines'
                      : '✅ Strong open engagement'}
                  </p>
                </div>
                <div className={cn('rounded-lg p-3 border', funnel.clickDropOff > 95 ? 'border-red-500/20 bg-red-500/[0.03]' : 'border-gray-200 bg-gray-50')}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-medium text-gray-500">Click Drop-Off</span>
                    {funnel.clickDropOff > 95 && <AlertTriangle className="h-3 w-3 text-red-400" />}
                  </div>
                  <p className={cn('text-lg font-bold', funnel.clickDropOff > 95 ? 'text-red-400' : funnel.clickDropOff > 80 ? 'text-amber-400' : 'text-emerald-400')}>
                    {formatPercent(funnel.clickDropOff)}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-1">
                    {funnel.clickDropOff > 95
                      ? '⚠️ Very low click-through — review CTAs & content relevance'
                      : funnel.clickDropOff > 80
                      ? 'Typical — optimize CTA placement'
                      : '✅ Good CTA engagement'}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* ═══ Section 3: Engagement Quality Tiers ═══ */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4 mb-8">
            <Card>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-medium uppercase text-gray-500">Excellent (&gt;50% open)</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-emerald-400">{summary.tiers.excellent}</p>
              <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${summary.significantCampaigns > 0 ? (summary.tiers.excellent / summary.significantCampaigns) * 100 : 0}%` }} />
              </div>
              <p className="text-[10px] text-gray-500 mt-1">of {summary.significantCampaigns} active campaigns</p>
            </Card>
            <Card>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-medium uppercase text-gray-500">Good (30-50% open)</span>
                <TrendingUp className="h-4 w-4 text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-blue-400">{summary.tiers.good}</p>
              <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full bg-blue-500" style={{ width: `${summary.significantCampaigns > 0 ? (summary.tiers.good / summary.significantCampaigns) * 100 : 0}%` }} />
              </div>
              <p className="text-[10px] text-gray-500 mt-1">of {summary.significantCampaigns} active campaigns</p>
            </Card>
            <Card>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-medium uppercase text-gray-500">Average (15-30% open)</span>
                <BarChart3 className="h-4 w-4 text-amber-400" />
              </div>
              <p className="text-2xl font-bold text-amber-400">{summary.tiers.average}</p>
              <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full bg-amber-500" style={{ width: `${summary.significantCampaigns > 0 ? (summary.tiers.average / summary.significantCampaigns) * 100 : 0}%` }} />
              </div>
              <p className="text-[10px] text-gray-500 mt-1">of {summary.significantCampaigns} active campaigns</p>
            </Card>
            <Card>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-medium uppercase text-gray-500">Poor (&lt;15% open)</span>
                <TrendingDown className="h-4 w-4 text-red-400" />
              </div>
              <p className="text-2xl font-bold text-red-400">{summary.tiers.poor}</p>
              <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full bg-red-500" style={{ width: `${summary.significantCampaigns > 0 ? (summary.tiers.poor / summary.significantCampaigns) * 100 : 0}%` }} />
              </div>
              <p className="text-[10px] text-gray-500 mt-1">of {summary.significantCampaigns} active campaigns</p>
            </Card>
          </div>

          {/* ═══ Section 4: Campaign Type & State Breakdown ═══ */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 mb-8">
            {/* By Type */}
            <Card>
              <CardHeader title="Performance by Campaign Type" subtitle="Triggered vs Blast comparison" />
              <div className="space-y-3">
                {Object.entries(summary.byType).map(([type, stats]) => {
                  const openRate = stats.delivered > 0 ? (stats.opens / stats.delivered) * 100 : 0;
                  const clickRate = stats.delivered > 0 ? (stats.clicks / stats.delivered) * 100 : 0;
                  const bounceRate = stats.sent > 0 ? (stats.bounced / stats.sent) * 100 : 0;
                  return (
                    <div key={type} className="rounded-lg border border-gray-200 p-4 bg-white/[0.01]">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-bold',
                            type === 'Triggered' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'
                          )}>
                            {type}
                          </span>
                          <span className="text-xs text-gray-500">{stats.count} campaigns</span>
                        </div>
                        <span className="text-xs text-gray-500">{formatNumber(stats.sent)} sent</span>
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                        <div>
                          <p className="text-[10px] text-gray-500">Open Rate</p>
                          <p className={cn('text-sm font-semibold', openRate >= 30 ? 'text-emerald-400' : openRate >= 15 ? 'text-amber-400' : 'text-red-400')}>
                            {formatPercent(openRate)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500">Click Rate</p>
                          <p className={cn('text-sm font-semibold', clickRate >= 5 ? 'text-emerald-400' : clickRate >= 2 ? 'text-amber-400' : 'text-red-400')}>
                            {formatPercent(clickRate)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500">Bounce Rate</p>
                          <p className={cn('text-sm font-semibold', bounceRate <= 2 ? 'text-emerald-400' : bounceRate <= 5 ? 'text-amber-400' : 'text-red-400')}>
                            {formatPercent(bounceRate)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500">Unsubs</p>
                          <p className="text-sm font-semibold text-gray-700">{formatNumber(stats.unsubs)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* By State */}
            <Card>
              <CardHeader title="Campaign Lifecycle" subtitle="Status distribution of all email campaigns" />
              <div className="space-y-2">
                {Object.entries(summary.byState)
                  .sort(([, a], [, b]) => b - a)
                  .map(([state, count]) => {
                    const pct = summary.totalCampaigns > 0 ? (count / summary.totalCampaigns) * 100 : 0;
                    const colorMap: Record<string, string> = {
                      Running: 'bg-emerald-500',
                      Ready: 'bg-blue-500',
                      Finished: 'bg-zinc-500',
                      Draft: 'bg-amber-500',
                      Archived: 'bg-zinc-600',
                    };
                    const textColorMap: Record<string, string> = {
                      Running: 'text-emerald-400',
                      Ready: 'text-blue-400',
                      Finished: 'text-gray-500',
                      Draft: 'text-amber-400',
                      Archived: 'text-gray-500',
                    };
                    return (
                      <div key={state} className="flex items-center gap-3">
                        <div className="w-20">
                          <span className={cn('text-xs font-medium', textColorMap[state] || 'text-gray-500')}>
                            {state}
                          </span>
                        </div>
                        <div className="flex-1 h-6 rounded-lg bg-gray-100 overflow-hidden relative">
                          <div
                            className={cn('h-full rounded-lg transition-all', colorMap[state] || 'bg-zinc-500')}
                            style={{ width: `${pct}%`, opacity: 0.6 }}
                          />
                          <span className="absolute inset-0 flex items-center px-3 text-[11px] font-medium text-gray-900">
                            {count} campaigns ({formatPercent(pct, 0)})
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Rankings quickview */}
              {rankings && (
                <div className="mt-6 border-t border-gray-200 pt-4">
                  <h4 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">🏆 Top Performers (by open rate)</h4>
                  <div className="space-y-1.5">
                    {rankings.bestByOpenRate.map((r, i) => (
                      <div key={r.id} className="flex items-center gap-2 text-xs">
                        <span className="w-5 text-right font-bold text-gray-500">{i + 1}.</span>
                        <span className="flex-1 text-gray-700 truncate">{r.name}</span>
                        <span className="text-emerald-400 font-semibold">{formatPercent(r.openRate || 0)}</span>
                        <span className="text-gray-400 text-[10px]">{formatNumber(r.sent)} sent</span>
                      </div>
                    ))}
                  </div>

                  <h4 className="text-xs font-semibold text-gray-500 mb-3 mt-4 uppercase tracking-wider">⚠️ Needs Attention (lowest open rate)</h4>
                  <div className="space-y-1.5">
                    {rankings.worstByOpenRate.map((r, i) => (
                      <div key={r.id} className="flex items-center gap-2 text-xs">
                        <span className="w-5 text-right font-bold text-gray-500">{i + 1}.</span>
                        <span className="flex-1 text-gray-700 truncate">{r.name}</span>
                        <span className="text-red-400 font-semibold">{formatPercent(r.openRate || 0)}</span>
                        <span className="text-gray-400 text-[10px]">{formatNumber(r.sent)} sent</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* ═══ Section 5: Full Campaign Table ═══ */}
          <Card className="mb-8">
            <CardHeader
              title="All Campaign Performance"
              subtitle={`${filteredCampaigns.length} campaigns with send data`}
              action={
                <div className="flex items-center gap-2">
                  <Filter className="h-3 w-3 text-gray-500" />
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as CampaignFilter)}
                    className="bg-gray-100 border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-700 focus:outline-none focus:border-brand-500"
                  >
                    <option value="all">All States</option>
                    <option value="Running">Running</option>
                    <option value="Finished">Finished</option>
                    <option value="Ready">Ready</option>
                    <option value="Draft">Draft</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              }
            />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700" onClick={() => handleSort('name')}>
                      Campaign <SortIcon field="name" />
                    </th>
                    <th className="py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Health</th>
                    <th className="py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700" onClick={() => handleSort('sent')}>
                      Sent <SortIcon field="sent" />
                    </th>
                    <th className="py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Delivered</th>
                    <th className="py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700" onClick={() => handleSort('openRate')}>
                      Open Rate <SortIcon field="openRate" />
                    </th>
                    <th className="py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700" onClick={() => handleSort('clickRate')}>
                      Click Rate <SortIcon field="clickRate" />
                    </th>
                    <th className="py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">CTOR</th>
                    <th className="py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700" onClick={() => handleSort('bounceRate')}>
                      Bounce <SortIcon field="bounceRate" />
                    </th>
                    <th className="py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700" onClick={() => handleSort('unsubRate')}>
                      Unsubs <SortIcon field="unsubRate" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayedCampaigns.map((c) => (
                    <tr key={c.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="py-3 text-left max-w-[280px]">
                        <p className="font-medium text-gray-800 truncate">{c.name}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{c.campaignState} · {c.createdBy}</p>
                      </td>
                      <td className="py-3 text-center">
                        <span className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-bold',
                          c.type === 'Triggered' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'
                        )}>
                          {c.type}
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        <HealthBadge openRate={c.openRate} bounceRate={c.bounceRate} />
                      </td>
                      <td className="py-3 text-right text-gray-700 font-medium">{formatNumber(c.metrics.totalSent)}</td>
                      <td className="py-3 text-right text-gray-500">{formatNumber(c.metrics.totalDelivered)}</td>
                      <td className={cn('py-3 text-right font-semibold', c.openRate >= 50 ? 'text-emerald-400' : c.openRate >= 30 ? 'text-blue-400' : c.openRate >= 15 ? 'text-amber-400' : 'text-red-400')}>
                        {formatPercent(c.openRate)}
                      </td>
                      <td className={cn('py-3 text-right font-semibold', c.clickRate >= 5 ? 'text-emerald-400' : c.clickRate >= 2 ? 'text-blue-400' : c.clickRate >= 0.5 ? 'text-amber-400' : 'text-red-400')}>
                        {formatPercent(c.clickRate)}
                      </td>
                      <td className="py-3 text-right text-gray-500">{formatPercent(c.clickToOpenRate)}</td>
                      <td className={cn('py-3 text-right', c.bounceRate > 10 ? 'text-red-400 font-semibold' : c.bounceRate > 5 ? 'text-amber-400' : 'text-gray-500')}>
                        {formatPercent(c.bounceRate)}
                      </td>
                      <td className="py-3 text-right text-gray-500">{formatNumber(c.metrics.totalUnsubscribes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredCampaigns.length > 25 && !showAll && (
              <div className="flex justify-center pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowAll(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-xs font-medium text-gray-500 hover:bg-gray-200 transition-colors"
                >
                  Show All {filteredCampaigns.length} Campaigns
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>
            )}
          </Card>

          {/* ═══ Section 6: Deliverability Insights ═══ */}
          <Card>
            <CardHeader title="📋 Deliverability & Health Summary" subtitle="Key takeaways from Iterable data" />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {/* Bounce Analysis */}
              <div className={cn(
                'rounded-lg p-4 border',
                summary.avgBounceRate > 5 ? 'border-red-500/20 bg-red-500/[0.03]' : 'border-gray-200 bg-gray-50'
              )}>
                <div className="flex items-center gap-2 mb-2">
                  <ShieldAlert className={cn('h-4 w-4', summary.avgBounceRate > 5 ? 'text-red-400' : 'text-emerald-400')} />
                  <span className="text-xs font-semibold text-gray-700">Bounce Rate Health</span>
                </div>
                <p className="text-lg font-bold text-gray-900">{formatPercent(summary.avgBounceRate)}</p>
                <p className="text-[11px] text-gray-500 mt-1">
                  {summary.totalBounced.toLocaleString()} total bounces across {formatNumber(summary.totalSent)} sends.
                  {summary.avgBounceRate > 10
                    ? ' ⚠️ Critical: High bounce rate hurts sender reputation. Clean your email list immediately.'
                    : summary.avgBounceRate > 5
                    ? ' ⚠️ Warning: Elevated bounce rate. Review email list hygiene.'
                    : ' ✅ Bounce rate is within healthy range.'}
                </p>
              </div>

              {/* Unsubscribe Analysis */}
              <div className={cn(
                'rounded-lg p-4 border',
                summary.avgUnsubRate > 1 ? 'border-amber-500/20 bg-amber-500/[0.03]' : 'border-gray-200 bg-gray-50'
              )}>
                <div className="flex items-center gap-2 mb-2">
                  <UserX className={cn('h-4 w-4', summary.avgUnsubRate > 1 ? 'text-amber-400' : 'text-emerald-400')} />
                  <span className="text-xs font-semibold text-gray-700">Unsubscribe Rate</span>
                </div>
                <p className="text-lg font-bold text-gray-900">{formatPercent(summary.avgUnsubRate)}</p>
                <p className="text-[11px] text-gray-500 mt-1">
                  {summary.totalUnsubs.toLocaleString()} total unsubscribes.
                  {summary.avgUnsubRate > 1
                    ? ' ⚠️ Above industry average (0.5%). Review email frequency and content relevance.'
                    : ' ✅ Unsubscribe rate is healthy and below industry average.'}
                </p>
              </div>

              {/* Engagement Quality */}
              <div className="rounded-lg p-4 border border-gray-200 bg-gray-50">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="h-4 w-4 text-blue-400" />
                  <span className="text-xs font-semibold text-gray-700">Open Rate Analysis</span>
                </div>
                <p className="text-lg font-bold text-gray-900">{formatPercent(summary.avgOpenRate)}</p>
                <p className="text-[11px] text-gray-500 mt-1">
                  {summary.totalUniqueOpens.toLocaleString()} unique opens from {formatNumber(summary.totalDelivered)} delivered.
                  {summary.avgOpenRate >= 30
                    ? ' ✅ Above health/wellness industry average (~25%). Strong subject line performance.'
                    : summary.avgOpenRate >= 20
                    ? ' Average for health/wellness industry. Test subject lines with A/B testing.'
                    : ' ⚠️ Below industry average. Prioritize subject line optimization and send time testing.'}
                </p>
              </div>

              {/* Click Engagement */}
              <div className="rounded-lg p-4 border border-gray-200 bg-gray-50">
                <div className="flex items-center gap-2 mb-2">
                  <MousePointer className="h-4 w-4 text-purple-400" />
                  <span className="text-xs font-semibold text-gray-700">Click-Through Analysis</span>
                </div>
                <p className="text-lg font-bold text-gray-900">{formatPercent(summary.avgClickRate)}</p>
                <p className="text-[11px] text-gray-500 mt-1">
                  {summary.totalUniqueClicks.toLocaleString()} unique clicks.
                  Click-to-open rate: {formatPercent(funnel.clickToOpenRate)}.
                  {summary.avgClickRate >= 3
                    ? ' ✅ Good CTR. Continue optimizing CTA placement and copy.'
                    : ' ⚠️ Low CTR suggests content or CTA issues. Review email templates for clearer calls to action.'}
                </p>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
