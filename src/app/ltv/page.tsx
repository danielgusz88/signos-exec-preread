'use client';

import { Card, CardHeader, MetricCard } from '@/components/ui/card';
import { DataSourceRequired, EmptySection } from '@/components/ui/data-source-required';
import { cn, formatPercent, formatNumber, formatCompact, formatCurrency } from '@/lib/utils';
import {
  Calculator,
  Loader2,
  RefreshCw,
  DollarSign,
  Repeat,
  TrendingUp,
  Users,
  Lightbulb,
  ShoppingBag,
  BarChart3,
  ArrowUpDown,
  Package,
  ChevronDown,
  ChevronUp,
  Table2,
  BookOpen,
  Sigma,
  GitBranch,
  Info,
} from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// ── Interfaces ─────────────────────────────────────────────────────────────────

interface ModeData {
  connected: boolean;
  error?: string;
  kpis?: {
    activeSubscribers: number;
    currentMRR: number;
    peakMRR: number;
    renewalRate: number;
    avgChurn3Month: number;
    totalLifetimeUsers: number;
    customerConversionRate: number;
  };
  churn?: {
    planBreakdown: Array<{ plan: string; activeCount: number; label: string }>;
    monthlyChurn: Array<{
      month: string;
      newSubs: number;
      lostSubs: number;
      activeEnd: number;
      activeStart: number;
      churnRate: number;
    }>;
  };
  mrr?: {
    monthlyMRR: Array<{ month: string; mrr: number; plans?: Record<string, number> }>;
    currentMRR: number;
    peakMRR: number;
  };
  renewal?: {
    monthlyRenewal: Array<{
      month: string;
      upForRenewal: number;
      renewed: number;
      renewalRate: number;
    }>;
    overallRenewalRate: number;
    totalUpForRenewal: number;
    totalRenewed: number;
  };
}

interface ShopifyData {
  connected: boolean;
  error?: string;
  shopifyRevenue?: {
    monthlyData: Array<{
      month: string;
      orderCount: number;
      uniqueCustomers: number;
      totalRevenue: number;
      avgOrderValue: number;
      products: Record<string, { orders: number; revenue: number }>;
    }>;
    currentMonth: { month: string; revenue: number; orders: number; customers: number; aov: number };
    previousMonth: { month: string; revenue: number; orders: number };
    revenueChange: number;
    totalAllTimeRevenue: number;
  };
  ltvByCohort?: {
    cohorts: Array<{
      cohortMonth: string;
      cohortSize: number;
      payingUsers: number;
      totalRevenue: number;
      avgLTV: number;
      medianLTV: number;
      avgLifetimeMonths: number;
      avgInvoicesPerUser: number;
      churnedUsers: number;
      churnRatePct: number;
    }>;
    overallLTV: number;
    recentAvgLTV: number;
    totalUsers: number;
    totalRevenue: number;
    ltvTrend: number;
    avgLifetimeMonths: number;
  };
  subscriptionRevenue?: {
    monthlyData: Array<{
      month: string;
      totalRevenue: number;
      invoiceCount: number;
      uniqueUsers: number;
      arpu: number;
      byPlan: Record<string, { revenue: number; count: number }>;
      byContext: Record<string, { revenue: number; count: number }>;
    }>;
    latestRevenue: number;
    latestARPU: number;
    newVsRenewal: { newRevenue: number; renewalRevenue: number; renewalPct: number };
  };
  shopifyProducts?: {
    categories: Array<{ name: string; revenue: number; orders: number; buyers: number }>;
    totalProducts: number;
    totalRevenue: number;
  };
  userJourney?: {
    monthlyData: Array<{
      month: string;
      totalUsers: number;
      byStatus: Record<string, number>;
      avgDaysActive: number | null;
      churnedPct: number;
    }>;
    overallStatus: Record<string, number>;
    totalTracked: number;
  };
}

