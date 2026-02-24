import { NextResponse } from 'next/server';
import { getIterableCampaigns, getIterableCampaignMetrics } from '@/lib/integrations/iterable';

export async function GET() {
  try {
    if (!process.env.ITERABLE_API_KEY) {
      return NextResponse.json({
        connected: false,
        error: 'Iterable API key not configured. Set ITERABLE_API_KEY.',
        campaigns: [],
      });
    }

    const campaigns = await getIterableCampaigns();

    // Fetch metrics for each campaign (limit to 20 to avoid rate limiting)
    const campaignsWithMetrics = await Promise.all(
      campaigns.slice(0, 20).map(async (campaign) => {
        const metrics = await getIterableCampaignMetrics(campaign.id);
        return {
          ...campaign,
          metrics: metrics || {
            totalSent: 0,
            uniqueEmailSends: 0,
            totalDelivered: 0,
            uniqueOpens: 0,
            totalOpens: 0,
            uniqueClicks: 0,
            totalClicks: 0,
            unsubscribes: 0,
            complaints: 0,
            bounces: 0,
            totalPurchases: 0,
            revenue: 0,
          },
          openRate: metrics ? (metrics.uniqueOpens / Math.max(metrics.totalDelivered, 1)) * 100 : 0,
          clickRate: metrics ? (metrics.uniqueClicks / Math.max(metrics.totalDelivered, 1)) * 100 : 0,
        };
      })
    );

    return NextResponse.json({
      connected: true,
      campaigns: campaignsWithMetrics,
      totalCampaigns: campaigns.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        connected: false,
        error: error.message,
        campaigns: [],
      },
      { status: 500 }
    );
  }
}
