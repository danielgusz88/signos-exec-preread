/**
 * Ad Platform Integration Stubs for FunnelAI
 * Meta (Facebook) Ads + Google Ads
 * 
 * Phase 1: Manual CSV upload / Mode reports
 * Phase 2: Direct API integration
 */

// ============================================================================
// META ADS
// ============================================================================

function getMetaCredentials() {
  const accessToken = process.env.META_ADS_ACCESS_TOKEN;
  const adAccountId = process.env.META_ADS_ACCOUNT_ID;
  if (!accessToken || !adAccountId) return null;
  return { accessToken, adAccountId };
}

export async function testMetaConnection(): Promise<{
  success: boolean;
  error?: string;
  accountName?: string;
}> {
  try {
    const creds = getMetaCredentials();
    if (!creds) {
      return { success: false, error: 'Meta Ads credentials not configured. Set META_ADS_ACCESS_TOKEN and META_ADS_ACCOUNT_ID.' };
    }

    const response = await fetch(
      `https://graph.facebook.com/v19.0/act_${creds.adAccountId}?fields=name,account_status&access_token=${creds.accessToken}`
    );

    if (!response.ok) {
      return { success: false, error: `Meta API error: ${response.status}` };
    }

    const data = await response.json();
    return { success: true, accountName: data.name };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getMetaCampaigns(dateRange?: { since: string; until: string }): Promise<any[]> {
  const creds = getMetaCredentials();
  if (!creds) return [];

  try {
    const fields = 'campaign_name,adset_name,ad_name,spend,impressions,clicks,actions,cost_per_action_type,ctr,cpc';
    const params = new URLSearchParams({
      fields,
      access_token: creds.accessToken,
      level: 'campaign',
      limit: '500',
    });
    
    if (dateRange) {
      params.append('time_range', JSON.stringify({ since: dateRange.since, until: dateRange.until }));
    }

    const response = await fetch(
      `https://graph.facebook.com/v19.0/act_${creds.adAccountId}/insights?${params.toString()}`
    );

    if (!response.ok) return [];
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('[META] Failed to fetch campaigns:', error);
    return [];
  }
}

export function isMetaConfigured(): boolean {
  return getMetaCredentials() !== null;
}

// ============================================================================
// GOOGLE ADS
// ============================================================================

function getGoogleAdsCredentials() {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;

  if (!developerToken || !customerId) return null;
  return { developerToken, clientId, clientSecret, refreshToken, customerId };
}

export async function testGoogleAdsConnection(): Promise<{
  success: boolean;
  error?: string;
}> {
  const creds = getGoogleAdsCredentials();
  if (!creds) {
    return { success: false, error: 'Google Ads credentials not configured.' };
  }
  
  // Google Ads API requires OAuth2 — simplified test
  return { success: false, error: 'Google Ads direct API not yet implemented. Use Mode reports for Google Ads data.' };
}

export function isGoogleAdsConfigured(): boolean {
  return getGoogleAdsCredentials() !== null;
}
