import type { Context } from "@netlify/functions";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";

const LIFESTYLE_PHOTOS = [
  "https://cdn.prod.website-files.com/63ed08484c069d0492f5b0bc/66ff04ff698cbfcce388ff57_6557d5bba8a8893dbded1969_woman-with-signos-cgm-similing-at-camera.webp",
  "https://cdn.prod.website-files.com/63ed08484c069d0492f5b0bc/66e42ebfb05a6e530a49a9c3_woman-preparing-healthy-food.webp",
  "https://cdn.prod.website-files.com/63ed08484c069d0492f5b0bc/6977bf4595147e56c8aa6cd9_young-asian-couple-traveler-tourists-eating-thai-s-2026-01-06-10-39-06-utc%20(1)-p-800.jpg",
  "https://cdn.prod.website-files.com/63ed08484c069d0492f5b0bc/691a0332bd872eb104526272_multiethnic-diverse-male-friends-having-fun-togeth-2025-10-14-08-35-41-utc-min-p-800.jpg",
  "https://cdn.prod.website-files.com/63ed08484c069d0492f5b0bc/695a945193266413762d2199_Option%206.png",
];
const PHOTO_LIST = LIFESTYLE_PHOTOS.map((u, i) => `  lifestyle_${i + 1}: ${u}`).join("\n");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// ── Reusable phone mockup HTML block ───────────────────────────────────

const PHONE_MOCKUP_HTML = `<div style="position:relative;width:PHONE_WIDTHpx;height:PHONE_HEIGHTpx;border-radius:44px;background:#f7f7f8;border:6px solid #0e0f14;box-shadow:0 18px 45px rgba(0,0,0,0.22);overflow:hidden;">
<div style="position:absolute;top:13px;left:50%;transform:translateX(-50%);width:120px;height:30px;border-radius:18px;background:#090a0c;z-index:3;"></div>
<div style="position:absolute;inset:0;padding:28px 26px 22px;color:#2a2e44;background:linear-gradient(180deg,#fafafa 0%,#f3f3f4 100%);font-family:Inter,Arial,sans-serif;">
<div style="margin-top:16px;display:flex;justify-content:space-between;align-items:center;font-size:13px;color:#111318;font-weight:700;"><span>6:50</span><span style="font-size:11px;">●  ◔  ▮</span></div>
<div style="margin-top:18px;font-size:12px;color:#5b6075;">Current glucose</div>
<div style="margin-top:4px;display:flex;align-items:flex-end;gap:8px;color:#232844;"><span style="font-size:82px;line-height:0.9;font-weight:800;letter-spacing:-0.05em;">110</span><span style="font-size:14px;line-height:1.1;margin-bottom:10px;color:#4d546e;">mg<br>dL</span></div>
<div style="margin-top:10px;display:flex;gap:12px;font-size:12px;color:#384057;font-weight:700;"><span style="display:inline-flex;align-items:center;gap:4px;"><span style="display:inline-block;width:4px;height:12px;border-radius:3px;background:#18b8a5;"></span>TIR 82%</span><span style="display:inline-flex;align-items:center;gap:4px;"><span style="display:inline-block;width:4px;height:12px;border-radius:3px;background:#ff5630;"></span>SPD 7</span><span style="display:inline-flex;align-items:center;gap:4px;"><span style="display:inline-block;width:4px;height:12px;border-radius:3px;background:#f4b02a;"></span>LST 5:30p</span></div>
<div style="margin-top:20px;background:#e9e3db;border:3px solid #f6a623;border-radius:16px;padding:10px 12px;display:grid;grid-template-columns:52px 1fr 16px;align-items:center;gap:10px;">
<div style="background:#f6a623;color:#5a3900;border-radius:10px;padding:8px 6px;text-align:center;font-size:12px;font-weight:800;">10:02</div>
<div><div style="font-size:12px;font-weight:700;color:#29304a;">Fast rise predicted</div><div style="font-size:11px;color:#4d5875;line-height:1.25;margin-top:2px;">Move now to steady your glucose</div></div>
<div style="font-size:22px;color:#7a5a1e;">›</div>
</div>
<div style="position:absolute;left:22px;right:22px;bottom:24px;top:280px;border-radius:16px;overflow:hidden;background:linear-gradient(180deg,rgba(255,255,255,0.5),rgba(240,240,243,0.8));">
<svg viewBox="0 0 1000 620" preserveAspectRatio="none" style="width:100%;height:100%;display:block;" aria-hidden="true">
<defs><linearGradient id="fg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ff6e3c" stop-opacity="0.55"/><stop offset="28%" stop-color="#f7b448" stop-opacity="0.42"/><stop offset="62%" stop-color="#8d38ff" stop-opacity="0.28"/><stop offset="100%" stop-color="#8d38ff" stop-opacity="0"/></linearGradient><linearGradient id="sg" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#6341ff"/><stop offset="45%" stop-color="#8d2fff"/><stop offset="78%" stop-color="#ff8d2d"/><stop offset="100%" stop-color="#ff4774"/></linearGradient></defs>
<path d="M0,500 C55,470 90,455 130,465 C175,475 210,485 250,455 C290,425 305,320 340,360 C360,385 372,560 395,535 C430,495 445,210 480,180 C505,160 520,340 545,395 C575,455 595,540 625,500 C655,455 675,330 705,350 C745,376 770,448 805,470 C850,495 900,485 945,470 C970,463 985,462 1000,462 L1000,620 L0,620 Z" fill="url(#fg)"/>
<path d="M0,500 C55,470 90,455 130,465 C175,475 210,485 250,455 C290,425 305,320 340,360 C360,385 372,560 395,535 C430,495 445,210 480,180 C505,160 520,340 545,395 C575,455 595,540 625,500 C655,455 675,330 705,350 C745,376 770,448 805,470 C850,495 900,485 945,470 C970,463 985,462 1000,462" fill="none" stroke="url(#sg)" stroke-width="10" stroke-linecap="round"/>
</svg>
</div>
</div>
</div>`;

