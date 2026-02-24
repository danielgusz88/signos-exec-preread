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

  const accessToken = Netlify.env.get("SHOPIFY_ACCESS_TOKEN");
  const storeDomain = Netlify.env.get("SHOPIFY_STORE_DOMAIN");

  if (!accessToken || !storeDomain) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Shopify credentials not configured. Set SHOPIFY_ACCESS_TOKEN and SHOPIFY_STORE_DOMAIN.',
      }),
      { status: 200, headers: corsHeaders }
    );
  }

  try {
    // Test the connection by fetching shop info
    const res = await fetch(`https://${storeDomain}/admin/api/2024-01/shop.json`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid Shopify access token.' }),
          { status: 200, headers: corsHeaders }
        );
      }
      return new Response(
        JSON.stringify({ success: false, error: `Shopify API error: ${res.status}` }),
        { status: 200, headers: corsHeaders }
      );
    }

    const data = await res.json();
    return new Response(
      JSON.stringify({
        success: true,
        shopName: data.shop?.name || storeDomain,
        domain: data.shop?.domain || storeDomain,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
};
