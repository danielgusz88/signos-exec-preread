/**
 * email-design.mts — Shared source of truth for the Email Hub
 * design system: image pool, design presets, module patterns.
 *
 * Imported by:
 *   - netlify/functions/email-hub.mts (generation + review + apply-start)
 *   - netlify/functions/email-hub-apply-background.mts (patch executor)
 *
 * Keeping this data in one file lets us expand the image pool or
 * tweak a module style without hunting down duplicated strings.
 */

/* ───────────────────────── IMAGE POOL ──────────────────────────
 * Expanded from 5 to 25+ images. Each image tagged with:
 *   - role: hero | inline | product — where in the email it fits
 *   - mood: warm | clinical | energetic | calm | editorial
 *   - subject: food, fitness, people, device, lifestyle, abstract
 *
 * Mood tagging is what lets the preset system pick a coherent set
 * per email — e.g. "editorial-clinical" emails pull from the clinical
 * subset only, not the warm lifestyle set.
 * ──────────────────────────────────────────────────────────────── */
export type ImageRole = "hero" | "inline" | "product";
export type ImageMood = "warm" | "clinical" | "energetic" | "calm" | "editorial";
export type ImageSubject = "food" | "fitness" | "people" | "device" | "lifestyle" | "abstract";

export interface EmailImage {
  key: string;           // short name the model writes in the markup
  url: string;           // CDN URL
  role: ImageRole;
  moods: ImageMood[];    // can be shared across more than one mood
  subjects: ImageSubject[];
  alt: string;           // description for alt text + Claude to match topic
}

