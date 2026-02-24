import type { Context } from "@netlify/functions";

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

  const integrations = [
    {
      name: 'Iterable',
      key: 'ITERABLE_API_KEY',
      configured: !!Netlify.env.get("ITERABLE_API_KEY"),
      description: 'Email campaigns, lifecycle messaging, engagement metrics',
    },
    {
      name: 'Mode Analytics',
      key: 'MODE_API_TOKEN',
      configured: !!(Netlify.env.get("MODE_API_TOKEN") && Netlify.env.get("MODE_API_SECRET") && Netlify.env.get("MODE_WORKSPACE")),
      description: 'Subscription churn, MRR, renewal rates, customer funnel (36K+ users)',
    },
    {
      name: 'Shopify',
      key: 'SHOPIFY_ACCESS_TOKEN',
      configured: !!Netlify.env.get("SHOPIFY_ACCESS_TOKEN"),
      description: 'Order data, product catalog, revenue metrics',
    },
    {
      name: 'Stripe',
      key: 'STRIPE_SECRET_KEY',
      configured: !!Netlify.env.get("STRIPE_SECRET_KEY"),
      description: 'Subscription billing, payment data, MRR',
    },
    {
      name: 'Meta Ads',
      key: 'META_ADS_ACCESS_TOKEN',
      configured: !!Netlify.env.get("META_ADS_ACCESS_TOKEN"),
      description: 'Facebook/Instagram ad campaigns, acquisition costs',
    },
    {
      name: 'Google Ads',
      key: 'GOOGLE_ADS_API_KEY',
      configured: !!Netlify.env.get("GOOGLE_ADS_API_KEY"),
      description: 'Google ad campaigns, search acquisition costs',
    },
  ];

  const configured = integrations.filter((i) => i.configured).length;

  return new Response(
    JSON.stringify({
      integrations,
      summary: {
        total: integrations.length,
        configured,
        notConfigured: integrations.length - configured,
      },
    }),
    { status: 200, headers: corsHeaders }
  );
};

// Route configured via netlify.toml redirect
