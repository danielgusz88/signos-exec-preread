import type { Context } from "@netlify/functions";

const RECRAFT_API = "https://external.api.recraft.ai/v1/images/generations";

interface RecraftRequest {
  prompt: string;
  size?: string;
  style?: string;
  model?: string;
}

export default async function handler(req: Request, _context: Context) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const apiKey = Netlify.env.get("RECRAFT_API_KEY");
  if (!apiKey) {
    return Response.json(
      { error: "RECRAFT_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const body: RecraftRequest = await req.json();
    const {
      prompt,
      size = "1024x1365",
      style = "realistic_image",
      model = "recraftv3",
    } = body;

    const response = await fetch(RECRAFT_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        model,
        size,
        style,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return Response.json(
        {
          error: `Recraft API error: ${response.status}`,
          details: errText,
          _request: { promptLength: prompt.length, model, size, style, promptFirst200: prompt.substring(0, 200) },
        },
        { status: 502 }
      );
    }

    const data = await response.json();

    const imageUrl = data?.data?.[0]?.url;
    if (!imageUrl) {
      return Response.json(
        {
          error: "No image URL in Recraft response",
          details: JSON.stringify(data).substring(0, 500),
        },
        { status: 502 }
      );
    }

    return Response.json({
      success: true,
      imageUrl,
      _debug: { model, style, size },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
