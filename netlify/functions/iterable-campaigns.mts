import type { Context } from "@netlify/functions";

const ITERABLE_API_BASE = 'https://api.iterable.com/api';

interface Campaign {
  id: number;
  name: string;
  type: string;
  templateId: number;
  messageMedium: string;
  createdByUserId: string;
  updatedByUserId: string;
  campaignState: string;
  workflowId: number;
  labels: string[];
  createdAt: number;
  updatedAt: number;
}

interface CampaignMetrics {
  id: number;
  totalSent: number;
  totalDelivered: number;
  totalOpens: number;
  uniqueOpens: number;
  totalClicks: number;
  uniqueClicks: number;
  totalBounced: number;
  uniqueBounced: number;
  totalUnsubscribes: number;
  uniqueUnsubscribes: number;
  totalComplaints: number;
  uniqueEmailSends: number;
  uniqueDelivered: number;
  uniqueOpensOrClicks: number;
  totalPurchases: number;
  uniquePurchases: number;
  revenue: number;
  avgOrderValue: number;
  totalHoldout: number;
  totalSendSkips: number;
}

function parseCSVMetrics(csv: string): CampaignMetrics[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',');
  const results: CampaignMetrics[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length < headers.length) continue;

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = values[idx]?.trim() || '0';
    });

    const safeNum = (v: string | undefined) => {
      if (!v || v === '') return 0;
      const n = parseFloat(v);
      return isNaN(n) ? 0 : n;
    };

    results.push({
      id: safeNum(row['id']),
      totalSent: safeNum(row['Total Email Sends']),
      totalDelivered: safeNum(row['Total Emails Delivered']),
      totalOpens: safeNum(row['Total Email Opens']),
      uniqueOpens: safeNum(row['Unique Email Opens']),
      totalClicks: safeNum(row['Total Emails Clicked']),
      uniqueClicks: safeNum(row['Unique Email Clicks']),
      totalBounced: safeNum(row['Total Emails Bounced']),
      uniqueBounced: safeNum(row['Unique Emails Bounced']),
      totalUnsubscribes: safeNum(row['Total Unsubscribes']),
      uniqueUnsubscribes: safeNum(row['Unique Unsubscribes']),
      totalComplaints: safeNum(row['Total Complaints']),
      uniqueEmailSends: safeNum(row['Unique Email Sends']),
      uniqueDelivered: safeNum(row['Unique Emails Delivered']),
      uniqueOpensOrClicks: safeNum(row['Unique Email Opens Or Clicks']),
      totalPurchases: safeNum(row['Total Purchases']),
      uniquePurchases: safeNum(row['Unique Purchases']),
      revenue: safeNum(row['Revenue']),
      avgOrderValue: safeNum(row['Average Order Value']),
      totalHoldout: safeNum(row['Total Email Holdout']),
      totalSendSkips: safeNum(row['Total Email Send Skips']),
    });
  }

  return results;
}

