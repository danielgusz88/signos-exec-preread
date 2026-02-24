import type { Context } from "@netlify/functions";

/**
 * Mode Analytics Data — Netlify Function
 * Fetches pre-computed dataset results from Mode API and aggregates for dashboard consumption.
 *
 * Datasets used:
 * - CHURN_BY_PAYMENT_CAPTURE: Monthly churn tracking by plan (344K rows, 36K users)
 * - MRR: Monthly Recurring Revenue by plan
 * - RENEWAL_RATE: Monthly renewal tracking (36K rows, 6K users)
 * - CUSTOMER_STAGES_FLATTENED: Acquisition funnel stages (30K rows, 27K users)
 */

const MODE_API_BASE = 'https://app.mode.com/api';

// Known dataset run endpoints (pre-computed results)
const DATASETS = {
  churn: {
    report: '7705ac7b72df',
    run: '979effdb6722',
    query: '80c6e22c59c1',
  },
  mrr: {
    report: 'a9247d33f12e',
    run: 'c20890fc0720',
    query: '3477817c0ab3',
  },
  renewal: {
    report: '8a72deca281d',
    run: '956575908b89',
    query: '919fcd8a2452',
  },
  customerStages: {
    report: '917459766eb8',
    run: '73d807924116',
    query: 'c3ddcd75646b',
  },
};

function getModeCredentials() {
  const apiToken = Netlify.env.get("MODE_API_TOKEN");
  const apiSecret = Netlify.env.get("MODE_API_SECRET");
  const workspace = Netlify.env.get("MODE_WORKSPACE");
  if (!apiToken || !apiSecret || !workspace) return null;
  return { apiToken, apiSecret, workspace };
}

