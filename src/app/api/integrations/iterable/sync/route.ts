import { NextResponse } from 'next/server';
import { getIterableCampaigns, getIterableCampaignMetrics } from '@/lib/integrations/iterable';
import { getDatabase } from '@/lib/db';

export async function POST() {
  try {
    const db = await getDatabase();
    const startedAt = new Date();
    let recordsProcessed = 0;
    let recordsFailed = 0;

    // 1. Fetch all campaigns from Iterable
    const campaigns = await getIterableCampaigns();

    for (const campaign of campaigns) {
      try {
        // Upsert campaign record
        const record = await db.iterableCampaignRecord.upsert({
          where: { iterableCampaignId: campaign.id },
          update: {
            name: campaign.name,
            type: campaign.type,
            messageMedium: campaign.messageMedium,
            campaignState: campaign.campaignState,
            lastSyncAt: new Date(),
          },
          create: {
            iterableCampaignId: campaign.id,
            name: campaign.name,
            type: campaign.type,
            messageMedium: campaign.messageMedium,
            campaignState: campaign.campaignState,
            lastSyncAt: new Date(),
          },
        });

        // Fetch metrics for this campaign
        const metrics = await getIterableCampaignMetrics(campaign.id);
        if (metrics) {
          await db.iterableMetricSnapshot.create({
            data: {
              campaignRecordId: record.id,
              totalSent: metrics.totalSent,
              totalDelivered: metrics.totalDelivered,
              uniqueOpens: metrics.uniqueOpens,
              totalOpens: metrics.totalOpens,
              uniqueClicks: metrics.uniqueClicks,
              totalClicks: metrics.totalClicks,
              unsubscribes: metrics.unsubscribes,
              complaints: metrics.complaints,
              bounces: metrics.bounces,
              openRate: metrics.totalSent > 0 ? (metrics.uniqueOpens / metrics.totalSent) * 100 : 0,
              clickRate: metrics.totalSent > 0 ? (metrics.uniqueClicks / metrics.totalSent) * 100 : 0,
              revenue: metrics.revenue,
            },
          });
        }

        recordsProcessed++;
      } catch (error) {
        console.error(`[ITERABLE SYNC] Failed to sync campaign ${campaign.id}:`, error);
        recordsFailed++;
      }
    }

    // Log the sync
    await db.dataSync.create({
      data: {
        source: 'iterable',
        syncType: 'full',
        status: recordsFailed > 0 ? 'partial' : 'success',
        startedAt,
        completedAt: new Date(),
        recordsProcessed,
        recordsFailed,
      },
    });

    return NextResponse.json({
      success: true,
      campaignsFound: campaigns.length,
      recordsProcessed,
      recordsFailed,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
