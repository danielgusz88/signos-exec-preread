import type { Context } from "@netlify/functions";

/**
 * Mode Analytics Extended Data — Netlify Function
 * Fetches Shopify revenue, LTV by cohort, subscription revenue, product catalog,
 * and user journey/drop-off data from Mode reports (backed by Snowflake).
 *
 * Queries (in report 704faa5fc878):
 * - funnelai_shopify_monthly_revenue: Monthly Shopify revenue by product
 * - funnelai_ltv_by_cohort: LTV by signup cohort month
 * - funnelai_subscription_revenue: Invoice-based subscription revenue by plan
 * - funnelai_shopify_products: Shopify product catalog with sales stats
 * - funnelai_user_journey_dropoff: Customer journey timing & drop-off analysis
 */

const MODE_API_BASE = 'https://app.mode.com/api';

// Query tokens from report 704faa5fc878, run 5661a0116be7
const REPORT_TOKEN = '704faa5fc878';
const QUERIES = {
  shopifyRevenue: { query: 'efa56fc2339e', name: 'funnelai_shopify_monthly_revenue' },
  ltvByCohort: { query: '8dda7ba3db5a', name: 'funnelai_ltv_by_cohort' },
  subscriptionRevenue: { query: '6163389aac4f', name: 'funnelai_subscription_revenue' },
  shopifyProducts: { query: '06ab39fd6c01', name: 'funnelai_shopify_products' },
  userJourney: { query: '913c6c965b3d', name: 'funnelai_user_journey_dropoff' },
};

function getModeCredentials() {
  const apiToken = Netlify.env.get("MODE_API_TOKEN");
  const apiSecret = Netlify.env.get("MODE_API_SECRET");
  const workspace = Netlify.env.get("MODE_WORKSPACE");
  if (!apiToken || !apiSecret || !workspace) return null;
  return { apiToken, apiSecret, workspace };
}

