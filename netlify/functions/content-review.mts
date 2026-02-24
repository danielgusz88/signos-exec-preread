import type { Context } from "@netlify/functions";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";

interface ReviewRequest {
  videoUrl: string;
  imageUrl: string;
  script: string;
  hook: string;
  ctaText: string;
  targetEmotion: string;
  platforms: string[];
}

interface ScoreResult {
  overall: number;
  realism: number;
  hookStrength: number;
  scriptQuality: number;
  brandSafety: number;
  ctaEffectiveness: number;
  predictedEngagement: number;
  platformScores: Record<string, number>;
  verdict: 'publish' | 'edit_and_regenerate' | 'reject';
  summary: string;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  platformNotes: Record<string, string>;
}

export default async function handler(req: Request, _context: Context) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "Content-Type" },
    });
  }

  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const anthropicKey = Netlify.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) {
    return Response.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  try {
    const body: ReviewRequest = await req.json();
    const { imageUrl, script, hook, ctaText, targetEmotion, platforms } = body;

    const platformList = platforms.map((p) => {
      switch (p) {
        case "tiktok": return "TikTok";
        case "instagram_reels": return "Instagram Reels";
        case "youtube_shorts": return "YouTube Shorts";
        case "instagram_feed": return "Instagram Feed";
        default: return p;
      }
    });

    const systemPrompt = `You are an expert AI content quality analyst specializing in short-form UGC video for health and wellness brands. You evaluate AI-generated video content across multiple dimensions with brutal honesty.

You will be shown:
1. A still frame / thumbnail from an AI-generated video
2. The narration script
3. The hook text and CTA

Your job is to score the content and provide actionable feedback. Be specific and constructive — generic praise is useless.

Scoring scale (1-10):
- 1-3: Poor, unusable
- 4-5: Below average, needs significant work
- 6-7: Decent, publishable with caveats
- 8-9: Strong, ready to publish
- 10: Exceptional, viral potential

Platform knowledge:
- TikTok: Algorithm rewards watch time, controversy, curiosity gaps. Fast-paced, raw feeling. 15-60s sweet spot.
- Instagram Reels: More polished than TikTok. Discovery via Explore. Visual quality matters more. 15-90s.
- YouTube Shorts: Search-driven discovery. Educational hooks perform well. 15-60s.
- Instagram Feed: Curated, brand-forward. Higher production expectations. Up to 60s.`;

    // Build content blocks — include image if available
    const contentBlocks: Array<Record<string, unknown>> = [];

    if (imageUrl) {
      contentBlocks.push({
        type: "image",
        source: { type: "url", url: imageUrl },
      });
    }

    contentBlocks.push({
      type: "text",
      text: `Review this AI-generated UGC video content for a health/wellness brand.

**Hook:** "${hook}"
**Target Emotion:** ${targetEmotion}
**Target Platforms:** ${platformList.join(", ")}

**Full Script:**
${script}

**Call to Action:** "${ctaText}"

${imageUrl ? "The image above is a still frame from the generated video. Evaluate the visual quality, realism of the AI-generated person, setting authenticity, and overall production value." : "No image was provided for visual evaluation."}

Provide your evaluation as a JSON object with this exact structure:
{
  "overall": <number 1-10>,
  "realism": <number 1-10, how realistic does the AI presenter look?>,
  "hookStrength": <number 1-10, would this stop someone scrolling?>,
  "scriptQuality": <number 1-10, is the script engaging, well-paced, accurate?>,
  "brandSafety": <number 1-10, any problematic claims, misleading info, regulatory risk?>,
  "ctaEffectiveness": <number 1-10, is the CTA clear and compelling?>,
  "predictedEngagement": <number 1-10, based on content patterns, how likely to perform?>,
  "platformScores": {
    ${platformList.map((p) => `"${p}": <number 1-10>`).join(",\n    ")}
  },
  "verdict": "<one of: publish, edit_and_regenerate, reject>",
  "summary": "<2-3 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"],
  "improvements": ["<specific actionable improvement 1>", "<improvement 2>", "<improvement 3>"],
  "platformNotes": {
    ${platformList.map((p) => `"${p}": "<specific advice for this platform>"`).join(",\n    ")}
  }
}

Return ONLY the JSON object, no other text.`,
    });

    const response = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: "user", content: contentBlocks }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return Response.json({ error: `Anthropic API error: ${response.status}`, details: errText }, { status: 502 });
    }

    const result = await response.json();
    const content = result.content?.[0]?.text || "";

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({ error: "Failed to parse review from Claude", raw: content }, { status: 500 });
    }

    const review: ScoreResult = JSON.parse(jsonMatch[0]);

    return Response.json({ success: true, review });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