export const IMAGE_POOL: EmailImage[] = [
  // ── Signos first-party hero images (on signos CDN already in use) ──
  { key: "hero-photo", url: "https://funnel-ai-signos.netlify.app/email-assets/nutrition/hero-photo.jpg",
    role: "hero", moods: ["warm", "energetic"], subjects: ["food"], alt: "Colorful healthy foods spread on a table" },
  { key: "hero-composed", url: "https://funnel-ai-signos.netlify.app/email-assets/experiments/hero-composed.jpg",
    role: "hero", moods: ["editorial", "clinical"], subjects: ["device"], alt: "Signos app and CGM composed on a surface" },
  { key: "section-photo-1", url: "https://funnel-ai-signos.netlify.app/email-assets/experiments/section-photo-1.jpg",
    role: "inline", moods: ["warm", "calm"], subjects: ["lifestyle"], alt: "Lifestyle photograph" },
  { key: "section-photo-2", url: "https://funnel-ai-signos.netlify.app/email-assets/experiments/section-photo-2.jpg",
    role: "inline", moods: ["warm", "calm"], subjects: ["lifestyle"], alt: "Lifestyle photograph" },
  { key: "food-findings", url: "https://funnel-ai-signos.netlify.app/email-assets/nutrition/food-findings-rounded.png",
    role: "inline", moods: ["warm", "energetic"], subjects: ["food"], alt: "Fresh strawberries" },

  // ── Signos existing CMS hero/lifestyle imagery ──
  { key: "woman-cgm", url: "https://cdn.prod.website-files.com/63ed08484c069d0492f5b0bc/66ff04ff698cbfcce388ff57_6557d5bba8a8893dbded1969_woman-with-signos-cgm-similing-at-camera.webp",
    role: "hero", moods: ["warm", "energetic"], subjects: ["people", "device"], alt: "Woman smiling while wearing a Signos CGM" },
  { key: "couple-eating-thai", url: "https://cdn.prod.website-files.com/63ed08484c069d0492f5b0bc/6977bf4595147e56c8aa6cd9_young-asian-couple-traveler-tourists-eating-thai-s-2026-01-06-10-39-06-utc%20(1)-p-800.jpg",
    role: "hero", moods: ["warm", "calm"], subjects: ["people", "food"], alt: "Young couple sharing a meal at a street-food stall" },
  { key: "friends-together", url: "https://cdn.prod.website-files.com/63ed08484c069d0492f5b0bc/691a0332bd872eb104526272_multiethnic-diverse-male-friends-having-fun-togeth-2025-10-14-08-35-41-utc-min-p-800.jpg",
    role: "hero", moods: ["warm", "energetic"], subjects: ["people"], alt: "Friends gathering outdoors in bright light" },

  // ── Curated Unsplash additions (royalty-free) — gives visual variety ──
  // Food / nutrition
  { key: "salad-bowl", url: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&auto=format&fit=crop&q=80",
    role: "hero", moods: ["warm", "editorial"], subjects: ["food"], alt: "Fresh green salad bowl with vegetables" },
  { key: "breakfast-spread", url: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=1200&auto=format&fit=crop&q=80",
    role: "hero", moods: ["warm", "energetic"], subjects: ["food"], alt: "Morning breakfast spread of eggs, toast, and coffee" },
  { key: "berries-close", url: "https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?w=1200&auto=format&fit=crop&q=80",
    role: "inline", moods: ["warm", "editorial"], subjects: ["food"], alt: "Close-up of fresh mixed berries" },
  { key: "meal-prep-bowls", url: "https://images.unsplash.com/photo-1547592180-85f173990554?w=1200&auto=format&fit=crop&q=80",
    role: "inline", moods: ["clinical", "editorial"], subjects: ["food"], alt: "Organized meal-prep bowls on a counter" },
  { key: "avocado-toast", url: "https://images.unsplash.com/photo-1603046891744-1f76eb10aec1?w=1200&auto=format&fit=crop&q=80",
    role: "inline", moods: ["warm", "editorial"], subjects: ["food"], alt: "Avocado toast on a wooden board" },

  // Fitness / movement
  { key: "runner-sunrise", url: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=1200&auto=format&fit=crop&q=80",
    role: "hero", moods: ["energetic", "editorial"], subjects: ["fitness", "people"], alt: "Runner at sunrise" },
  { key: "yoga-light", url: "https://images.unsplash.com/photo-1593810450967-f9c42742e326?w=1200&auto=format&fit=crop&q=80",
    role: "hero", moods: ["calm", "editorial"], subjects: ["fitness", "people"], alt: "Woman in yoga pose in soft light" },
  { key: "strength-gym", url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&auto=format&fit=crop&q=80",
    role: "inline", moods: ["energetic", "clinical"], subjects: ["fitness"], alt: "Strength training in a clean gym" },
  { key: "walking-park", url: "https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=1200&auto=format&fit=crop&q=80",
    role: "inline", moods: ["calm", "warm"], subjects: ["fitness", "people"], alt: "Person walking through a green park" },

  // People / lifestyle
  { key: "woman-kitchen-smiling", url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&auto=format&fit=crop&q=80",
    role: "hero", moods: ["warm", "calm"], subjects: ["people", "food"], alt: "Woman smiling over a plate of food in a bright kitchen" },
  { key: "morning-routine", url: "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=1200&auto=format&fit=crop&q=80",
    role: "hero", moods: ["calm", "editorial"], subjects: ["lifestyle"], alt: "Morning routine — coffee and sunlight" },
  { key: "man-thinking", url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=1200&auto=format&fit=crop&q=80",
    role: "inline", moods: ["clinical", "editorial"], subjects: ["people"], alt: "Man looking thoughtfully to the side" },

  // Clinical / data / device
  { key: "charts-data", url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&auto=format&fit=crop&q=80",
    role: "inline", moods: ["clinical", "editorial"], subjects: ["abstract"], alt: "Glucose-like data chart on a laptop screen" },
  { key: "lab-clean", url: "https://images.unsplash.com/photo-1576086213369-97a306d36557?w=1200&auto=format&fit=crop&q=80",
    role: "inline", moods: ["clinical"], subjects: ["abstract"], alt: "Clean laboratory surface with vials and a tablet" },
  { key: "cgm-sensor-closeup", url: "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=1200&auto=format&fit=crop&q=80",
    role: "hero", moods: ["clinical", "editorial"], subjects: ["device"], alt: "Continuous glucose monitor close-up on skin" },

  // Abstract / editorial
  { key: "abstract-gradient-warm", url: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&auto=format&fit=crop&q=80",
    role: "hero", moods: ["editorial", "warm"], subjects: ["abstract"], alt: "Warm gradient abstract background" },
  { key: "abstract-gradient-cool", url: "https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?w=1200&auto=format&fit=crop&q=80",
    role: "hero", moods: ["editorial", "calm"], subjects: ["abstract"], alt: "Cool gradient abstract background" },
  { key: "texture-paper", url: "https://images.unsplash.com/photo-1512418490979-92798cec1380?w=1200&auto=format&fit=crop&q=80",
    role: "inline", moods: ["editorial", "calm"], subjects: ["abstract"], alt: "Subtle paper-texture backdrop" },

  // ── Menstrual-cycle stock cards (polygon-cut Figma exports, 2× retina 1136×488) ──
  // Can be reused as "How to" section cards for any phased/themed email.
  // Added 2026-04-20 per user request to expand the stock pool.
  { key: "card-follicular", url: "https://funnel-ai-signos.netlify.app/email-assets/menstrual-cycle/stock/card-follicular-desktop.jpg",
    role: "inline", moods: ["calm", "editorial", "warm"], subjects: ["fitness", "people", "device"], alt: "Woman lifting weights in a bright gym with a Signos CGM on her arm, polygon-cut overlay with seedling icon" },
  { key: "card-ovulatory", url: "https://funnel-ai-signos.netlify.app/email-assets/menstrual-cycle/stock/card-ovulatory-desktop.jpg",
    role: "inline", moods: ["energetic", "editorial"], subjects: ["fitness", "people", "device"], alt: "Woman mid high-intensity workout with a Signos CGM, polygon-cut overlay with lightning icon" },
  { key: "card-luteal", url: "https://funnel-ai-signos.netlify.app/email-assets/menstrual-cycle/stock/card-luteal-desktop.jpg",
    role: "inline", moods: ["warm", "calm"], subjects: ["food", "people", "lifestyle"], alt: "Woman snacking in a car, polygon-cut overlay with waves icon" },
];

