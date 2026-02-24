import { NextResponse } from 'next/server';
import { getModeReports, getModeReportRuns, getModeQueryResults, getModeReportQueries } from '@/lib/integrations/mode';
import { getDatabase } from '@/lib/db';

export async function POST() {
  try {
    const db = await getDatabase();
    const startedAt = new Date();
    let recordsProcessed = 0;
    let recordsFailed = 0;

    // 1. Fetch all reports from Mode
    const reports = await getModeReports();

    for (const report of reports) {
      try {
        // Upsert the report record
        await db.modeReport.upsert({
          where: { reportToken: report.token },
          update: {
            name: report.name,
            description: report.description,
            reportUrl: report.webUrl,
          },
          create: {
            reportToken: report.token,
            name: report.name,
            description: report.description,
            category: categorizeReport(report.name),
            reportUrl: report.webUrl,
          },
        });

        // Get latest run
        const runs = await getModeReportRuns(report.token, 1);
        if (runs.length === 0 || runs[0].state !== 'succeeded') continue;

        const latestRun = runs[0];

        // Get queries for this report
        const queries = await getModeReportQueries(report.token);
        if (queries.length === 0) continue;

        // Get results for the first query
        const results = await getModeQueryResults(report.token, latestRun.token, queries[0].token);
        if (!results) continue;

        // Store snapshot
        await db.modeSnapshot.create({
          data: {
            modeReportId: (await db.modeReport.findUnique({ where: { reportToken: report.token } }))!.id,
            metricsJson: JSON.stringify(extractMetrics(results)),
            dataPreviewJson: JSON.stringify(results.data.slice(0, 50)),
            rowCount: results.data.length,
          },
        });

        // Update report sync status
        await db.modeReport.update({
          where: { reportToken: report.token },
          data: { lastSyncAt: new Date(), syncStatus: 'synced' },
        });

        recordsProcessed += results.data.length;
      } catch (error) {
        console.error(`[MODE SYNC] Failed to sync report ${report.token}:`, error);
        recordsFailed++;
      }
    }

    // Log the sync
    await db.dataSync.create({
      data: {
        source: 'mode',
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
      reportsFound: reports.length,
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

function categorizeReport(name: string): string {
  const nameLower = name.toLowerCase();
  if (nameLower.includes('retention') || nameLower.includes('churn')) return 'retention';
  if (nameLower.includes('usage') || nameLower.includes('engagement') || nameLower.includes('activity')) return 'usage';
  if (nameLower.includes('funnel') || nameLower.includes('conversion')) return 'funnel';
  if (nameLower.includes('product') || nameLower.includes('mix')) return 'product_mix';
  return 'churn';
}

function extractMetrics(results: { columns: string[]; data: any[][] }): Record<string, any> {
  const metrics: Record<string, any> = {};

  // Try to extract numeric columns as metrics
  results.columns.forEach((col, idx) => {
    const values = results.data.map((row) => row[idx]).filter((v) => typeof v === 'number');
    if (values.length > 0) {
      metrics[col] = {
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        sum: values.reduce((a, b) => a + b, 0),
        count: values.length,
      };
    }
  });

  return metrics;
}