export default async (req: Request, context: Context) => {
  const apiKey = Netlify.env.get("ITERABLE_API_KEY");

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (!apiKey) {
    return new Response(
      JSON.stringify({
        connected: false,
        error: 'ITERABLE_API_KEY not configured in Netlify environment variables.',
        campaigns: [],
        summary: null,
        funnel: null,
      }),
      { status: 200, headers: corsHeaders }
    );
  }

  try {
    // Fetch all campaigns
    const campaignRes = await fetch(`${ITERABLE_API_BASE}/campaigns`, {
      headers: { 'Api-Key': apiKey },
    });

    if (!campaignRes.ok) {
      const errText = await campaignRes.text();
      return new Response(
        JSON.stringify({
          connected: false,
          error: `Iterable API error: ${campaignRes.status} — ${errText}`,
          campaigns: [],
          summary: null,
          funnel: null,
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    const campaignData = await campaignRes.json();
    const allCampaigns: Campaign[] = campaignData.campaigns || [];
    const emailCampaigns = allCampaigns.filter((c) => c.messageMedium === 'Email');

    // Fetch metrics for all email campaigns (CSV format)
    const campaignIdParams = emailCampaigns.map((c) => `campaignId=${c.id}`).join('&');
    const metricsRes = await fetch(`${ITERABLE_API_BASE}/campaigns/metrics?${campaignIdParams}`, {
      headers: { 'Api-Key': apiKey },
    });

    let metricsMap: Record<number, CampaignMetrics> = {};
    if (metricsRes.ok) {
      const csvText = await metricsRes.text();
      const metrics = parseCSVMetrics(csvText);
      metrics.forEach((m) => { metricsMap[m.id] = m; });
    }

    // Enrich campaigns
    const enrichedCampaigns = emailCampaigns.map((campaign) => {
      const m = metricsMap[campaign.id] || {} as Partial<CampaignMetrics>;
      const delivered = m.totalDelivered || 0;
      const sent = m.totalSent || 0;

      return {
        id: campaign.id,
        name: campaign.name,
        type: campaign.type,
        campaignState: campaign.campaignState,
        workflowId: campaign.workflowId,
        labels: campaign.labels,
        createdBy: campaign.createdByUserId,
        createdAt: new Date(campaign.createdAt).toISOString(),
        updatedAt: new Date(campaign.updatedAt).toISOString(),
        metrics: {
          totalSent: sent,
          uniqueEmailSends: m.uniqueEmailSends || 0,
          totalDelivered: delivered,
          uniqueDelivered: m.uniqueDelivered || 0,
          totalOpens: m.totalOpens || 0,
          uniqueOpens: m.uniqueOpens || 0,
          totalClicks: m.totalClicks || 0,
          uniqueClicks: m.uniqueClicks || 0,
          totalBounced: m.totalBounced || 0,
          uniqueBounced: m.uniqueBounced || 0,
          totalUnsubscribes: m.totalUnsubscribes || 0,
          uniqueUnsubscribes: m.uniqueUnsubscribes || 0,
          totalComplaints: m.totalComplaints || 0,
          totalPurchases: m.totalPurchases || 0,
          uniquePurchases: m.uniquePurchases || 0,
          revenue: m.revenue || 0,
          avgOrderValue: m.avgOrderValue || 0,
          totalHoldout: m.totalHoldout || 0,
          totalSendSkips: m.totalSendSkips || 0,
        },
        deliveryRate: sent > 0 ? (delivered / sent) * 100 : 0,
        openRate: delivered > 0 ? ((m.uniqueOpens || 0) / delivered) * 100 : 0,
        clickRate: delivered > 0 ? ((m.uniqueClicks || 0) / delivered) * 100 : 0,
        clickToOpenRate: (m.uniqueOpens || 0) > 0 ? ((m.uniqueClicks || 0) / (m.uniqueOpens || 1)) * 100 : 0,
        bounceRate: sent > 0 ? ((m.totalBounced || 0) / sent) * 100 : 0,
        unsubRate: delivered > 0 ? ((m.totalUnsubscribes || 0) / delivered) * 100 : 0,
        complaintRate: delivered > 0 ? ((m.totalComplaints || 0) / delivered) * 100 : 0,
      };
    });

    enrichedCampaigns.sort((a, b) => b.metrics.totalSent - a.metrics.totalSent);

    // Aggregates
    const activeCampaigns = enrichedCampaigns.filter((c) => c.metrics.totalSent > 0);
    const totalSent = activeCampaigns.reduce((s, c) => s + c.metrics.totalSent, 0);
    const totalDelivered = activeCampaigns.reduce((s, c) => s + c.metrics.totalDelivered, 0);
    const totalUniqueOpens = activeCampaigns.reduce((s, c) => s + c.metrics.uniqueOpens, 0);
    const totalUniqueClicks = activeCampaigns.reduce((s, c) => s + c.metrics.uniqueClicks, 0);
    const totalBounced = activeCampaigns.reduce((s, c) => s + c.metrics.totalBounced, 0);
    const totalUnsubs = activeCampaigns.reduce((s, c) => s + c.metrics.totalUnsubscribes, 0);
    const totalComplaints = activeCampaigns.reduce((s, c) => s + c.metrics.totalComplaints, 0);
    const totalRevenue = activeCampaigns.reduce((s, c) => s + c.metrics.revenue, 0);
    const totalPurchases = activeCampaigns.reduce((s, c) => s + c.metrics.totalPurchases, 0);

    // Funnel
    const funnel = {
      sent: totalSent,
      delivered: totalDelivered,
      opened: totalUniqueOpens,
      clicked: totalUniqueClicks,
      purchased: totalPurchases,
      deliveryDropOff: totalSent > 0 ? ((totalSent - totalDelivered) / totalSent) * 100 : 0,
      openDropOff: totalDelivered > 0 ? ((totalDelivered - totalUniqueOpens) / totalDelivered) * 100 : 0,
      clickDropOff: totalUniqueOpens > 0 ? ((totalUniqueOpens - totalUniqueClicks) / totalUniqueOpens) * 100 : 0,
      conversionDropOff: totalUniqueClicks > 0 ? ((totalUniqueClicks - totalPurchases) / totalUniqueClicks) * 100 : 0,
      deliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
      openRate: totalDelivered > 0 ? (totalUniqueOpens / totalDelivered) * 100 : 0,
      clickRate: totalDelivered > 0 ? (totalUniqueClicks / totalDelivered) * 100 : 0,
      clickToOpenRate: totalUniqueOpens > 0 ? (totalUniqueClicks / totalUniqueOpens) * 100 : 0,
    };

    // By type
    const byType: Record<string, any> = {};
    for (const c of activeCampaigns) {
      if (!byType[c.type]) byType[c.type] = { count: 0, sent: 0, delivered: 0, opens: 0, clicks: 0, unsubs: 0, bounced: 0 };
      byType[c.type].count++;
      byType[c.type].sent += c.metrics.totalSent;
      byType[c.type].delivered += c.metrics.totalDelivered;
      byType[c.type].opens += c.metrics.uniqueOpens;
      byType[c.type].clicks += c.metrics.uniqueClicks;
      byType[c.type].unsubs += c.metrics.totalUnsubscribes;
      byType[c.type].bounced += c.metrics.totalBounced;
    }

    // By state
    const byState: Record<string, number> = {};
    for (const c of emailCampaigns) {
      byState[c.campaignState] = (byState[c.campaignState] || 0) + 1;
    }

    // Quality tiers
    const significantCampaigns = activeCampaigns.filter((c) => c.metrics.totalSent >= 50);
    const tiers = {
      excellent: significantCampaigns.filter((c) => c.openRate >= 50).length,
      good: significantCampaigns.filter((c) => c.openRate >= 30 && c.openRate < 50).length,
      average: significantCampaigns.filter((c) => c.openRate >= 15 && c.openRate < 30).length,
      poor: significantCampaigns.filter((c) => c.openRate < 15).length,
    };

    // Rankings
    const bestByOpenRate = [...significantCampaigns].sort((a, b) => b.openRate - a.openRate).slice(0, 5);
    const worstByOpenRate = [...significantCampaigns].sort((a, b) => a.openRate - b.openRate).slice(0, 5);
    const bestByClickRate = [...significantCampaigns].sort((a, b) => b.clickRate - a.clickRate).slice(0, 5);
    const highestBounceRate = [...significantCampaigns].sort((a, b) => b.bounceRate - a.bounceRate).slice(0, 5);

    const summary = {
      totalCampaigns: emailCampaigns.length,
      activeCampaigns: activeCampaigns.length,
      significantCampaigns: significantCampaigns.length,
      totalSent, totalDelivered, totalUniqueOpens, totalUniqueClicks,
      totalBounced, totalUnsubs, totalComplaints, totalRevenue, totalPurchases,
      avgDeliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
      avgOpenRate: totalDelivered > 0 ? (totalUniqueOpens / totalDelivered) * 100 : 0,
      avgClickRate: totalDelivered > 0 ? (totalUniqueClicks / totalDelivered) * 100 : 0,
      avgBounceRate: totalSent > 0 ? (totalBounced / totalSent) * 100 : 0,
      avgUnsubRate: totalDelivered > 0 ? (totalUnsubs / totalDelivered) * 100 : 0,
      byType, byState, tiers,
    };

    return new Response(
      JSON.stringify({
        connected: true,
        campaigns: enrichedCampaigns,
        summary,
        funnel,
        rankings: {
          bestByOpenRate: bestByOpenRate.map((c) => ({ id: c.id, name: c.name, openRate: c.openRate, sent: c.metrics.totalSent })),
          worstByOpenRate: worstByOpenRate.map((c) => ({ id: c.id, name: c.name, openRate: c.openRate, sent: c.metrics.totalSent })),
          bestByClickRate: bestByClickRate.map((c) => ({ id: c.id, name: c.name, clickRate: c.clickRate, sent: c.metrics.totalSent })),
          highestBounceRate: highestBounceRate.map((c) => ({ id: c.id, name: c.name, bounceRate: c.bounceRate, sent: c.metrics.totalSent })),
        },
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        connected: false,
        error: error.message || 'Unknown error',
        campaigns: [],
        summary: null,
        funnel: null,
      }),
      { status: 500, headers: corsHeaders }
    );
  }
};

// Route configured via netlify.toml redirect
