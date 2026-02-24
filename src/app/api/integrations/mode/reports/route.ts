import { NextResponse } from 'next/server';
import { getModeReports, isModeConfigured } from '@/lib/integrations/mode';

export async function GET() {
  try {
    if (!isModeConfigured()) {
      return NextResponse.json({
        connected: false,
        error: 'Mode credentials not configured. Set MODE_API_TOKEN, MODE_API_SECRET, and MODE_WORKSPACE.',
        reports: [],
      });
    }

    const reports = await getModeReports();

    return NextResponse.json({
      connected: true,
      reports,
      totalReports: reports.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        connected: false,
        error: error.message,
        reports: [],
      },
      { status: 500 }
    );
  }
}