// ── Template-based archetypes ──────────────────────────────────────────

const ARCHETYPES: Record<string, { label: string; desc: string }> = {
  signos_split: {
    label: "Photo Top + Dark Panel",
    desc: "Photo top zone, navy copy panel bottom, phone mockup overlapping the boundary",
  },
  hero_overlay: {
    label: "Full-Bleed + Headline Overlay",
    desc: "Full lifestyle photo with headline overlaid using directional gradient for readability",
  },
  editorial_light: {
    label: "Light Editorial + Image Strip",
    desc: "Warm cream headline zone on top, photo/product strip on bottom",
  },
  data_poster: {
    label: "Data Poster",
    desc: "Poster-style layout with bold stat or typography, dark background, optional proof element",
  },
};

const ARCHETYPE_LIST = Object.entries(ARCHETYPES)
  .map(([k, v]) => `- ${k}: "${v.label}" — ${v.desc}`)
  .join("\n");

// ── System prompt with full HTML/CSS templates ─────────────────────────

function buildSystemPrompt(archetype: string | null, w: number, h: number): string {
  const phoneW = Math.round(w * 0.36);
  const phoneH = Math.round(phoneW * 1.8);
  const phone = PHONE_MOCKUP_HTML.replace(/PHONE_WIDTH/g, String(phoneW)).replace(/PHONE_HEIGHT/g, String(phoneH));

  const templates = `
═══════════════════════════════════════════════
TEMPLATE A — "signos_split" (Photo Top + Dark Panel)
═══════════════════════════════════════════════
This is the #1 Signos ad pattern. Use it as default.

<html><head><style>*{margin:0;padding:0;box-sizing:border-box;}@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');</style></head>
<body style="margin:0;background:#111;display:flex;justify-content:center;align-items:center;min-height:100vh;">
<div style="position:relative;width:${w}px;height:${h}px;overflow:hidden;font-family:'Inter',Arial,sans-serif;background:#eef1f6;color:#f5f3ef;">

  <!-- PHOTO ZONE: top 58% — use a real lifestyle photo -->
  <div style="position:absolute;top:0;left:0;right:0;height:58%;background-image:url('PHOTO_URL');background-size:cover;background-position:center top;">
    <!-- Left-to-right gradient for headline readability over photo -->
    <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(244,246,251,0.88) 0%,rgba(244,246,251,0.78) 28%,rgba(244,246,251,0.18) 55%,rgba(244,246,251,0) 75%);pointer-events:none;"></div>
  </div>

  <!-- HEADLINE: positioned over the photo zone, left-aligned -->
  <div style="position:absolute;top:${Math.round(h * 0.04)}px;left:${Math.round(w * 0.057)}px;z-index:3;width:${Math.round(w * 0.58)}px;color:#1d2340;font-weight:900;font-size:${Math.round(w * 0.063)}px;line-height:0.95;letter-spacing:-0.045em;text-transform:uppercase;">
    HEADLINE WITH<br><span style="color:#ff3b7f;">ACCENT PHRASE</span><br>CONTINUATION.
  </div>

  <!-- DARK PANEL: bottom 42% — solid navy, hard edge -->
  <div style="position:absolute;left:0;right:0;bottom:0;height:42%;background:#1f2746;z-index:1;"></div>

  <!-- PHONE MOCKUP: overlaps the photo/panel boundary, anchored bottom-left -->
  <div style="position:absolute;left:${Math.round(w * 0.04)}px;bottom:${Math.round(h * -0.025)}px;z-index:4;">
    ${phone}
  </div>

  <!-- SUPPORT COPY: right side of the panel -->
  <div style="position:absolute;right:${Math.round(w * 0.057)}px;bottom:${Math.round(h * 0.058)}px;width:${Math.round(w * 0.42)}px;z-index:4;color:#f5f4ef;">
    <div style="font-family:'Roboto Mono','SFMono-Regular',Consolas,monospace;font-size:${Math.round(w * 0.031)}px;line-height:1.15;letter-spacing:0.05em;font-weight:700;text-transform:uppercase;">
      SUBHEAD LINE ONE<br>SUBHEAD LINE TWO.
    </div>
    <div style="margin-top:${Math.round(h * 0.025)}px;font-size:${Math.round(w * 0.028)}px;line-height:1.55;font-weight:400;color:rgba(245,244,239,0.97);">
      <strong style="font-weight:800;color:#fff;">Signos AI</strong> creates a personalized foundation for lasting weight management.
    </div>
    <!-- LOGO -->
    <div style="margin-top:${Math.round(h * 0.05)}px;display:flex;align-items:center;gap:18px;">
      <div style="width:${Math.round(w * 0.068)}px;height:${Math.round(w * 0.085)}px;background:#ff3b7f;clip-path:polygon(26% 0%,100% 0%,72% 34%,100% 34%,74% 68%,100% 68%,74% 100%,0% 100%,28% 66%,0% 66%,28% 32%,0% 32%);flex:0 0 auto;"></div>
      <span style="font-size:${Math.round(w * 0.035)}px;letter-spacing:0.04em;font-weight:500;color:#f6f3ee;">SIGNOS</span>
    </div>
  </div>
</div>
</body></html>

═══════════════════════════════════════════════
TEMPLATE B — "hero_overlay" (Full-Bleed + Headline)
═══════════════════════════════════════════════
Use for provocative belief-challenging headlines over lifestyle photos.

<html><head><style>*{margin:0;padding:0;box-sizing:border-box;}@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');</style></head>
<body style="margin:0;background:#111;display:flex;justify-content:center;align-items:center;min-height:100vh;">
<div style="position:relative;width:${w}px;height:${h}px;overflow:hidden;font-family:'Inter',Arial,sans-serif;background:#9aa8bb;background-image:url('PHOTO_URL');background-size:cover;background-position:center;color:#f5f3ef;">

  <!-- Subtle veil for text readability — NOT too dark -->
  <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,12,18,0.08) 0%,rgba(10,12,18,0.14) 100%);"></div>

  <!-- HEADLINE: top area, massive, poster-style -->
  <div style="position:absolute;top:${Math.round(h * 0.047)}px;left:${Math.round(w * 0.055)}px;z-index:2;">
    <div style="font-size:${Math.round(w * 0.085)}px;line-height:0.94;font-weight:900;letter-spacing:-0.04em;color:#f5f3ef;">
      THE SCALE IS<br>
      <span style="display:inline-block;padding:4px 14px 10px;background:#ff3b7f;color:#fff;line-height:0.9;">GASLIGHTING</span><br>
      YOU.
    </div>
    <div style="margin-top:${Math.round(h * 0.022)}px;font-size:${Math.round(w * 0.022)}px;line-height:1.15;letter-spacing:0.08em;font-weight:600;">
      YOUR BLOOD SUGAR<br>TELLS THE REAL STORY.
    </div>
  </div>

  <!-- PHONE MOCKUP: bottom-left, overlapping -->
  <div style="position:absolute;left:${Math.round(w * 0.055)}px;bottom:${Math.round(h * 0.115)}px;z-index:2;">
    ${phone}
  </div>

  <!-- RIGHT COPY BLOCK: bottom-right -->
  <div style="position:absolute;right:${Math.round(w * 0.057)}px;bottom:${Math.round(h * 0.13)}px;z-index:2;width:${Math.round(w * 0.32)}px;">
    <div style="font-size:${Math.round(w * 0.05)}px;line-height:0.98;font-weight:900;letter-spacing:-0.03em;">GET THE DATA<br>YOUR BODY'S<br>BEEN HIDING.</div>
    <div style="margin-top:${Math.round(h * 0.009)}px;font-size:${Math.round(w * 0.02)}px;line-height:1.2;font-weight:600;">REAL-TIME DATA FOR<br>MANAGING WEIGHT GAIN.</div>
  </div>

  <!-- LOGO: bottom-right -->
  <div style="position:absolute;right:${Math.round(w * 0.052)}px;bottom:${Math.round(h * 0.034)}px;z-index:2;display:flex;align-items:center;gap:12px;">
    <div style="width:${Math.round(w * 0.05)}px;height:${Math.round(w * 0.063)}px;background:#ff3b7f;clip-path:polygon(26% 0%,100% 0%,72% 34%,100% 34%,74% 68%,100% 68%,74% 100%,0% 100%,28% 66%,0% 66%,28% 32%,0% 32%);flex:0 0 auto;"></div>
    <span style="font-size:${Math.round(w * 0.031)}px;font-weight:800;letter-spacing:0.14em;color:#f5f3ef;">SIGNOS</span>
  </div>
</div>
</body></html>

═══════════════════════════════════════════════
TEMPLATE C — "editorial_light" (Light Top + Image Strip)
═══════════════════════════════════════════════
Airy, editorial feel. Light cream headline zone up top, photos/product below.

<html><head><style>*{margin:0;padding:0;box-sizing:border-box;}@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');</style></head>
<body style="margin:0;background:#111;display:flex;justify-content:center;align-items:center;min-height:100vh;">
<div style="position:relative;width:${w}px;height:${h}px;overflow:hidden;font-family:'Inter',Arial,sans-serif;background:#f3f0e8;color:#1f2430;">

  <!-- TOP: Headline zone on light background -->
  <div style="padding:${Math.round(h * 0.052)}px ${Math.round(w * 0.059)}px ${Math.round(h * 0.027)}px;">
    <div style="max-width:${Math.round(w * 0.8)}px;font-size:${Math.round(w * 0.054)}px;line-height:1.02;font-weight:800;letter-spacing:-0.035em;">
      Signos AI <span style="color:#ff3b7f;">scores every meal</span> you eat with an FDA-cleared CGM.
    </div>
    <div style="margin-top:${Math.round(h * 0.021)}px;max-width:${Math.round(w * 0.72)}px;font-size:${Math.round(w * 0.022)}px;line-height:1.28;color:rgba(31,36,48,0.84);">
      Not a diet app. Not a tracker. A metabolic intelligence system that learns your body.
    </div>
  </div>

  <!-- BOTTOM: Image strip with photo and product proof -->
  <div style="position:absolute;left:0;right:0;bottom:0;height:${Math.round(h * 0.385)}px;background:#d9d1c8;overflow:hidden;">
    <!-- Two lifestyle/food photos side by side -->
    <div style="position:absolute;top:0;bottom:0;left:0;width:50%;background-image:url('PHOTO_URL');background-size:cover;background-position:center;"></div>
    <div style="position:absolute;top:0;bottom:0;right:0;width:50%;background-image:url('PHOTO_URL_2');background-size:cover;background-position:center;"></div>
    <!-- Phone mockup anchored bottom-left of strip -->
    <div style="position:absolute;left:${Math.round(w * 0.05)}px;bottom:${Math.round(h * 0.036)}px;z-index:2;">
      ${phone}
    </div>
    <!-- Logo bottom-right -->
    <div style="position:absolute;right:${Math.round(w * 0.048)}px;bottom:${Math.round(h * 0.031)}px;z-index:2;display:flex;align-items:center;gap:12px;">
      <div style="width:${Math.round(w * 0.05)}px;height:${Math.round(w * 0.063)}px;background:#ff3b7f;clip-path:polygon(26% 0%,100% 0%,72% 34%,100% 34%,74% 68%,100% 68%,74% 100%,0% 100%,28% 66%,0% 66%,28% 32%,0% 32%);flex:0 0 auto;"></div>
      <span style="font-size:${Math.round(w * 0.03)}px;font-weight:800;letter-spacing:0.14em;color:#f5f3ef;">SIGNOS</span>
    </div>
  </div>
</div>
</body></html>

═══════════════════════════════════════════════
TEMPLATE D — "data_poster" (Bold Stat / Typography Poster)
═══════════════════════════════════════════════
The ONLY template that skips real photography. Big stat or big typography as the hero.

<html><head><style>*{margin:0;padding:0;box-sizing:border-box;}@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');</style></head>
<body style="margin:0;background:#111;display:flex;justify-content:center;align-items:center;min-height:100vh;">
<div style="position:relative;width:${w}px;height:${h}px;overflow:hidden;font-family:'Inter',Arial,sans-serif;background:#1f2746;color:#f5f3ef;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:${Math.round(w * 0.074)}px;">

  <!-- BIG STAT or BIG HEADLINE as hero -->
  <div style="font-size:${Math.round(w * 0.14)}px;font-weight:900;letter-spacing:-0.04em;line-height:0.9;color:#ff3b7f;">73%</div>

  <!-- Supporting line -->
  <div style="margin-top:${Math.round(h * 0.025)}px;font-size:${Math.round(w * 0.03)}px;line-height:1.35;font-weight:400;max-width:${Math.round(w * 0.7)}px;color:rgba(245,243,239,0.92);">
    of people regain weight within 1 year of stopping GLP-1.<br>
    <span style="display:inline-block;margin-top:8px;background:#ff3b7f;color:#fff;padding:4px 16px;font-weight:700;">Signos helps you graduate</span> with a plan that sticks.
  </div>

  <!-- Thin accent bar -->
  <div style="margin-top:${Math.round(h * 0.035)}px;width:80px;height:4px;background:linear-gradient(90deg,#18b8a5,#3B88FF);border-radius:2px;"></div>

  <!-- Attribution -->
  <div style="margin-top:${Math.round(h * 0.015)}px;font-size:${Math.round(w * 0.013)}px;color:rgba(245,243,239,0.4);">*Based on clinical studies of GLP-1 medication outcomes</div>

  <!-- LOGO: bottom-right -->
  <div style="position:absolute;right:${Math.round(w * 0.044)}px;bottom:${Math.round(h * 0.035)}px;display:flex;align-items:center;gap:12px;">
    <div style="width:${Math.round(w * 0.05)}px;height:${Math.round(w * 0.063)}px;background:#ff3b7f;clip-path:polygon(26% 0%,100% 0%,72% 34%,100% 34%,74% 68%,100% 68%,74% 100%,0% 100%,28% 66%,0% 66%,28% 32%,0% 32%);flex:0 0 auto;"></div>
    <span style="font-size:${Math.round(w * 0.03)}px;font-weight:800;letter-spacing:0.14em;color:#f5f3ef;">SIGNOS</span>
  </div>
</div>
</body></html>`;

  const selectedTemplate = archetype === 'signos_split' ? 'A' : archetype === 'hero_overlay' ? 'B' : archetype === 'editorial_light' ? 'C' : archetype === 'data_poster' ? 'D' : null;

  const archSection = selectedTemplate
    ? `\nYOU MUST USE TEMPLATE ${selectedTemplate} ("${ARCHETYPES[archetype!]?.label}") as your structural foundation. Customize the text, photo URL, and accent placement, but PRESERVE the template's layout structure, spacing, and zone composition.`
    : `\nNo template selected. Default to Template A ("signos_split") unless the concept clearly calls for another. Choose the template that best fits the topic and angle.`;

  return `You are a world-class creative director creating ads as self-contained HTML/CSS for Signos (CGM metabolic health company).

You MUST use one of the four provided HTML/CSS templates as your structural foundation. DO NOT invent layouts from scratch. Customize the content but PRESERVE the template's proven structure.

═══════════════════════════════════════════════
DESIGN TOKENS (use these exact values)
═══════════════════════════════════════════════
--navy: #1f2746
--navy-2: #232947
--ink: #1d2340
--cream: #f5f3ef
--white: #ffffff
--accent: #ff3b7f
--orange: #f6a623
--text-muted-light: rgba(245,243,239,0.88)
--text-muted-dark: rgba(31,36,48,0.82)
--light-canvas: #f3f0e8
--shadow-phone: 0 18px 45px rgba(0,0,0,0.22)

Font: Inter, Arial, Helvetica, sans-serif
Headline weight: 800-900
Body weight: 400-500
Headline letter-spacing: -0.035em to -0.045em
Logo letter-spacing: 0.04em to 0.14em

═══════════════════════════════════════════════
AVAILABLE LIFESTYLE PHOTOS
═══════════════════════════════════════════════
${PHOTO_LIST}

═══════════════════════════════════════════════
10 HARD VISUAL CONSTRAINTS (NEVER VIOLATE)
═══════════════════════════════════════════════
1. NO BROKEN IMAGES: If an image fails, use a solid fallback color. Never leave empty black voids.
2. NO EMPTY ZONES: Every major region must carry visual weight. No region >25% of canvas can be visually empty.
3. READABLE SUPPORT COPY: Minimum 22px for 1080-wide ads, minimum 24px for 1200-wide. If copy is too long, shorten it — never shrink it below readable.
4. NO TEXT EFFECTS: No glow, blur, bevel, neon shadow, gradient text. Flat, sharp, high-contrast type only.
5. ACCENT RESTRAINT: Use #ff3b7f for exactly ONE key phrase in the headline (max 20-25% of headline text). Not sprayed everywhere.
6. PHONE MOCKUP QUALITY: If included, the phone must be large enough to read, crisp, and anchored to the composition. If it would be too small, remove it entirely.
7. STRONG EDGE ALIGNMENT: Text, device, and logo must align to an invisible grid. No random floating elements. Use generous padding (40-72px for 1080w, 56-88px for 1350/1920h).
8. MAX 3-5 VISUAL ELEMENTS: background, headline, support copy, optional phone proof, logo. That's it. No bullet lists, checklists, icon rows, or multiple copy blocks.
9. PREMIUM EDITORIAL FEEL: Should feel like a clean DTC ad from a top brand. Not a software deck, SaaS hero, or product page.
10. COMPLETE WITHOUT SMALL COPY: The ad must look graphically resolved and finished even if the viewer never reads the support text.

═══════════════════════════════════════════════
MESSAGING RULES
═══════════════════════════════════════════════
Headline must do ONE of: challenge a belief, create contrast (old vs new), name a frustration, provoke curiosity.
- Headline ≤ 10 words
- Subhead ≤ 2 short lines
- BANNED phrases: "stay on track", "build healthy habits", "reach your goals", "take control", "transform your health", "your wellness journey", "sustainable habits", "track patterns"
- Lead with USER pain, not product. Signos is the ANSWER, not the opening subject.
- One core idea per ad.

═══════════════════════════════════════════════
THE FOUR HTML/CSS TEMPLATES
═══════════════════════════════════════════════
${templates}

═══════════════════════════════════════════════
HOW TO USE THE TEMPLATES
═══════════════════════════════════════════════
1. Pick the template that fits the concept
2. Replace PHOTO_URL (and PHOTO_URL_2 for template C) with a real lifestyle photo URL from the available photos
3. Replace headline text with your persuasive copy — keep the font-size, weight, and positioning
4. Replace support copy — keep the font-size and positioning
5. Adjust the accent highlight to land on YOUR key phrase
6. You may adjust sizes proportionally for different canvas dimensions, but DO NOT change the fundamental layout structure, zone ratios, gradient directions, or spacing philosophy
7. Include the phone mockup if it adds proof value; remove it if the concept doesn't need it
8. The Signos logo (pink clip-path mark + "SIGNOS" text) MUST appear in the same position as the template
${archSection}

Output ONLY the complete HTML document. No markdown fences. No explanation.`;
}