/**
 * resolveImageUrl — lookup helper.
 * Accepts keys, basenames, or full URLs. Falls back to the first hero image.
 */
export function resolveImageUrl(raw: string): string {
  if (!raw) return IMAGE_POOL[0].url;
  const trimmed = raw.trim();
  const byKey = IMAGE_POOL.find((i) => i.key === trimmed || i.url === trimmed);
  if (byKey) return byKey.url;
  const basename = trimmed.split("/").pop()?.replace(/\?.*$/, "") || "";
  const noExt = basename.replace(/\.[^.]+$/, "");
  const byBase = IMAGE_POOL.find((i) => i.key === noExt || i.key === basename);
  if (byBase) return byBase.url;
  if (trimmed.startsWith("http")) return trimmed;
  return IMAGE_POOL[0].url;
}

/**
 * pickImageSet — choose a coherent set of N images that match the
 * requested moods and the layout's image needs.
 */
export function pickImageSet(opts: {
  moods: ImageMood[];
  subjectHints?: ImageSubject[];
  count: number;
}): EmailImage[] {
  const { moods, subjectHints = [], count } = opts;
  const moodSet = new Set(moods);
  const subjectSet = new Set(subjectHints);

  const scored = IMAGE_POOL.map((img) => {
    const moodMatch = img.moods.some((m) => moodSet.has(m)) ? 2 : 0;
    const subjectMatch = img.subjects.some((s) => subjectSet.has(s)) ? 1 : 0;
    return { img, score: moodMatch + subjectMatch };
  }).filter((x) => x.score > 0);

  scored.sort((a, b) => b.score - a.score);

  // Prefer at least one hero, at least one inline.
  const picks: EmailImage[] = [];
  const hero = scored.find((x) => x.img.role === "hero");
  if (hero) picks.push(hero.img);
  for (const s of scored) {
    if (picks.find((p) => p.url === s.img.url)) continue;
    picks.push(s.img);
    if (picks.length >= count) break;
  }
  // Backfill from full pool if not enough matched.
  if (picks.length < count) {
    for (const img of IMAGE_POOL) {
      if (picks.find((p) => p.url === img.url)) continue;
      picks.push(img);
      if (picks.length >= count) break;
    }
  }
  return picks.slice(0, count);
}

/* ───────────────────────── DESIGN PRESETS ──────────────────────
 * Four distinct visual frames × four palette directions.
 * The layout determines structure + image count + section rhythm.
 * The palette determines accent color and bg cycling.
 * The type-scale determines headline / body font sizing.
 *
 * Each preset generates its own injected prompt block so the
 * generator produces genuinely different emails, not module permutations.
 * ──────────────────────────────────────────────────────────────── */

export type LayoutId = "editorial" | "newsletter" | "announcement" | "digest";
export type PaletteId = "cerise" | "navy" | "warm" | "cool";
export type TypeScaleId = "display" | "editorial" | "tight";

export interface LayoutPreset {
  id: LayoutId;
  label: string;
  description: string;      // shown in UI
  imageCount: number;       // target number of images (hard floor)
  sectionCount: string;     // "1 focus" / "3-5 sections" — prompt hint
  rhythm: string;           // narrative rhythm instruction for Claude
  moodHints: ImageMood[];   // which image moods fit this layout best
}

export const LAYOUT_PRESETS: Record<LayoutId, LayoutPreset> = {
  editorial: {
    id: "editorial",
    label: "Editorial",
    description: "Big hero, long-form narrative — magazine feel.",
    imageCount: 3,
    sectionCount: "2-3 long sections",
    rhythm:
      "Open with a bold full-width hero image + wave overlay. Follow with one sweeping narrative — fewer but longer sections. Use a pull-quote (module 14) and at least one large stat-highlight (module 12) as editorial moments. This is a magazine-style email, not a newsletter.",
    moodHints: ["editorial", "warm"],
  },
  newsletter: {
    id: "newsletter",
    label: "Newsletter",
    description: "Multi-section digest — 3-5 equal-weight sections.",
    imageCount: 4,
    sectionCount: "3-5 modular sections",
    rhythm:
      "Top hero is optional but lighter. Build 3-5 near-equal-weight sections, each with its own section-intro (module 13) and a short body + CTA. Use rounded section images (module 5) or small visual breaks between sections. Favor variety over depth.",
    moodHints: ["editorial", "clinical", "warm"],
  },
  announcement: {
    id: "announcement",
    label: "Announcement",
    description: "Single focus, one huge headline, one clear CTA.",
    imageCount: 2,
    sectionCount: "1 focus",
    rhythm:
      "One central focus. Full-width hero. Bicolor or large headline (module 8). One body paragraph of context. Cerise accent band (module 11) as the emotional moment. One dominant primary CTA. Keep it tight — under 15 <tr> blocks.",
    moodHints: ["energetic", "editorial"],
  },
  digest: {
    id: "digest",
    label: "Digest",
    description: "Multi-topic roundup — list-driven, light imagery.",
    imageCount: 2,
    sectionCount: "5-7 short cards",
    rhythm:
      "Small hero. Then 5-7 short card-style list items (module 7) with numbered bullets. One mid-point visual break (section image or cerise band). Short closing CTA. Favor information density over editorial flourish.",
    moodHints: ["clinical", "editorial"],
  },
};

