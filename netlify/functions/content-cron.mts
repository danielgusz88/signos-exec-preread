import type { Context } from "@netlify/functions";

/**
 * Scheduled Content Generation — Netlify Scheduled Function
 *
 * Runs on a cron schedule (configured in netlify.toml).
 * Reads topic configuration from CONTENT_CRON_CONFIG env var (JSON string).
 * Generates ideas via Claude, then submits fal.ai generation jobs.
 *
 * Expected CONTENT_CRON_CONFIG format:
 * {
 *   "enabled": true,
 *   "topic": "metabolic health, GLP-1 graduation, CGM insights",
 *   "platforms": ["tiktok", "instagram_reels"],
 *   "voiceStyle": "Confident, friendly female health educator in her 30s",
 *   "notes": "Focus on Signos CGM product, mention blood sugar data",
 *   "count": 5
 * }
 */

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const FAL_QUEUE_API = "https://queue.fal.run";

interface CronConfig {
  enabled: boolean;
  topic: string;
  platforms: string[];
  voiceStyle: string;
  notes: string;
  count: number;
}

export default async function handler(req: Request, _context: Context) {
  const configRaw = Netlify.env.get("CONTENT_CRON_CONFIG");
  if (!configRaw) {
    console.log("[CRON] No CONTENT_CRON_CONFIG env var set. Skipping.");
    return Response.json({ skipped: true, reason: "No config" });
  }

  let config: CronConfig;
  try {
    config = JSON.parse(configRaw);
  } catch {
    console.error("[CRON] Invalid CONTENT_CRON_CONFIG JSON");
    return Response.json({ error: "Invalid config JSON" }, { status: 500 });
  }

  if (!config.enabled) {
    console.log("[CRON] Content cron is disabled.");
    return Response.json({ skipped: true, reason: "Disabled" });
  }

  const anthropicKey = Netlify.env.get("ANTHROPIC_API_KEY");
  const falKey = Netlify.env.get("FAL_KEY");

  if (!anthropicKey || !falKey) {
    console.error("[CRON] Missing API keys (ANTHROPIC_API_KEY or FAL_KEY)");
    return Response.json({ error: "Missing API keys" }, { status: 500 });
  }

  try {
    // Phase 1: Generate ideas via Claude
    console.log(`[CRON] Generating ${config.count} ideas for: ${config.topic}`);

    const ideateResponse = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: "You are a short-form video content strategist for health and wellness. Generate viral video concepts as a JSON array.",
        messages: [{
          role: "user",
          content: `Generate ${config.count} video concepts for "${config.topic}". Notes: ${config.notes || "None"}. Return a JSON array with objects containing: hook, script, imagePrompt, motionPrompt, ctaText, estimatedDuration. Return ONLY the JSON array.`,
        }],
      }),
    });

    if (!ideateResponse.ok) {
      throw new Error(`Claude API error: ${ideateResponse.status}`);
    }

    const ideateResult = await ideateResponse.json();
    const content = ideateResult.content?.[0]?.text || "";
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("Failed to parse ideas from Claude");
    const ideas = JSON.parse(jsonMatch[0]);

    // Phase 2: Submit fal.ai jobs for each idea
    const aspectRatio = config.platforms.includes("instagram_feed") ? "4:5" : "9:16";
    const jobs = [];

    for (const idea of ideas) {
      const imageRes = await fetch(`${FAL_QUEUE_API}/fal-ai/kling-image/v3/text-to-image`, {
        method: "POST",
        headers: { Authorization: `Key ${falKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: idea.imagePrompt, aspect_ratio: aspectRatio }),
      });
      const imageJob = await imageRes.json();

      const ttsRes = await fetch(`${FAL_QUEUE_API}/fal-ai/qwen-3-tts/voice-design/1.7b`, {
        method: "POST",
        headers: { Authorization: `Key ${falKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          text: idea.script,
          voice_prompt: config.voiceStyle,
          speed: 0.95,
        }),
      });
      const ttsJob = await ttsRes.json();

      jobs.push({
        hook: idea.hook,
        imageRequestId: imageJob.request_id,
        ttsRequestId: ttsJob.request_id,
      });

      console.log(`[CRON] Submitted jobs for: "${idea.hook}"`);
    }

    console.log(`[CRON] Submitted ${jobs.length} generation jobs. Video generation will be triggered when assets complete.`);

    return Response.json({
      success: true,
      ideasGenerated: ideas.length,
      jobsSubmitted: jobs.length,
      jobs,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[CRON] Error: ${message}`);
    return Response.json({ error: message }, { status: 500 });
  }
}
