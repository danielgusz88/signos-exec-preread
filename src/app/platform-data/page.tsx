'use client';

import { cn } from '@/lib/utils';
import {
  BarChart3, Loader2, RefreshCw, TrendingUp, TrendingDown, DollarSign,
  Eye, MousePointerClick, ShoppingCart, ArrowUpRight, Play, CheckCircle2,
  XCircle, Clock, Bot, ChevronDown, ChevronUp, ExternalLink, Copy,
  Calendar, Minus, AlertTriangle, X, Database, Users, Repeat,
} from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';

interface DailySummary {
  platform: string; date: string; total_spend: number; total_impressions: number;
  total_clicks: number; total_conversions: number; total_revenue: number;
  avg_ctr: number; avg_cpc: number; avg_cpa: number; avg_roas: number;
  campaign_count: number; extra: Record<string, unknown>;
}
interface CampaignRow {
  campaign_name: string; campaign_id: string; ad_set_name: string;
  impressions: number; clicks: number; spend: number; conversions: number;
  revenue: number; ctr: number; cpc: number; cpa: number; roas: number;
}
interface AgentTask {
  id: string; platform: string; task_type: string; status: string;
  instructions: string; date_range_start: string; date_range_end: string;
  result: Record<string, unknown> | null; error: string; triggered_by: string;
  started_at: number | null; completed_at: number | null; created_at: number;
}

interface ModeMonthlyRevenue {
  month: string; orderCount: number; uniqueCustomers: number;
  totalRevenue: number; subtotalRevenue: number; avgOrderValue: number;
  products: Record<string, { orders: number; revenue: number }>;
}
interface ModeCohort {
  cohortMonth: string; cohortSize: number; payingUsers: number;
  totalRevenue: number; avgLTV: number; medianLTV: number;
  avgLifetimeMonths: number; avgInvoicesPerUser: number;
  churnedUsers: number; churnRatePct: number;
}
interface ModeSubRevMonth {
  month: string; totalRevenue: number; invoiceCount: number;
  uniqueUsers: number; totalDiscounts: number; arpu: number;
  byPlan: Record<string, { revenue: number; count: number }>;
  byContext: Record<string, { revenue: number; count: number }>;
}
interface ModeProductCategory { name: string; revenue: number; orders: number; buyers: number; }
interface ModeData {
  connected: boolean;
  error?: string;
  shopifyRevenue?: {
    monthlyData: ModeMonthlyRevenue[]; currentMonth: { month: string; revenue: number; orders: number; customers: number; aov: number };
    previousMonth: { month: string; revenue: number; orders: number }; revenueChange: number; totalAllTimeRevenue: number;
  };
  ltvByCohort?: {
    cohorts: ModeCohort[]; overallLTV: number; recentAvgLTV: number;
    totalUsers: number; totalRevenue: number; ltvTrend: number; avgLifetimeMonths: number;
  };
  subscriptionRevenue?: {
    monthlyData: ModeSubRevMonth[]; latestMonth: string; latestRevenue: number; latestARPU: number;
    newVsRenewal: { newRevenue: number; renewalRevenue: number; renewalPct: number };
  };
  shopifyProducts?: { products: Array<Record<string, unknown>>; categories: ModeProductCategory[]; totalProducts: number; totalRevenue: number };
  lastUpdated?: string;
}

async function api(action: string, payload: Record<string, unknown> = {}) {
  const r = await fetch('/api/platform-data/store', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  });
  return r.json();
}

async function fetchModeData(): Promise<ModeData> {
  const r = await fetch('/api/data/mode-shopify');
  return r.json();
}

const PLATFORMS = [
  { id: 'google_ads', label: 'Google Ads', color: 'bg-blue-500', lightBg: 'bg-blue-50', lightText: 'text-blue-700', icon: '🔍', loginUrl: 'https://ads.google.com' },
  { id: 'meta_ads', label: 'Meta Ads', color: 'bg-indigo-500', lightBg: 'bg-indigo-50', lightText: 'text-indigo-700', icon: '📘', loginUrl: 'https://adsmanager.facebook.com' },
  { id: 'ga4', label: 'GA4', color: 'bg-orange-500', lightBg: 'bg-orange-50', lightText: 'text-orange-700', icon: '📊', loginUrl: 'https://analytics.google.com' },
];

