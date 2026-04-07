import type { Context } from "@netlify/functions";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";

// Annotated photo library — LLM must pick based on headline message
const PHOTO_LIBRARY = `
AVAILABLE PHOTOS (pick the one that supports your headline):
  1. Woman with CGM sensor, smiling at camera (identity, positivity, belonging)
     https://cdn.prod.website-files.com/63ed08484c069d0492f5b0bc/66ff04ff698cbfcce388ff57_6557d5bba8a8893dbded1969_woman-with-signos-cgm-similing-at-camera.webp
  2. Woman preparing healthy food in kitchen (nutrition, meals, cooking)
     https://cdn.prod.website-files.com/63ed08484c069d0492f5b0bc/66e42ebfb05a6e530a49a9c3_woman-preparing-healthy-food.webp
  3. Couple eating Thai food together (social eating, enjoyment, freedom)
     https://cdn.prod.website-files.com/63ed08484c069d0492f5b0bc/6977bf4595147e56c8aa6cd9_young-asian-couple-traveler-tourists-eating-thai-s-2026-01-06-10-39-06-utc%20(1)-p-800.jpg
  4. Male friends outdoors being active (active lifestyle, energy, social)
     https://cdn.prod.website-files.com/63ed08484c069d0492f5b0bc/691a0332bd872eb104526272_multiethnic-diverse-male-friends-having-fun-togeth-2025-10-14-08-35-41-utc-min-p-800.jpg
  5. Athletic woman exercising with weights (fitness, training, graduation, strength)
     https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1400&q=80
RULE: Choose the photo that DIRECTLY supports the headline. Never reuse the same URL for different concepts in a batch.`;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// ── Archetype definitions ──────────────────────────────────────────────

const ARCHETYPES: Record<string, { label: string; desc: string }> = {
  signos_split: {
    label: "Photo Top + Dark Panel",
    desc: "Photo top zone, navy copy panel bottom, phone overlapping boundary",
  },
  hero_overlay: {
    label: "Full-Bleed Hero",
    desc: "Lifestyle photo covers canvas, headline overlaid with gradient veil",
  },
  editorial_light: {
    label: "Editorial Light",
    desc: "Warm cream headline zone on top, single photo below",
  },
  data_poster: {
    label: "Data Poster",
    desc: "Dark navy background, giant stat number, no photography",
  },
};

const ARCHETYPE_LIST = Object.entries(ARCHETYPES)
  .map(([k, v]) => `- ${k}: "${v.label}" — ${v.desc}`)
  .join("\n");

// ── Gold-standard template (class-based CSS) ───────────────────────────

