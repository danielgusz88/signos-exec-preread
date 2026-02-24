import type { Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const FEEDBACK_STORE = "content-feedback";

type ContentType = "testimonial" | "data_card" | "lifestyle" | "food_comparison" | "ugc_video" | "edu_video";

interface IdeateRequest {
  topic: string;
  contentType: ContentType;
  platforms: string[];
  voiceStyle: string;
  notes: string;
  count: number;
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

  const apiKey = Netlify.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return Response.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  try {
    const body: IdeateRequest = await req.json();
    const { topic, contentType = "testimonial", platforms, voiceStyle, notes, count } = body;

    const platformSpecs = platforms.map((p) => {
      switch (p) {
        case "tiktok": return "TikTok (9:16, 15-60s, fast-paced hooks, trending sounds)";
        case "instagram_reels": return "Instagram Reels (9:16, 15-90s, polished aesthetic, discovery-oriented)";
        case "youtube_shorts": return "YouTube Shorts (9:16, 15-60s, educational hooks, searchable)";
        case "instagram_feed": return "Instagram Feed (3:4 vertical, up to 60s, curated, brand-forward)";
        default: return p;
      }
    }).join(", ");

    const signosContext = `You are writing ads for **Signos** — a continuous glucose monitor (CGM) company that helps people lose weight by understanding their body's real-time glucose response to food. Signos provides:
- A CGM sensor worn on the arm that tracks glucose in real time
- An AI-powered app that gives personalized food scores and insights
- Metabolic health coaching and weight loss programs
- A GLP-1 program for clinically supervised weight loss medication
- The insight that the same food affects everyone differently — Signos shows YOUR body's unique response`;

    const recraftImageRules = `
## RECRAFT IMAGE PROMPT RULES
You are writing prompts for Recraft V3, an AI image model that EXCELS at rendering text in images. This means:
- You MUST include the exact text you want displayed as part of the prompt
- Describe the complete ad layout: background, text hierarchy, typography, colors
- Recraft will render headlines, subheadlines, CTAs directly IN the image
- This produces a FINISHED, post-ready ad in a single generation step
- NEVER ask for CGM devices, glucose monitors, medical sensors, smartphones, or Signos product shots — AI cannot render these realistically
- Describe the visual scene/background + all text elements + their styling + layout position
- Always specify the ad dimensions (use "1024x1365" for 3:4 or "1024x1820" for 9:16)`;

    const contentTypePrompts: Record<ContentType, { system: string; outputFields: string }> = {
      testimonial: {
        system: `You are a direct-response copywriter creating high-converting testimonial quote ad cards for Signos.

${signosContext}

${recraftImageRules}

## FORMAT: TESTIMONIAL QUOTE AD
A premium wellness brand quote post. The Recraft prompt should describe:
- A beautiful textured or gradient background (watercolor, marble, linen, bokeh, muted color wash)
- Large, elegant quote text centered on the image (use quotation marks)
- Attribution line below the quote
- CTA at the bottom in a colored pill/button shape
- Clean, minimal, premium aesthetic

## QUOTE FORMULAS THAT CONVERT:
- Result + Surprise: "I lost 23 lbs and I didn't give up a single food I love"
- Before/After Contrast: "I went from pre-diabetic to the best metabolic health of my life"
- Specific Metric: "My fasting glucose dropped from 112 to 89 in 6 weeks"
- Emotional Shift: "For the first time in years, I actually understand why I gain weight"
- GLP-1 Graduation: "I got off my GLP-1 and kept the weight off — here's how"
- Discovery: "I had no idea my 'healthy' smoothie was spiking my blood sugar worse than candy"

## RECRAFT PROMPT STRUCTURE:
"Elegant Instagram ad poster with [background description]. Large centered italic serif quote text in white reading '[QUOTE TEXT]'. Below the quote, smaller attribution text: '[ATTRIBUTION]'. At the bottom, a teal (#0D9488) rounded pill button with white text: '[CTA TEXT]'. Premium wellness brand aesthetic, clean typography, balanced layout. 1024x1365 dimensions."

Target platforms: ${platformSpecs}`,
        outputFields: `- "hook": string (the full testimonial quote, 15-25 words, first person, specific results)
- "angle": string (conversion angle: weight loss, metabolic health, GLP-1 graduation, food discovery, etc.)
- "headline": string (the testimonial quote text that will appear in the image)
- "subheadline": string (attribution line, e.g. "— Sarah, 34 • Signos member since 2025")
- "ctaText": string (CTA button text, 2-5 words, e.g. "Take the Free Quiz")
- "hookText": string (same as headline)
- "fullScript": string (complete ad text: QUOTE | ATTRIBUTION | CTA — useful for copy/paste)
- "estimatedDuration": number (always 0)
- "targetEmotion": string (hope, relief, empowerment, curiosity, etc.)
- "imagePrompt": string (COMPLETE Recraft prompt describing the entire ad. Include the quote text, attribution, CTA text, background style, typography style, and layout. Example: "Elegant Instagram ad poster with soft warm abstract watercolor background in muted teal and cream tones. Large centered italic serif quote text in white reading 'I lost 23 lbs and I didn't give up a single food I love'. Below the quote in smaller sans-serif text: '— Sarah, 34 • Signos member'. At the bottom, a teal green rounded pill button with white bold text reading 'Take the Free Quiz'. Premium wellness brand aesthetic, clean balanced typography, professional advertising design. 1024x1365 dimensions.")
- "textColor": string ("white" for dark backgrounds, "dark" for light backgrounds)
- "presenterDescription": string (brief description of the background style)
- "recraftStyle": string (always "realistic_image" for testimonials)`
      },

      data_card: {
        system: `You are a health content strategist creating high-impact data/education card ads for Signos.

${signosContext}

${recraftImageRules}

## FORMAT: DATA & EDUCATION CARD
Clean infographic-style card. The Recraft prompt should describe:
- Solid color or gradient background (teal, navy, sage green, coral)
- Bold, large headline stat/fact (the scroll-stopper)
- Supporting explanation text below
- CTA button at the bottom
- Modern, clean typography

## STAT/FACT FORMULAS THAT WORK:
- Shocking Stat: "93% of Americans have some form of metabolic dysfunction"
- Myth Bust: "Your 'healthy' acai bowl can spike your glucose more than a Snickers bar"
- Comparison: "The same banana raises glucose 3x more in some people vs. others"
- Question: "Why do you crash at 3pm every day?"
- Counter-Intuitive: "Eating a salad before rice reduces your glucose spike by 40%"
- Number + Outcome: "Members see an average 15% reduction in glucose spikes in 30 days"

## RECRAFT PROMPT STRUCTURE:
"Bold infographic-style Instagram ad on [solid color/gradient] background. Very large bold white uppercase headline text: '[STAT/FACT]'. Below in smaller text: '[EXPLANATION connecting to Signos]'. At the bottom, a [contrasting color] rounded pill button with white text: '[CTA]'. Clean modern health brand typography, minimal design, professional advertising layout. 1024x1365 dimensions."

Target platforms: ${platformSpecs}`,
        outputFields: `- "hook": string (the headline stat/fact, 3-8 words)
- "angle": string (education, myth-busting, shocking-stat, comparison, etc.)
- "headline": string (the big stat or fact — the scroll-stopper)
- "subheadline": string (10-20 words explaining why this matters + Signos connection)
- "ctaText": string (CTA button text, e.g. "See Your Glucose Score")
- "hookText": string (same as headline)
- "fullScript": string (complete card text: HEADLINE | SUBHEADLINE | CTA)
- "estimatedDuration": number (always 0)
- "targetEmotion": string (shock, curiosity, concern, empowerment, etc.)
- "imagePrompt": string (COMPLETE Recraft prompt. Example: "Bold infographic-style Instagram ad on deep teal #0D9488 solid background. Very large bold white uppercase sans-serif headline text reading '93% OF AMERICANS'. Below in medium white text: 'have some form of metabolic dysfunction. Signos shows your body's real-time glucose response.' At the bottom, a white rounded pill button with teal text reading 'See Your Score'. Clean modern health brand typography, minimal professional design. 1024x1365 dimensions.")
- "textColor": string ("white" for dark backgrounds, "dark" for light)
- "presenterDescription": string (color/style description, e.g. "Deep teal gradient")
- "recraftStyle": string (always "realistic_image")`
      },

      lifestyle: {
        system: `You are a creative director creating aspirational lifestyle image ads for Signos.

${signosContext}

${recraftImageRules}

## FORMAT: LIFESTYLE ASPIRATION AD
Beautiful lifestyle photo with text overlays. The Recraft prompt should describe:
- An aspirational person in a lifestyle scene (cooking, exercising, eating healthy, outdoors)
- Bold headline text at the top of the image with enough contrast to read
- Subheadline text below the headline
- CTA at the bottom
- Warm, inviting lighting

## KEY RULES:
- AI is GOOD at: people cooking, exercising, enjoying meals, outdoor activities, morning routines
- NEVER: CGM devices, glucose monitors, smartphones, medical equipment, product shots
- Text should be placed in areas with clear space (top third, bottom fifth)
- Use text shadows or semi-transparent dark overlays behind text for readability

## RECRAFT PROMPT STRUCTURE:
"Instagram lifestyle ad featuring [person description and scene]. Bold white uppercase headline text at the top with text shadow reading '[HEADLINE]'. Below in smaller white text: '[SUBHEADLINE]'. At the bottom, a teal (#0D9488) rounded pill button with white text: '[CTA]'. Warm golden lighting, aspirational wellness photography, professional advertising composition with text overlays. 1024x1365 dimensions."

Target platforms: ${platformSpecs}`,
        outputFields: `- "hook": string (headline, 3-7 words, sells transformation or creates curiosity)
- "angle": string (transformation, food-freedom, energy, weight-loss, metabolic-health, etc.)
- "headline": string (bold headline, 3-7 words)
- "subheadline": string (supporting value prop, 8-15 words)
- "ctaText": string (CTA button text, 2-5 words)
- "hookText": string (same as headline)
- "fullScript": string (complete ad: HEADLINE | SUBHEADLINE | CTA)
- "estimatedDuration": number (always 0)
- "targetEmotion": string (aspiration, hope, confidence, curiosity, etc.)
- "imagePrompt": string (COMPLETE Recraft prompt with person, scene, AND all text. Example: "Instagram lifestyle ad featuring a fit woman in her 30s smiling while preparing a colorful breakfast in a bright modern kitchen with warm morning light. Bold white uppercase headline text at the top with dark text shadow reading 'EAT SMARTER NOT LESS'. Below in smaller white text with shadow: 'Signos shows your body's unique glucose response to every meal'. At the bottom, a teal green rounded pill button with white text reading 'Start Your Journey'. Aspirational wellness photography, professional ad composition. 1024x1365 dimensions.")
- "textColor": string ("white")
- "presenterDescription": string (brief: age, gender, setting, activity)
- "recraftStyle": string (always "realistic_image")`
      },

      food_comparison: {
        system: `You are a performance marketing creative creating "This vs That" food comparison ads for Signos.

${signosContext}

${recraftImageRules}

## FORMAT: FOOD COMPARISON AD
Food photography with comparison text. The Recraft prompt should describe:
- Two foods/meals side by side (overhead or 45-degree angle)
- Comparison headline text at the top
- Explanation/answer text
- CTA at the bottom
- Magazine-quality food styling

## COMPARISON CONCEPTS:
- "Healthy" vs actually healthy: Acai bowl vs eggs + avocado
- Surprising spike: Orange juice vs cola (OJ is worse!)
- Meal order trick: Salad before pasta vs pasta alone
- Breakfast battle: Oatmeal with fruit vs Greek yogurt with nuts
- Snack swap: Granola bar vs handful of almonds

## RECRAFT PROMPT STRUCTURE:
"Instagram food comparison ad. Professional overhead food photography showing [food 1] on the left and [food 2] on the right on [surface]. Bold white headline text at the top with dark shadow: '[COMPARISON HOOK]'. Below in smaller text: '[EXPLANATION]'. At the bottom, a teal (#0D9488) pill button: '[CTA]'. Bright appetizing lighting, editorial food styling, advertising composition. 1024x1365 dimensions."

Target platforms: ${platformSpecs}`,
        outputFields: `- "hook": string (comparison headline creating curiosity about which food is worse/better)
- "angle": string (surprising-spike, healthy-vs-healthy, meal-hack, breakfast-battle, etc.)
- "headline": string (the comparison hook, 5-10 words)
- "subheadline": string (answer/explanation, 10-20 words, connects to Signos)
- "ctaText": string (CTA text, e.g. "See Your Food Scores")
- "hookText": string (same as headline)
- "fullScript": string (complete ad: HEADLINE | FOOD 1 vs FOOD 2 | EXPLANATION | CTA)
- "estimatedDuration": number (always 0)
- "targetEmotion": string (curiosity, surprise, intrigue, concern, etc.)
- "imagePrompt": string (COMPLETE Recraft prompt with foods AND text. Example: "Instagram food comparison ad. Professional overhead food photography on a marble surface: a colorful acai bowl with granola and berries on the left, scrambled eggs with avocado on sourdough toast on the right. Bold white headline text at the top with dark text shadow reading 'ONE SPIKES YOUR GLUCOSE 3X MORE'. Below in smaller white text: 'The same food affects everyone differently — Signos shows YOUR response'. At the bottom, a teal green pill button with white text: 'See Your Food Scores'. Bright natural lighting, magazine-quality food styling, professional ad layout. 1024x1365 dimensions.")
- "textColor": string ("white")
- "presenterDescription": string (brief food description)
- "recraftStyle": string (always "realistic_image")`
      },

      ugc_video: {
        system: `You are an elite direct-response video ad copywriter creating 30-second UGC-style video ad SCRIPTS for Signos. The script is the primary deliverable.

${signosContext}

## FORMAT: UGC TALKING HEAD VIDEO SCRIPT
Write a complete 30-second script for a person talking to camera. The AI will generate a preview video.

## 5-PART FRAMEWORK:
**HOOK (0-3s):** Pattern interrupt.
**PROBLEM (3-8s):** Agitate ONE specific pain point.
**SOLUTION (8-20s):** How Signos solves this.
**PROOF (20-27s):** Build trust.
**CTA (27-30s):** One clear conversion action.

## SCRIPT RULES:
- Write like a REAL person talking to a friend
- 75-90 words total (~30 seconds spoken)
- Every script drives toward Signos conversion
- DO NOT reference showing the app or CGM on camera

## IMAGE PROMPT RULES (for fal.ai presenter image):
- Casual, real-world setting (kitchen, living room, park, gym)
- Person should look like a real social media creator
- NEVER show CGM, phone screen, or medical devices
- iPhone selfie framing

Target platforms: ${platformSpecs}
Voice/presenter style: ${voiceStyle}`,
        outputFields: `- "hook": string (opening line, scroll-stopping first 2-3 seconds)
- "angle": string (1-2 sentence conversion angle description)
- "fullScript": string (COMPLETE 75-90 word monologue following 5-part framework)
- "ctaText": string (text overlay for last 3-5 seconds)
- "hookText": string (bold text overlay for first 3 seconds)
- "estimatedDuration": number (always 30)
- "targetEmotion": string (curiosity, fear, hope, shock, frustration, relief, etc.)
- "imagePrompt": string (fal.ai prompt for casual person looking at camera. NEVER include medical devices. Example: "Photorealistic iPhone selfie of a friendly woman in her early 30s, casual clothing, modern kitchen, natural daylight, looking at camera, slight smile, UGC creator aesthetic, 9:16 vertical portrait". Always end with "9:16 vertical portrait, natural lighting".)
- "headline": string (empty string "")
- "subheadline": string (empty string "")
- "textColor": string ("white")
- "presenterDescription": string (e.g. "30s woman in kitchen, casual, natural light")
- "recraftStyle": string (empty string "")`
      },

      edu_video: {
        system: `You are a health content creator making 30-second educational explainer video SCRIPTS about metabolic health for Signos.

${signosContext}

## FORMAT: EDUCATIONAL EXPLAINER SCRIPT
A 30-second script delivered by a credible expert. The AI generates a preview.

## 5-PART FRAMEWORK:
**HOOK (0-3s):** Surprising fact or misconception.
**PROBLEM (3-8s):** Why this matters for the viewer.
**SOLUTION (8-20s):** Teach the science simply.
**PROOF (20-27s):** How Signos makes it actionable.
**CTA (27-30s):** One clear conversion action.

## SCRIPT RULES:
- Tone: "friendly doctor explaining to a patient"
- 75-90 words total
- Lead with science, end with Signos
- DO NOT make specific medical claims

## IMAGE PROMPT RULES (for fal.ai presenter image):
- Professional setting (office, clean modern room)
- Smart casual or professional attire
- NEVER show medical devices, stethoscopes, product shots

Target platforms: ${platformSpecs}
Voice/presenter style: ${voiceStyle}`,
        outputFields: `- "hook": string (surprising fact or misconception)
- "angle": string (1-2 sentence educational angle)
- "fullScript": string (COMPLETE 75-90 word educational monologue)
- "ctaText": string (educational CTA overlay)
- "hookText": string (bold fact/stat overlay for first 3 seconds)
- "estimatedDuration": number (always 30)
- "targetEmotion": string (curiosity, revelation, empowerment, concern, etc.)
- "imagePrompt": string (fal.ai prompt for authority figure. NEVER include medical equipment. Example: "Photorealistic portrait of a professional woman in her 40s, smart casual blazer, modern office with plants, natural lighting, confident expression, looking at camera, 9:16 vertical portrait". Always end with "9:16 vertical portrait, professional setting".)
- "headline": string (empty string "")
- "subheadline": string (empty string "")
- "textColor": string ("white")
- "presenterDescription": string (e.g. "Female nutritionist in 40s, modern office")
- "recraftStyle": string (empty string "")`
      }
    };

    const ctConfig = contentTypePrompts[contentType];

    // ── Inject learned preferences from feedback ──
    let feedbackContext = "";
    try {
      const store = getStore(FEEDBACK_STORE);

      const guideKey = `style-guide-${contentType}`;
      const guideAll = "style-guide-all";
      let guide = await store.get(guideKey);
      if (!guide) guide = await store.get(guideAll);

      if (guide) {
        feedbackContext = `\n\n## LEARNED PREFERENCES (from user feedback on prior ads)\nApply these rules to every concept you generate:\n\n${guide}`;
      } else {
        let index: string[] = [];
        try {
          const raw = await store.get("feedback-index");
          if (raw) index = JSON.parse(raw);
        } catch { index = []; }

        if (index.length > 0) {
          const recent = index.slice(-15);
          const entries: string[] = [];
          for (const id of recent) {
            try {
              const entry = await store.get(`entry-${id}`, { type: "json" }) as Record<string, unknown> | null;
              if (entry && (entry.contentType === contentType || !entry.contentType)) {
                const tags = Array.isArray(entry.tags) ? (entry.tags as string[]).join(", ") : "";
                entries.push(`- Rating: ${entry.rating}/5${tags ? ` | Issues: ${tags}` : ""}${entry.notes ? ` | "${entry.notes}"` : ""}`);
              }
            } catch { /* skip */ }
          }
          if (entries.length > 0) {
            feedbackContext = `\n\n## LEARNED PREFERENCES (raw feedback from ${entries.length} recent ratings)\n${entries.join("\n")}\n\nImportant: Pay close attention to items rated 1-2 (avoid those patterns) and items rated 4-5 (repeat those patterns).`;
          }
        }
      }
    } catch {
      // Blobs unavailable — proceed without feedback
    }

    const systemPrompt = ctConfig.system + feedbackContext;

    const isImageType = ["testimonial", "data_card", "lifestyle", "food_comparison"].includes(contentType);
    const userPrompt = `Generate ${count} unique Signos conversion-focused ${isImageType ? "static image ad" : "video ad script"} concepts.

**Content Type:** ${contentType}
**Topic/Angle Direction:** ${topic}
**Additional Notes:** ${notes || "None provided"}
**Target Platforms:** ${platformSpecs}

For each concept, return a JSON array with objects containing:
${ctConfig.outputFields}

Return ONLY the JSON array, no other text. No markdown code fences.`;

    const response = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        stream: true,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return Response.json({ error: `Anthropic API error: ${response.status}`, details: errText }, { status: 502 });
    }

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    const processStream = async () => {
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split("\n");
          sseBuffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") continue;

            try {
              const evt = JSON.parse(payload);
              if (evt.type === "content_block_delta" && evt.delta?.text) {
                await writer.write(encoder.encode(evt.delta.text));
              }
            } catch {
              // skip malformed SSE events
            }
          }
        }
      } finally {
        await writer.close();
      }
    };

    processStream();

    return new Response(readable, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
        "X-Content-Stream": "claude-ideate",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