const TASK_STATUS = {
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-600', icon: Clock },
  running: { label: 'Running', color: 'bg-blue-100 text-blue-700', icon: RefreshCw },
  completed: { label: 'Done', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700', icon: XCircle },
};

function todayStr() { return new Date().toISOString().split('T')[0]; }
function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}
function fmt(n: number, dec = 0) { return n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
function fmtCurrency(n: number) { return '$' + fmt(n, 2); }
function fmtPct(n: number) { return fmt(n, 2) + '%'; }

const AGENT_INSTRUCTIONS: Record<string, string> = {
  google_ads: `## Google Ads Data Pull — Cursor Cloud Agent Instructions

### Objective
Extract daily campaign performance data from Google Ads and POST it to the Signos Funnel AI ingest API.

### Steps

1. **Navigate** to https://ads.google.com and sign in with the Signos Google Ads account.

2. **Go to Campaigns view**: Click "Campaigns" in the left sidebar.

3. **Set date range**: Set the date range to yesterday (or the requested date range). Click the date picker in the top-right area and select the correct range.

4. **Show all columns**: Make sure these columns are visible: Campaign, Status, Impressions, Clicks, CTR, Avg. CPC, Cost, Conversions, Cost/conv., Conv. value, Conv. value/cost (ROAS).

5. **Extract data**: For each campaign row visible, extract:
   - campaign_name (Campaign column)
   - campaign_id (from the URL when hovering, or the campaign detail)
   - impressions (number)
   - clicks (number)
   - ctr (percentage as decimal, e.g. 2.5 for 2.5%)
   - cpc (dollar amount)
   - spend (Cost column, dollar amount)
   - conversions (number)
   - cpa (Cost/conv. column)
   - revenue (Conv. value column)
   - roas (Conv. value/cost column)

6. **Compute summary**: Sum up totals across all campaigns for the day.

7. **POST the data** to: \`https://funnel-ai-signos.netlify.app/api/platform-data/store\`

   Request body:
   \`\`\`json
   {
     "action": "ingest",
     "platform": "google_ads",
     "date": "YYYY-MM-DD",
     "rows": [
       {
         "campaign_name": "Campaign Name",
         "campaign_id": "12345678",
         "account_name": "Signos",
         "impressions": 50000,
         "clicks": 1200,
         "spend": 450.00,
         "conversions": 25,
         "revenue": 2500.00,
         "ctr": 2.4,
         "cpc": 0.375,
         "cpm": 9.00,
         "cpa": 18.00,
         "roas": 5.56
       }
     ],
     "summary": {
       "total_spend": 450.00,
       "total_impressions": 50000,
       "total_clicks": 1200,
       "total_conversions": 25,
       "total_revenue": 2500.00,
       "avg_ctr": 2.4,
       "avg_cpc": 0.375,
       "avg_cpa": 18.00,
       "avg_roas": 5.56,
       "campaign_count": 5
     }
   }
   \`\`\`

8. **Verify** the response returns \`{"ok": true}\`.

### Notes
- If a campaign has zero spend, still include it with zero values.
- Convert all currency to numbers (no $ signs in the JSON).
- CTR should be a percentage number (2.5 means 2.5%), not a decimal (0.025).
- Check for pagination — if there are more campaigns, scroll/paginate to capture all.`,

  meta_ads: `## Meta Ads Data Pull — Cursor Cloud Agent Instructions

### Objective
Extract daily campaign performance data from Meta Ads Manager and POST it to the Signos Funnel AI ingest API.

### Steps

1. **Navigate** to https://adsmanager.facebook.com and sign in with the Signos account.

2. **Select the correct ad account**: Make sure you're viewing the Signos ad account.

3. **Go to Campaigns tab**: Click the "Campaigns" tab at the top.

4. **Set date range**: Click the date picker and set it to yesterday (or requested date range).

5. **Configure columns**: Click "Columns" dropdown and select "Performance and Clicks" or customize to show: Campaign Name, Delivery, Impressions, Reach, Clicks (All), CTR, CPC, Amount Spent, Results (Purchases/Leads), Cost per Result, Purchase ROAS.

6. **Extract data**: For each campaign row, extract:
   - campaign_name
   - campaign_id (from URL or campaign details)
   - impressions
   - clicks (use "Link Clicks" or "Clicks (All)")
   - ctr
   - cpc
   - spend (Amount Spent)
   - conversions (Results column — purchases or leads)
   - cpa (Cost per Result)
   - revenue (Purchase Conversion Value if available)
   - roas (Purchase ROAS if available)
   - Extra: reach, frequency

7. **Compute summary**: Sum totals across all campaigns.

8. **POST the data** to: \`https://funnel-ai-signos.netlify.app/api/platform-data/store\`

   Request body:
   \`\`\`json
   {
     "action": "ingest",
     "platform": "meta_ads",
     "date": "YYYY-MM-DD",
     "rows": [
       {
         "campaign_name": "Campaign Name",
         "campaign_id": "12345678",
         "account_name": "Signos",
         "impressions": 80000,
         "clicks": 2400,
         "spend": 600.00,
         "conversions": 30,
         "revenue": 3000.00,
         "ctr": 3.0,
         "cpc": 0.25,
         "cpm": 7.50,
         "cpa": 20.00,
         "roas": 5.0,
         "extra": { "reach": 60000, "frequency": 1.33 }
       }
     ],
     "summary": {
       "total_spend": 600.00,
       "total_impressions": 80000,
       "total_clicks": 2400,
       "total_conversions": 30,
       "total_revenue": 3000.00,
       "avg_ctr": 3.0,
       "avg_cpc": 0.25,
       "avg_cpa": 20.00,
       "avg_roas": 5.0,
       "campaign_count": 8
     }
   }
   \`\`\`

8. **Verify** the response returns \`{"ok": true}\`.

### Notes
- Meta often shows "Learning" or "Active" status — include all campaigns with spend.
- If breakdowns by ad set are available, include ad_set_name for each row.
- Watch for pagination at the bottom of the campaigns list.`,

  ga4: `## GA4 Data Pull — Cursor Cloud Agent Instructions

### Objective
Extract daily website traffic and conversion data from Google Analytics 4 and POST it to the Signos Funnel AI ingest API.

### Steps

1. **Navigate** to https://analytics.google.com and sign in with the Signos account.

2. **Select the correct property**: Make sure you're viewing the Signos website property.

3. **Go to Reports > Acquisition > Traffic acquisition**: This shows session-level acquisition data.

4. **Set date range**: Set to yesterday (or requested date range).

5. **Extract traffic data by channel**: For each channel grouping (Organic Search, Paid Search, Direct, Social, etc.), extract:
   - campaign_name: Use the channel grouping name (e.g., "Organic Search", "Paid Search")
   - campaign_id: Use the channel name lowercase (e.g., "organic_search")
   - impressions: Use "Sessions" count
   - clicks: Use "Engaged Sessions"
   - conversions: Use "Conversions" or "Key events"
   - revenue: Use "Total revenue" if available
   - ctr: Engagement rate
   - Extra: bounce_rate, avg_session_duration, pages_per_session, new_users

6. **Also visit Reports > Engagement > Landing pages**: Extract top landing pages and their performance.

7. **Compute summary**: Total sessions, total conversions, total revenue across all channels.

8. **POST the data** to: \`https://funnel-ai-signos.netlify.app/api/platform-data/store\`

   Request body:
   \`\`\`json
   {
     "action": "ingest",
     "platform": "ga4",
     "date": "YYYY-MM-DD",
     "rows": [
       {
         "campaign_name": "Organic Search",
         "campaign_id": "organic_search",
         "account_name": "Signos Website",
         "impressions": 15000,
         "clicks": 10000,
         "spend": 0,
         "conversions": 150,
         "revenue": 15000.00,
         "ctr": 66.7,
         "cpc": 0,
         "cpm": 0,
         "cpa": 100.00,
         "roas": 0,
         "extra": { "bounce_rate": 42.5, "avg_session_duration": 125, "new_users": 8000 }
       }
     ],
     "summary": {
       "total_spend": 0,
       "total_impressions": 45000,
       "total_clicks": 30000,
       "total_conversions": 400,
       "total_revenue": 40000.00,
       "avg_ctr": 66.7,
       "avg_cpc": 0,
       "avg_cpa": 100.00,
       "avg_roas": 0,
       "campaign_count": 6,
       "extra": { "total_sessions": 45000, "total_new_users": 25000 }
     }
   }
   \`\`\`

9. **Verify** the response returns \`{"ok": true}\`.

### Notes
- GA4 uses "Sessions" not "Impressions" — map sessions to the impressions field for consistency.
- GA4 shows engagement rate, not CTR — map it to the ctr field.
- Include the landing page data in the extra field of the summary if possible.
- Revenue may not be available if ecommerce tracking isn't configured; use 0 in that case.`,
};

function PullDataModal({ platform, onClose, onCopy, onCreateTask, copied, triggering }: {
  platform: typeof PLATFORMS[0]; onClose: () => void;
  onCopy: (id: string) => void; onCreateTask: (id: string) => void;
  copied: string; triggering: string;
}) {
  const [showInstructions, setShowInstructions] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        <div className={cn('flex items-center justify-between px-6 py-4 border-b border-gray-100', platform.lightBg)}>
          <div className="flex items-center gap-2">
            <span className="text-lg">{platform.icon}</span>
            <h2 className={cn('text-sm font-bold', platform.lightText)}>Pull {platform.label} Data</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-white/60"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-6 space-y-5">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">How to pull {platform.label} data</h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-500 text-[9px] font-bold text-white">1</div>
                <div>
                  <p className="text-[11px] font-semibold text-gray-900">Copy the agent instructions below</p>
                  <p className="text-[10px] text-gray-500">These tell the Cursor cloud agent exactly how to extract data from {platform.label}.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-500 text-[9px] font-bold text-white">2</div>
                <div>
                  <p className="text-[11px] font-semibold text-gray-900">Open a Cursor Background Agent</p>
                  <p className="text-[10px] text-gray-500">In Cursor IDE, create a new Background Agent and paste the instructions.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-500 text-[9px] font-bold text-white">3</div>
                <div>
                  <p className="text-[11px] font-semibold text-gray-900">Agent logs into {platform.label} and extracts data</p>
                  <p className="text-[10px] text-gray-500">The agent navigates to <a href={platform.loginUrl} target="_blank" rel="noopener noreferrer" className="text-brand-600 underline">{platform.loginUrl}</a>, signs in, and pulls campaign data.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-500 text-[9px] font-bold text-white">4</div>
                <div>
                  <p className="text-[11px] font-semibold text-gray-900">Data appears on this dashboard</p>
                  <p className="text-[10px] text-gray-500">The agent POSTs the extracted data to Funnel AI and it shows up here automatically.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onCopy(platform.id)}
              className={cn('flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition', platform.color, 'hover:opacity-90')}
            >
              {copied === platform.id ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied === platform.id ? 'Copied to Clipboard!' : 'Copy Agent Instructions'}
            </button>
            <button
              onClick={() => onCreateTask(platform.id)}
              disabled={!!triggering}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
            >
              {triggering === platform.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Track Task
            </button>
          </div>

          <div>
            <button onClick={() => setShowInstructions(!showInstructions)} className="flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-gray-700">
              {showInstructions ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {showInstructions ? 'Hide' : 'Preview'} full instructions
            </button>
            {showInstructions && (
              <pre className="mt-2 whitespace-pre-wrap text-[10px] text-gray-600 leading-relaxed font-mono bg-gray-50 rounded-lg p-4 max-h-[300px] overflow-y-auto border border-gray-200">
                {AGENT_INSTRUCTIONS[platform.id]}
              </pre>
            )}
          </div>

          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-[11px] text-amber-700"><strong>Tip:</strong> For daily automation, set up a recurring Cursor Background Agent for each platform. The agent will log in, extract yesterday&apos;s data, and POST it to Funnel AI each morning.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModeSalesTab({ modeData, modeLoading, onRefresh }: { modeData: ModeData | null; modeLoading: boolean; onRefresh: () => void }) {
  const [subTab, setSubTab] = useState<'overview' | 'revenue' | 'ltv' | 'products'>('overview');

  if (modeLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-brand-500" /><span className="ml-2 text-sm text-gray-400">Loading sales data from Mode...</span></div>;
  }

  if (!modeData || !modeData.connected) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <Database className="mx-auto h-8 w-8 text-gray-300 mb-3" />
        <p className="text-sm text-gray-500 mb-1">Mode API not connected</p>
        <p className="text-xs text-gray-400 mb-4">{modeData?.error || 'Set MODE_API_TOKEN, MODE_API_SECRET, and MODE_WORKSPACE in Netlify environment variables.'}</p>
        <a href="https://app.mode.com/signos/reports/704faa5fc878" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600">
          <ExternalLink className="h-3 w-3" /> Open in Mode
        </a>
      </div>
    );
  }

  const sr = modeData.shopifyRevenue;
  const ltv = modeData.ltvByCohort;
  const sub = modeData.subscriptionRevenue;
  const prod = modeData.shopifyProducts;

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          {(['overview', 'revenue', 'ltv', 'products'] as const).map(t => (
            <button key={t} onClick={() => setSubTab(t)} className={cn('rounded-full px-3 py-1 text-[11px] font-medium transition capitalize', subTab === t ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
              {t === 'ltv' ? 'LTV & Cohorts' : t === 'products' ? 'Products' : t === 'revenue' ? 'Subscription Revenue' : 'Overview'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {modeData.lastUpdated && <span className="text-[10px] text-gray-400">Updated {new Date(modeData.lastUpdated).toLocaleString()}</span>}
          <button onClick={onRefresh} className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[10px] font-medium text-gray-600 hover:bg-gray-50">
            <RefreshCw className="h-3 w-3" /> Refresh
          </button>
          <a href="https://app.mode.com/signos/reports/704faa5fc878" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[10px] font-medium text-gray-600 hover:bg-gray-50">
            <ExternalLink className="h-3 w-3" /> Mode
          </a>
        </div>
      </div>

      {subTab === 'overview' && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-6">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2 mb-1"><DollarSign className="h-4 w-4 text-purple-500" /><span className="text-[10px] font-medium uppercase text-gray-500">Current Month Revenue</span></div>
              <p className="text-xl font-bold text-gray-900">{fmtCurrency(sr?.currentMonth.revenue || 0)}</p>
              {sr && sr.revenueChange !== 0 && (
                <div className="flex items-center gap-1 mt-1">
                  {sr.revenueChange > 0 ? <TrendingUp className="h-3 w-3 text-emerald-500" /> : <TrendingDown className="h-3 w-3 text-red-500" />}
                  <span className={cn('text-[10px] font-medium', sr.revenueChange > 0 ? 'text-emerald-600' : 'text-red-600')}>{sr.revenueChange > 0 ? '+' : ''}{fmt(sr.revenueChange, 1)}% vs last month</span>
                </div>
              )}
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2 mb-1"><Users className="h-4 w-4 text-blue-500" /><span className="text-[10px] font-medium uppercase text-gray-500">Avg LTV</span></div>
              <p className="text-xl font-bold text-gray-900">{fmtCurrency(ltv?.recentAvgLTV || 0)}</p>
              {ltv && ltv.ltvTrend !== 0 && (
                <div className="flex items-center gap-1 mt-1">
                  {ltv.ltvTrend > 0 ? <TrendingUp className="h-3 w-3 text-emerald-500" /> : <TrendingDown className="h-3 w-3 text-red-500" />}
                  <span className={cn('text-[10px] font-medium', ltv.ltvTrend > 0 ? 'text-emerald-600' : 'text-red-600')}>{ltv.ltvTrend > 0 ? '+' : ''}{fmt(ltv.ltvTrend, 1)}% YoY</span>
                </div>
              )}
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2 mb-1"><Repeat className="h-4 w-4 text-emerald-500" /><span className="text-[10px] font-medium uppercase text-gray-500">Sub Revenue (Latest)</span></div>
              <p className="text-xl font-bold text-gray-900">{fmtCurrency(sub?.latestRevenue || 0)}</p>
              <p className="text-[10px] text-gray-400 mt-1">ARPU: {fmtCurrency(sub?.latestARPU || 0)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2 mb-1"><ShoppingCart className="h-4 w-4 text-amber-500" /><span className="text-[10px] font-medium uppercase text-gray-500">All-Time Shopify Revenue</span></div>
              <p className="text-xl font-bold text-gray-900">{fmtCurrency(sr?.totalAllTimeRevenue || 0)}</p>
              <p className="text-[10px] text-gray-400 mt-1">{fmt(sr?.currentMonth.orders || 0)} orders this month</p>
            </div>
          </div>

          {/* Shopify Revenue Trend + Sub Revenue Side by Side */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 mb-6">
            {/* Shopify Monthly Revenue */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Shopify Revenue (Monthly)</h3>
              </div>
              <div className="p-4">
                {sr && sr.monthlyData.length > 0 ? (
                  <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                    {sr.monthlyData.slice(0, 12).map(m => {
                      const maxRev = Math.max(...sr.monthlyData.slice(0, 12).map(x => x.totalRevenue));
                      const pct = maxRev > 0 ? (m.totalRevenue / maxRev) * 100 : 0;
                      return (
                        <div key={m.month} className="flex items-center gap-3">
                          <span className="w-16 text-[10px] font-medium text-gray-500 flex-shrink-0">{m.month}</span>
                          <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-20 text-right text-[10px] font-bold text-gray-700">{fmtCurrency(m.totalRevenue)}</span>
                          <span className="w-12 text-right text-[9px] text-gray-400">{fmt(m.orderCount)} ord</span>
                        </div>
                      );
                    })}
                  </div>
                ) : <p className="text-[11px] text-gray-400 text-center py-6">No Shopify revenue data</p>}
              </div>
            </div>

            {/* New vs Renewal Revenue */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">New vs Renewal Revenue ({sub?.latestMonth})</h3>
              </div>
              <div className="p-4">
                {sub ? (
                  <>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-medium text-emerald-600">New Subscriptions</span>
                          <span className="text-[11px] font-bold text-gray-900">{fmtCurrency(sub.newVsRenewal.newRevenue)}</span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${100 - sub.newVsRenewal.renewalPct}%` }} />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-medium text-blue-600">Renewals</span>
                          <span className="text-[11px] font-bold text-gray-900">{fmtCurrency(sub.newVsRenewal.renewalRevenue)}</span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-400 rounded-full" style={{ width: `${sub.newVsRenewal.renewalPct}%` }} />
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 text-center">{fmt(sub.newVsRenewal.renewalPct, 1)}% of revenue from renewals</p>

                    {/* Sub Revenue Trend */}
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-1.5 max-h-[160px] overflow-y-auto">
                      {sub.monthlyData.slice(-8).reverse().map(m => (
                        <div key={m.month} className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-500">{m.month}</span>
                          <span className="text-[10px] font-bold text-gray-700">{fmtCurrency(m.totalRevenue)}</span>
                          <span className="text-[9px] text-gray-400">{fmt(m.uniqueUsers)} users</span>
                          <span className="text-[9px] text-gray-400">ARPU {fmtCurrency(m.arpu)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : <p className="text-[11px] text-gray-400 text-center py-6">No subscription revenue data</p>}
              </div>
            </div>
          </div>

          {/* Product Categories */}
          {prod && prod.categories.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Product Categories</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead><tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-3 py-2 text-left font-semibold text-gray-500">Product</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-500">Revenue</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-500">Orders</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-500">Buyers</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-500">% of Total</th>
                  </tr></thead>
                  <tbody>
                    {prod.categories.slice(0, 10).map(c => (
                      <tr key={c.name} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-900">{c.name}</td>
                        <td className="px-3 py-2 text-right font-bold text-emerald-600">{fmtCurrency(c.revenue)}</td>
                        <td className="px-3 py-2 text-right">{fmt(c.orders)}</td>
                        <td className="px-3 py-2 text-right">{fmt(c.buyers)}</td>
                        <td className="px-3 py-2 text-right">{prod.totalRevenue > 0 ? fmtPct(c.revenue / prod.totalRevenue * 100) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {subTab === 'revenue' && sub && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Subscription Revenue by Month</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead><tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-3 py-2 text-left font-semibold text-gray-500">Month</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-500">Revenue</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-500">Invoices</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-500">Users</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-500">ARPU</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-500">Discounts</th>
              </tr></thead>
              <tbody>
                {[...sub.monthlyData].reverse().map(m => (
                  <tr key={m.month} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-900">{m.month}</td>
                    <td className="px-3 py-2 text-right font-bold text-emerald-600">{fmtCurrency(m.totalRevenue)}</td>
                    <td className="px-3 py-2 text-right">{fmt(m.invoiceCount)}</td>
                    <td className="px-3 py-2 text-right">{fmt(m.uniqueUsers)}</td>
                    <td className="px-3 py-2 text-right font-medium">{fmtCurrency(m.arpu)}</td>
                    <td className="px-3 py-2 text-right text-red-500">{m.totalDiscounts > 0 ? '-' + fmtCurrency(m.totalDiscounts) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'ltv' && ltv && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-6">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <span className="text-[10px] font-medium uppercase text-gray-500">Overall LTV</span>
              <p className="text-xl font-bold text-gray-900">{fmtCurrency(ltv.overallLTV)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <span className="text-[10px] font-medium uppercase text-gray-500">Recent 6-mo Avg LTV</span>
              <p className="text-xl font-bold text-gray-900">{fmtCurrency(ltv.recentAvgLTV)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <span className="text-[10px] font-medium uppercase text-gray-500">Total Revenue</span>
              <p className="text-xl font-bold text-gray-900">{fmtCurrency(ltv.totalRevenue)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <span className="text-[10px] font-medium uppercase text-gray-500">Avg Lifetime (mo)</span>
              <p className="text-xl font-bold text-gray-900">{fmt(ltv.avgLifetimeMonths, 1)}</p>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">LTV by Cohort</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead><tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">Cohort</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-500">Size</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-500">Paying</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-500">Avg LTV</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-500">Median LTV</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-500">Avg Lifetime</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-500">Churn %</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-500">Total Rev</th>
                </tr></thead>
                <tbody>
                  {[...ltv.cohorts].reverse().map(c => (
                    <tr key={c.cohortMonth} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-900">{c.cohortMonth}</td>
                      <td className="px-3 py-2 text-right">{fmt(c.cohortSize)}</td>
                      <td className="px-3 py-2 text-right">{fmt(c.payingUsers)}</td>
                      <td className="px-3 py-2 text-right font-bold text-emerald-600">{fmtCurrency(c.avgLTV)}</td>
                      <td className="px-3 py-2 text-right">{fmtCurrency(c.medianLTV)}</td>
                      <td className="px-3 py-2 text-right">{fmt(c.avgLifetimeMonths, 1)} mo</td>
                      <td className="px-3 py-2 text-right"><span className={cn(c.churnRatePct > 50 ? 'text-red-600' : c.churnRatePct > 30 ? 'text-amber-600' : 'text-emerald-600')}>{fmtPct(c.churnRatePct)}</span></td>
                      <td className="px-3 py-2 text-right">{fmtCurrency(c.totalRevenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {subTab === 'products' && prod && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Top Products</h3>
            <span className="text-[10px] text-gray-400">{prod.totalProducts} total products</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead><tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-3 py-2 text-left font-semibold text-gray-500">Category</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-500">Revenue</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-500">Orders</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-500">Buyers</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-500">Share</th>
              </tr></thead>
              <tbody>
                {prod.categories.map(c => {
                  const pct = prod.totalRevenue > 0 ? (c.revenue / prod.totalRevenue) * 100 : 0;
                  return (
                    <tr key={c.name} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-900">{c.name}</td>
                      <td className="px-3 py-2 text-right font-bold text-emerald-600">{fmtCurrency(c.revenue)}</td>
                      <td className="px-3 py-2 text-right">{fmt(c.orders)}</td>
                      <td className="px-3 py-2 text-right">{fmt(c.buyers)}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-purple-400 rounded-full" style={{ width: `${pct}%` }} /></div>
                          <span className="text-[10px]">{fmtPct(pct)}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

export default function PlatformDataPage() {
  const [tab, setTab] = useState<'dashboard' | 'sales' | 'agents' | 'instructions'>('dashboard');
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [drillLoading, setDrillLoading] = useState(false);
  const [dateRange, setDateRange] = useState({ start: daysAgo(30), end: todayStr() });
  const [expandedInstruction, setExpandedInstruction] = useState<string | null>(null);
  const [triggering, setTriggering] = useState('');
  const [copied, setCopied] = useState('');
  const [pullModal, setPullModal] = useState<string | null>(null);
  const [modeData, setModeData] = useState<ModeData | null>(null);
  const [modeLoading, setModeLoading] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    const [sumRes, taskRes] = await Promise.all([
      api('get_summaries', { start_date: dateRange.start, end_date: dateRange.end }),
      api('list_tasks'),
    ]);
    if (sumRes.ok) setSummaries(sumRes.summaries || []);
    if (taskRes.ok) setTasks(taskRes.tasks || []);
    setLoading(false);
  }, [dateRange]);

  const loadModeData = useCallback(async () => {
    setModeLoading(true);
    try {
      const data = await fetchModeData();
      setModeData(data);
    } catch {
      setModeData({ connected: false, error: 'Failed to fetch Mode data' });
    }
    setModeLoading(false);
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);
  useEffect(() => { if (tab === 'sales' && !modeData && !modeLoading) loadModeData(); }, [tab, modeData, modeLoading, loadModeData]);

  const drillDown = useCallback(async (platform: string, date: string) => {
    setSelectedPlatform(platform); setSelectedDate(date);
    setDrillLoading(true);
    const res = await api('get_campaigns', { platform, date });
    if (res.ok) setCampaigns(res.campaigns || []);
    setDrillLoading(false);
  }, []);

  const triggerAgent = useCallback(async (platformId: string) => {
    setTriggering(platformId);
    await api('create_task', {
      platform: platformId,
      task_type: 'pull_data',
      date_range_start: daysAgo(1),
      date_range_end: daysAgo(1),
      triggered_by: 'manual',
      instructions: AGENT_INSTRUCTIONS[platformId] || '',
    });
    await loadDashboard();
    setTriggering('');
  }, [loadDashboard]);

  const copyInstructions = useCallback((platformId: string) => {
    navigator.clipboard.writeText(AGENT_INSTRUCTIONS[platformId] || '');
    setCopied(platformId);
    setTimeout(() => setCopied(''), 2000);
  }, []);

  const dateMap = new Map<string, Record<string, DailySummary>>();
  for (const s of summaries) {
    if (!dateMap.has(s.date)) dateMap.set(s.date, {});
    dateMap.get(s.date)![s.platform] = s;
  }
  const sortedDates = Array.from(dateMap.keys()).sort((a, b) => b.localeCompare(a));

  const platformTotals: Record<string, { spend: number; impressions: number; clicks: number; conversions: number; revenue: number; days: number }> = {};
  for (const p of PLATFORMS) {
    platformTotals[p.id] = { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0, days: 0 };
  }
  for (const s of summaries) {
    const t = platformTotals[s.platform];
    if (t) {
      t.spend += Number(s.total_spend || 0);
      t.impressions += Number(s.total_impressions || 0);
      t.clicks += Number(s.total_clicks || 0);
      t.conversions += Number(s.total_conversions || 0);
      t.revenue += Number(s.total_revenue || 0);
      t.days++;
    }
  }

  const totalSpend = Object.values(platformTotals).reduce((s, t) => s + t.spend, 0);
  const totalRevenue = Object.values(platformTotals).reduce((s, t) => s + t.revenue, 0);
  const totalConversions = Object.values(platformTotals).reduce((s, t) => s + t.conversions, 0);
  const totalClicks = Object.values(platformTotals).reduce((s, t) => s + t.clicks, 0);

  const pullModalPlatform = pullModal ? PLATFORMS.find(p => p.id === pullModal) : null;

  return (
    <div className="h-[calc(100vh-3.5rem)] lg:h-screen flex flex-col">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 lg:px-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-5 w-5 text-brand-500" />
          <div>
            <h1 className="text-base font-bold text-gray-900 lg:text-lg">Platform Performance</h1>
            <p className="text-[10px] text-gray-400">Ad platform data via Cursor agents &middot; Sales data via Mode API</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="rounded-lg border border-gray-200 px-2 py-1.5 text-[11px] focus:border-brand-500 focus:outline-none" />
          <span className="text-[10px] text-gray-400">to</span>
          <input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="rounded-lg border border-gray-200 px-2 py-1.5 text-[11px] focus:border-brand-500 focus:outline-none" />
        </div>
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-100 bg-white px-4 py-2 lg:px-6">
        {[
          { id: 'dashboard' as const, label: 'Ad Performance' },
          { id: 'sales' as const, label: 'Sales Data (Mode)' },
          { id: 'agents' as const, label: 'Agent Tasks' },
          { id: 'instructions' as const, label: 'Agent Instructions' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={cn('rounded-full px-3 py-1 text-[11px] font-medium transition', tab === t.id ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>{t.label}</button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        {loading && tab === 'dashboard' ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-brand-500" /></div>
        ) : tab === 'dashboard' ? (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-6">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center gap-2 mb-1"><DollarSign className="h-4 w-4 text-red-500" /><span className="text-[10px] font-medium uppercase text-gray-500">Total Spend</span></div>
                <p className="text-xl font-bold text-gray-900">{fmtCurrency(totalSpend)}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center gap-2 mb-1"><ShoppingCart className="h-4 w-4 text-emerald-500" /><span className="text-[10px] font-medium uppercase text-gray-500">Revenue</span></div>
                <p className="text-xl font-bold text-gray-900">{fmtCurrency(totalRevenue)}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center gap-2 mb-1"><ArrowUpRight className="h-4 w-4 text-blue-500" /><span className="text-[10px] font-medium uppercase text-gray-500">Conversions</span></div>
                <p className="text-xl font-bold text-gray-900">{fmt(totalConversions)}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center gap-2 mb-1"><MousePointerClick className="h-4 w-4 text-violet-500" /><span className="text-[10px] font-medium uppercase text-gray-500">Clicks</span></div>
                <p className="text-xl font-bold text-gray-900">{fmt(totalClicks)}</p>
              </div>
            </div>

            {/* Platform summary cards */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 mb-6">
              {PLATFORMS.map(p => {
                const t = platformTotals[p.id];
                const hasData = t.days > 0;
                return (
                  <div key={p.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                    <div className={cn('px-4 py-2 flex items-center justify-between', p.lightBg)}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{p.icon}</span>
                        <span className={cn('text-xs font-bold', p.lightText)}>{p.label}</span>
                      </div>
                      <button onClick={() => setPullModal(p.id)} className={cn('flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition bg-white border border-gray-200 text-gray-600 hover:bg-gray-50')}>
                        <Bot className="h-2.5 w-2.5" /> Pull Data
                      </button>
                    </div>
                    <div className="p-4">
                      {hasData ? (
                        <div className="grid grid-cols-2 gap-3">
                          <div><span className="text-[9px] text-gray-400 uppercase">Spend</span><p className="text-sm font-bold text-gray-900">{fmtCurrency(t.spend)}</p></div>
                          <div><span className="text-[9px] text-gray-400 uppercase">Revenue</span><p className="text-sm font-bold text-gray-900">{fmtCurrency(t.revenue)}</p></div>
                          <div><span className="text-[9px] text-gray-400 uppercase">Conversions</span><p className="text-sm font-bold text-gray-900">{fmt(t.conversions)}</p></div>
                          <div><span className="text-[9px] text-gray-400 uppercase">ROAS</span><p className="text-sm font-bold text-gray-900">{t.spend > 0 ? fmt(t.revenue / t.spend, 2) + 'x' : '—'}</p></div>
                          <div><span className="text-[9px] text-gray-400 uppercase">CPA</span><p className="text-sm font-bold text-gray-900">{t.conversions > 0 ? fmtCurrency(t.spend / t.conversions) : '—'}</p></div>
                          <div><span className="text-[9px] text-gray-400 uppercase">Days</span><p className="text-sm font-bold text-gray-900">{t.days}</p></div>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <AlertTriangle className="mx-auto h-5 w-5 text-gray-300 mb-1" />
                          <p className="text-[11px] text-gray-400 mb-2">No data yet</p>
                          <button onClick={() => setPullModal(p.id)} className={cn('inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[10px] font-semibold text-white', p.color)}>
                            <Bot className="h-3 w-3" /> Set Up Data Pull
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Daily data table */}
            {sortedDates.length > 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Daily Breakdown</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="px-3 py-2 text-left font-semibold text-gray-500">Date</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-500">Platform</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-500">Spend</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-500">Impressions</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-500">Clicks</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-500">CTR</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-500">Conv.</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-500">Revenue</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-500">ROAS</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-500">CPA</th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-500">Detail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedDates.map(date => {
                        const platformData = dateMap.get(date)!;
                        return Object.entries(platformData).map(([pid, s]) => {
                          const pl = PLATFORMS.find(p => p.id === pid);
                          return (
                            <tr key={`${date}-${pid}`} className="border-b border-gray-50 hover:bg-gray-50">
                              <td className="px-3 py-2 font-medium text-gray-900">{date}</td>
                              <td className="px-3 py-2"><span className={cn('rounded-full px-2 py-0.5 text-[9px] font-medium', pl?.lightBg, pl?.lightText)}>{pl?.label || pid}</span></td>
                              <td className="px-3 py-2 text-right font-medium">{fmtCurrency(Number(s.total_spend))}</td>
                              <td className="px-3 py-2 text-right">{fmt(Number(s.total_impressions))}</td>
                              <td className="px-3 py-2 text-right">{fmt(Number(s.total_clicks))}</td>
                              <td className="px-3 py-2 text-right">{fmtPct(Number(s.avg_ctr))}</td>
                              <td className="px-3 py-2 text-right font-medium">{fmt(Number(s.total_conversions))}</td>
                              <td className="px-3 py-2 text-right font-medium text-emerald-600">{fmtCurrency(Number(s.total_revenue))}</td>
                              <td className="px-3 py-2 text-right font-bold">{Number(s.total_spend) > 0 ? fmt(Number(s.total_revenue) / Number(s.total_spend), 2) + 'x' : '—'}</td>
                              <td className="px-3 py-2 text-right">{Number(s.total_conversions) > 0 ? fmtCurrency(Number(s.total_spend) / Number(s.total_conversions)) : '—'}</td>
                              <td className="px-3 py-2 text-center">
                                <button onClick={() => drillDown(pid, date)} className="rounded border border-gray-200 px-2 py-0.5 text-[9px] font-medium text-brand-600 hover:bg-brand-50">View</button>
                              </td>
                            </tr>
                          );
                        });
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
                <BarChart3 className="mx-auto h-8 w-8 text-gray-300 mb-3" />
                <p className="text-sm text-gray-500 mb-1">No performance data yet</p>
                <p className="text-xs text-gray-400 mb-4">Click &ldquo;Pull Data&rdquo; on any platform card above to get started with Cursor cloud agents.</p>
              </div>
            )}

            {/* Campaign drill-down modal */}
            {selectedPlatform && selectedDate && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className="w-full max-w-3xl max-h-[80vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
                  <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                    <div>
                      <h2 className="text-sm font-bold text-gray-900">{PLATFORMS.find(p => p.id === selectedPlatform)?.label} — {selectedDate}</h2>
                      <p className="text-[10px] text-gray-400">{campaigns.length} campaigns</p>
                    </div>
                    <button onClick={() => { setSelectedPlatform(''); setSelectedDate(''); setCampaigns([]); }} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X className="h-4 w-4" /></button>
                  </div>
                  <div className="overflow-x-auto">
                    {drillLoading ? (
                      <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-brand-500" /></div>
                    ) : (
                      <table className="w-full text-[11px]">
                        <thead><tr className="border-b border-gray-100 bg-gray-50">
                          <th className="px-3 py-2 text-left font-semibold text-gray-500">Campaign</th>
                          <th className="px-3 py-2 text-right font-semibold text-gray-500">Spend</th>
                          <th className="px-3 py-2 text-right font-semibold text-gray-500">Impr.</th>
                          <th className="px-3 py-2 text-right font-semibold text-gray-500">Clicks</th>
                          <th className="px-3 py-2 text-right font-semibold text-gray-500">CTR</th>
                          <th className="px-3 py-2 text-right font-semibold text-gray-500">Conv.</th>
                          <th className="px-3 py-2 text-right font-semibold text-gray-500">Revenue</th>
                          <th className="px-3 py-2 text-right font-semibold text-gray-500">ROAS</th>
                        </tr></thead>
                        <tbody>{campaigns.map((c, i) => (
                          <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="px-3 py-2 font-medium text-gray-900 max-w-[200px] truncate">{c.campaign_name || '—'}</td>
                            <td className="px-3 py-2 text-right">{fmtCurrency(Number(c.spend))}</td>
                            <td className="px-3 py-2 text-right">{fmt(Number(c.impressions))}</td>
                            <td className="px-3 py-2 text-right">{fmt(Number(c.clicks))}</td>
                            <td className="px-3 py-2 text-right">{fmtPct(Number(c.ctr))}</td>
                            <td className="px-3 py-2 text-right font-medium">{fmt(Number(c.conversions))}</td>
                            <td className="px-3 py-2 text-right font-medium text-emerald-600">{fmtCurrency(Number(c.revenue))}</td>
                            <td className="px-3 py-2 text-right font-bold">{Number(c.spend) > 0 ? fmt(Number(c.revenue) / Number(c.spend), 2) + 'x' : '—'}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : tab === 'sales' ? (
          <ModeSalesTab modeData={modeData} modeLoading={modeLoading} onRefresh={loadModeData} />
        ) : tab === 'agents' ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Agent Task History</h2>
              <div className="flex items-center gap-2">
                {PLATFORMS.map(p => (
                  <button key={p.id} onClick={() => setPullModal(p.id)} className={cn('flex items-center gap-1 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition', p.lightBg, p.lightText, 'border-gray-200 hover:shadow-sm')}>
                    <Bot className="h-3 w-3" /> Pull {p.label}
                  </button>
                ))}
              </div>
            </div>
            {tasks.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
                <Bot className="mx-auto h-8 w-8 text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">No agent tasks yet</p>
                <p className="text-xs text-gray-400 mt-1">Click a &ldquo;Pull&rdquo; button above to get started.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.map(t => {
                  const st = TASK_STATUS[t.status as keyof typeof TASK_STATUS] || TASK_STATUS.pending;
                  const pl = PLATFORMS.find(p => p.id === t.platform);
                  return (
                    <div key={t.id} className="rounded-xl border border-gray-200 bg-white p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', st.color)}>{st.label}</span>
                          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', pl?.lightBg, pl?.lightText)}>{pl?.label || t.platform}</span>
                          <span className="text-[10px] text-gray-400">{t.task_type}</span>
                          {t.date_range_start && <span className="text-[10px] text-gray-400">{t.date_range_start} → {t.date_range_end}</span>}
                        </div>
                        <span className="text-[10px] text-gray-400">{new Date(t.created_at).toLocaleString()}</span>
                      </div>
                      {t.error && <p className="mt-2 text-[11px] text-red-600 bg-red-50 rounded-lg px-3 py-1.5">{t.error}</p>}
                      {t.result && (
                        <div className="mt-2 text-[11px] text-gray-500 bg-gray-50 rounded-lg px-3 py-1.5">
                          <pre className="whitespace-pre-wrap">{JSON.stringify(t.result, null, 2).slice(0, 500)}</pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          /* Instructions tab */
          <>
            <div className="mb-4">
              <p className="text-xs text-gray-500">Copy these instructions and paste them into a Cursor cloud agent (Background Agent) to automatically pull performance data from each platform. The agent will log into the platform, extract the data, and POST it to the Funnel AI API.</p>
            </div>
            <div className="space-y-4">
              {PLATFORMS.map(p => (
                <div key={p.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                  <button onClick={() => setExpandedInstruction(expandedInstruction === p.id ? null : p.id)} className={cn('w-full flex items-center justify-between px-5 py-3', p.lightBg)}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{p.icon}</span>
                      <span className={cn('text-sm font-bold', p.lightText)}>{p.label} Agent Instructions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={e => { e.stopPropagation(); copyInstructions(p.id); }} className="flex items-center gap-1 rounded-md bg-white border border-gray-200 px-2.5 py-1 text-[10px] font-medium text-gray-600 hover:bg-gray-50">
                        {copied === p.id ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                        {copied === p.id ? 'Copied!' : 'Copy'}
                      </button>
                      {expandedInstruction === p.id ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                    </div>
                  </button>
                  {expandedInstruction === p.id && (
                    <div className="p-5 border-t border-gray-100">
                      <pre className="whitespace-pre-wrap text-[11px] text-gray-700 leading-relaxed font-mono bg-gray-50 rounded-lg p-4 max-h-[500px] overflow-y-auto">{AGENT_INSTRUCTIONS[p.id]}</pre>
                      <div className="mt-3 flex items-center gap-2">
                        <button onClick={() => triggerAgent(p.id)} disabled={!!triggering} className={cn('flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition', p.color, 'hover:opacity-90 disabled:opacity-60')}>
                          {triggering === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} Create Agent Task
                        </button>
                        <span className="text-[10px] text-gray-400">Creates a task record. Run a Cursor cloud agent with these instructions to execute it.</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-brand-100 bg-brand-50/30 p-5">
              <h3 className="text-xs font-bold text-brand-700 uppercase tracking-wide mb-3">How This Works</h3>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
                {[
                  { step: '1', title: 'Copy Instructions', desc: 'Copy the agent instructions for the platform you want to pull data from.' },
                  { step: '2', title: 'Start Cloud Agent', desc: 'Open a Cursor cloud agent (Background Agent) and paste the instructions.' },
                  { step: '3', title: 'Agent Extracts Data', desc: 'The agent logs into the ad platform, navigates to the right views, and extracts campaign data.' },
                  { step: '4', title: 'Data Appears Here', desc: 'The agent POSTs the data to the Funnel AI API and it shows up on the dashboard automatically.' },
                ].map(s => (
                  <div key={s.step} className="flex gap-3">
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">{s.step}</div>
                    <div><p className="text-[11px] font-semibold text-gray-900">{s.title}</p><p className="text-[10px] text-gray-500 mt-0.5">{s.desc}</p></div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
                <p className="text-[11px] text-amber-700"><strong>Daily automation:</strong> To run this daily, set up a recurring Cursor cloud agent task for each platform. The agent will pull yesterday&apos;s data each morning and POST it to Funnel AI.</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Pull Data Modal */}
      {pullModalPlatform && (
        <PullDataModal
          platform={pullModalPlatform}
          onClose={() => setPullModal(null)}
          onCopy={copyInstructions}
          onCreateTask={(id) => { triggerAgent(id); setPullModal(null); }}
          copied={copied}
          triggering={triggering}
        />
      )}
    </div>
  );
}
