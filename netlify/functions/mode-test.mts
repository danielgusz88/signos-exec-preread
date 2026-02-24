import type { Context } from "@netlify/functions";

const MODE_API_BASE = 'https://app.mode.com/api';

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

  const apiToken = Netlify.env.get("MODE_API_TOKEN");
  const apiSecret = Netlify.env.get("MODE_API_SECRET");
  const workspace = Netlify.env.get("MODE_WORKSPACE");

  if (!apiToken || !apiSecret || !workspace) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Mode credentials not configured. Set MODE_API_TOKEN, MODE_API_SECRET, and MODE_WORKSPACE.',
      }),
      { status: 200, headers: corsHeaders }
    );
  }

  try {
    const credentials = btoa(`${apiToken}:${apiSecret}`);

    // Verify credentials
    const verifyRes = await fetch(`${MODE_API_BASE}/verify`, {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Accept': 'application/hal+json',
      },
    });

    if (!verifyRes.ok) {
      if (verifyRes.status === 401) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid API credentials.' }),
          { status: 200, headers: corsHeaders }
        );
      }
      return new Response(
        JSON.stringify({ success: false, error: `Mode API error: ${verifyRes.status}` }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Test workspace access
    const wsRes = await fetch(`${MODE_API_BASE}/${workspace}`, {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Accept': 'application/hal+json',
      },
    });

    if (!wsRes.ok) {
      return new Response(
        JSON.stringify({ success: false, error: `Workspace "${workspace}" not accessible.` }),
        { status: 200, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ success: true, workspace }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
};
