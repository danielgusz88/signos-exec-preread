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

  const apiKey = Netlify.env.get("ITERABLE_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ success: false, error: 'ITERABLE_API_KEY not configured.' }),
      { status: 200, headers: corsHeaders }
    );
  }

  try {
    const res = await fetch('https://api.iterable.com/api/channels', {
      headers: { 'Api-Key': apiKey },
    });

    if (!res.ok) {
      return new Response(
        JSON.stringify({ success: false, error: `Iterable API returned ${res.status}` }),
        { status: 200, headers: corsHeaders }
      );
    }

    const data = await res.json();
    return new Response(
      JSON.stringify({
        success: true,
        channelCount: data.channels?.length || 0,
        channels: data.channels || [],
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

// Route configured via netlify.toml redirect