export interface PalettePreset {
  id: PaletteId;
  label: string;
  description: string;
  accentHex: string;        // primary accent
  accentBorderHex: string;  // button bottom-shadow / border (darker)
  ctaTextHex: string;       // button text color
  eyebrowHex: string;       // eyebrow color (often same as accent)
  headlineHex: string;      // primary headline color
  bodyBgCycle: string;      // instruction for Claude about bg alternation
  waveVariant: "default" | "cool" | "warm";
}

export const PALETTE_PRESETS: Record<PaletteId, PalettePreset> = {
  cerise: {
    id: "cerise",
    label: "Classic Cerise",
    description: "Signos signature — cerise accent on pebble/gray/white.",
    accentHex: "#fd3576",
    accentBorderHex: "#ce0259",
    ctaTextHex: "#ffffff",
    eyebrowHex: "#fd3576",
    headlineHex: "#21263a",
    bodyBgCycle: "pebble → gray → white, alternating with wave rows",
    waveVariant: "default",
  },
  navy: {
    id: "navy",
    label: "Navy-Forward",
    description: "Stone-navy accent, minimal cerise — clinical and calm.",
    accentHex: "#21263a",
    accentBorderHex: "#14181f",
    ctaTextHex: "#ffffff",
    eyebrowHex: "#21263a",
    headlineHex: "#21263a",
    bodyBgCycle: "white → pebble → white with navy accents; cerise used sparingly",
    waveVariant: "default",
  },
  warm: {
    id: "warm",
    label: "Warm",
    description: "Amber-orange accents on cream backgrounds — inviting.",
    accentHex: "#d97706",
    accentBorderHex: "#92400e",
    ctaTextHex: "#ffffff",
    eyebrowHex: "#d97706",
    headlineHex: "#21263a",
    bodyBgCycle: "pebble → white with warm accent bands replacing cerise",
    waveVariant: "warm",
  },
  cool: {
    id: "cool",
    label: "Cool",
    description: "Teal-mint accents — clinical, data-forward.",
    accentHex: "#0d9488",
    accentBorderHex: "#115e59",
    ctaTextHex: "#ffffff",
    eyebrowHex: "#0d9488",
    headlineHex: "#21263a",
    bodyBgCycle: "white → gray → white; teal accent bands replace cerise",
    waveVariant: "cool",
  },
};

export interface TypeScalePreset {
  id: TypeScaleId;
  label: string;
  description: string;
  h1Size: number;
  h2Size: number;
  bodyLgSize: number;
  bodySmSize: number;
  instruction: string;
}

export const TYPE_SCALE_PRESETS: Record<TypeScaleId, TypeScalePreset> = {
  display: {
    id: "display",
    label: "Display",
    description: "Huge headlines, lots of air.",
    h1Size: 44,
    h2Size: 36,
    bodyLgSize: 18,
    bodySmSize: 15,
    instruction:
      "Lean into large type: H1 up to 44px extra-condensed, H2 up to 36px, body-lg 18px. Use more vertical padding between sections (32-48px tops). Each headline gets its own row.",
  },
  editorial: {
    id: "editorial",
    label: "Editorial",
    description: "Magazine-style — H1 30px, restrained body.",
    h1Size: 30,
    h2Size: 30,
    bodyLgSize: 16,
    bodySmSize: 14,
    instruction:
      "Magazine-style discipline: H1 30px extra-condensed uppercase, H2 30px, body-lg 16px. Classic Signos type pairing. Use normal padding.",
  },
  tight: {
    id: "tight",
    label: "Tight",
    description: "Compact — for digest/newsletter density.",
    h1Size: 26,
    h2Size: 22,
    bodyLgSize: 15,
    bodySmSize: 13,
    instruction:
      "Compact scale: H1 26px, H2 22px, body-lg 15px, body-sm 13px. Tighter padding (16-20px tops). Optimize for information density.",
  },
};

/**
 * buildPresetPromptBlock — produces the instruction block that gets
 * injected into the CONTENT_SYSTEM prompt based on the user's preset
 * selections. This is what actually makes emails DIFFERENT from
 * each other: each combination produces a different instruction.
 */