const COLORS = ['#8b5cf6', '#10b981', '#06b6d4', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6'];

function ChartTooltipContent({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-white/95 border border-gray-200 px-3 py-2 text-xs shadow-xl">
      <p className="font-medium text-gray-700 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-medium text-gray-900">
            {formatter ? formatter(p.value) : typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// Collapsible section component
function CollapsibleSection({
  title,
  subtitle,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">{title}</span>
          {badge && (
            <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[9px] font-bold text-violet-400 border border-violet-500/20">
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {subtitle && <span className="text-[10px] text-gray-500 hidden md:block">{subtitle}</span>}
          {open ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
        </div>
      </button>
      {open && <div className="px-4 pb-4 border-t border-gray-200">{children}</div>}
    </div>
  );
}

// Formula step component
function FormulaStep({
  step,
  label,
  formula,
  result,
  explanation,
  highlight,
}: {
  step: number;
  label: string;
  formula: React.ReactNode;
  result: string;
  explanation: string;
  highlight?: boolean;
}) {
  return (
    <div className={cn(
      'rounded-lg border p-3',
      highlight
        ? 'border-emerald-500/20 bg-emerald-500/[0.03]'
        : 'border-gray-200 bg-white/[0.01]'
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold',
          highlight
            ? 'bg-emerald-500/20 text-emerald-400'
            : 'bg-gray-100 text-gray-500'
        )}>
          {step}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-700 mb-1">{label}</p>
          <div className="font-mono text-xs leading-relaxed mb-1.5">{formula}</div>
          <div className="flex items-center justify-between">
            <span className={cn(
              'font-mono font-bold text-sm',
              highlight ? 'text-emerald-400' : 'text-gray-900'
            )}>
              = {result}
            </span>
          </div>
          <p className="text-[10px] text-gray-500 mt-1">{explanation}</p>
        </div>
      </div>
    </div>
  );
}

export default function LTVPage() {
  const [modeData, setModeData] = useState<ModeData | null>(null);
  const [shopifyData, setShopifyData] = useState<ShopifyData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [modeRes, shopifyRes] = await Promise.all([
        fetch('/api/data/mode').then(r => r.json()).catch(() => ({ connected: false })),
        fetch('/api/data/mode-shopify').then(r => r.json()).catch(() => ({ connected: false })),
      ]);
      setModeData(modeRes);
      setShopifyData(shopifyRes);
    } catch {
      setModeData({ connected: false, error: 'Failed to fetch' });
      setShopifyData({ connected: false, error: 'Failed to fetch' });
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const modeConnected = modeData?.connected === true;
  const shopifyConnected = shopifyData?.connected === true;
  const isConnected = modeConnected || shopifyConnected;

  const kpis = modeData?.kpis;
  const mrr = modeData?.mrr;
  const renewal = modeData?.renewal;
  const churnData = modeData?.churn;
  const planBreakdown = churnData?.planBreakdown || [];

  const ltv = shopifyData?.ltvByCohort;
  const shopRevenue = shopifyData?.shopifyRevenue;
  const subRevenue = shopifyData?.subscriptionRevenue;
  const products = shopifyData?.shopifyProducts;
  const journey = shopifyData?.userJourney;

  // ── ARPU-based LTV Calculation (with intermediate values) ──────────────
  const currentMRR = kpis?.currentMRR || 0;
  const activeSubs = kpis?.activeSubscribers || 0;
  const arpu = activeSubs > 0 ? currentMRR / activeSubs : 0;
  const avgChurn3Month = kpis?.avgChurn3Month || 0;
  const avgLifetimeMonths = avgChurn3Month > 0 ? 100 / avgChurn3Month : 0;
  const estimatedRevenueLTV = arpu * avgLifetimeMonths;

  // Churn rate detail for last 3 months
  const recentChurnMonths = useMemo(() => {
    if (!churnData?.monthlyChurn) return [];
    const valid = churnData.monthlyChurn.filter(m => m.activeStart > 0);
    return valid.slice(-3);
  }, [churnData]);

  // ── Cohort-based LTV Calculation ──────────────────────────────────────
  const actualLTV = ltv?.overallLTV || 0;
  const recentLTV = ltv?.recentAvgLTV || 0;
  const totalCohortUsers = ltv?.totalUsers || 0;
  const totalCohortRevenue = ltv?.totalRevenue || 0;

  // ── Subscription revenue breakdown by plan ────────────────────────────
  const latestSubMonth = useMemo(() => {
    if (!subRevenue?.monthlyData?.length) return null;
    return subRevenue.monthlyData[subRevenue.monthlyData.length - 1];
  }, [subRevenue]);

  const planRevenueBreakdown = useMemo(() => {
    if (!latestSubMonth?.byPlan) return [];
    return Object.entries(latestSubMonth.byPlan)
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .map(([plan, data]) => ({
        plan,
        revenue: data.revenue,
        count: data.count,
        arpu: data.count > 0 ? data.revenue / data.count : 0,
      }));
  }, [latestSubMonth]);

  // ── LTV Sensitivity ───────────────────────────────────────────────────
  const sensitivityData = useMemo(() => {
    if (!arpu || !avgChurn3Month) return [];
    const churnSteps = [-2, -1, 0, 1, 2]; // percentage point changes
    const arpuSteps = [-20, -10, 0, 10, 20]; // dollar changes
    const rows: Array<{
      churnDelta: number;
      newChurn: number;
      arpuDelta: number;
      newArpu: number;
      newLifespan: number;
      newLTV: number;
      ltvDelta: number;
      ltvDeltaPct: number;
    }> = [];

    for (const cd of churnSteps) {
      for (const ad of arpuSteps) {
        const newChurn = Math.max(0.5, avgChurn3Month + cd);
        const newArpu = Math.max(0, arpu + ad);
        const newLifespan = newChurn > 0 ? 100 / newChurn : 0;
        const newLTV = newArpu * newLifespan;
        rows.push({
          churnDelta: cd,
          newChurn,
          arpuDelta: ad,
          newArpu,
          newLifespan,
          newLTV,
          ltvDelta: newLTV - estimatedRevenueLTV,
          ltvDeltaPct: estimatedRevenueLTV > 0 ? ((newLTV - estimatedRevenueLTV) / estimatedRevenueLTV) * 100 : 0,
        });
      }
    }
    return rows;
  }, [arpu, avgChurn3Month, estimatedRevenueLTV]);

  // ── Chart data ────────────────────────────────────────────────────────
  const cohortChartData = (ltv?.cohorts || [])
    .slice(-24)
    .map(c => ({
      month: c.cohortMonth.slice(2),
      avgLTV: Math.round(c.avgLTV),
      medianLTV: Math.round(c.medianLTV),
      cohortSize: c.cohortSize,
      churnPct: c.churnRatePct,
    }));

  const revenueChartData = (shopRevenue?.monthlyData || [])
    .slice(0, 12)
    .reverse()
    .map(m => ({
      month: m.month.slice(2),
      revenue: Math.round(m.totalRevenue),
      orders: m.orderCount,
      aov: Math.round(m.avgOrderValue),
    }));

  const subRevenueChartData = (subRevenue?.monthlyData || [])
    .slice(-12)
    .map(m => ({
      month: m.month.slice(2),
      revenue: Math.round(m.totalRevenue),
      arpu: Math.round(m.arpu),
      users: m.uniqueUsers,
    }));

  const productPieData = (products?.categories || [])
    .slice(0, 6)
    .map((c, i) => ({
      name: c.name,
      value: Math.round(c.revenue),
      color: COLORS[i % COLORS.length],
    }));

  const statusData = journey?.overallStatus
    ? Object.entries(journey.overallStatus)
        .sort(([, a], [, b]) => b - a)
        .map(([status, count], i) => ({
          name: status,
          value: count,
          color: COLORS[i % COLORS.length],
        }))
    : [];

  return (
    <div className="p-6 pb-20">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-gray-900">LTV Deep Dive</h1>
          <span className="rounded-full bg-violet-500/10 px-2.5 py-0.5 text-[10px] font-bold text-violet-400 border border-violet-500/20">
            UNIT ECONOMICS
          </span>
          {modeConnected && (
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
              MODE LIVE
            </span>
          )}
          {shopifyConnected && (
            <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-bold text-blue-400 border border-blue-500/20">
              SHOPIFY + SNOWFLAKE
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500">
          Revenue LTV by cohort, Shopify revenue, subscription economics, and customer journey analysis — powered by Snowflake via Mode Analytics
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 text-brand-400 animate-spin" />
          <span className="ml-3 text-sm text-gray-500">Loading real-time data from Mode Analytics & Snowflake...</span>
        </div>
      )}

      {/* Not connected at all */}
      {!loading && !isConnected && (
        <DataSourceRequired
          title="LTV Deep Dive — Connect Mode Analytics to unlock all metrics"
          description="This page requires Mode Analytics credentials to access Snowflake data (subscriptions, Shopify orders, customer journey)."
          className="mb-8"
          sources={[
            {
              name: 'Mode Analytics (Snowflake)',
              description: 'Subscription revenue, Shopify orders, LTV by cohort, customer journey, product usage',
              envVars: ['MODE_API_TOKEN', 'MODE_API_SECRET', 'MODE_WORKSPACE'],
              status: 'not_configured',
            },
          ]}
        />
      )}

      {/* Connected — show data */}
      {!loading && isConnected && (
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

          {/* ═══ Top KPI Row ═══ */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-5 mb-8">
            <MetricCard
              label={ltv ? "Actual Avg LTV" : "Est. Revenue LTV"}
              value={ltv ? formatCompact(actualLTV) : formatCompact(estimatedRevenueLTV)}
              icon={<DollarSign className="h-5 w-5" />}
              valueColor="text-emerald-400"
              trend={ltv?.ltvTrend}
              trendLabel="vs 12mo ago"
            />
            <MetricCard
              label="Recent 6mo Avg LTV"
              value={recentLTV > 0 ? formatCompact(recentLTV) : formatCompact(arpu)}
              icon={<TrendingUp className="h-5 w-5" />}
              valueColor="text-violet-400"
            />
            <MetricCard
              label="Avg Customer Lifespan"
              value={ltv?.avgLifetimeMonths ? `${ltv.avgLifetimeMonths} mo` : `${avgLifetimeMonths.toFixed(1)} mo`}
              icon={<Users className="h-5 w-5" />}
            />
            <MetricCard
              label="Shopify Revenue (Current)"
              value={shopRevenue ? formatCompact(shopRevenue.currentMonth.revenue) : '—'}
              icon={<ShoppingBag className="h-5 w-5" />}
              trend={shopRevenue?.revenueChange}
              trendLabel="vs prior mo"
            />
            <MetricCard
              label="Current MRR"
              value={kpis ? formatCompact(kpis.currentMRR) : '—'}
              icon={<DollarSign className="h-5 w-5" />}
            />
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              LTV CALCULATION METHODOLOGY — The core new section
              ═══════════════════════════════════════════════════════════════════ */}
          <Card className="mb-8 border-brand-500/20 bg-gradient-to-br from-brand-500/[0.02] to-transparent">
            <CardHeader
              title="LTV Calculation Methodology"
              subtitle="Complete traceable breakdown of how LTV is calculated — reproduce these numbers yourself"
              action={
                <span className="rounded-full bg-brand-500/10 px-2.5 py-0.5 text-[10px] font-bold text-brand-400 border border-brand-500/20">
                  <BookOpen className="inline h-3 w-3 mr-1" />
                  METHODOLOGY
                </span>
              }
            />

            {/* Overview panel */}
            <div className="rounded-lg bg-black/40 border border-gray-200 p-4 mb-5">
              <div className="flex items-start gap-3 mb-3">
                <Info className="h-4 w-4 text-brand-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-gray-500 space-y-1">
                  <p className="text-gray-700 font-medium">Two methods are used to calculate LTV. Both are shown below with real numbers so you can verify each step.</p>
                  <p><span className="text-violet-400 font-semibold">Method A (ARPU-Based)</span> uses current subscription data: <span className="text-gray-900 font-mono">LTV = ARPU × (1 / Monthly Churn Rate)</span>. Best for quick estimation based on current operating metrics.</p>
                  <p><span className="text-emerald-400 font-semibold">Method B (Cohort-Based)</span> uses actual historical invoice data grouped by signup month: <span className="text-gray-900 font-mono">LTV = Total Cohort Revenue / Cohort Size</span>. More accurate as it reflects real customer payment behavior.</p>
                </div>
              </div>
              {ltv && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="rounded-lg bg-violet-500/[0.05] border border-violet-500/10 p-3 text-center">
                    <p className="text-[9px] font-bold text-violet-400 tracking-wider mb-1">METHOD A: ARPU-BASED</p>
                    <p className="text-xl font-bold text-gray-900">{formatCompact(estimatedRevenueLTV)}</p>
                    <p className="text-[10px] text-gray-500">Estimated from current metrics</p>
                  </div>
                  <div className="rounded-lg bg-emerald-500/[0.05] border border-emerald-500/10 p-3 text-center">
                    <p className="text-[9px] font-bold text-emerald-400 tracking-wider mb-1">METHOD B: COHORT-BASED</p>
                    <p className="text-xl font-bold text-gray-900">{formatCompact(actualLTV)}</p>
                    <p className="text-[10px] text-gray-500">Actual from {formatNumber(totalCohortUsers)} users</p>
                  </div>
                </div>
              )}
            </div>

            {/* ── Method A: ARPU-Based Step-by-Step ────────────────────────── */}
            <div className="space-y-4">
              <CollapsibleSection
                title="Method A: ARPU-Based LTV"
                subtitle="LTV = ARPU × (1 / Monthly Churn Rate)"
                badge="STEP-BY-STEP"
                defaultOpen={true}
              >
                <div className="space-y-3 mt-3">
                  <FormulaStep
                    step={1}
                    label="Current Monthly Recurring Revenue (MRR)"
                    formula={
                      <span>
                        <span className="text-gray-500">MRR = </span>
                        <span className="text-violet-400">Sum of all subscription revenue in latest month</span>
                      </span>
                    }
                    result={formatCurrency(currentMRR)}
                    explanation={`Source: Mode Analytics → MRR dataset (WEIGHT_AVG column summed across all plans for ${mrr?.monthlyMRR?.[mrr.monthlyMRR.length - 1]?.month || 'latest month'})`}
                  />

                  <FormulaStep
                    step={2}
                    label="Active Subscribers"
                    formula={
                      <span>
                        <span className="text-gray-500">Active Subs = </span>
                        <span className="text-blue-400">Count of users with ACTIVE_AT_END_OF_MONTH = 1 in latest month</span>
                      </span>
                    }
                    result={formatNumber(activeSubs)}
                    explanation="Source: Mode Analytics → CHURN_BY_PAYMENT_CAPTURE dataset (latest month's ACTIVE_AT_END_OF_MONTH field)"
                  />

                  <FormulaStep
                    step={3}
                    label="Average Revenue Per User (ARPU)"
                    formula={
                      <span>
                        <span className="text-gray-500">ARPU = MRR ÷ Active Subs = </span>
                        <span className="text-violet-400">{formatCurrency(currentMRR)}</span>
                        <span className="text-gray-500"> ÷ </span>
                        <span className="text-blue-400">{formatNumber(activeSubs)}</span>
                      </span>
                    }
                    result={`${formatCurrency(Math.round(arpu * 100) / 100)}/mo`}
                    explanation="This is the blended ARPU across all subscription plans. See the plan-level decomposition below."
                  />

                  <FormulaStep
                    step={4}
                    label="Monthly Churn Rate (3-Month Trailing Average)"
                    formula={
                      <span>
                        <span className="text-gray-500">Churn Rate = Avg of last 3 months = (</span>
                        {recentChurnMonths.map((m, i) => (
                          <span key={m.month}>
                            <span className="text-red-400">{m.churnRate.toFixed(2)}%</span>
                            {i < recentChurnMonths.length - 1 && <span className="text-gray-500"> + </span>}
                          </span>
                        ))}
                        <span className="text-gray-500">) ÷ {recentChurnMonths.length}</span>
                      </span>
                    }
                    result={formatPercent(avgChurn3Month, 2)}
                    explanation={`Source: CHURN_BY_PAYMENT_CAPTURE → each month's churn = LOST_SUBSCRIPTION ÷ ACTIVE_AT_END_OF_PRIOR_MONTH. Months: ${recentChurnMonths.map(m => m.month).join(', ')}`}
                  />

                  {/* Show trailing churn detail */}
                  {recentChurnMonths.length > 0 && (
                    <div className="ml-9 rounded-lg bg-black/30 border border-gray-200 p-3">
                      <p className="text-[9px] font-bold text-gray-500 tracking-wider mb-2">CHURN RATE — MONTHLY DETAIL</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-gray-500">
                              <th className="text-left pb-1 pr-4 font-medium">Month</th>
                              <th className="text-right pb-1 pr-4 font-medium">Active (Start)</th>
                              <th className="text-right pb-1 pr-4 font-medium">Lost</th>
                              <th className="text-right pb-1 pr-4 font-medium">New</th>
                              <th className="text-right pb-1 pr-4 font-medium">Active (End)</th>
                              <th className="text-right pb-1 font-medium">Churn Rate</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recentChurnMonths.map(m => (
                              <tr key={m.month} className="border-t border-gray-200">
                                <td className="py-1.5 pr-4 text-gray-700 font-mono">{m.month}</td>
                                <td className="py-1.5 pr-4 text-right text-gray-500 font-mono">{formatNumber(m.activeStart)}</td>
                                <td className="py-1.5 pr-4 text-right text-red-400 font-mono">{formatNumber(m.lostSubs)}</td>
                                <td className="py-1.5 pr-4 text-right text-emerald-400 font-mono">+{formatNumber(m.newSubs)}</td>
                                <td className="py-1.5 pr-4 text-right text-gray-700 font-mono">{formatNumber(m.activeEnd)}</td>
                                <td className="py-1.5 text-right font-mono font-semibold">
                                  <span className={m.churnRate > avgChurn3Month ? 'text-red-400' : 'text-amber-400'}>
                                    {m.churnRate.toFixed(2)}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                            <tr className="border-t border-gray-200">
                              <td className="py-1.5 pr-4 text-gray-700 font-semibold" colSpan={5}>3-Month Average</td>
                              <td className="py-1.5 text-right font-mono font-bold text-gray-900">{formatPercent(avgChurn3Month, 2)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <p className="text-[9px] text-gray-400 mt-2">
                        Formula: Churn Rate = Lost Subscriptions ÷ Active at Start of Month × 100
                      </p>
                    </div>
                  )}

                  <FormulaStep
                    step={5}
                    label="Average Customer Lifespan"
                    formula={
                      <span>
                        <span className="text-gray-500">Lifespan = 1 ÷ Churn Rate = 1 ÷ </span>
                        <span className="text-red-400">{(avgChurn3Month / 100).toFixed(4)}</span>
                      </span>
                    }
                    result={`${avgLifetimeMonths.toFixed(1)} months`}
                    explanation="This is the expected number of months a customer remains active, assuming constant churn. Formula: 1 / (churn rate as decimal)"
                  />

                  <FormulaStep
                    step={6}
                    label="Estimated Revenue LTV"
                    formula={
                      <span>
                        <span className="text-gray-500">LTV = ARPU × Lifespan = </span>
                        <span className="text-violet-400">{formatCurrency(Math.round(arpu * 100) / 100)}</span>
                        <span className="text-gray-500"> × </span>
                        <span className="text-blue-400">{avgLifetimeMonths.toFixed(1)} months</span>
                      </span>
                    }
                    result={formatCurrency(Math.round(estimatedRevenueLTV))}
                    explanation="This is the estimated total revenue generated per customer over their expected lifetime. This does not account for costs (COGS, marketing), so it is a gross revenue LTV."
                    highlight
                  />
                </div>
              </CollapsibleSection>

              {/* ── Method B: Cohort-Based LTV ─────────────────────────────── */}
              {ltv && (
                <CollapsibleSection
                  title="Method B: Cohort-Based LTV (Actual)"
                  subtitle={`${formatNumber(totalCohortUsers)} users across ${ltv.cohorts.length} cohorts`}
                  badge="ACTUAL DATA"
                  defaultOpen={true}
                >
                  <div className="space-y-3 mt-3">
                    <FormulaStep
                      step={1}
                      label="Group Users by Signup Month (Cohort)"
                      formula={
                        <span>
                          <span className="text-gray-500">Cohorts = </span>
                          <span className="text-cyan-400">{ltv.cohorts.length} monthly cohorts</span>
                          <span className="text-gray-500"> from </span>
                          <span className="text-gray-900">{ltv.cohorts[0]?.cohortMonth || '?'}</span>
                          <span className="text-gray-500"> to </span>
                          <span className="text-gray-900">{ltv.cohorts[ltv.cohorts.length - 1]?.cohortMonth || '?'}</span>
                        </span>
                      }
                      result={`${formatNumber(totalCohortUsers)} total users`}
                      explanation="Source: Snowflake → Users are bucketed by their first invoice month (signup cohort). Each cohort tracks all revenue generated by those users."
                    />

                    <FormulaStep
                      step={2}
                      label="Sum Total Revenue Across All Cohorts"
                      formula={
                        <span>
                          <span className="text-gray-500">Total Revenue = Σ Cohort Revenue = </span>
                          <span className="text-emerald-400">{formatCurrency(Math.round(totalCohortRevenue))}</span>
                        </span>
                      }
                      result={formatCurrency(Math.round(totalCohortRevenue))}
                      explanation="Source: Snowflake invoices table → SUM(total_in_cents / 100) grouped by cohort month. Includes all subscription and one-time invoice revenue."
                    />

                    <FormulaStep
                      step={3}
                      label="Overall Average LTV"
                      formula={
                        <span>
                          <span className="text-gray-500">Avg LTV = Total Revenue ÷ Total Users = </span>
                          <span className="text-emerald-400">{formatCurrency(Math.round(totalCohortRevenue))}</span>
                          <span className="text-gray-500"> ÷ </span>
                          <span className="text-cyan-400">{formatNumber(totalCohortUsers)}</span>
                        </span>
                      }
                      result={formatCurrency(Math.round(actualLTV))}
                      explanation="This is the actual average revenue per user across all historical cohorts. Note: older cohorts have longer observation windows, so they naturally have higher LTVs."
                      highlight
                    />

                    <FormulaStep
                      step={4}
                      label="Recent 6-Month Average LTV"
                      formula={
                        <span>
                          <span className="text-gray-500">Recent LTV = Avg of last 6 cohort LTVs = (</span>
                          {ltv.cohorts.slice(-6).map((c, i) => (
                            <span key={c.cohortMonth}>
                              <span className="text-violet-400">${Math.round(c.avgLTV)}</span>
                              {i < 5 && <span className="text-gray-400"> + </span>}
                            </span>
                          ))}
                          <span className="text-gray-500">) ÷ 6</span>
                        </span>
                      }
                      result={formatCurrency(Math.round(recentLTV))}
                      explanation="Recent cohorts may still be accumulating revenue (not fully matured). This represents the minimum expected LTV — it will grow as these cohorts age."
                    />

                    <FormulaStep
                      step={5}
                      label="Average Customer Lifetime (from cohort data)"
                      formula={
                        <span>
                          <span className="text-gray-500">Avg Lifetime = Mean of per-cohort AVG_LIFETIME_MONTHS</span>
                        </span>
                      }
                      result={`${ltv.avgLifetimeMonths} months`}
                      explanation="Source: Snowflake → AVG(DATEDIFF('month', first_invoice, last_invoice)) per user, then averaged across cohorts. Indicates how long the average customer keeps paying."
                    />
                  </div>
                </CollapsibleSection>
              )}

              {/* ── ARPU Decomposition by Plan ─────────────────────────────── */}
              {planRevenueBreakdown.length > 0 && (
                <CollapsibleSection
                  title="ARPU Decomposition by Subscription Plan"
                  subtitle={`${latestSubMonth?.month || 'Latest month'} · ${planRevenueBreakdown.length} plans`}
                  badge="PLAN DETAIL"
                  defaultOpen={false}
                >
                  <div className="mt-3">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-500 border-b border-gray-200">
                            <th className="text-left pb-2 pr-4 font-medium">Plan</th>
                            <th className="text-right pb-2 pr-4 font-medium">Revenue</th>
                            <th className="text-right pb-2 pr-4 font-medium">Invoices</th>
                            <th className="text-right pb-2 pr-4 font-medium">ARPU</th>
                            <th className="text-right pb-2 font-medium">% of Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {planRevenueBreakdown.map(p => {
                            const totalRev = planRevenueBreakdown.reduce((s, x) => s + x.revenue, 0);
                            const pct = totalRev > 0 ? (p.revenue / totalRev) * 100 : 0;
                            return (
                              <tr key={p.plan} className="border-t border-gray-200">
                                <td className="py-1.5 pr-4 text-gray-700">{p.plan}</td>
                                <td className="py-1.5 pr-4 text-right text-gray-900 font-mono">{formatCurrency(Math.round(p.revenue))}</td>
                                <td className="py-1.5 pr-4 text-right text-gray-500 font-mono">{formatNumber(p.count)}</td>
                                <td className="py-1.5 pr-4 text-right text-violet-400 font-mono">{formatCurrency(Math.round(p.arpu))}</td>
                                <td className="py-1.5 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <div className="w-16 h-1.5 rounded bg-gray-100 overflow-hidden">
                                      <div className="h-full rounded bg-violet-500/60" style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="text-gray-500 font-mono w-10 text-right">{pct.toFixed(1)}%</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-gray-200">
                            <td className="pt-2 pr-4 text-gray-700 font-semibold">Total</td>
                            <td className="pt-2 pr-4 text-right text-gray-900 font-mono font-semibold">
                              {formatCurrency(Math.round(planRevenueBreakdown.reduce((s, p) => s + p.revenue, 0)))}
                            </td>
                            <td className="pt-2 pr-4 text-right text-gray-500 font-mono font-semibold">
                              {formatNumber(planRevenueBreakdown.reduce((s, p) => s + p.count, 0))}
                            </td>
                            <td className="pt-2 pr-4 text-right text-violet-400 font-mono font-semibold">
                              {formatCurrency(Math.round(latestSubMonth?.arpu || 0))}
                            </td>
                            <td className="pt-2 text-right text-gray-500 font-mono font-semibold">100.0%</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    <p className="text-[9px] text-gray-400 mt-3">
                      Source: Snowflake → invoices table, grouped by SUBSCRIPTION_PLAN_INVOICED. ARPU = Revenue ÷ Invoice Count per plan. 
                      Blended ARPU = Total Revenue ÷ Unique Users in month.
                    </p>
                  </div>
                </CollapsibleSection>
              )}

              {/* ── Cohort Detail Table ────────────────────────────────────── */}
              {ltv && ltv.cohorts.length > 0 && (
                <CollapsibleSection
                  title="Cohort Detail Table"
                  subtitle={`${ltv.cohorts.length} cohorts · sortable`}
                  badge="RAW DATA"
                  defaultOpen={false}
                >
                  <div className="mt-3">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-500 border-b border-gray-200">
                            <th className="text-left pb-2 pr-3 font-medium">Cohort</th>
                            <th className="text-right pb-2 pr-3 font-medium">Size</th>
                            <th className="text-right pb-2 pr-3 font-medium">Paying</th>
                            <th className="text-right pb-2 pr-3 font-medium">Revenue</th>
                            <th className="text-right pb-2 pr-3 font-medium">Avg LTV</th>
                            <th className="text-right pb-2 pr-3 font-medium">Median LTV</th>
                            <th className="text-right pb-2 pr-3 font-medium">Avg Life (mo)</th>
                            <th className="text-right pb-2 pr-3 font-medium">Invoices/User</th>
                            <th className="text-right pb-2 pr-3 font-medium">Churned</th>
                            <th className="text-right pb-2 font-medium">Churn %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ltv.cohorts.map(c => (
                            <tr key={c.cohortMonth} className="border-t border-gray-200 hover:bg-gray-50">
                              <td className="py-1.5 pr-3 text-gray-700 font-mono">{c.cohortMonth}</td>
                              <td className="py-1.5 pr-3 text-right text-gray-500 font-mono">{formatNumber(c.cohortSize)}</td>
                              <td className="py-1.5 pr-3 text-right text-gray-500 font-mono">{formatNumber(c.payingUsers)}</td>
                              <td className="py-1.5 pr-3 text-right text-gray-900 font-mono">{formatCurrency(Math.round(c.totalRevenue))}</td>
                              <td className="py-1.5 pr-3 text-right text-emerald-400 font-mono font-semibold">{formatCurrency(Math.round(c.avgLTV))}</td>
                              <td className="py-1.5 pr-3 text-right text-violet-400 font-mono">{formatCurrency(Math.round(c.medianLTV))}</td>
                              <td className="py-1.5 pr-3 text-right text-gray-500 font-mono">{c.avgLifetimeMonths.toFixed(1)}</td>
                              <td className="py-1.5 pr-3 text-right text-gray-500 font-mono">{c.avgInvoicesPerUser.toFixed(1)}</td>
                              <td className="py-1.5 pr-3 text-right text-red-400 font-mono">{formatNumber(c.churnedUsers)}</td>
                              <td className="py-1.5 text-right font-mono">
                                <span className={cn(
                                  c.churnRatePct > 70 ? 'text-red-400' : c.churnRatePct > 50 ? 'text-amber-400' : 'text-emerald-400'
                                )}>
                                  {c.churnRatePct.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-gray-200">
                            <td className="pt-2 pr-3 text-gray-700 font-semibold">Overall</td>
                            <td className="pt-2 pr-3 text-right text-gray-900 font-mono font-semibold">{formatNumber(totalCohortUsers)}</td>
                            <td className="pt-2 pr-3 text-right text-gray-500 font-mono">—</td>
                            <td className="pt-2 pr-3 text-right text-gray-900 font-mono font-semibold">{formatCurrency(Math.round(totalCohortRevenue))}</td>
                            <td className="pt-2 pr-3 text-right text-emerald-400 font-mono font-semibold">{formatCurrency(Math.round(actualLTV))}</td>
                            <td className="pt-2 pr-3 text-right text-violet-400 font-mono">—</td>
                            <td className="pt-2 pr-3 text-right text-gray-500 font-mono">{ltv.avgLifetimeMonths}</td>
                            <td className="pt-2 pr-3 text-right text-gray-500 font-mono">—</td>
                            <td className="pt-2 pr-3 text-right text-gray-500 font-mono">—</td>
                            <td className="pt-2 text-right text-gray-500 font-mono">—</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    <div className="mt-3 text-[9px] text-gray-400 space-y-0.5">
                      <p><strong>Cohort:</strong> Month of user's first subscription invoice</p>
                      <p><strong>Size:</strong> Total users who signed up in that month</p>
                      <p><strong>Paying:</strong> Users with at least one paid invoice</p>
                      <p><strong>Revenue:</strong> SUM(total_in_cents / 100) for all invoices from that cohort</p>
                      <p><strong>Avg LTV:</strong> Revenue ÷ Cohort Size (includes users who never paid)</p>
                      <p><strong>Median LTV:</strong> Median of per-user revenue in the cohort (more robust to outliers)</p>
                      <p><strong>Avg Life:</strong> AVG(months between first and last invoice) per user</p>
                      <p><strong>Invoices/User:</strong> AVG(number of invoices) per user in cohort</p>
                      <p><strong>Churned:</strong> Users whose subscription ended (status = &apos;expired&apos; or &apos;canceled&apos;)</p>
                      <p><strong>Churn %:</strong> Churned Users ÷ Cohort Size × 100</p>
                    </div>
                  </div>
                </CollapsibleSection>
              )}

              {/* ── LTV Sensitivity Table ──────────────────────────────────── */}
              {sensitivityData.length > 0 && (
                <CollapsibleSection
                  title="LTV Sensitivity Analysis"
                  subtitle="How LTV changes with different churn rates and ARPU values"
                  badge="WHAT-IF"
                  defaultOpen={false}
                >
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-3">
                      This table shows how the ARPU-based LTV changes when you vary the monthly churn rate (rows) and ARPU (columns).
                      The highlighted cell is the current state. Green cells indicate higher LTV, red cells indicate lower.
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr>
                            <th className="text-left pb-2 pr-2 text-gray-500 font-medium">
                              <span className="text-[9px]">Churn \ ARPU →</span>
                            </th>
                            {[-20, -10, 0, 10, 20].map(ad => {
                              const a = Math.max(0, arpu + ad);
                              return (
                                <th key={ad} className={cn(
                                  'text-center pb-2 px-1 font-medium',
                                  ad === 0 ? 'text-gray-900 bg-white/[0.03] rounded-t' : 'text-gray-500'
                                )}>
                                  <div className="text-[9px]">{ad > 0 ? `+$${ad}` : ad < 0 ? `-$${Math.abs(ad)}` : 'Current'}</div>
                                  <div className="font-mono">{formatCurrency(Math.round(a))}</div>
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {[-2, -1, 0, 1, 2].map(cd => {
                            const newChurn = Math.max(0.5, avgChurn3Month + cd);
                            return (
                              <tr key={cd} className="border-t border-gray-200">
                                <td className={cn(
                                  'py-1.5 pr-2 font-mono',
                                  cd === 0 ? 'text-gray-900 font-semibold bg-white/[0.03]' : 'text-gray-500'
                                )}>
                                  <div className="text-[9px] text-gray-500">
                                    {cd > 0 ? `+${cd}pp` : cd < 0 ? `${cd}pp` : 'Current'}
                                  </div>
                                  <div>{newChurn.toFixed(1)}%</div>
                                </td>
                                {[-20, -10, 0, 10, 20].map(ad => {
                                  const a = Math.max(0, arpu + ad);
                                  const lifespan = newChurn > 0 ? 100 / newChurn : 0;
                                  const newLTV = a * lifespan;
                                  const delta = newLTV - estimatedRevenueLTV;
                                  const isCurrent = cd === 0 && ad === 0;

                                  return (
                                    <td
                                      key={ad}
                                      className={cn(
                                        'py-1.5 px-1 text-center font-mono',
                                        isCurrent && 'bg-white/[0.06] rounded font-bold text-gray-900',
                                        !isCurrent && delta > 0 && 'text-emerald-400',
                                        !isCurrent && delta < 0 && 'text-red-400',
                                        !isCurrent && delta === 0 && 'text-gray-500',
                                      )}
                                    >
                                      <div className="font-semibold">{formatCurrency(Math.round(newLTV))}</div>
                                      {!isCurrent && (
                                        <div className="text-[9px]">
                                          {delta > 0 ? '+' : ''}{formatCurrency(Math.round(delta))}
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-3 text-[9px] text-gray-400 space-y-0.5">
                      <p><strong>Reading this table:</strong> Each cell = ARPU × (1 / Churn Rate as decimal). The number below is the delta vs current LTV ({formatCurrency(Math.round(estimatedRevenueLTV))}).</p>
                      <p><strong>Example:</strong> Reducing churn by 1 percentage point (from {avgChurn3Month.toFixed(1)}% to {Math.max(0.5, avgChurn3Month - 1).toFixed(1)}%) at current ARPU = {formatCurrency(Math.round(arpu * (100 / Math.max(0.5, avgChurn3Month - 1))))} LTV ({formatCurrency(Math.round(arpu * (100 / Math.max(0.5, avgChurn3Month - 1)) - estimatedRevenueLTV))} increase)</p>
                    </div>
                  </div>
                </CollapsibleSection>
              )}

              {/* ── Data Sources & Reproducibility ─────────────────────────── */}
              <CollapsibleSection
                title="Data Sources & How to Reproduce"
                subtitle="SQL queries, tables, and field references"
                badge="REFERENCE"
                defaultOpen={false}
              >
                <div className="mt-3 space-y-4">
                  <div className="rounded-lg bg-black/30 border border-gray-200 p-3 text-xs text-gray-500 space-y-3">
                    <div>
                      <p className="text-gray-700 font-semibold mb-1">ARPU-Based LTV Sources</p>
                      <div className="font-mono text-[10px] bg-black/40 rounded p-2 space-y-1">
                        <p className="text-gray-500">-- MRR (from Mode report: a9247d33f12e)</p>
                        <p className="text-emerald-400">SELECT PAID_MONTH, SUM(WEIGHT_AVG) AS mrr</p>
                        <p className="text-emerald-400">FROM MRR_TABLE GROUP BY PAID_MONTH</p>
                        <p className="text-gray-400 mt-2">-- Active Subscribers (from Mode report: 7705ac7b72df)</p>
                        <p className="text-blue-400">SELECT MONTH_ON_PLATFORM, SUM(ACTIVE_AT_END_OF_MONTH) AS active</p>
                        <p className="text-blue-400">FROM CHURN_BY_PAYMENT_CAPTURE GROUP BY MONTH_ON_PLATFORM</p>
                        <p className="text-gray-400 mt-2">-- Churn Rate</p>
                        <p className="text-red-400">SELECT SUM(LOST_SUBSCRIPTION) / SUM(ACTIVE_AT_END_OF_PRIOR_MONTH) AS churn_rate</p>
                        <p className="text-red-400">FROM CHURN_BY_PAYMENT_CAPTURE WHERE MONTH_ON_PLATFORM IN (last 3 months)</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-gray-700 font-semibold mb-1">Cohort-Based LTV Sources</p>
                      <div className="font-mono text-[10px] bg-black/40 rounded p-2 space-y-1">
                        <p className="text-gray-500">-- LTV by Cohort (from Mode report: 704faa5fc878, query: 8dda7ba3db5a)</p>
                        <p className="text-emerald-400">SELECT DATE_TRUNC(&apos;month&apos;, first_invoice_date) AS cohort_month,</p>
                        <p className="text-emerald-400">  COUNT(*) AS cohort_size,</p>
                        <p className="text-emerald-400">  SUM(total_revenue) AS cohort_total_revenue,</p>
                        <p className="text-emerald-400">  AVG(total_revenue) AS avg_ltv,</p>
                        <p className="text-emerald-400">  MEDIAN(total_revenue) AS median_ltv,</p>
                        <p className="text-emerald-400">  AVG(DATEDIFF(&apos;month&apos;, first_invoice, last_invoice)) AS avg_lifetime_months</p>
                        <p className="text-emerald-400">FROM user_revenue_summary GROUP BY 1</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-gray-700 font-semibold mb-1">Subscription Revenue by Plan</p>
                      <div className="font-mono text-[10px] bg-black/40 rounded p-2 space-y-1">
                        <p className="text-gray-500">-- Subscription Revenue (from Mode report: 704faa5fc878, query: 6163389aac4f)</p>
                        <p className="text-violet-400">SELECT DATE_TRUNC(&apos;month&apos;, invoice_date) AS revenue_month,</p>
                        <p className="text-violet-400">  SUBSCRIPTION_PLAN_INVOICED,</p>
                        <p className="text-violet-400">  SUM(total_in_cents / 100) AS total_revenue,</p>
                        <p className="text-violet-400">  COUNT(*) AS invoice_count,</p>
                        <p className="text-violet-400">  COUNT(DISTINCT user_id) AS unique_users</p>
                        <p className="text-violet-400">FROM invoices GROUP BY 1, 2</p>
                      </div>
                    </div>
                  </div>

                  <div className="text-[9px] text-gray-400 space-y-0.5">
                    <p><strong>Database:</strong> Snowflake (accessed via Mode Analytics API)</p>
                    <p><strong>Mode Workspace:</strong> Signos</p>
                    <p><strong>Key Tables:</strong> CHURN_BY_PAYMENT_CAPTURE, MRR (materialized view), RENEWAL_RATE, invoices, subscriptions, users</p>
                    <p><strong>Data Freshness:</strong> Updated on each Mode report run (triggered automatically or manually)</p>
                    <p><strong>To reproduce:</strong> Run the SQL queries above in Mode Analytics or directly in Snowflake. The results feed into the formulas shown in Methods A and B.</p>
                  </div>
                </div>
              </CollapsibleSection>
            </div>
          </Card>

          {/* ═══ LTV by Cohort Chart ═══ */}
          {cohortChartData.length > 0 && (
            <Card className="mb-8">
              <CardHeader
                title="LTV by Signup Cohort"
                subtitle={`${ltv?.totalUsers?.toLocaleString() || 0} total users · ${formatCompact(ltv?.totalRevenue || 0)} total revenue · Actual per-user LTV over time`}
              />
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={cohortChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#71717a' }} />
                    <YAxis
                      yAxisId="left"
                      tickFormatter={(v) => `$${v}`}
                      tick={{ fontSize: 10, fill: '#71717a' }}
                      label={{ value: 'LTV ($)', angle: -90, position: 'insideLeft', fill: '#71717a', fontSize: 10 }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 10, fill: '#71717a' }}
                      label={{ value: 'Cohort Size', angle: 90, position: 'insideRight', fill: '#71717a', fontSize: 10 }}
                    />
                    <Tooltip content={<ChartTooltipContent formatter={(v: number) => `$${v.toLocaleString()}`} />} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Bar yAxisId="right" dataKey="cohortSize" fill="#6366f1" fillOpacity={0.3} name="Cohort Size" />
                    <Line yAxisId="left" type="monotone" dataKey="avgLTV" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} name="Avg LTV" />
                    <Line yAxisId="left" type="monotone" dataKey="medianLTV" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} strokeDasharray="5 5" name="Median LTV" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* ═══ Shopify Revenue + Subscription Revenue ═══ */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 mb-8">
            {revenueChartData.length > 0 && (
              <Card>
                <CardHeader
                  title="Shopify Revenue (Monthly)"
                  subtitle={`Total all-time: ${formatCompact(shopRevenue?.totalAllTimeRevenue || 0)} · Current: ${formatCompact(shopRevenue?.currentMonth.revenue || 0)}`}
                />
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={revenueChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#71717a' }} />
                      <YAxis
                        yAxisId="left"
                        tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                        tick={{ fontSize: 10, fill: '#71717a' }}
                      />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#71717a' }} />
                      <Tooltip content={<ChartTooltipContent formatter={(v: number) => `$${v.toLocaleString()}`} />} />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} name="Revenue" />
                      <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#06b6d4" strokeWidth={2} dot={false} name="Orders" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}

            {subRevenueChartData.length > 0 && (
              <Card>
                <CardHeader
                  title="Subscription Revenue (Recurly)"
                  subtitle={`Latest ARPU: ${formatCompact(subRevenue?.latestARPU || 0)} · Renewal: ${formatPercent(subRevenue?.newVsRenewal.renewalPct || 0)} of revenue`}
                />
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={subRevenueChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#71717a' }} />
                      <YAxis
                        yAxisId="left"
                        tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                        tick={{ fontSize: 10, fill: '#71717a' }}
                      />
                      <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `$${v}`} tick={{ fontSize: 10, fill: '#71717a' }} />
                      <Tooltip content={<ChartTooltipContent formatter={(v: number) => `$${v.toLocaleString()}`} />} />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#10b981" fill="#10b981" fillOpacity={0.2} name="Revenue" />
                      <Line yAxisId="right" type="monotone" dataKey="arpu" stroke="#f59e0b" strokeWidth={2} dot={false} name="ARPU" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}
          </div>

          {/* ═══ Product Mix + User Journey ═══ */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 mb-8">
            {productPieData.length > 0 && (
              <Card>
                <CardHeader
                  title="Shopify Product Revenue Mix"
                  subtitle={`${products?.totalProducts || 0} product variants · ${formatCompact(products?.totalRevenue || 0)} total revenue`}
                  action={
                    <span className="rounded-full bg-violet-500/10 px-2.5 py-0.5 text-[10px] font-bold text-violet-400">
                      <Package className="inline h-3 w-3 mr-1" />
                      PRODUCTS
                    </span>
                  }
                />
                <div className="flex items-center gap-4">
                  <div className="h-[200px] w-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={productPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {productPieData.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={<ChartTooltipContent formatter={(v: number) => `$${v.toLocaleString()}`} />}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {productPieData.map((p, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: p.color }} />
                        <span className="text-gray-500 flex-1 truncate">{p.name}</span>
                        <span className="font-medium text-gray-900">{formatCompact(p.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {statusData.length > 0 && (
              <Card>
                <CardHeader
                  title="Customer Journey Status"
                  subtitle={`${journey?.totalTracked?.toLocaleString() || 0} tracked users across all cohorts`}
                  action={
                    <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-bold text-blue-400">
                      <ArrowUpDown className="inline h-3 w-3 mr-1" />
                      JOURNEY
                    </span>
                  }
                />
                <div className="space-y-2">
                  {statusData.map((s, i) => {
                    const total = statusData.reduce((sum, x) => sum + x.value, 0);
                    const pct = total > 0 ? (s.value / total) * 100 : 0;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-36 truncate">
                          <span className="text-xs font-medium text-gray-700">{s.name}</span>
                        </div>
                        <div className="flex-1 h-5 rounded bg-gray-100 overflow-hidden relative">
                          <div
                            className="h-full rounded transition-all"
                            style={{ width: `${pct}%`, backgroundColor: s.color, opacity: 0.6 }}
                          />
                          <span className="absolute inset-0 flex items-center px-2 text-[10px] font-medium text-gray-900">
                            {formatNumber(s.value)} ({formatPercent(pct, 1)})
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>

          {/* ═══ MRR Trend ═══ */}
          {mrr && (
            <Card className="mb-8">
              <CardHeader
                title="MRR Trend"
                subtitle={`Peak: ${formatCompact(mrr.peakMRR)} · Current: ${formatCompact(mrr.currentMRR)}`}
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
                        className="w-full rounded-t bg-violet-500/50 hover:bg-violet-500/70 transition-all cursor-pointer"
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
          )}

          {/* ═══ Renewal Trend ═══ */}
          {renewal && (
            <Card className="mb-8">
              <CardHeader
                title="Monthly Renewal Rate"
                subtitle={`Overall: ${formatPercent(renewal.overallRenewalRate)} · ${formatNumber(renewal.totalRenewed)} of ${formatNumber(renewal.totalUpForRenewal)} renewed`}
              />
              <div className="h-[200px] flex items-end gap-0.5 px-1">
                {renewal.monthlyRenewal
                  .filter((m) => m.upForRenewal > 0)
                  .map((m) => {
                    const height = m.renewalRate;
                    return (
                      <div key={m.month} className="flex-1 flex flex-col items-center group relative">
                        <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                          <div className="rounded-lg bg-white border border-gray-200 px-3 py-2 text-xs whitespace-nowrap shadow-xl">
                            <p className="font-semibold text-gray-900">{m.month}</p>
                            <p className="text-gray-500">{formatNumber(m.renewed)} of {formatNumber(m.upForRenewal)} renewed</p>
                            <p className={cn('font-medium', m.renewalRate >= 30 ? 'text-emerald-400' : 'text-amber-400')}>
                              {formatPercent(m.renewalRate)}
                            </p>
                          </div>
                        </div>
                        <div
                          className={cn(
                            'w-full rounded-t transition-all cursor-pointer',
                            m.renewalRate >= 30 ? 'bg-emerald-500/60 hover:bg-emerald-500/80' :
                            m.renewalRate >= 20 ? 'bg-amber-500/60 hover:bg-amber-500/80' :
                            'bg-red-500/60 hover:bg-red-500/80'
                          )}
                          style={{ height: `${Math.min(height, 100)}%`, minHeight: m.renewalRate > 0 ? '4px' : '0' }}
                        />
                      </div>
                    );
                  })}
              </div>
              <div className="flex gap-0.5 px-1 mt-2">
                {renewal.monthlyRenewal
                  .filter((m) => m.upForRenewal > 0)
                  .map((m, i) => (
                    <div key={m.month} className="flex-1 text-center">
                      {i % 3 === 0 && (
                        <span className="text-[8px] text-gray-400">{m.month.slice(2)}</span>
                      )}
                    </div>
                  ))}
              </div>
            </Card>
          )}

          {/* ═══ Plan Mix ═══ */}
          {planBreakdown.length > 0 && (
            <Card className="mb-8">
              <CardHeader
                title="Subscription Plan Mix"
                subtitle="Plan distribution affects blended LTV — longer plans = higher LTV"
              />
              <div className="space-y-2">
                {planBreakdown.map((plan) => {
                  const totalPlans = planBreakdown.reduce((s, p) => s + p.activeCount, 0);
                  const pct = totalPlans > 0 ? (plan.activeCount / totalPlans) * 100 : 0;
                  return (
                    <div key={plan.plan} className="flex items-center gap-3">
                      <div className="w-44 truncate">
                        <span className="text-xs font-medium text-gray-700">{plan.label}</span>
                      </div>
                      <div className="flex-1 h-6 rounded-lg bg-gray-100 overflow-hidden relative">
                        <div
                          className="h-full rounded-lg bg-violet-500 transition-all"
                          style={{ width: `${pct}%`, opacity: 0.5 }}
                        />
                        <span className="absolute inset-0 flex items-center px-3 text-[10px] font-medium text-gray-900">
                          {formatNumber(plan.activeCount)} ({formatPercent(pct, 1)})
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* ═══ LTV Insights ═══ */}
          <Card className="border-brand-500/20 bg-gradient-to-br from-brand-500/[0.03] to-transparent">
            <CardHeader title="LTV Insights" subtitle="Key observations from live data" />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-lg p-4 border border-gray-200 bg-gray-50">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-brand-400" />
                  <span className="text-xs font-semibold text-gray-700">Revenue Potential</span>
                </div>
                <p className="text-[11px] text-gray-500">
                  {ltv ? (
                    <>
                      Actual LTV is {formatCompact(ltv.overallLTV)} based on {ltv.totalUsers.toLocaleString()} users.
                      Recent cohorts average {formatCompact(ltv.recentAvgLTV)} ({ltv.ltvTrend > 0 ? 'improving' : 'declining'} trend).
                      {ltv.avgLifetimeMonths < 5 ? ' Increasing customer lifespan beyond 5 months is the #1 lever for LTV improvement.' : ' Focus on upsell and plan upgrades to boost per-user revenue.'}
                    </>
                  ) : (
                    <>
                      At {formatCompact(arpu)}/mo ARPU and {avgLifetimeMonths.toFixed(1)} month avg lifespan,
                      each subscriber generates ~{formatCompact(estimatedRevenueLTV)} in revenue LTV.
                    </>
                  )}
                </p>
              </div>
              <div className="rounded-lg p-4 border border-gray-200 bg-gray-50">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingBag className="h-4 w-4 text-violet-400" />
                  <span className="text-xs font-semibold text-gray-700">Shopify Revenue</span>
                </div>
                <p className="text-[11px] text-gray-500">
                  {shopRevenue ? (
                    <>
                      Current month: {formatCompact(shopRevenue.currentMonth.revenue)} from {shopRevenue.currentMonth.orders.toLocaleString()} orders
                      ({shopRevenue.revenueChange > 0 ? '+' : ''}{shopRevenue.revenueChange.toFixed(1)}% vs prior month).
                      {' '}AOV: {formatCompact(shopRevenue.currentMonth.aov)}.
                      {' '}{formatCompact(shopRevenue.totalAllTimeRevenue)} total Shopify revenue tracked.
                    </>
                  ) : (
                    'Shopify data loading...'
                  )}
                </p>
              </div>
              {journey && (
                <div className="rounded-lg p-4 border border-gray-200 bg-gray-50">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="h-4 w-4 text-cyan-400" />
                    <span className="text-xs font-semibold text-gray-700">User Journey</span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    {journey.totalTracked.toLocaleString()} users tracked.
                    {journey.overallStatus['Active - Onboarded'] && (
                      <> {formatNumber(journey.overallStatus['Active - Onboarded'])} active & onboarded. </>
                    )}
                    {journey.overallStatus['Churned'] && (
                      <> {formatNumber(journey.overallStatus['Churned'])} churned ({formatPercent((journey.overallStatus['Churned'] / journey.totalTracked) * 100, 1)}). </>
                    )}
                    Recent cohorts show {journey.monthlyData[0]?.churnedPct?.toFixed(1)}% churn rate.
                  </p>
                </div>
              )}
              {renewal && (
                <div className="rounded-lg p-4 border border-gray-200 bg-gray-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Repeat className="h-4 w-4 text-blue-400" />
                    <span className="text-xs font-semibold text-gray-700">Renewal Impact</span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    {formatPercent(renewal.overallRenewalRate)} overall renewal rate across {formatNumber(renewal.totalUpForRenewal)} renewal opportunities.
                    {renewal.overallRenewalRate < 30
                      ? ' Low renewal rate is the #1 LTV drag. Targeted renewal campaigns could significantly boost LTV.'
                      : ' Solid renewal rate — focus on reducing early churn (Month 1-3) for the biggest LTV impact.'}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