// ── Claude streaming helper ────────────────────────────────────────────────

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

// ── Handler ────────────────────────────────────────────────────────────────

export default async (req: Request, _ctx: Context) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS });

  const apiKey = Netlify.env.get("ANTHROPIC_API_KEY") || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ error: "Missing API key" }, 500);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const action = body.action as string;

  // ── GENERATE (stream HTML) ─────────────────────────────────────────────
  if (action === "generate") {
    const w = Number(body.width) || 1200, h = Number(body.height) || 1200;
    const archetype = (body.archetype as string) || null;
    const system = buildSystemPrompt(archetype, w, h);
    const prompt = `Create a Signos ad at ${w}x${h}px (${body.sizeLabel || "Square"}).

Topic/Angle: ${body.topic || body.headline || "Signos CGM for metabolic health"}
${body.headline ? `Headline direction: ${body.headline}` : "Generate a belief-challenging headline."}
${body.subhead ? `Subhead: ${body.subhead}` : ""}
${body.details ? `Creative notes: ${body.details}` : ""}
${body.imageUrl ? `Use this photo: ${body.imageUrl}` : "Pick the most relevant lifestyle photo from the available list."}

Start from the template structure. Replace the placeholder content with your creative. Preserve the layout, spacing, zone ratios, and gradient system exactly.

Output ONLY the HTML.`;
    return streamClaude(apiKey, system, prompt);
  }

  // ── ITERATE (stream HTML) ──────────────────────────────────────────────
  if (action === "iterate") {
    const w = Number(body.width) || 1200, h = Number(body.height) || 1200;
    const system = buildSystemPrompt(null, w, h);
    const prompt = `You are editing an existing Signos ad. Here is the current HTML:

${body.currentHtml}

EDIT INSTRUCTIONS: ${body.instructions}

AUTO-FIX CHECKLIST (fix these even if not explicitly asked):
1. Is the headline font-size under 64px? → increase to at least 68px
2. Is there a #ff3b7f highlight on one key phrase? → add one
3. Is the background empty/black/abstract? → swap to a lifestyle photo from the available list
4. Are there bullet lists, checklists, or >3 text elements? → simplify
5. Does the headline sound like a product page? → rewrite to challenge a belief
6. Is there a clear two-zone composition with hard edge? → add one
7. Are there text glow/blur/bevel effects? → remove, use flat type
8. Is support copy below 22px? → increase to 24px
9. Is there a giant empty region? → fill it with image, text, or color panel
10. Is the phone mockup too small or broken? → enlarge or remove

Apply edits AND fix problems. Return COMPLETE updated HTML. Output ONLY HTML.`;
    return streamClaude(apiKey, system, prompt);
  }

  // ── BATCH ARCHETYPES ───────────────────────────────────────────────────
  if (action === "batch") {
    const prompt = `Generate 4 ad concept variations for Signos (CGM metabolic health app), one for each template.

Topic: ${body.topic}
Angle: ${body.angle || ""}
Size: ${body.width || 1200}x${body.height || 1200}px
Details: ${body.details || "none"}

Templates:
${ARCHETYPE_LIST}

Each headline must be a persuasion hook (≤10 words), NOT a product description.
Good: "The scale is gaslighting you." / "GLP-1s stop working. Signos doesn't."
Bad: "Track your glucose patterns" / "Build sustainable habits"

Output a JSON array of 4 objects (one per template):
[{"name": "short name", "archetype": "archetype_id", "headline": "provocative headline", "subhead": "1-2 lines", "angle_description": "why this persuades"}]

Output ONLY valid JSON.`;

    try {
      const raw = await callClaude(apiKey, "You are an elite DTC performance creative director. Belief-challenging copy only. Output only valid JSON.", prompt, 2000);
      const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      return json({ variations: JSON.parse(cleaned) });
    } catch (e) { return json({ error: e instanceof Error ? e.message : "batch failed" }, 500); }
  }

  // ── SIGNALS → ANGLES ──────────────────────────────────────────────────
  if (action === "signals") {
    const prompt = `You are a performance marketing strategist for Signos (CGM metabolic health app).

Given these keyword/trend signals:
${body.keywords}

${body.topic ? `Topic context: ${body.topic}` : ""}

Generate 6 distinct messaging angles. Each must be SPECIFIC, BELIEF-CHALLENGING, EMOTIONALLY CHARGED.

For each, suggest the best visual template: ${Object.keys(ARCHETYPES).join(", ")}

Output JSON array:
[{"angle": "short name", "hook": "headline ≤10 words", "emotion": "fear|hope|curiosity|identity|control|urgency", "insight": "why this resonates", "archetypes": ["template_id_1", "template_id_2"]}]

BANNED: "stay on track", "build habits", "reach your goals", "transform your health"

Output ONLY valid JSON.`;

    try {
      const raw = await callClaude(apiKey, "Elite performance marketing strategist. Belief-challenging copy only. Output only valid JSON.", prompt, 2000);
      const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      return json({ angles: JSON.parse(cleaned) });
    } catch (e) { return json({ error: e instanceof Error ? e.message : "signals failed" }, 500); }
  }

  // ── GOOGLE RSA GENERATOR ──────────────────────────────────────────────
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

  // ── REVIEW (8-dimension rubric) ───────────────────────────────────────
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

VISUAL CHECKS:
- Empty black zones? Broken images? Text glow/blur effects? Headline <64px? Bullets/checklists? Missing #ff3b7f highlight? Abstract background instead of real photo? Support copy too small?

Output JSON:
{"hook_strength":{"score":0,"feedback":""},"single_core_idea":{"score":0,"feedback":""},"problem_relevance":{"score":0,"feedback":""},"reframe_quality":{"score":0,"feedback":""},"benefit_first":{"score":0,"feedback":""},"visual_message":{"score":0,"feedback":""},"readability":{"score":0,"feedback":""},"specificity":{"score":0,"feedback":""},"total":0,"max_total":40,"verdict":"Excellent|Good|Mediocre|Weak|Poor","fast_fail":false,"fast_fail_reasons":[],"design_violations":[],"top_improvements":[],"headline_rewrite":"better headline"}

34-40=Excellent 28-33=Good 20-27=Mediocre 12-19=Weak 8-11=Poor

Output ONLY valid JSON.`;

    try {
      const raw = await callClaude(apiKey, "Brutally honest creative director. Penalize generic copy, abstract visuals, feature-led messaging. Output only valid JSON.", prompt, 3000);
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
