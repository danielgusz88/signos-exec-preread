/**
 * Iterable Integration for FunnelAI
 * Pulls lifecycle email campaign data, engagement metrics, and revenue attribution.
 * 
 * Authentication: API key in header
 * API Base: https://api.iterable.com/api
 */

const ITERABLE_API_BASE = 'https://api.iterable.com/api';

function getIterableKey(): string | null {
  return process.env.ITERABLE_API_KEY || null;
}

async function iterableRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  const apiKey = getIterableKey();
  if (!apiKey) throw new Error('Iterable API key not configured');

  const url = `${ITERABLE_API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Api-Key': apiKey,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[ITERABLE] API error at ${endpoint}:`, response.status, errorText);
    throw new Error(`Iterable API error: ${response.status}`);
  }

  return response.json();
}

export async function testIterableConnection(): Promise<{
  success: boolean;
  error?: string;
  channelCount?: number;
}> {
  try {
    const apiKey = getIterableKey();
    if (!apiKey) {
      return { success: false, error: 'Iterable API key not configured. Set ITERABLE_API_KEY.' };
    }

    const data = await iterableRequest('/channels');
    return { success: true, channelCount: data.channels?.length || 0 };
  } catch (error: any) {
    if (error.message?.includes('401')) {
      return { success: false, error: 'Invalid Iterable API key.' };
    }
    return { success: false, error: error.message };
  }
}

export async function getIterableCampaigns(): Promise<Array<{
  id: number;
  name: string;
  type: string;
  templateId: number;
  messageMedium: string;
  createdAt: string;
  updatedAt: string;
  campaignState: string;
}>> {
  try {
    const data = await iterableRequest('/campaigns');
    const campaigns = data.campaigns || [];

    return campaigns.map((c: any) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      templateId: c.templateId,
      messageMedium: c.messageMedium,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      campaignState: c.campaignState,
    }));
  } catch (error) {
    console.error('[ITERABLE] Failed to fetch campaigns:', error);
    return [];
  }
}

export async function getIterableCampaignMetrics(campaignId: number): Promise<{
  totalSent: number;
  uniqueEmailSends: number;
  totalDelivered: number;
  uniqueOpens: number;
  totalOpens: number;
  uniqueClicks: number;
  totalClicks: number;
  unsubscribes: number;
  complaints: number;
  bounces: number;
  totalPurchases: number;
  revenue: number;
} | null> {
  try {
    const params = new URLSearchParams();
    params.append('campaignId', campaignId.toString());

    const data = await iterableRequest(`/campaigns/metrics?${params.toString()}`);

    return {
      totalSent: data.totalSent || 0,
      uniqueEmailSends: data.uniqueEmailSends || 0,
      totalDelivered: data.totalDelivered || 0,
      uniqueOpens: data.uniqueOpens || 0,
      totalOpens: data.totalOpens || 0,
      uniqueClicks: data.uniqueClicks || 0,
      totalClicks: data.totalClicks || 0,
      unsubscribes: data.unsubscribes || 0,
      complaints: data.complaints || 0,
      bounces: data.bounces || 0,
      totalPurchases: data.totalPurchases || 0,
      revenue: data.revenue || 0,
    };
  } catch (error) {
    console.error(`[ITERABLE] Failed to fetch metrics for campaign ${campaignId}:`, error);
    return null;
  }
}

export async function getIterableEmailMetrics(startDate: Date, endDate: Date): Promise<{
  totalSent: number;
  uniqueOpens: number;
  uniqueClicks: number;
  unsubscribes: number;
  complaints: number;
  bounces: number;
} | null> {
  try {
    const params = new URLSearchParams();
    params.append('startDateTime', startDate.toISOString());
    params.append('endDateTime', endDate.toISOString());

    const data = await iterableRequest(`/email/metrics?${params.toString()}`);

    return {
      totalSent: data.totalSent || 0,
      uniqueOpens: data.uniqueOpens || 0,
      uniqueClicks: data.uniqueClicks || 0,
      unsubscribes: data.unsubscribes || 0,
      complaints: data.complaints || 0,
      bounces: data.bounces || 0,
    };
  } catch (error) {
    console.error('[ITERABLE] Failed to fetch email metrics:', error);
    return null;
  }
}

export function isIterableConfigured(): boolean {
  return getIterableKey() !== null;
}