export function buildPresetPromptBlock(opts: {
  layout: LayoutId;
  palette: PaletteId;
  typeScale: TypeScaleId;
}): string {
  const layout = LAYOUT_PRESETS[opts.layout];
  const palette = PALETTE_PRESETS[opts.palette];
  const type = TYPE_SCALE_PRESETS[opts.typeScale];

  return `
DESIGN PRESET FOR THIS EMAIL (NON-NEGOTIABLE — distinguishes this email from past ones):

LAYOUT: ${layout.label} — ${layout.description}
  Section count: ${layout.sectionCount}
  Image count: ${layout.imageCount} (hero + ${layout.imageCount - 1} supporting)
  Rhythm: ${layout.rhythm}

PALETTE: ${palette.label} — ${palette.description}
  Accent color (buttons, eyebrow): ${palette.accentHex}
  Button border/shadow: ${palette.accentBorderHex}
  Headline color: ${palette.headlineHex}
  Background cycle: ${palette.bodyBgCycle}
  NOTE: If this preset uses an accent color OTHER than cerise (#fd3576), replace cerise in eyebrows, accent bands, and CTA buttons with the preset accent. Do NOT mix three different accent colors in one email.

TYPE SCALE: ${type.label} — ${type.description}
  H1 size: ${type.h1Size}px
  H2 size: ${type.h2Size}px
  Body-lg size: ${type.bodyLgSize}px
  Body-sm size: ${type.bodySmSize}px
  ${type.instruction}
`;
}

/* ───────────────────────── MODULE PATTERNS ─────────────────────
 * Subset of Signos module HTML patterns used by the patch executor
 * to INSERT new modules without Claude writing full HTML.
 *
 * These mirror the patterns in CONTENT_SYSTEM but live here so both
 * the generator and patch applier share one source of truth.
 * ──────────────────────────────────────────────────────────────── */

export type ModuleKey =
  | "section-intro"
  | "pull-quote"
  | "cerise-band"
  | "stat-highlight"
  | "two-column"
  | "body-text"
  | "cta-button"
  | "wave"
  // Premium modules — added to give parallel sections distinct visual DNA
  // so the Design Review can swap repeated stat-highlights / cerise-bands
  // for a different-but-equally-strong moment instead of reusing the same
  // treatment across sections.
  | "framed-stat"      // vertical left-rule + stat stacked (alt to stat-highlight)
  | "stats-grid"       // 3 small stats side-by-side
  | "chapter-mark"     // oversized numeral + eyebrow + headline
  | "side-callout"     // body with cerise left-rule, italic, no headline
  | "photo-divider"    // full-width image as section break (alt to wave)
  | "editorial-pair";  // image + body side-by-side, magazine-style

export interface ModuleVars {
  // section-intro
  eyebrow?: string;
  headline?: string;
  deck?: string;
  // pull-quote
  quote?: string;
  attribution?: string;
  // cerise-band
  callout?: string;
  supporting?: string;
  // stat-highlight
  stat?: string;
  label?: string;
  context?: string;
  // two-column
  leftLabel?: string;
  leftHeadline?: string;
  leftBody?: string;
  rightLabel?: string;
  rightHeadline?: string;
  rightBody?: string;
  // body-text
  text?: string;
  bg?: "pebble" | "gray" | "white";
  // cta-button
  ctaText?: string;
  href?: string;
  // wave
  from?: "pebble" | "gray" | "white";
  to?: "pebble" | "gray" | "white";
  // Premium module vars
  // framed-stat reuses stat/label/context from stat-highlight
  // stats-grid: 3 small stats
  stat1?: string; label1?: string;
  stat2?: string; label2?: string;
  stat3?: string; label3?: string;
  // chapter-mark
  number?: string;       // e.g. "02"
  // side-callout reuses `text` from body-text
  // photo-divider + editorial-pair
  imageKey?: string;
  // palette override (optional — for preset-aware inserts)
  accentHex?: string;
  accentBorderHex?: string;
}

const bgColors: Record<string, string> = { pebble: "#f5f6f7", gray: "#e3e4e7", white: "#ffffff" };