function buildGoldTemplate(w: number, h: number): string {
  const scale = w / 1200;
  const s = (px: number) => Math.round(px * scale);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  :root {
    --bg-light: #f3f5f9;
    --bg-navy: #1f2746;
    --bg-navy-2: #1a2140;
    --text-dark: #1d2340;
    --text-mid: #495273;
    --text-light: #f6f3ee;
    --accent: #ff3b7f;
    --shadow: 0 24px 60px rgba(12,16,30,0.22);
  }
  * { box-sizing: border-box; margin: 0; }
  html, body { background: #111; font-family: Inter, Arial, sans-serif; }
  body { display: grid; place-items: center; min-height: 100vh; }

  .ad { position: relative; width: ${w}px; height: ${h}px; overflow: hidden; background: var(--bg-light); }

  .top {
    position: absolute; inset: 0 0 43% 0;
    background:
      linear-gradient(90deg,
        rgba(243,245,249,0.96) 0%, rgba(243,245,249,0.90) 28%,
        rgba(243,245,249,0.62) 48%, rgba(243,245,249,0.20) 68%,
        rgba(243,245,249,0.00) 84%),
      url("PHOTO_URL_HERE");
    background-size: cover; background-position: center top;
  }
  .bottom {
    position: absolute; inset: 57% 0 0 0;
    background: linear-gradient(180deg, var(--bg-navy) 0%, var(--bg-navy-2) 100%);
  }

  .headline {
    position: absolute; top: ${s(58)}px; left: ${s(58)}px;
    width: ${s(650)}px; z-index: 3; color: var(--text-dark);
  }
  .kicker {
    font-size: ${s(18)}px; font-weight: 700; letter-spacing: 0.10em;
    text-transform: uppercase; color: var(--accent); margin-bottom: ${s(18)}px;
  }
  .headline h1 {
    margin: 0; font-size: ${s(88)}px; line-height: 0.94;
    letter-spacing: -0.055em; font-weight: 900; text-transform: uppercase;
  }
  .headline .accent { color: var(--accent); }
  .headline p {
    margin: ${s(18)}px 0 0; max-width: ${s(460)}px;
    font-size: ${s(22)}px; line-height: 1.28; color: var(--text-mid); font-weight: 500;
  }

  .phone {
    position: absolute; left: ${s(58)}px; bottom: ${s(48)}px;
    width: ${s(300)}px; height: ${s(548)}px;
    border-radius: ${s(34)}px;
    background: linear-gradient(180deg, #fcfcfd 0%, #f2f3f5 100%);
    border: ${s(5)}px solid #0d1018;
    box-shadow: var(--shadow); overflow: hidden; z-index: 4;
  }
  .notch {
    position: absolute; top: ${s(14)}px; left: 50%; transform: translateX(-50%);
    width: ${s(114)}px; height: ${s(28)}px; border-radius: ${s(18)}px; background: #05070b; z-index: 3;
  }
  .screen {
    position: absolute; inset: 0;
    padding: ${s(26)}px ${s(22)}px ${s(20)}px; color: #28304d;
  }
  .status {
    margin-top: ${s(16)}px; display: flex; justify-content: space-between;
    align-items: center; font-size: ${s(12)}px; font-weight: 700; color: #12151f;
  }
  .label { margin-top: ${s(18)}px; font-size: ${s(12)}px; color: #5a617c; }
  .reading { margin-top: ${s(6)}px; display: flex; align-items: flex-end; gap: ${s(8)}px; }
  .reading .num { font-size: ${s(78)}px; line-height: 0.9; font-weight: 800; letter-spacing: -0.06em; }
  .reading .unit { margin-bottom: ${s(8)}px; font-size: ${s(14)}px; line-height: 1.05; color: #4d546e; }
  .metrics {
    margin-top: ${s(12)}px; display: flex; gap: ${s(10)}px;
    font-size: ${s(12)}px; font-weight: 700; color: #384057;
  }
  .metrics span::before {
    content: ""; display: inline-block; width: ${s(4)}px; height: ${s(12)}px;
    border-radius: 2px; margin-right: ${s(4)}px; vertical-align: -2px;
  }
  .metrics span:nth-child(1)::before { background: #18b8a5; }
  .metrics span:nth-child(2)::before { background: #ff623b; }
  .metrics span:nth-child(3)::before { background: #f3b02a; }
  .alert {
    margin-top: ${s(18)}px; padding: ${s(10)}px ${s(12)}px;
    display: grid; grid-template-columns: ${s(54)}px 1fr ${s(14)}px;
    gap: ${s(10)}px; align-items: center;
    border-radius: ${s(16)}px; border: 3px solid #f6a623; background: #eae3d9;
  }
  .alert-time {
    padding: ${s(8)}px 0; border-radius: ${s(10)}px; background: #f6a623;
    color: #694300; text-align: center; font-size: ${s(12)}px; font-weight: 800;
  }
  .alert strong { display: block; font-size: ${s(12)}px; line-height: 1.1; }
  .alert small { display: block; margin-top: 2px; color: #5a617c; font-size: ${s(11)}px; line-height: 1.25; }
  .chart {
    position: absolute; left: ${s(20)}px; right: ${s(20)}px; top: ${s(242)}px; bottom: ${s(20)}px;
    border-radius: ${s(18)}px; overflow: hidden;
    background: linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(241,242,244,0.98) 100%);
  }
  .chart svg { width: 100%; height: 100%; display: block; }

  .copy {
    position: absolute; right: ${s(78)}px; bottom: ${s(110)}px;
    width: ${s(360)}px; z-index: 4; color: var(--text-light);
  }
  .copy .eyebrow {
    margin: 0 0 ${s(12)}px; font-size: ${s(16)}px; font-weight: 700;
    letter-spacing: 0.12em; text-transform: uppercase; color: rgba(246,243,238,0.72);
  }
  .copy h2 {
    margin: 0; font-size: ${s(60)}px; line-height: 0.94;
    letter-spacing: -0.05em; font-weight: 900; text-transform: uppercase;
  }
  .copy p {
    margin: ${s(16)}px 0 0; max-width: ${s(320)}px;
    font-size: ${s(20)}px; line-height: 1.28; color: rgba(246,243,238,0.84); font-weight: 500;
  }

  .logo {
    position: absolute; right: ${s(58)}px; bottom: ${s(34)}px;
    display: flex; align-items: center; gap: ${s(12)}px; z-index: 5;
  }
  .mark {
    width: ${s(42)}px; height: ${s(54)}px; background: var(--accent);
    clip-path: polygon(26% 0%,100% 0%,72% 34%,100% 34%,74% 68%,100% 68%,74% 100%,0% 100%,28% 66%,0% 66%,28% 32%,0% 32%);
  }
  .logo span { font-size: ${s(28)}px; letter-spacing: 0.06em; font-weight: 700; color: var(--text-light); }
</style>
</head>
<body>
  <div class="ad">
    <div class="top"></div>
    <div class="bottom"></div>

    <section class="headline">
      <div class="kicker">KICKER TEXT</div>
      <h1>HEADLINE<br>WITH <span class="accent">ACCENT</span><br>PHRASE.</h1>
      <p>One short supporting sentence under the headline.</p>
    </section>

    <div class="phone">
      <div class="notch"></div>
      <div class="screen">
        <div class="status"><span>6:50</span><span>● ◔ ▮</span></div>
        <div class="label">Current glucose</div>
        <div class="reading"><div class="num">110</div><div class="unit">mg<br>dL</div></div>
        <div class="metrics"><span>TIR 82%</span><span>SPD 7</span><span>LST 5:30p</span></div>
        <div class="alert">
          <div class="alert-time">10:02</div>
          <div><strong>Fast rise predicted</strong><small>Move now to steady your glucose</small></div>
          <div style="font-size:${s(20)}px;color:#7a5a1e;">›</div>
        </div>
        <div class="chart">
          <svg viewBox="0 0 1000 620" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#ff7c3f" stop-opacity="0.38"/>
                <stop offset="38%" stop-color="#b866ff" stop-opacity="0.24"/>
                <stop offset="100%" stop-color="#8d38ff" stop-opacity="0"/>
              </linearGradient>
              <linearGradient id="strokeGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="#6342ff"/>
                <stop offset="45%" stop-color="#8b31ff"/>
                <stop offset="78%" stop-color="#ff8b2f"/>
                <stop offset="100%" stop-color="#ff5378"/>
              </linearGradient>
            </defs>
            <path d="M0,500 C65,450 110,455 155,470 C205,485 240,445 285,325 C310,260 330,420 360,505 C392,595 430,210 470,175 C500,150 525,350 555,430 C585,510 620,520 650,445 C685,360 712,315 748,380 C790,455 850,488 905,476 C940,468 970,458 1000,455 L1000,620 L0,620 Z" fill="url(#fillGrad)"/>
            <path d="M0,500 C65,450 110,455 155,470 C205,485 240,445 285,325 C310,260 330,420 360,505 C392,595 430,210 470,175 C500,150 525,350 555,430 C585,510 620,520 650,445 C685,360 712,315 748,380 C790,455 850,488 905,476 C940,468 970,458 1000,455" fill="none" stroke="url(#strokeGrad)" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
    </div>

    <section class="copy">
      <div class="eyebrow">EYEBROW TEXT</div>
      <h2>SUPPORT<br>HEADLINE.</h2>
      <p>One short body sentence that reinforces the main idea.</p>
    </section>

    <div class="logo"><div class="mark"></div><span>SIGNOS</span></div>
  </div>
</body>
</html>`;
}

// ── System prompt ──────────────────────────────────────────────────────

function buildSystemPrompt(archetype: string | null, w: number, h: number): string {
  const goldTemplate = buildGoldTemplate(w, h);

  const archVariations = `
ARCHETYPE VARIATIONS (modify the gold template as described):

signos_split (DEFAULT — Photo Top + Dark Panel):
  Use the gold template EXACTLY as provided. This is the proven Signos pattern.
  .top = lifestyle photo with left-to-right gradient veil
  .bottom = solid navy panel
  .headline = over the photo zone, left-aligned
  .phone = bottom-left, overlapping the photo/panel boundary
  .copy = right side of the navy panel (eyebrow + h2 + p)
  .logo = bottom-right

hero_overlay (Full-Bleed Hero):
  Change .top to cover the ENTIRE canvas (inset: 0). Remove .bottom entirely.
  Use a subtle dark veil gradient (not too dark — just enough for readability).
  .headline stays top-left but use white/light text (color: var(--text-light)).
  .copy moves to bottom-right, also white text.
  .phone is OPTIONAL — include only if it strengthens the concept. If included, bottom-left.
  The headline IS the hero. Photo IS the emotional backdrop.

editorial_light (Light Editorial):
  Change .top to a solid warm cream background (#f3f0e8), NO photo in the top zone.
  .headline uses dark text over cream. Font-size can be slightly smaller (72-80px).
  .bottom becomes a single lifestyle photo covering the lower 40%.
  .phone overlaps the text/photo boundary at bottom-left.
  .copy is NOT needed — the headline zone carries all the text.
  Clean, magazine-like feel. Lots of breathing room.

data_poster (Data Poster — NO photography):
  Remove .top and .bottom. Set .ad background to var(--bg-navy).
  Replace .headline h1 with a GIANT stat number (120-160px, color: var(--accent)).
  .headline p becomes the explanation of the stat (24-28px, white).
  Remove .phone entirely — this is a typography-led layout.
  .copy is NOT needed. Center everything vertically.
  .logo stays bottom-right.
  This is the ONLY archetype that skips photography.`;

  const selectedArch = archetype && ARCHETYPES[archetype] ? archetype : null;
  const archInstruction = selectedArch
    ? `\nYOU MUST USE the "${selectedArch}" variation. Follow its specific instructions above while keeping the gold template's class structure.`
    : `\nNo archetype specified. Default to "signos_split" — use the gold template as-is.`;

  return `You are a world-class creative director producing finished Signos ads as self-contained HTML/CSS.

You have ONE gold-standard HTML template below. Every ad you create MUST start from this template's CLASS-BASED structure. You customize the CONTENT (text, photo URL, colors) but PRESERVE the CSS class names, the layout zones, the spacing, and the sizing.

═══════════════════════════════════════════════
COMPOSITION LAW (NEVER VIOLATE)
═══════════════════════════════════════════════
One ad = ONE focal headline + ONE quiet support zone + ONE proof element + ONE logo.

- The .headline section is the ONLY large text. h1 gets 80-100px, weight 900.
- The .copy section is SMALLER and QUIETER. h2 max 60px. p max 22px. NEVER mono font.
- The .phone is PROOF, not hero. It stays at 300px wide (25% of 1200). NEVER enlarge it.
- The .logo sits quietly in one corner.
- DO NOT create two headline-sized text blocks.
- DO NOT add text blocks that are not part of .headline or .copy.
- DO NOT use monospace/mono font anywhere. All text is Inter only.
- The ad must have exactly these semantic parts: .headline, .copy, .logo, and optionally .phone.

═══════════════════════════════════════════════
TEXT HIERARCHY (exact sizes for 1200px canvas)
═══════════════════════════════════════════════
.kicker:        16-18px, weight 700, uppercase, letter-spacing 0.10em, accent color
.headline h1:   80-100px, weight 900, uppercase, letter-spacing -0.05em
.headline p:    20-24px, weight 500, muted color
.copy .eyebrow: 14-16px, weight 700, uppercase, muted white
.copy h2:       50-60px, weight 900, uppercase
.copy p:        18-22px, weight 500, muted white

BANNED: monospace font at any size. Multiple text blocks above 50px. Support copy wider than 360px.

═══════════════════════════════════════════════
MESSAGING RULES
═══════════════════════════════════════════════
Headline must: challenge a belief, create contrast, name a frustration, or provoke curiosity.
- Headline ≤ 10 words. Subhead ≤ 2 short lines.
- BANNED: "stay on track", "build healthy habits", "reach your goals", "take control", "transform your health", "sustainable habits", "track patterns"
- Lead with USER pain. Signos is the ANSWER, not the opening subject.
- One core idea per ad.

${PHOTO_LIBRARY}
${archVariations}
${archInstruction}

═══════════════════════════════════════════════
GOLD-STANDARD HTML TEMPLATE
═══════════════════════════════════════════════
${goldTemplate}

═══════════════════════════════════════════════
HOW TO USE THIS TEMPLATE
═══════════════════════════════════════════════
1. Start from the gold template above. Keep ALL class names and the <style> block.
2. Replace PHOTO_URL_HERE in .top with a real photo URL from the library.
3. Replace .kicker text, .headline h1 text, .headline p text with your creative.
4. Place your accent span on ONE key phrase (2-4 words) using class="accent".
5. Replace .copy .eyebrow, .copy h2, .copy p with your support messaging.
6. Keep the .phone exactly as provided (300px wide). Remove it only if the archetype says to.
7. Keep the .logo exactly as provided.
8. You MAY adjust CSS values proportionally for non-square canvases, but DO NOT change class names, layout structure, or add new positioned elements.
9. DO NOT add inline styles that override the class-based layout. Work WITHIN the system.

Output ONLY the complete HTML document. No markdown fences. No explanation.`;
}

// ── Claude helpers ─────────────────────────────────────────────────────

async function streamClaude(apiKey: string, system: string, userContent: string, maxTokens = 8000): Promise<Response> {
  const resp = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, stream: true, system, messages: [{ role: "user", content: userContent }] }),
  });
  if (!resp.ok) { const t = await resp.text(); return json({ error: `Claude ${resp.status}: ${t}` }, 502); }

  const encoder = new TextEncoder();
  const reader = resp.body!.getReader();
  const decoder = new TextDecoder();
  const readable = new ReadableStream({
    async pull(controller) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) { controller.close(); return; }
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;
          try {
            const evt = JSON.parse(payload);
            if (evt.type === "content_block_delta" && evt.delta?.text) controller.enqueue(encoder.encode(evt.delta.text));
          } catch { /* skip */ }
        }
      }
    },
  });
  return new Response(readable, { headers: { ...CORS, "Content-Type": "text/html; charset=utf-8", "Transfer-Encoding": "chunked", "Cache-Control": "no-cache" } });
}