async function fetchCSV(
  creds: { apiToken: string; apiSecret: string; workspace: string },
  reportToken: string,
  runToken: string,
  queryToken: string,
): Promise<string> {
  const credentials = btoa(`${creds.apiToken}:${creds.apiSecret}`);
  const url = `${MODE_API_BASE}/${creds.workspace}/reports/${reportToken}/runs/${runToken}/query_runs/${queryToken}/results/content.csv`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${credentials}`,
      'Accept-Encoding': 'gzip',
    },
  });

  if (!response.ok) {
    throw new Error(`Mode CSV fetch failed: ${response.status}`);
  }

  return response.text();
}

function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];

  // Handle quoted CSV headers
  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// ── Aggregation Functions ────────────────────────────────────────────────────

interface MonthlyChurn {
  month: string;
  newSubs: number;
  lostSubs: number;
  activeEnd: number;
  activeStart: number;
  churnRate: number;
}

interface PlanBreakdown {
  plan: string;
  activeCount: number;
  churnRate: number;
  label: string;
}

function aggregateChurnData(rows: Record<string, string>[]) {
  const monthly: Record<string, { new: number; lost: number; active: number; prior: number }> = {};
  const planCounts: Record<string, number> = {};
  const statusCounts: Record<string, number> = {};
  const users = new Set<string>();

  for (const row of rows) {
    const month = (row['MONTH_ON_PLATFORM'] || '').slice(0, 7);
    if (month > '2026' || month < '2020') continue;

    users.add(row['USER_ID']);

    if (!monthly[month]) monthly[month] = { new: 0, lost: 0, active: 0, prior: 0 };
    monthly[month].new += parseInt(row['NEW_SUBSCRIPTION'] || '0') || 0;
    monthly[month].lost += parseInt(row['LOST_SUBSCRIPTION'] || '0') || 0;
    monthly[month].active += parseInt(row['ACTIVE_AT_END_OF_MONTH'] || '0') || 0;
    monthly[month].prior += parseInt(row['ACTIVE_AT_END_OF_PRIOR_MONTH'] || '0') || 0;

    const plan = row['SUBSCRIPTION_PLAN'] || 'Unknown';
    planCounts[plan] = (planCounts[plan] || 0) + 1;

    const status = row['SUBSCRIPTION_STATUS'] || 'Unknown';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  }

  // Build monthly churn array
  const monthlyChurn: MonthlyChurn[] = Object.entries(monthly)
    .filter(([m]) => m >= '2021-01' && m <= '2025-12')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, d]) => ({
      month,
      newSubs: d.new,
      lostSubs: d.lost,
      activeEnd: d.active,
      activeStart: d.prior,
      churnRate: d.prior > 0 ? (d.lost / d.prior) * 100 : 0,
    }));

  // Simplify plan names
  const planLabelMap: Record<string, string> = {
    signos_semi_annual_plan: '6-Month',
    signos_semi_annual_split_plan: '6-Month Split',
    signos_quarterly_plan: 'Quarterly',
    signos_semi_annual_billed_monthly_2_shipments_plan: '6-Month (Monthly Bill)',
    signos_quarterly_billed_monthly_plan: 'Quarterly (Monthly Bill)',
    signos_monthly_plan: 'Monthly',
    signos_flex_plan: 'Flex',
    signos_trial_plan: 'Trial',
    'Signos Glucose Monitoring System: 6-Month Plan': '6-Month GMS',
    'Signos Glucose Monitoring System: 6-Month Maintenance Plan': '6-Month Maintenance',
    'Signos Glucose Monitoring System: 3-Month Plan': '3-Month GMS',
    'Signos Glucose Monitoring System: 1-Month Plan': '1-Month GMS',
    '6 Months of Signos': '6-Month Legacy',
  };

  const planBreakdown: PlanBreakdown[] = Object.entries(planCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([plan, count]) => ({
      plan,
      activeCount: count,
      churnRate: 0, // Will be computed below
      label: planLabelMap[plan] || plan,
    }));

  // Current metrics (most recent month with data)
  const recentMonths = monthlyChurn.filter((m) => m.activeEnd > 0);
  const latest = recentMonths[recentMonths.length - 1];
  const prevMonth = recentMonths.length > 1 ? recentMonths[recentMonths.length - 2] : null;

  // Trailing 3-month avg churn
  const last3 = recentMonths.slice(-3);
  const avgChurn3m = last3.length > 0
    ? last3.reduce((s, m) => s + m.churnRate, 0) / last3.length
    : 0;

  // Peak active users
  const peakActive = Math.max(...recentMonths.map((m) => m.activeEnd));
  const peakMonth = recentMonths.find((m) => m.activeEnd === peakActive)?.month || '';

  return {
    totalUsers: users.size,
    totalRows: rows.length,
    monthlyChurn,
    planBreakdown,
    statusCounts,
    currentActive: latest?.activeEnd || 0,
    currentChurnRate: latest?.churnRate || 0,
    previousActive: prevMonth?.activeEnd || 0,
    previousChurnRate: prevMonth?.churnRate || 0,
    avgChurn3Month: avgChurn3m,
    peakActive,
    peakMonth,
    latestMonth: latest?.month || '',
  };
}

function aggregateMRRData(rows: Record<string, string>[]) {
  const monthly: Record<string, { total: number; plans: Record<string, number> }> = {};

  for (const row of rows) {
    const month = (row['PAID_MONTH'] || '').slice(0, 7);
    const plan = row['SUBSCRIPTION_PLAN'] || 'Unknown';
    const mrr = parseFloat(row['WEIGHT_AVG'] || '0') || 0;

    if (!monthly[month]) monthly[month] = { total: 0, plans: {} };
    monthly[month].total += mrr;
    monthly[month].plans[plan] = (monthly[month].plans[plan] || 0) + mrr;
  }

  const monthlyMRR = Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, d]) => ({
      month,
      mrr: Math.round(d.total),
      plans: d.plans,
    }));

  const latest = monthlyMRR[monthlyMRR.length - 1];
  const peakMRR = Math.max(...monthlyMRR.map((m) => m.mrr));

  return {
    monthlyMRR,
    currentMRR: latest?.mrr || 0,
    peakMRR,
    latestMonth: latest?.month || '',
  };
}

function aggregateRenewalData(rows: Record<string, string>[]) {
  const monthly: Record<string, { upForRenewal: number; renewed: number; total: number }> = {};
  const users = new Set<string>();

  for (const row of rows) {
    const month = (row['MONTH'] || '').slice(0, 7);
    if (!month) continue;
    users.add(row['USER_ID']);

    if (!monthly[month]) monthly[month] = { upForRenewal: 0, renewed: 0, total: 0 };
    monthly[month].upForRenewal += parseInt(row['UP_FOR_RENEWAL'] || '0') || 0;
    monthly[month].renewed += parseInt(row['RENEWED'] || '0') || 0;
    monthly[month].total += 1;
  }

  const monthlyRenewal = Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, d]) => ({
      month,
      upForRenewal: d.upForRenewal,
      renewed: d.renewed,
      renewalRate: d.upForRenewal > 0 ? (d.renewed / d.upForRenewal) * 100 : 0,
      totalRecords: d.total,
    }));

  // Calculate overall renewal rate across months with renewals
  const withRenewals = monthlyRenewal.filter((m) => m.upForRenewal > 0);
  const totalUp = withRenewals.reduce((s, m) => s + m.upForRenewal, 0);
  const totalRenewed = withRenewals.reduce((s, m) => s + m.renewed, 0);

  return {
    totalUsers: users.size,
    monthlyRenewal,
    overallRenewalRate: totalUp > 0 ? (totalRenewed / totalUp) * 100 : 0,
    totalUpForRenewal: totalUp,
    totalRenewed,
  };
}

function aggregateCustomerStages(rows: Record<string, string>[]) {
  const stageCounts: Record<string, number> = {};
  const total = rows.length;
  const currentStageCounts: Record<string, number> = {};

  const stageColumns = [
    'PAYMENT_AUTH',
    'CLINICAL_PROTOCOL_COMPLETED',
    'EHR_DR_APPROVED',
    'PAYMENT_CAPTURE',
    'PACKAGE_SHIPPED',
    'PACKAGE_DELIVERED',
    'ONBOARDING_STARTED',
    'ONBOARDING_COMPLETED',
    'CUSTOMER_CANCELLED',
    'CUSTOMER_REJECTED',
    'SIGNOS_REJECTED',
    'SIGNOS_REFUNDED',
  ];

  for (const row of rows) {
    for (const stage of stageColumns) {
      const val = row[stage] || '';
      if (val && val.trim()) {
        stageCounts[stage] = (stageCounts[stage] || 0) + 1;
      }
    }

    const currentStage = row['CURRENT_STAGE'] || 'Unknown';
    currentStageCounts[currentStage] = (currentStageCounts[currentStage] || 0) + 1;
  }

  // Build funnel
  const funnelStages = [
    'PAYMENT_AUTH',
    'CLINICAL_PROTOCOL_COMPLETED',
    'EHR_DR_APPROVED',
    'PAYMENT_CAPTURE',
    'PACKAGE_SHIPPED',
    'PACKAGE_DELIVERED',
    'ONBOARDING_STARTED',
    'ONBOARDING_COMPLETED',
  ];

  const labelMap: Record<string, string> = {
    PAYMENT_AUTH: 'Payment Authorized',
    CLINICAL_PROTOCOL_COMPLETED: 'Clinical Protocol',
    EHR_DR_APPROVED: 'Doctor Approved',
    PAYMENT_CAPTURE: 'Payment Captured',
    PACKAGE_SHIPPED: 'Package Shipped',
    PACKAGE_DELIVERED: 'Package Delivered',
    ONBOARDING_STARTED: 'Onboarding Started',
    ONBOARDING_COMPLETED: 'Onboarding Completed',
  };

  const funnel = funnelStages.map((stage) => {
    const count = stageCounts[stage] || 0;
    return {
      stage,
      label: labelMap[stage] || stage,
      count,
      percent: total > 0 ? (count / total) * 100 : 0,
    };
  });

  // Drop-off points
  const dropOffStages = ['CUSTOMER_CANCELLED', 'SIGNOS_REJECTED', 'SIGNOS_REFUNDED'];
  const dropOffs = dropOffStages.map((stage) => ({
    stage,
    count: stageCounts[stage] || 0,
    percent: total > 0 ? ((stageCounts[stage] || 0) / total) * 100 : 0,
  }));

  // Current stage distribution
  const currentStageDistribution = Object.entries(currentStageCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([stage, count]) => ({
      stage,
      count,
      percent: total > 0 ? (count / total) * 100 : 0,
    }));

  return {
    totalCustomers: total,
    funnel,
    dropOffs,
    currentStageDistribution,
  };
}

// ── Main Handler ─────────────────────────────────────────────────────────────

export default async (req: Request, context: Context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const creds = getModeCredentials();
  if (!creds) {
    return new Response(
      JSON.stringify({
        connected: false,
        error: 'Mode credentials not configured. Set MODE_API_TOKEN, MODE_API_SECRET, and MODE_WORKSPACE.',
      }),
      { status: 200, headers: corsHeaders },
    );
  }

  try {
    // Fetch all datasets in parallel
    const [churnCSV, mrrCSV, renewalCSV, stagesCSV] = await Promise.all([
      fetchCSV(creds, DATASETS.churn.report, DATASETS.churn.run, DATASETS.churn.query),
      fetchCSV(creds, DATASETS.mrr.report, DATASETS.mrr.run, DATASETS.mrr.query),
      fetchCSV(creds, DATASETS.renewal.report, DATASETS.renewal.run, DATASETS.renewal.query),
      fetchCSV(creds, DATASETS.customerStages.report, DATASETS.customerStages.run, DATASETS.customerStages.query),
    ]);

    // Parse and aggregate
    const churnData = aggregateChurnData(parseCSV(churnCSV));
    const mrrData = aggregateMRRData(parseCSV(mrrCSV));
    const renewalData = aggregateRenewalData(parseCSV(renewalCSV));
    const stagesData = aggregateCustomerStages(parseCSV(stagesCSV));

    // Compute top-level KPIs
    const kpis = {
      activeSubscribers: churnData.currentActive,
      activeChange: churnData.previousActive > 0
        ? ((churnData.currentActive - churnData.previousActive) / churnData.previousActive) * 100
        : 0,
      monthlyChurnRate: churnData.currentChurnRate,
      avgChurn3Month: churnData.avgChurn3Month,
      currentMRR: mrrData.currentMRR,
      peakMRR: mrrData.peakMRR,
      renewalRate: renewalData.overallRenewalRate,
      totalLifetimeUsers: churnData.totalUsers,
      peakActiveUsers: churnData.peakActive,
      peakActiveMonth: churnData.peakMonth,
      customerConversionRate: stagesData.totalCustomers > 0
        ? ((stagesData.funnel.find((f) => f.stage === 'ONBOARDING_COMPLETED')?.count || 0) / stagesData.totalCustomers) * 100
        : 0,
    };

    return new Response(
      JSON.stringify({
        connected: true,
        workspace: creds.workspace,
        kpis,
        churn: churnData,
        mrr: mrrData,
        renewal: renewalData,
        funnel: stagesData,
        lastUpdated: new Date().toISOString(),
      }),
      { status: 200, headers: corsHeaders },
    );
  } catch (error: any) {
    console.error('[MODE] Data aggregation error:', error);
    return new Response(
      JSON.stringify({
        connected: false,
        error: error.message || 'Failed to fetch Mode data',
      }),
      { status: 500, headers: corsHeaders },
    );
  }
};

// Route configured via netlify.toml redirect