function esc(s: string): string {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * renderModule — produce the <tr> HTML for a module by key.
 * Used by the patch executor when an `insert_module` op is applied.
 */
export function renderModule(key: ModuleKey, v: ModuleVars = {}): string {
  const accent = v.accentHex || "#fd3576";
  const accentBorder = v.accentBorderHex || "#ce0259";

  switch (key) {
    case "section-intro":
      return `<tr><td class="bg-pebble px-m" style="background-color:#f5f6f7;padding:40px 24px 0 24px;"><table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td style="border-top:2px solid #21263a;padding-top:20px;"><p class="eyebrow" style="font-family:'JetBrains Mono','Courier New',monospace;font-weight:600;font-size:13px;line-height:1;text-transform:uppercase;color:${accent};margin:0 0 12px 0;letter-spacing:1.5px;">${esc(v.eyebrow || "SECTION")}</p><p class="h2" style="font-family:'Archivo',Arial,sans-serif;font-weight:700;font-size:32px;line-height:1.05;text-transform:uppercase;margin:0 0 12px 0;color:#21263a;font-stretch:extra-condensed;font-variation-settings:'wdth' 62.5;">${esc(v.headline || "HEADLINE")}</p><p style="font-family:'Archivo',Arial,sans-serif;font-weight:400;font-size:16px;line-height:1.55;margin:0;color:#4a5068;">${esc(v.deck || "")}</p></td></tr></table></td></tr>`;

    case "pull-quote":
      return `<tr><td class="bg-white px-m" style="background-color:#ffffff;padding:40px 32px;"><table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td><p style="font-family:'Archivo',Arial,sans-serif;font-weight:700;font-size:64px;line-height:1;margin:0;color:${accent};font-stretch:extra-condensed;font-variation-settings:'wdth' 62.5;">&ldquo;</p><p style="font-family:'Archivo',Arial,sans-serif;font-weight:500;font-size:22px;line-height:1.35;margin:0 0 16px 0;color:#21263a;font-style:italic;">${esc(v.quote || "Quote")}</p><p style="font-family:'JetBrains Mono','Courier New',monospace;font-weight:600;font-size:12px;line-height:1;text-transform:uppercase;color:#4a5068;margin:0;letter-spacing:1.2px;">&mdash; ${esc(v.attribution || "Attribution")}</p></td></tr></table></td></tr>`;

    case "cerise-band":
      return `<tr><td style="background-color:${accent};padding:40px 24px;text-align:center;"><p style="font-family:'Archivo',Arial,sans-serif;font-weight:700;font-size:28px;line-height:1.1;text-transform:uppercase;margin:0 0 12px 0;color:#ffffff;font-stretch:extra-condensed;font-variation-settings:'wdth' 62.5;">${esc(v.callout || "CALLOUT")}</p><p style="font-family:'Archivo',Arial,sans-serif;font-weight:400;font-size:15px;line-height:1.5;margin:0;color:#ffffff;opacity:0.92;">${esc(v.supporting || "")}</p></td></tr>`;

    case "stat-highlight":
      return `<tr><td class="bg-pebble px-m" style="background-color:#f5f6f7;padding:24px 16px 24px 16px;"><table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top:4px solid ${accent};padding-top:24px;"><tr><td style="text-align:center;"><p style="font-family:'Archivo',Arial,sans-serif;font-weight:700;font-size:52px;line-height:1;margin:0 0 8px 0;color:${accent};font-stretch:extra-condensed;font-variation-settings:'wdth' 62.5;">${esc(v.stat || "0")}</p><p style="font-family:'JetBrains Mono','Courier New',monospace;font-weight:600;font-size:13px;line-height:1.4;text-transform:uppercase;margin:0 0 12px 0;color:#21263a;letter-spacing:0.5px;">${esc(v.label || "LABEL")}</p><p style="font-family:'Archivo',Arial,sans-serif;font-weight:400;font-size:14px;line-height:1.5;margin:0;color:#21263a;">${esc(v.context || "")}</p></td></tr></table></td></tr>`;

    case "two-column":
      return `<tr><td class="bg-gray px-m" style="background-color:#e3e4e7;padding:32px 16px;"><table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td valign="top" width="50%" style="padding-right:8px;"><p style="font-family:'JetBrains Mono','Courier New',monospace;font-weight:600;font-size:11px;line-height:1;text-transform:uppercase;color:#4a5068;margin:0 0 8px 0;letter-spacing:1.2px;">${esc(v.leftLabel || "LEFT")}</p><p style="font-family:'Archivo',Arial,sans-serif;font-weight:600;font-size:22px;line-height:1.1;margin:0 0 8px 0;color:#21263a;font-stretch:extra-condensed;font-variation-settings:'wdth' 62.5;">${esc(v.leftHeadline || "")}</p><p style="font-family:'Archivo',Arial,sans-serif;font-weight:400;font-size:13px;line-height:1.5;margin:0;color:#21263a;">${esc(v.leftBody || "")}</p></td><td valign="top" width="50%" style="padding-left:16px;border-left:2px solid ${accent};"><p style="font-family:'JetBrains Mono','Courier New',monospace;font-weight:600;font-size:11px;line-height:1;text-transform:uppercase;color:${accent};margin:0 0 8px 0;letter-spacing:1.2px;">${esc(v.rightLabel || "RIGHT")}</p><p style="font-family:'Archivo',Arial,sans-serif;font-weight:600;font-size:22px;line-height:1.1;margin:0 0 8px 0;color:#21263a;font-stretch:extra-condensed;font-variation-settings:'wdth' 62.5;">${esc(v.rightHeadline || "")}</p><p style="font-family:'Archivo',Arial,sans-serif;font-weight:400;font-size:13px;line-height:1.5;margin:0;color:#21263a;">${esc(v.rightBody || "")}</p></td></tr></table></td></tr>`;

    case "body-text": {
      const bg = v.bg || "pebble";
      const bgClass = `bg-${bg}`;
      const bgColor = bgColors[bg] || "#f5f6f7";
      return `<tr><td class="${bgClass} px-m" style="background-color:${bgColor};padding:0 16px 24px 16px;"><p class="body-sm" style="font-family:'Archivo',Arial,sans-serif;font-weight:400;font-size:14px;line-height:1.5;margin:0;color:#21263a;">${esc(v.text || "")}</p></td></tr>`;
    }

    case "cta-button": {
      const bg = v.bg || "pebble";
      const bgClass = `bg-${bg}`;
      const bgColor = bgColors[bg] || "#f5f6f7";
      return `<tr><td class="${bgClass} px-m" style="background-color:${bgColor};padding:0 16px 32px 16px;"><table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%"><tr><td align="center"><!--[if !mso]><!--><a href="${esc(v.href || "#")}" class="btn-cerise" style="display:inline-block;padding:16px 30px;border-radius:16px;font-family:'Archivo',Arial,sans-serif;font-weight:700;font-size:18px;line-height:normal;text-decoration:none;color:#ffffff;background-color:${accent};text-align:center;border:2px solid ${accentBorder};border-bottom:4px solid ${accentBorder};max-width:520px;box-sizing:border-box;width:100%;font-stretch:expanded;font-variation-settings:'wdth' 125;">${esc(v.ctaText || "Learn More")} &rarr;</a><!--<![endif]--></td></tr></table></td></tr>`;
    }

    case "wave": {
      const from = v.from || "pebble";
      const to = v.to || "gray";
      const bgClass = `bg-${from}`;
      const bgColor = bgColors[from] || "#f5f6f7";
      const waveName = `wave-${from}-to-${to}`;
      return `<tr><td class="${bgClass}" style="background-color:${bgColor};padding:0;line-height:0;font-size:0;"><img class="hex-light" src="https://funnel-ai-signos.netlify.app/email-assets/nutrition/${waveName}.png?v=5" width="600" alt="" style="display:block;width:100%;height:auto;" /><!--[if !mso]><!--><img class="hex-dark" src="https://funnel-ai-signos.netlify.app/email-assets/nutrition/${waveName}-dark.png?v=5" width="600" alt="" style="display:none;max-height:0;overflow:hidden;width:100%;height:auto;" /><!--<![endif]--></td></tr>`;
    }

    /* ── Premium modules ──────────────────────────────────────────
     * Distinguishing features vs the "standard" palette:
     *   - framed-stat: vertical LEFT rule (not top), navy stat (not cerise),
     *     left-aligned, editorial feel. Use when you already have a
     *     stat-highlight earlier and need a second data moment that looks
     *     different.
     *   - stats-grid: three small stats side-by-side. No one giant number.
     *     Magazine data-table look. Good for roundup moments.
     *   - chapter-mark: oversized numeral + label + headline laid out
     *     horizontally. Alternative to section-intro when you want more
     *     editorial weight / to break parallel section sameness.
     *   - side-callout: italic body with cerise left rule, no headline.
     *     Inline emphasis for a single pulled line.
     *   - photo-divider: a full-bleed image used as the transition itself.
     *     Use instead of a wave to break up "wave fatigue".
     *   - editorial-pair: image + body-copy side-by-side. Good for a
     *     human/context moment mid-email; collapses to stacked on mobile.
     * ──────────────────────────────────────────────────────────── */

    case "framed-stat":
      return `<tr><td class="bg-pebble px-m" style="background-color:#f5f6f7;padding:32px 16px;"><table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td style="border-left:3px solid ${accent};padding-left:20px;"><p style="font-family:'Archivo',Arial,sans-serif;font-weight:700;font-size:56px;line-height:1;margin:0 0 6px 0;color:#21263a;font-stretch:extra-condensed;font-variation-settings:'wdth' 62.5;">${esc(v.stat || "0")}</p><p style="font-family:'JetBrains Mono','Courier New',monospace;font-weight:600;font-size:11px;line-height:1.2;text-transform:uppercase;margin:0 0 10px 0;color:${accent};letter-spacing:1.5px;">${esc(v.label || "LABEL")}</p><p style="font-family:'Archivo',Arial,sans-serif;font-weight:400;font-size:15px;line-height:1.5;margin:0;color:#4a5068;">${esc(v.context || "")}</p></td></tr></table></td></tr>`;

    case "stats-grid":
      return `<tr><td class="bg-pebble px-m" style="background-color:#f5f6f7;padding:32px 16px;"><table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td valign="top" width="33%" style="padding-right:8px;text-align:center;"><p style="font-family:'Archivo',Arial,sans-serif;font-weight:700;font-size:32px;line-height:1;margin:0 0 4px 0;color:${accent};font-stretch:extra-condensed;font-variation-settings:'wdth' 62.5;">${esc(v.stat1 || "0")}</p><p style="font-family:'JetBrains Mono','Courier New',monospace;font-weight:600;font-size:10px;line-height:1.2;text-transform:uppercase;margin:0;color:#21263a;letter-spacing:1px;">${esc(v.label1 || "LABEL")}</p></td><td valign="top" width="34%" style="padding:0 8px;text-align:center;border-left:1px solid #d9dadf;border-right:1px solid #d9dadf;"><p style="font-family:'Archivo',Arial,sans-serif;font-weight:700;font-size:32px;line-height:1;margin:0 0 4px 0;color:${accent};font-stretch:extra-condensed;font-variation-settings:'wdth' 62.5;">${esc(v.stat2 || "0")}</p><p style="font-family:'JetBrains Mono','Courier New',monospace;font-weight:600;font-size:10px;line-height:1.2;text-transform:uppercase;margin:0;color:#21263a;letter-spacing:1px;">${esc(v.label2 || "LABEL")}</p></td><td valign="top" width="33%" style="padding-left:8px;text-align:center;"><p style="font-family:'Archivo',Arial,sans-serif;font-weight:700;font-size:32px;line-height:1;margin:0 0 4px 0;color:${accent};font-stretch:extra-condensed;font-variation-settings:'wdth' 62.5;">${esc(v.stat3 || "0")}</p><p style="font-family:'JetBrains Mono','Courier New',monospace;font-weight:600;font-size:10px;line-height:1.2;text-transform:uppercase;margin:0;color:#21263a;letter-spacing:1px;">${esc(v.label3 || "LABEL")}</p></td></tr></table></td></tr>`;

    case "chapter-mark":
      return `<tr><td class="bg-pebble px-m" style="background-color:#f5f6f7;padding:48px 24px 16px 24px;"><table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td valign="top" width="90" style="padding-right:20px;"><p style="font-family:'Archivo',Arial,sans-serif;font-weight:700;font-size:72px;line-height:0.9;margin:0;color:${accent};font-stretch:extra-condensed;font-variation-settings:'wdth' 62.5;">${esc(v.number || "01")}</p></td><td valign="top"><p style="font-family:'JetBrains Mono','Courier New',monospace;font-weight:600;font-size:11px;line-height:1.2;text-transform:uppercase;color:#4a5068;margin:0 0 6px 0;letter-spacing:1.5px;">${esc(v.eyebrow || "CHAPTER")}</p><p style="font-family:'Archivo',Arial,sans-serif;font-weight:700;font-size:26px;line-height:1.05;margin:0;color:#21263a;font-stretch:extra-condensed;font-variation-settings:'wdth' 62.5;text-transform:uppercase;">${esc(v.headline || "HEADLINE")}</p></td></tr></table></td></tr>`;

    case "side-callout":
      return `<tr><td class="bg-pebble px-m" style="background-color:#f5f6f7;padding:16px 24px 24px 24px;"><table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td style="border-left:3px solid ${accent};padding-left:20px;"><p style="font-family:'Archivo',Arial,sans-serif;font-weight:500;font-size:18px;line-height:1.4;margin:0;color:#21263a;font-style:italic;">${esc(v.text || "Pull-out emphasis text")}</p></td></tr></table></td></tr>`;

    case "photo-divider": {
      const imageUrl = resolveImageUrl(v.imageKey || "section-photo-1");
      return `<tr><td class="bg-white" style="background-color:#ffffff;padding:0;line-height:0;font-size:0;"><img src="${imageUrl}" width="600" alt="" style="display:block;width:100%;height:auto;" /></td></tr>`;
    }

    case "editorial-pair": {
      const imageUrl = resolveImageUrl(v.imageKey || "section-photo-1");
      return `<tr><td class="bg-pebble px-m" style="background-color:#f5f6f7;padding:32px 16px;"><table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td valign="top" width="45%" style="padding-right:16px;"><img src="${imageUrl}" width="240" alt="" style="display:block;width:100%;height:auto;border-radius:8px;" /></td><td valign="top"><p style="font-family:'JetBrains Mono','Courier New',monospace;font-weight:600;font-size:11px;line-height:1.2;text-transform:uppercase;color:${accent};margin:0 0 6px 0;letter-spacing:1.2px;">${esc(v.eyebrow || "INSIGHT")}</p><p style="font-family:'Archivo',Arial,sans-serif;font-weight:600;font-size:20px;line-height:1.15;margin:0 0 8px 0;color:#21263a;font-stretch:extra-condensed;font-variation-settings:'wdth' 62.5;text-transform:uppercase;">${esc(v.headline || "HEADLINE")}</p><p style="font-family:'Archivo',Arial,sans-serif;font-weight:400;font-size:14px;line-height:1.5;margin:0;color:#21263a;">${esc(v.text || "Body text for this editorial pair.")}</p></td></tr></table></td></tr>`;
    }

    default:
      return "";
  }
}
