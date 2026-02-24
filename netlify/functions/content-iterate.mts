import type { Context } from "@netlify/functions";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";

interface IterateRequest {
  originalPrompt: string;
  contentType: string;
  rating: number;
  tags: string[];
  notes: string;
  headline?: string;
  hook?: string;
  aiWeaknesses?: string[];
  aiImprovements?: string[];
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

  const apiKey = Netlify.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const body: IterateRequest = await req.json();
    const {
      originalPrompt,
      contentType,
      rating,
      tags,
      notes,
      headline,
      hook,
      aiWeaknesses = [],
      aiImprovements = [],
    } = body;

    const feedbackSummary = [
      `User rating: ${rating}/5`,
      tags.length > 0 ? `Issues tagged: ${tags.join(", ")}` : null,
      notes ? `User notes: "${notes}"` : null,
      aiWeaknesses.length > 0
        ? `AI-detected weaknesses: ${aiWeaknesses.join("; ")}`
        : null,
      aiImprovements.length > 0
        ? `AI-suggested improvements: ${aiImprovements.join("; ")}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    const response = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        system: `You are an expert advertising art director iterating on AI-generated ad creatives for Signos (a CGM/metabolic health company).

Your job: take the ORIGINAL Recraft image generation prompt and the user's FEEDBACK, then produce an IMPROVED prompt that addresses every piece of feedback.

Rules:
- Output ONLY a JSON object with these fields: { "imagePrompt": "...", "headline": "...", "ctaText": "...", "reasoning": "..." }
- imagePrompt must be a complete, self-contained Recraft V3 prompt (include ALL text, layout, typography, colors, dimensions)
- NEVER include CGM devices, glucose monitors, medical sensors, smartphones, or Signos product shots
- Maintain the same content type (${contentType}) and general ad format
- Address EVERY piece of feedback explicitly
- The "reasoning" field should be 1-2 sentences explaining what you changed and why
- Keep dimensions at 1024x1365 for 3:4 ads
- Return ONLY the JSON object, no markdown fences, no other text`,
        messages: [
          {
            role: "user",
            content: `ORIGINAL PROMPT:\n${originalPrompt}\n\n${headline ? `HEADLINE: ${headline}\n` : ""}${hook ? `HOOK: ${hook}\n` : ""}\nFEEDBACK:\n${feedbackSummary}\n\nProduce an improved Recraft prompt that addresses all feedback. Return ONLY the JSON object.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return Response.json(
        { error: `Anthropic API error: ${response.status}`, details: errText },
        { status: 502 }
      );
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    try {
      const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(cleaned);
      return Response.json({ success: true, ...parsed });
    } catch {
      return Response.json({
        success: true,
        imagePrompt: text,
        headline: headline || "",
        ctaText: "",
        reasoning: "Raw response — could not parse JSON",
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
