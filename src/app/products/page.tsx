'use client';

import { Card, CardHeader, MetricCard } from '@/components/ui/card';
import { DataSourceRequired } from '@/components/ui/data-source-required';
import { formatCompact, formatNumber, formatPercent } from '@/lib/utils';
import { Loader2, RefreshCw, Package, ShoppingBag, TrendingUp, DollarSign } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Line,
  Area,
} from 'recharts';

interface ProductData {
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
  shopifyProducts?: {
    products: Array<{
      productId: string;
      name: string;
      variant: string;
      orderCount: number;
      uniqueBuyers: number;
      totalRevenue: number;
      avgPrice: number;
      firstOrderDate: string;
      lastOrderDate: string;
    }>;
    categories: Array<{ name: string; revenue: number; orders: number; buyers: number }>;
    totalProducts: number;
    totalRevenue: number;
  };
  subscriptionRevenue?: {
    monthlyData: Array<{
      month: string;
      totalRevenue: number;
      invoiceCount: number;
      uniqueUsers: number;
      arpu: number;
      byPlan: Record<string, { revenue: number; count: number }>;
    }>;
    latestRevenue: number;
    latestARPU: number;
    newVsRenewal: { newRevenue: number; renewalRevenue: number; renewalPct: number };
  };
}

const COLORS = ['#8b5cf6', '#10b981', '#06b6d4', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6'];

function ChartTooltipContent({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-zinc-900/95 border border-zinc-700 px-3 py-2 text-xs shadow-xl">
      <p className="font-medium text-zinc-300 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-zinc-400">{p.name}:</span>
          <span className="font-medium text-white">
            {formatter ? formatter(p.value) : typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ProductsPage() {
  const [data, setData] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/data/mode-shopify');
      const json = await res.json();
      setData(json);
    } catch {
      setData({ connected: false, error: 'Failed to fetch' });
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const isConnected = data?.connected === true;
  const revenue = data?.shopifyRevenue;
  const products = data?.shopifyProducts;
  const subRevenue = data?.subscriptionRevenue;

  // Product category pie data
  const categoryPieData = (products?.categories || []).slice(0, 7).map((c, i) => ({
    name: c.name,
    value: Math.round(c.revenue),
    orders: c.orders,
    color: COLORS[i % COLORS.length],
  }));

  // Monthly revenue chart (last 12 months)
  const revenueChart = (revenue?.monthlyData || []).slice(0, 12).reverse().map(m => ({
    month: m.month.slice(2),
    revenue: Math.round(m.totalRevenue),
    orders: m.orderCount,
    aov: Math.round(m.avgOrderValue),
  }));

  // Monthly product breakdown (last 6 months, top 5 products)
  const productBreakdownChart = (revenue?.monthlyData || []).slice(0, 6).reverse().map(m => {
    const entry: any = { month: m.month.slice(2) };
    const sorted = Object.entries(m.products).sort(([, a], [, b]) => b.revenue - a.revenue).slice(0, 5);
    for (const [name, { revenue: rev }] of sorted) {
      entry[name] = Math.round(rev);
    }
    return entry;
  });

  // Get top product names for stacked bar
  const topProductNames = new Set<string>();
  for (const m of (revenue?.monthlyData || []).slice(0, 6)) {
    const sorted = Object.entries(m.products).sort(([, a], [, b]) => b.revenue - a.revenue).slice(0, 5);
    for (const [name] of sorted) topProductNames.add(name);
  }

  // Subscription revenue by plan (latest month)
  const latestSubMonth = subRevenue?.monthlyData?.[subRevenue.monthlyData.length - 1];
  const planBreakdownData = latestSubMonth
    ? Object.entries(latestSubMonth.byPlan)
        .sort(([, a], [, b]) => b.revenue - a.revenue)
        .slice(0, 8)
        .map(([plan, d], i) => ({
          name: plan,
          revenue: Math.round(d.revenue),
          invoices: d.count,
          color: COLORS[i % COLORS.length],
        }))
    : [];

  return (
    <div className="p-6 pb-20">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-white">Revenue & Products</h1>
          {isConnected && (
            <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-bold text-blue-400 border border-blue-500/20">
              SHOPIFY + SNOWFLAKE LIVE
            </span>
          )}
        </div>
        <p className="text-sm text-zinc-400">
          Shopify order revenue, product mix, subscription economics — data from Snowflake via Mode Analytics
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 text-brand-400 animate-spin" />
          <span className="ml-3 text-sm text-zinc-400">Loading product data from Snowflake...</span>
        </div>
      )}

      {/* Not connected */}
      {!loading && !isConnected && (
        <DataSourceRequired
          title="Revenue & Product Analytics"
          description="This page requires Mode Analytics credentials to access Shopify and subscription data from Snowflake."
          className="mb-8"
          sources={[
            {
              name: 'Mode Analytics (Snowflake)',
              description: 'Shopify orders, products, subscription invoices — all via Snowflake',
              envVars: ['MODE_API_TOKEN', 'MODE_API_SECRET', 'MODE_WORKSPACE'],
              status: 'not_configured',
            },
          ]}
        />
      )}

      {/* Connected */}
      {!loading && isConnected && (
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

          {/* Top KPIs */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-5 mb-8">
            <MetricCard
              label="Shopify Revenue (Mo)"
              value={formatCompact(revenue?.currentMonth.revenue || 0)}
              icon={<ShoppingBag className="h-5 w-5" />}
              valueColor="text-emerald-400"
              trend={revenue?.revenueChange}
              trendLabel="vs prior"
            />
            <MetricCard
              label="Orders (Mo)"
              value={formatNumber(revenue?.currentMonth.orders || 0)}
              icon={<Package className="h-5 w-5" />}
            />
            <MetricCard
              label="AOV"
              value={formatCompact(revenue?.currentMonth.aov || 0)}
              icon={<DollarSign className="h-5 w-5" />}
            />
            <MetricCard
              label="Sub Revenue ARPU"
              value={formatCompact(subRevenue?.latestARPU || 0)}
              icon={<TrendingUp className="h-5 w-5" />}
            />
            <MetricCard
              label="Product Variants"
              value={formatNumber(products?.totalProducts || 0)}
              icon={<Package className="h-5 w-5" />}
            />
          </div>

          {/* Revenue Trend + Product Mix */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 mb-8">
            {/* Shopify Revenue Trend */}
            {revenueChart.length > 0 && (
              <Card>
                <CardHeader
                  title="Monthly Shopify Revenue"
                  subtitle={`Total: ${formatCompact(revenue?.totalAllTimeRevenue || 0)} all-time`}
                />
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={revenueChart}>
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
                      <Line yAxisId="left" type="monotone" dataKey="aov" stroke="#f59e0b" strokeWidth={2} dot={false} name="AOV" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}

            {/* Product Category Pie */}
            {categoryPieData.length > 0 && (
              <Card>
                <CardHeader
                  title="Product Revenue by Category"
                  subtitle={`${formatCompact(products?.totalRevenue || 0)} total across ${products?.totalProducts || 0} variants`}
                />
                <div className="flex items-center gap-4">
                  <div className="h-[240px] w-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {categoryPieData.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltipContent formatter={(v: number) => `$${v.toLocaleString()}`} />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-2">
                    {categoryPieData.map((p, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: p.color }} />
                        <span className="text-zinc-400 flex-1 truncate">{p.name}</span>
                        <span className="font-medium text-white">{formatCompact(p.value)}</span>
                        <span className="text-zinc-600">{p.orders} orders</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Product Revenue Breakdown by Month (Stacked Bar) */}
          {productBreakdownChart.length > 0 && (
            <Card className="mb-8">
              <CardHeader
                title="Product Revenue Breakdown (Last 6 Months)"
                subtitle="Top 5 product categories by revenue per month"
              />
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productBreakdownChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#71717a' }} />
                    <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: '#71717a' }} />
                    <Tooltip content={<ChartTooltipContent formatter={(v: number) => `$${v.toLocaleString()}`} />} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    {Array.from(topProductNames).slice(0, 5).map((name, i) => (
                      <Bar key={name} dataKey={name} stackId="a" fill={COLORS[i % COLORS.length]} fillOpacity={0.7} name={name} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Subscription Plan Revenue */}
          {planBreakdownData.length > 0 && (
            <Card className="mb-8">
              <CardHeader
                title="Subscription Revenue by Plan (Latest Month)"
                subtitle={`${latestSubMonth?.month || ''} · Total: ${formatCompact(latestSubMonth?.totalRevenue || 0)} · ${formatNumber(latestSubMonth?.uniqueUsers || 0)} paying users`}
              />
              <div className="space-y-2">
                {planBreakdownData.map((plan, i) => {
                  const maxRevenue = Math.max(...planBreakdownData.map(p => p.revenue));
                  const pct = maxRevenue > 0 ? (plan.revenue / maxRevenue) * 100 : 0;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-28 truncate">
                        <span className="text-xs font-medium text-zinc-300">{plan.name}</span>
                      </div>
                      <div className="flex-1 h-6 rounded-lg bg-zinc-800/60 overflow-hidden relative">
                        <div
                          className="h-full rounded-lg transition-all"
                          style={{ width: `${pct}%`, backgroundColor: plan.color, opacity: 0.5 }}
                        />
                        <span className="absolute inset-0 flex items-center px-3 text-[10px] font-medium text-white">
                          {formatCompact(plan.revenue)} · {plan.invoices} invoices
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* New vs Renewal */}
              {subRevenue?.newVsRenewal && (
                <div className="mt-4 pt-4 border-t border-white/[0.06] flex gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                    <span className="text-zinc-400">New Revenue:</span>
                    <span className="font-medium text-white">{formatCompact(subRevenue.newVsRenewal.newRevenue)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-violet-500" />
                    <span className="text-zinc-400">Renewal Revenue:</span>
                    <span className="font-medium text-white">{formatCompact(subRevenue.newVsRenewal.renewalRevenue)}</span>
                    <span className="text-zinc-600">({formatPercent(subRevenue.newVsRenewal.renewalPct, 1)} of total)</span>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Top Products Table */}
          {(products?.products || []).length > 0 && (
            <Card>
              <CardHeader
                title="Top Products by Revenue"
                subtitle={`${products?.totalProducts || 0} product variants tracked`}
              />
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-zinc-500">
                      <th className="text-left py-2 px-3 font-medium">Product</th>
                      <th className="text-left py-2 px-3 font-medium">Variant</th>
                      <th className="text-right py-2 px-3 font-medium">Revenue</th>
                      <th className="text-right py-2 px-3 font-medium">Orders</th>
                      <th className="text-right py-2 px-3 font-medium">Buyers</th>
                      <th className="text-right py-2 px-3 font-medium">Avg Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(products?.products || []).slice(0, 15).map((p, i) => (
                      <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                        <td className="py-2 px-3 text-zinc-300 max-w-[200px] truncate">{p.name}</td>
                        <td className="py-2 px-3 text-zinc-500 max-w-[120px] truncate">{p.variant || '—'}</td>
                        <td className="py-2 px-3 text-right font-medium text-emerald-400">{formatCompact(p.totalRevenue)}</td>
                        <td className="py-2 px-3 text-right text-zinc-400">{formatNumber(p.orderCount)}</td>
                        <td className="py-2 px-3 text-right text-zinc-400">{formatNumber(p.uniqueBuyers)}</td>
                        <td className="py-2 px-3 text-right text-zinc-400">{formatCompact(p.avgPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Simulator link */}
          <div className="mt-8 text-center">
            <a
              href="/simulator"
              className="rounded-lg bg-brand-600/20 px-6 py-3 text-sm font-medium text-brand-400 hover:bg-brand-600/30 transition-colors inline-block"
            >
              Model product strategy impact → LTV Simulator
            </a>
          </div>
        </>
      )}
    </div>
  );
}
