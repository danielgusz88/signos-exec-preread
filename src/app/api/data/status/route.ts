import { NextResponse } from 'next/server';

export async function GET() {
  // Check which integrations are configured via env vars
  const modeConfigured = !!(process.env.MODE_API_TOKEN && process.env.MODE_API_SECRET && process.env.MODE_WORKSPACE);
  const iterableConfigured = !!(process.env.ITERABLE_API_KEY);
  const shopifyConfigured = !!(process.env.SHOPIFY_ACCESS_TOKEN && process.env.SHOPIFY_STORE_DOMAIN);
  const metaAdsConfigured = !!(process.env.META_ADS_ACCESS_TOKEN && process.env.META_ADS_ACCOUNT_ID);
  const googleAdsConfigured = !!(process.env.GOOGLE_ADS_DEVELOPER_TOKEN);
  const anthropicConfigured = !!(process.env.ANTHROPIC_API_KEY);

  const integrations = [
    {
      name: 'Mode Analytics',
      key: 'mode',
      configured: modeConfigured,
      envVars: ['MODE_API_TOKEN', 'MODE_API_SECRET', 'MODE_WORKSPACE'],
      description: 'Retention, usage, churn analytics, and custom SQL reports',
      dataProvided: ['Cohort retention', 'Churn analysis', 'Usage metrics', 'Custom reports'],
    },
    {
      name: 'Iterable',
      key: 'iterable',
      configured: iterableConfigured,
      envVars: ['ITERABLE_API_KEY'],
      description: 'Email campaign performance, engagement metrics, and lifecycle messaging',
      dataProvided: ['Campaign metrics', 'Open/click rates', 'Revenue attribution', 'Unsubscribes'],
    },
    {
      name: 'Shopify',
      key: 'shopify',
      configured: shopifyConfigured,
      envVars: ['SHOPIFY_ACCESS_TOKEN', 'SHOPIFY_STORE_DOMAIN'],
      description: 'Orders, subscriptions, payments, products, and revenue data',
      dataProvided: ['Revenue', 'Orders', 'Subscriptions', 'Payment health', 'Products'],
    },
    {
      name: 'Meta Ads',
      key: 'meta_ads',
      configured: metaAdsConfigured,
      envVars: ['META_ADS_ACCESS_TOKEN', 'META_ADS_ACCOUNT_ID'],
      description: 'Facebook/Instagram ad campaign performance and spend',
      dataProvided: ['Ad spend', 'Campaign performance', 'Audience data', 'Attribution'],
    },
    {
      name: 'Google Ads',
      key: 'google_ads',
      configured: googleAdsConfigured,
      envVars: ['GOOGLE_ADS_DEVELOPER_TOKEN', 'GOOGLE_ADS_CLIENT_ID', 'GOOGLE_ADS_CLIENT_SECRET'],
      description: 'Google search/display ad campaign performance and spend',
      dataProvided: ['Ad spend', 'Keyword performance', 'Search attribution'],
    },
    {
      name: 'Claude AI',
      key: 'anthropic',
      configured: anthropicConfigured,
      envVars: ['ANTHROPIC_API_KEY'],
      description: 'AI-powered insight generation and analysis',
      dataProvided: ['AI insights', 'Anomaly detection', 'Recommendations'],
    },
  ];

  const configuredCount = integrations.filter((i) => i.configured).length;

  return NextResponse.json({
    integrations,
    summary: {
      total: integrations.length,
      configured: configuredCount,
      notConfigured: integrations.length - configuredCount,
    },
  });
}