async function getLatestRunToken(
  creds: { apiToken: string; apiSecret: string; workspace: string },
): Promise<string | null> {
  const credentials = btoa(`${creds.apiToken}:${creds.apiSecret}`);
  const url = `${MODE_API_BASE}/${creds.workspace}/reports/${REPORT_TOKEN}/runs?page%5Bsize%5D=1`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${credentials}`,
      Accept: 'application/hal+json',
    },
  });
  if (!response.ok) return null;
  const data = await response.json();
  const runs = data?._embedded?.report_runs || [];
  if (runs.length === 0) return null;
  // Only use succeeded runs
  const succeeded = runs.find((r: any) => r.state === 'succeeded');
  return succeeded?.token || null;
}

async function triggerNewRun(
  creds: { apiToken: string; apiSecret: string; workspace: string },
): Promise<string | null> {
  const credentials = btoa(`${creds.apiToken}:${creds.apiSecret}`);
  const url = `${MODE_API_BASE}/${creds.workspace}/reports/${REPORT_TOKEN}/runs`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      Accept: 'application/hal+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ parameters: {} }),
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data?.token || null;
}

async function waitForRun(
  creds: { apiToken: string; apiSecret: string; workspace: string },
  runToken: string,
  maxWaitMs = 120000,
): Promise<boolean> {
  const credentials = btoa(`${creds.apiToken}:${creds.apiSecret}`);
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const url = `${MODE_API_BASE}/${creds.workspace}/reports/${REPORT_TOKEN}/runs/${runToken}`;
    const response = await fetch(url, {
      headers: { Authorization: `Basic ${credentials}`, Accept: 'application/hal+json' },
    });
    if (response.ok) {
      const data = await response.json();
      if (data.state === 'succeeded') return true;
      if (data.state === 'failed' || data.state === 'cancelled') return false;
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  return false;
}

async function fetchQueryCSV(
  creds: { apiToken: string; apiSecret: string; workspace: string },
  runToken: string,
  queryToken: string,
): Promise<string> {
  const credentials = btoa(`${creds.apiToken}:${creds.apiSecret}`);
  // First get the query_run token for this query in this run
  const qrUrl = `${MODE_API_BASE}/${creds.workspace}/reports/${REPORT_TOKEN}/runs/${runToken}/query_runs`;
  const qrResponse = await fetch(qrUrl, {
    headers: { Authorization: `Basic ${credentials}`, Accept: 'application/hal+json' },
  });
  if (!qrResponse.ok) throw new Error(`Failed to fetch query runs: ${qrResponse.status}`);
  const qrData = await qrResponse.json();
  const queryRuns = qrData?._embedded?.query_runs || [];

  // Find the query_run that matches our query token
  const matchingRun = queryRuns.find((qr: any) => {
    const qLink = qr._links?.query?.href || '';
    return qLink.endsWith(`/${queryToken}`);
  });

  if (!matchingRun) throw new Error(`No query run found for query ${queryToken}`);
  const queryRunToken = matchingRun.token;

  const url = `${MODE_API_BASE}/${creds.workspace}/reports/${REPORT_TOKEN}/runs/${runToken}/query_runs/${queryRunToken}/results/content.csv`;
  const response = await fetch(url, {
    headers: { Authorization: `Basic ${credentials}` },
  });
  if (!response.ok) throw new Error(`CSV fetch failed: ${response.status}`);
  return response.text();
}

function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
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
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else { current += char; }
  }
  result.push(current.trim());
  return result;
}

// ── Aggregation Functions ────────────────────────────────────────────────────

function aggregateShopifyRevenue(rows: Record<string, string>[]) {
  const monthly: Record<string, {
    orderCount: number; uniqueCustomers: number;
    totalRevenue: number; subtotalRevenue: number;
    products: Record<string, { orders: number; revenue: number }>;
  }> = {};

  for (const row of rows) {
    const month = (row['SALE_MONTH'] || '').slice(0, 7);
    const product = row['PRODUCT_NAME'] || 'Unknown';
    const orders = parseInt(row['ORDER_COUNT'] || '0') || 0;
    const customers = parseInt(row['UNIQUE_CUSTOMERS'] || '0') || 0;
    const revenue = parseFloat(row['TOTAL_REVENUE'] || '0') || 0;
    const subtotal = parseFloat(row['SUBTOTAL_REVENUE'] || '0') || 0;

    if (!monthly[month]) monthly[month] = { orderCount: 0, uniqueCustomers: 0, totalRevenue: 0, subtotalRevenue: 0, products: {} };
    monthly[month].orderCount += orders;
    monthly[month].uniqueCustomers += customers;
    monthly[month].totalRevenue += revenue;
    monthly[month].subtotalRevenue += subtotal;

    // Simplify product name for grouping
    const simpleName = simplifyProductName(product);
    if (!monthly[month].products[simpleName]) monthly[month].products[simpleName] = { orders: 0, revenue: 0 };
    monthly[month].products[simpleName].orders += orders;
    monthly[month].products[simpleName].revenue += revenue;
  }

  const monthlyData = Object.entries(monthly)
    .sort(([a], [b]) => b.localeCompare(a)) // Most recent first
    .map(([month, d]) => ({
      month,
      orderCount: d.orderCount,
      uniqueCustomers: d.uniqueCustomers,
      totalRevenue: Math.round(d.totalRevenue * 100) / 100,
      subtotalRevenue: Math.round(d.subtotalRevenue * 100) / 100,
      avgOrderValue: d.orderCount > 0 ? Math.round((d.totalRevenue / d.orderCount) * 100) / 100 : 0,
      products: d.products,
    }));

  const latest = monthlyData[0];
  const prev = monthlyData[1];
  const totalAllTime = monthlyData.reduce((s, m) => s + m.totalRevenue, 0);

  return {
    monthlyData,
    currentMonth: {
      month: latest?.month || '',
      revenue: latest?.totalRevenue || 0,
      orders: latest?.orderCount || 0,
      customers: latest?.uniqueCustomers || 0,
      aov: latest?.avgOrderValue || 0,
    },
    previousMonth: {
      month: prev?.month || '',
      revenue: prev?.totalRevenue || 0,
      orders: prev?.orderCount || 0,
    },
    revenueChange: prev && prev.totalRevenue > 0
      ? ((latest?.totalRevenue || 0) - prev.totalRevenue) / prev.totalRevenue * 100
      : 0,
    totalAllTimeRevenue: Math.round(totalAllTime * 100) / 100,
  };
}

function aggregateLTVByCohort(rows: Record<string, string>[]) {
  const cohorts = rows.map((row) => ({
    cohortMonth: (row['COHORT_MONTH'] || '').slice(0, 7),
    cohortSize: parseInt(row['COHORT_SIZE'] || '0') || 0,
    payingUsers: parseInt(row['PAYING_USERS'] || '0') || 0,
    totalRevenue: parseFloat(row['COHORT_TOTAL_REVENUE'] || '0') || 0,
    avgLTV: parseFloat(row['AVG_LTV'] || '0') || 0,
    medianLTV: parseFloat(row['MEDIAN_LTV'] || '0') || 0,
    avgLifetimeMonths: parseFloat(row['AVG_LIFETIME_MONTHS'] || '0') || 0,
    avgInvoicesPerUser: parseFloat(row['AVG_INVOICES_PER_USER'] || '0') || 0,
    churnedUsers: parseInt(row['CHURNED_USERS'] || '0') || 0,
    churnRatePct: parseFloat(row['CHURN_RATE_PCT'] || '0') || 0,
  })).sort((a, b) => a.cohortMonth.localeCompare(b.cohortMonth));

  // Overall metrics
  const totalUsers = cohorts.reduce((s, c) => s + c.cohortSize, 0);
  const totalRevenue = cohorts.reduce((s, c) => s + c.totalRevenue, 0);
  const overallLTV = totalUsers > 0 ? totalRevenue / totalUsers : 0;

  // Recent 6 months average LTV
  const recent6 = cohorts.slice(-6);
  const recentAvgLTV = recent6.length > 0
    ? recent6.reduce((s, c) => s + c.avgLTV, 0) / recent6.length
    : 0;

  // LTV trend (latest vs 12 months ago)
  const latest = cohorts[cohorts.length - 1];
  const yearAgo = cohorts.find(c => {
    const d1 = new Date(latest?.cohortMonth + '-01');
    const d2 = new Date(c.cohortMonth + '-01');
    return Math.abs((d1.getTime() - d2.getTime()) / (30 * 24 * 60 * 60 * 1000) - 12) < 2;
  });

  return {
    cohorts,
    overallLTV: Math.round(overallLTV * 100) / 100,
    recentAvgLTV: Math.round(recentAvgLTV * 100) / 100,
    totalUsers,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    ltvTrend: yearAgo && latest
      ? Math.round(((latest.avgLTV - yearAgo.avgLTV) / yearAgo.avgLTV) * 10000) / 100
      : 0,
    avgLifetimeMonths: cohorts.length > 0
      ? Math.round(cohorts.reduce((s, c) => s + c.avgLifetimeMonths, 0) / cohorts.length * 10) / 10
      : 0,
  };
}

function aggregateSubscriptionRevenue(rows: Record<string, string>[]) {
  const monthly: Record<string, {
    totalRevenue: number; invoiceCount: number; uniqueUsers: number;
    totalDiscounts: number;
    byPlan: Record<string, { revenue: number; count: number }>;
    byContext: Record<string, { revenue: number; count: number }>;
  }> = {};

  for (const row of rows) {
    const month = (row['REVENUE_MONTH'] || '').slice(0, 7);
    const plan = simplifyPlanName(row['SUBSCRIPTION_PLAN_INVOICED'] || 'Unknown');
    const context = row['INVOICE_CONTEXT'] || 'unknown';
    const revenue = parseFloat(row['TOTAL_REVENUE'] || '0') || 0;
    const count = parseInt(row['INVOICE_COUNT'] || '0') || 0;
    const users = parseInt(row['UNIQUE_USERS'] || '0') || 0;
    const discounts = parseFloat(row['TOTAL_DISCOUNTS'] || '0') || 0;

    if (!monthly[month]) monthly[month] = { totalRevenue: 0, invoiceCount: 0, uniqueUsers: 0, totalDiscounts: 0, byPlan: {}, byContext: {} };
    monthly[month].totalRevenue += revenue;
    monthly[month].invoiceCount += count;
    monthly[month].uniqueUsers += users;
    monthly[month].totalDiscounts += discounts;

    if (!monthly[month].byPlan[plan]) monthly[month].byPlan[plan] = { revenue: 0, count: 0 };
    monthly[month].byPlan[plan].revenue += revenue;
    monthly[month].byPlan[plan].count += count;

    if (!monthly[month].byContext[context]) monthly[month].byContext[context] = { revenue: 0, count: 0 };
    monthly[month].byContext[context].revenue += revenue;
    monthly[month].byContext[context].count += count;
  }

  const monthlyData = Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, d]) => ({
      month,
      totalRevenue: Math.round(d.totalRevenue * 100) / 100,
      invoiceCount: d.invoiceCount,
      uniqueUsers: d.uniqueUsers,
      totalDiscounts: Math.round(d.totalDiscounts * 100) / 100,
      arpu: d.uniqueUsers > 0 ? Math.round(d.totalRevenue / d.uniqueUsers * 100) / 100 : 0,
      byPlan: d.byPlan,
      byContext: d.byContext,
    }));

  // Compute new vs renewal revenue
  const latestMonth = monthlyData[monthlyData.length - 1];
  const newRevenue = latestMonth?.byContext['subscription_start']?.revenue || 0;
  const renewalRevenue = latestMonth?.byContext['subscription_renewal']?.revenue || 0;

  return {
    monthlyData,
    latestMonth: latestMonth?.month || '',
    latestRevenue: latestMonth?.totalRevenue || 0,
    latestARPU: latestMonth?.arpu || 0,
    newVsRenewal: {
      newRevenue: Math.round(newRevenue * 100) / 100,
      renewalRevenue: Math.round(renewalRevenue * 100) / 100,
      renewalPct: latestMonth?.totalRevenue ? Math.round(renewalRevenue / latestMonth.totalRevenue * 10000) / 100 : 0,
    },
  };
}

function aggregateShopifyProducts(rows: Record<string, string>[]) {
  const products = rows.map((row) => ({
    productId: row['PRODUCT_ID'] || '',
    name: row['PRODUCT_NAME'] || 'Unknown',
    variant: row['VARIANT_TITLE'] || '',
    orderCount: parseInt(row['ORDER_COUNT'] || '0') || 0,
    uniqueBuyers: parseInt(row['UNIQUE_BUYERS'] || '0') || 0,
    totalRevenue: parseFloat(row['TOTAL_PRODUCT_REVENUE'] || '0') || 0,
    avgPrice: parseFloat(row['AVG_PRICE'] || '0') || 0,
    firstOrderDate: (row['FIRST_ORDER_DATE'] || '').slice(0, 10),
    lastOrderDate: (row['LAST_ORDER_DATE'] || '').slice(0, 10),
  })).sort((a, b) => b.totalRevenue - a.totalRevenue);

  // Simplify and group by product category
  const categories: Record<string, { revenue: number; orders: number; buyers: number }> = {};
  for (const p of products) {
    const cat = simplifyProductName(p.name);
    if (!categories[cat]) categories[cat] = { revenue: 0, orders: 0, buyers: 0 };
    categories[cat].revenue += p.totalRevenue;
    categories[cat].orders += p.orderCount;
    categories[cat].buyers += p.uniqueBuyers;
  }

  return {
    products: products.slice(0, 30), // Top 30
    categories: Object.entries(categories)
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .map(([name, d]) => ({
        name,
        revenue: Math.round(d.revenue * 100) / 100,
        orders: d.orders,
        buyers: d.buyers,
      })),
    totalProducts: products.length,
    totalRevenue: Math.round(products.reduce((s, p) => s + p.totalRevenue, 0) * 100) / 100,
  };
}

function aggregateUserJourney(rows: Record<string, string>[]) {
  // Group by acquisition month
  const monthly: Record<string, {
    total: number;
    byStatus: Record<string, number>;
    byStage: Record<string, number>;
    byPlan: Record<string, number>;
    avgDaysToOnboard: number[];
    avgDaysActive: number[];
  }> = {};

  for (const row of rows) {
    const month = (row['ACQUISITION_MONTH'] || '').slice(0, 7);
    const status = row['USER_STATUS'] || 'Unknown';
    const stage = row['CURRENT_STAGE'] || 'Unknown';
    const plan = simplifyPlanName(row['CURRENT_SUBSCRIPTION_PLAN'] || 'Unknown');
    const count = parseInt(row['USER_COUNT'] || '0') || 0;
    const daysOnboard = parseFloat(row['AVG_DAYS_TO_ONBOARD'] || '');
    const daysActive = parseFloat(row['AVG_DAYS_ACTIVE'] || '');

    if (!monthly[month]) monthly[month] = { total: 0, byStatus: {}, byStage: {}, byPlan: {}, avgDaysToOnboard: [], avgDaysActive: [] };
    monthly[month].total += count;
    monthly[month].byStatus[status] = (monthly[month].byStatus[status] || 0) + count;
    monthly[month].byStage[stage] = (monthly[month].byStage[stage] || 0) + count;
    monthly[month].byPlan[plan] = (monthly[month].byPlan[plan] || 0) + count;

    if (!isNaN(daysOnboard) && daysOnboard > 0) {
      for (let i = 0; i < count; i++) monthly[month].avgDaysToOnboard.push(daysOnboard);
    }
    if (!isNaN(daysActive) && daysActive > 0) {
      for (let i = 0; i < count; i++) monthly[month].avgDaysActive.push(daysActive);
    }
  }

  const monthlyData = Object.entries(monthly)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, d]) => ({
      month,
      totalUsers: d.total,
      byStatus: d.byStatus,
      byStage: d.byStage,
      byPlan: d.byPlan,
      avgDaysToOnboard: d.avgDaysToOnboard.length > 0
        ? Math.round(d.avgDaysToOnboard.reduce((s, v) => s + v, 0) / d.avgDaysToOnboard.length)
        : null,
      avgDaysActive: d.avgDaysActive.length > 0
        ? Math.round(d.avgDaysActive.reduce((s, v) => s + v, 0) / d.avgDaysActive.length)
        : null,
      churnedPct: d.total > 0 ? Math.round((d.byStatus['Churned'] || 0) / d.total * 10000) / 100 : 0,
    }));

  // Overall status distribution
  const overallStatus: Record<string, number> = {};
  for (const m of monthlyData) {
    for (const [status, count] of Object.entries(m.byStatus)) {
      overallStatus[status] = (overallStatus[status] || 0) + count;
    }
  }

  return {
    monthlyData,
    overallStatus,
    totalTracked: monthlyData.reduce((s, m) => s + m.totalUsers, 0),
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function simplifyProductName(name: string): string {
  if (!name) return 'Unknown';
  const lower = name.toLowerCase();
  if (lower.includes('6-month plan') || lower.includes('6 month plan')) return '6-Month Plan';
  if (lower.includes('3-month plan') || lower.includes('3 month plan')) return '3-Month Plan';
  if (lower.includes('1-month plan') || lower.includes('1 month plan')) return '1-Month Plan';
  if (lower.includes('maintenance')) return 'Maintenance Plan';
  if (lower.includes('sustain') && lower.includes('sensor')) return 'Sustain + Sensor';
  if (lower.includes('sustain')) return 'Sustain Plan';
  if (lower.includes('early cancellation')) return 'Cancellation Fee';
  if (lower.includes('sensor')) return 'Sensor';
  if (lower.includes('glp') || lower.includes('semaglutide') || lower.includes('tirzepatide')) return 'GLP-1';
  return name.length > 40 ? name.slice(0, 40) + '…' : name;
}

function simplifyPlanName(plan: string): string {
  if (!plan) return 'Unknown';
  const lower = plan.toLowerCase();
  if (lower.includes('6-month plan') || lower.includes('semi_annual') || lower.includes('semi-annual') || lower.includes('6 month')) return '6-Month';
  if (lower.includes('3-month plan') || lower.includes('quarterly') || lower.includes('3 month')) return 'Quarterly';
  if (lower.includes('1-month plan') || lower.includes('monthly')) return 'Monthly';
  if (lower.includes('maintenance')) return 'Maintenance';
  if (lower.includes('sustain')) return 'Sustain';
  if (lower.includes('flex')) return 'Flex';
  if (lower.includes('trial')) return 'Trial';
  return plan.length > 30 ? plan.slice(0, 30) + '…' : plan;
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
      JSON.stringify({ connected: false, error: 'Mode credentials not configured.' }),
      { status: 200, headers: corsHeaders },
    );
  }

  try {
    // Get the latest successful run, or trigger a new one
    let runToken = await getLatestRunToken(creds);

    if (!runToken) {
      // No recent run found, trigger a new one
      const newRunToken = await triggerNewRun(creds);
      if (!newRunToken) {
        return new Response(
          JSON.stringify({ connected: false, error: 'Could not trigger Mode report run.' }),
          { status: 500, headers: corsHeaders },
        );
      }
      const success = await waitForRun(creds, newRunToken);
      if (!success) {
        return new Response(
          JSON.stringify({ connected: false, error: 'Mode report run did not complete.' }),
          { status: 500, headers: corsHeaders },
        );
      }
      runToken = newRunToken;
    }

    // Fetch all 5 query results in parallel
    const [shopifyCSV, ltvCSV, subRevCSV, productsCSV, journeyCSV] = await Promise.all([
      fetchQueryCSV(creds, runToken, QUERIES.shopifyRevenue.query),
      fetchQueryCSV(creds, runToken, QUERIES.ltvByCohort.query),
      fetchQueryCSV(creds, runToken, QUERIES.subscriptionRevenue.query),
      fetchQueryCSV(creds, runToken, QUERIES.shopifyProducts.query),
      fetchQueryCSV(creds, runToken, QUERIES.userJourney.query),
    ]);

    // Parse and aggregate
    const shopifyRevenue = aggregateShopifyRevenue(parseCSV(shopifyCSV));
    const ltvByCohort = aggregateLTVByCohort(parseCSV(ltvCSV));
    const subscriptionRevenue = aggregateSubscriptionRevenue(parseCSV(subRevCSV));
    const shopifyProducts = aggregateShopifyProducts(parseCSV(productsCSV));
    const userJourney = aggregateUserJourney(parseCSV(journeyCSV));

    return new Response(
      JSON.stringify({
        connected: true,
        workspace: creds.workspace,
        shopifyRevenue,
        ltvByCohort,
        subscriptionRevenue,
        shopifyProducts,
        userJourney,
        lastUpdated: new Date().toISOString(),
      }),
      { status: 200, headers: corsHeaders },
    );
  } catch (error: any) {
    console.error('[MODE-SHOPIFY] Error:', error);
    return new Response(
      JSON.stringify({ connected: false, error: error.message || 'Failed to fetch data' }),
      { status: 500, headers: corsHeaders },
    );
  }
};
