import type { Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

interface FeedbackEntry {
  id: string;
  jobId: string;
  contentType: string;
  rating: number;
  tags: string[];
  notes: string;
  imagePrompt: string;
  headline?: string;
  hook?: string;
  timestamp: number;
}

interface SaveRequest {
  action: "save";
  feedback: FeedbackEntry;
}

interface ListRequest {
  action: "list";
  contentType?: string;
  limit?: number;
}

interface SynthesizeRequest {
  action: "synthesize";
  contentType?: string;
}

type FeedbackRequest = SaveRequest | ListRequest | SynthesizeRequest;

const STORE_NAME = "content-feedback";
const INDEX_KEY = "feedback-index";
const GUIDE_KEY_PREFIX = "style-guide-";

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

  try {
    const store = getStore(STORE_NAME);
    const body: FeedbackRequest = await req.json();

    switch (body.action) {
      case "save": {
        const { feedback } = body;
        if (!feedback?.id || !feedback?.rating) {
          return Response.json(
            { error: "feedback.id and feedback.rating required" },
            { status: 400 }
          );
        }

        await store.setJSON(`entry-${feedback.id}`, feedback);

        let index: string[] = [];
        try {
          const existing = await store.get(INDEX_KEY);
          if (existing) index = JSON.parse(existing);
        } catch {
          index = [];
        }

        index.push(feedback.id);
        if (index.length > 200) index = index.slice(-200);
        await store.set(INDEX_KEY, JSON.stringify(index));

        return Response.json({ success: true, saved: feedback.id });
      }

      case "list": {
        const { contentType, limit = 30 } = body;

        let index: string[] = [];
        try {
          const existing = await store.get(INDEX_KEY);
          if (existing) index = JSON.parse(existing);
        } catch {
          index = [];
        }

        const recentIds = index.slice(-limit).reverse();
        const entries: FeedbackEntry[] = [];

        for (const id of recentIds) {
          try {
            const entry = await store.get(`entry-${id}`, { type: "json" }) as FeedbackEntry | null;
            if (entry) {
              if (!contentType || entry.contentType === contentType) {
                entries.push(entry);
              }
            }
          } catch {
            // skip corrupted entries
          }
        }

        return Response.json({ success: true, entries, total: index.length });
      }

      case "synthesize": {
        const { contentType } = body;
        const apiKey = Netlify.env.get("ANTHROPIC_API_KEY");
        if (!apiKey) {
          return Response.json(
            { error: "ANTHROPIC_API_KEY needed for synthesis" },
            { status: 500 }
          );
        }

        let index: string[] = [];
        try {
          const existing = await store.get(INDEX_KEY);
          if (existing) index = JSON.parse(existing);
        } catch {
          index = [];
        }

        const allEntries: FeedbackEntry[] = [];
        for (const id of index.slice(-50)) {
          try {
            const entry = await store.get(`entry-${id}`, { type: "json" }) as FeedbackEntry | null;
            if (entry) {
              if (!contentType || entry.contentType === contentType) {
                allEntries.push(entry);
              }
            }
          } catch {
            // skip
          }
        }

        if (allEntries.length === 0) {
          return Response.json({
            success: true,
            guide: "No feedback entries yet.",
            entryCount: 0,
          });
        }

        const feedbackSummary = allEntries.map((e) => {
          const tagStr = e.tags.length > 0 ? `Tags: ${e.tags.join(", ")}` : "";
          return `- Rating: ${e.rating}/5 | Type: ${e.contentType} | ${tagStr}${e.notes ? ` | Notes: "${e.notes}"` : ""}${e.headline ? ` | Headline: "${e.headline}"` : ""}`;
        }).join("\n");

        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 2048,
            system: `You are analyzing user feedback on AI-generated advertising images for Signos (a CGM/metabolic health company). Your job is to synthesize the feedback into a concise, actionable style guide that will be injected into future ad generation prompts.

Output a structured style guide with these sections:
1. STRONG LIKES (patterns from highly-rated ads, ratings 4-5)
2. COMMON ISSUES (patterns from low-rated ads, ratings 1-2)
3. SPECIFIC RULES (concrete, actionable directives derived from the feedback)

Keep it concise — max 15 bullet points total. Each point should be a clear, actionable instruction for an AI image generator.`,
            messages: [{
              role: "user",
              content: `Here are ${allEntries.length} feedback entries from a user reviewing AI-generated Signos ads:\n\n${feedbackSummary}\n\nSynthesize this into a concise style guide.`,
            }],
          }),
        });

        if (!response.ok) {
          return Response.json(
            { error: `Synthesis failed: ${response.status}` },
            { status: 502 }
          );
        }

        const data = await response.json();
        const guide =
          data.content?.[0]?.text || "Failed to generate style guide";

        const guideKey = contentType
          ? `${GUIDE_KEY_PREFIX}${contentType}`
          : `${GUIDE_KEY_PREFIX}all`;
        await store.set(guideKey, guide);

        return Response.json({
          success: true,
          guide,
          entryCount: allEntries.length,
        });
      }

      default:
        return Response.json(
          { error: "Invalid action. Use: save, list, synthesize" },
          { status: 400 }
        );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