async function callClaude(apiKey: string, system: string, userContent: string, maxTokens = 4096): Promise<string> {
  const resp = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: "user", content: userContent }] }),
  });
  if (!resp.ok) throw new Error(`Claude ${resp.status}`);
  const data = await resp.json();
  return data.content?.[0]?.text || "";
}

// ── Handler ────────────────────────────────────────────────────────────

export default async (req: Request, _ctx: Context) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS });

  const apiKey = Netlify.env.get("ANTHROPIC_API_KEY") || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ error: "Missing API key" }, 500);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const action = body.action as string;

  // ── GENERATE ──────────────────────────────────────────────────────────
  if (action === "generate") {
    const w = Number(body.width) || 1200, h = Number(body.height) || 1200;
    const archetype = (body.archetype as string) || null;
    const system = buildSystemPrompt(archetype, w, h);
    const prompt = `Create a Signos ad at ${w}x${h}px (${body.sizeLabel || "Square"}).

Topic/Angle: ${body.topic || body.headline || "Signos CGM for metabolic health"}
${body.headline ? `Headline direction: ${body.headline}` : "Generate a belief-challenging headline."}
${body.subhead ? `Subhead: ${body.subhead}` : ""}
${body.details ? `Creative notes: ${body.details}` : ""}
${body.imageUrl ? `Use this photo: ${body.imageUrl}` : "Pick the most relevant photo from the library based on your headline."}

Start from the gold template. Replace ONLY the text content and photo URL. Keep all class names, CSS structure, and layout zones intact.

Output ONLY the HTML.`;
    return streamClaude(apiKey, system, prompt);
  }

  // ── ITERATE ───────────────────────────────────────────────────────────
  if (action === "iterate") {
    const w = Number(body.width) || 1200, h = Number(body.height) || 1200;
    const system = buildSystemPrompt(null, w, h);
    const prompt = `You are editing an existing Signos ad. Here is the current HTML:

${body.currentHtml}

EDIT INSTRUCTIONS: ${body.instructions}

AUTO-FIX (apply even if not asked):
1. More than one text block above 50px? → Remove the weaker one. Only .headline h1 and .copy h2 may be large.
2. Phone wider than 320px? → Shrink to 300px.
3. Monospace font anywhere? → Switch to Inter.
4. Missing #ff3b7f accent on one headline phrase? → Add it.
5. Support copy (.copy) wider than 380px? → Narrow to 360px.

Apply edits AND fixes. Return COMPLETE updated HTML. Output ONLY HTML.`;
    return streamClaude(apiKey, system, prompt);
  }

  // ── BATCH ─────────────────────────────────────────────────────────────
  if (action === "batch") {
    const prompt = `Generate 4 ad concept variations for Signos (CGM metabolic health), one per archetype.

Topic: ${body.topic}
Angle: ${body.angle || ""}
Size: ${body.width || 1200}x${body.height || 1200}px
Details: ${body.details || "none"}

Archetypes:
${ARCHETYPE_LIST}

Each headline must be a persuasion hook (≤10 words), NOT a product description.
Good: "The scale is gaslighting you." / "GLP-1s stop working. Signos doesn't."
Bad: "Track your glucose patterns" / "Build sustainable habits"

Each concept must use a DIFFERENT photo from the library. Never reuse the same photo URL.

Output JSON array of 4 objects:
[{"name":"short name","archetype":"archetype_id","headline":"provocative headline","subhead":"1-2 lines","angle_description":"why this persuades"}]

Output ONLY valid JSON.`;

    try {
      const raw = await callClaude(apiKey, "Elite DTC creative director. Belief-challenging copy only. Output only valid JSON.", prompt, 2000);
      const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      return json({ variations: JSON.parse(cleaned) });
    } catch (e) { return json({ error: e instanceof Error ? e.message : "batch failed" }, 500); }
  }

  // ── SIGNALS → ANGLES ─────────────────────────────────────────────────
  if (action === "signals") {
    const prompt = `You are a performance marketing strategist for Signos (CGM metabolic health app).

Given these keyword/trend signals:
${body.keywords}

${body.topic ? `Topic context: ${body.topic}` : ""}

Generate 6 distinct messaging angles. Each must be SPECIFIC, BELIEF-CHALLENGING, EMOTIONALLY CHARGED.

For each, suggest the best visual archetype: ${Object.keys(ARCHETYPES).join(", ")}

Output JSON array:
[{"angle":"short name","hook":"headline ≤10 words","emotion":"fear|hope|curiosity|identity|control|urgency","insight":"why this resonates","archetypes":["id_1","id_2"]}]

BANNED: "stay on track", "build habits", "reach your goals", "transform your health"

Output ONLY valid JSON.`;

    try {
      const raw = await callClaude(apiKey, "Elite performance marketing strategist. Belief-challenging copy only. Output only valid JSON.", prompt, 2000);
      const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      return json({ angles: JSON.parse(cleaned) });
    } catch (e) { return json({ error: e instanceof Error ? e.message : "signals failed" }, 500); }
  }

  // ── GOOGLE RSA ────────────────────────────────────────────────────────
  if (action === "google_rsa") {
    const prompt = `You are a Google Ads specialist for Signos (CGM metabolic health app).

Keywords/themes: ${body.keywords}
Landing page: ${body.landing_page || "signos.com — CGM for weight management and metabolic health"}
${body.topic ? `Campaign topic: ${body.topic}` : ""}

Generate RSA asset set:
- 15 headlines (max 30 chars each, work in any combination)
- 4 descriptions (max 90 chars each)
- Mix: benefit, feature, CTA, social proof, urgency
- At least 3 headlines include a target keyword

Score: keyword_coverage, diversity, combination_safety (0-10 each), overall_strength

Output JSON:
{"headlines":[],"descriptions":[],"scores":{"keyword_coverage":0,"diversity":0,"combination_safety":0,"overall_strength":"Good"},"improvements":[],"keyword_groups":[{"keyword":"...","matched_headlines":[]}]}

Output ONLY valid JSON.`;

    try {
      const raw = await callClaude(apiKey, "Google Ads RSA expert. Output only valid JSON.", prompt, 3000);
      const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      return json(JSON.parse(cleaned));
    } catch (e) { return json({ error: e instanceof Error ? e.message : "RSA failed" }, 500); }
  }

  // ── REVIEW ────────────────────────────────────────────────────────────
  if (action === "review") {
    const platform = (body.platform as string) || "meta";
    const prevArchetypes = (body.prev_archetypes as string[]) || [];

    const prompt = `Evaluate this Signos ad. Score 1-5 per category. Be HARSH.

Platform: ${platform}
${prevArchetypes.length ? `Previous archetypes: ${prevArchetypes.join(", ")}. Penalize similarity.` : ""}

Ad HTML:
${body.html}

RUBRIC (1-5):
1. HOOK STRENGTH: 1=generic 3=clear but unremarkable 5=provocative, belief-challenging
2. SINGLE CORE IDEA: 1=competing messages 3=main idea + clutter 5=one idea dominates
3. PROBLEM RELEVANCE: 1=feature-led 3=generic issue 5=names a real user frustration
4. REFRAME QUALITY: 1=descriptive only 3=light reframe 5=strong belief shift
5. BENEFIT-FIRST: 1=product-led 3=mixed 5=outcome-first, product is enabler
6. VISUAL-MESSAGE FIT: 1=abstract/disconnected 3=fits topic 5=image reinforces headline
7. READABILITY: 1=crowded/low-contrast 3=readable 5=scannable in <2s, strong hierarchy
8. SPECIFICITY: 1=vague/generic 3=somewhat specific 5=concrete proof point

FAST FAIL if any ≤2: hook_strength, single_core_idea, visual_message, readability

COMPOSITION CHECKS:
- Is there more than one text block above 50px? (fail: competing focal points)
- Is the phone wider than 320px? (fail: device-as-hero)
- Is monospace font used for large text? (fail: wrong hierarchy)
- Is there a giant empty zone? (fail: unresolved composition)
- Are there more than 4 positioned elements? (fail: too complex)

Output JSON:
{"hook_strength":{"score":0,"feedback":""},"single_core_idea":{"score":0,"feedback":""},"problem_relevance":{"score":0,"feedback":""},"reframe_quality":{"score":0,"feedback":""},"benefit_first":{"score":0,"feedback":""},"visual_message":{"score":0,"feedback":""},"readability":{"score":0,"feedback":""},"specificity":{"score":0,"feedback":""},"total":0,"max_total":40,"verdict":"Excellent|Good|Mediocre|Weak|Poor","fast_fail":false,"fast_fail_reasons":[],"design_violations":[],"top_improvements":[],"headline_rewrite":"better headline"}

34-40=Excellent 28-33=Good 20-27=Mediocre 12-19=Weak 8-11=Poor

Output ONLY valid JSON.`;

    try {
      const raw = await callClaude(apiKey, "Brutally honest creative director. Penalize generic copy, oversized phones, competing focal points, mono font. Output only valid JSON.", prompt, 3000);
      const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      return json(JSON.parse(cleaned));
    } catch (e) { return json({ error: e instanceof Error ? e.message : "review failed" }, 500); }
  }

  // ── EXPORT FIGMA ──────────────────────────────────────────────────────
  if (action === "export_figma") {
    const w = body.width || 1200, h = body.height || 1200;
    const prompt = `Convert this HTML ad into AdBlueprint JSON for a Figma plugin.

HTML:
${body.html}

Canvas: ${w}x${h}px

Schema:
{"variant_name":"","canvas":{"width":${w},"height":${h}},"background":{"recraft_prompt":"","dominant_colors":[],"mood":"","style":"realistic_image"},"overlay":{"type":"gradient|solid|none","color_start":"","color_end":"","direction":"to bottom","opacity_start":0,"opacity_end":0.85,"coverage_percent":100},"elements":[{"id":"","type":"text|button|logo|image|shape","content":"","x":0,"y":0,"max_width":0,"width":0,"height":0,"font_family":"Inter","font_weight":700,"font_size":48,"color":"#FFF","bg_color":"","text_color":"","border_radius":0,"align":"left","opacity":1,"required":true}],"text_checklist":[{"element_id":"","exact_text":""}],"design_rules":[]}

Extract precise positions, sizes, colors from CSS. Output ONLY valid JSON.`;

    try {
      const raw = await callClaude(apiKey, "Extract structured layout data from HTML. Output only valid JSON.", prompt, 4000);
      const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      return json({ blueprint: JSON.parse(cleaned) });
    } catch (e) { return json({ error: e instanceof Error ? e.message : "export failed" }, 500); }
  }

  return json({ error: `Unknown action: ${action}` }, 400);
};
