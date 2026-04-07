import type { Context } from "@netlify/functions";
import Anthropic from "@anthropic-ai/sdk";
import { sql, ensureTables } from "./lib/db.mjs";

/* ═══════════════════════════════════════════════════════════════════
   TEMPLATE — extracted from iterable-experiments-nonmembers.html
   Split into HEAD (immutable), CONTENT reference, FOOTER (immutable)
   ═══════════════════════════════════════════════════════════════════ */

const TEMPLATE_HEAD = `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <meta charset="utf-8" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title>{{TITLE}}</title>
    <!--[if mso]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
    <!--[if mso]><style>* { font-family: Arial, Helvetica, sans-serif !important; }</style><![endif]-->
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@75,600;100,400;100,600;100,700;125,600&family=JetBrains+Mono:wght@700&display=swap');
      :root { color-scheme: light dark; supported-color-schemes: light dark; }
      body,table,td,p,a,li,blockquote { -webkit-text-size-adjust:100%;-ms-text-size-adjust:100%; }
      table,td { mso-table-lspace:0;mso-table-rspace:0; }
      img { -ms-interpolation-mode:bicubic;border:0;display:block;outline:none;text-decoration:none; }
      body { margin:0;padding:0;width:100%!important;min-width:100%;background-color:#f5f6f7;font-family:'Archivo',Arial,Helvetica,sans-serif;color:#21263a; }
      .wrapper { width:100%;background-color:#f5f6f7; }
      .container { width:600px;max-width:600px;margin:0 auto; }
      .bg-pebble-lt { background-color:#f5f6f7!important; }
      .bg-white { background-color:#ffffff!important; }
      .bg-stone { background-color:#21263a!important; }
      .eyebrow { font-family:'JetBrains Mono','Courier New',monospace;font-weight:700;font-size:14px;line-height:1.6;text-transform:uppercase;color:#3b88ff;margin:0; }
      .h1 { font-family:'Archivo ExtraCondensed','Archivo',Arial,sans-serif;font-weight:600;font-size:36px;line-height:1;text-transform:uppercase;margin:0;color:#21263a; }
      .h3 { font-family:'Archivo Expanded','Archivo',Arial,sans-serif;font-weight:600;font-size:22px;line-height:1.2;margin:0;color:#21263a; }
      .h3-section { font-family:'Archivo Expanded','Archivo',Arial,sans-serif;font-weight:600;font-size:24px;line-height:1.2;margin:0;color:#21263a; }
      .body-copy { font-family:'Archivo',Arial,sans-serif;font-weight:400;font-size:18px;line-height:24px;margin:0;color:#21263a; }
      .body-sm { font-family:'Archivo',Arial,sans-serif;font-weight:400;font-size:16px;line-height:1.6;margin:0;color:#21263a; }
      .exp-tag { font-family:'Archivo Expanded','Archivo',Arial,sans-serif;font-weight:600;font-size:14px;line-height:1.2;color:#8097b5;text-align:center;border:1px solid #8097b5;border-radius:6px;padding:10px 16px;display:inline-block; }
      .blue-bold { font-weight:700;color:#3b88ff; }
      .btn-cerise { display:inline-block;padding:16px 30px;border-radius:16px;font-family:'Archivo Expanded','Archivo',Arial,sans-serif;font-weight:700;font-size:18px;line-height:normal;text-decoration:none;color:#ffffff!important;background-color:#fd3576;text-align:center;border-bottom:4px solid #ce0259; }
      .footer-copy { font-family:'Archivo',Arial,sans-serif;font-weight:500;font-size:10px;line-height:1.3;color:#b5c3d6;margin:0; }
      .footer-links { font-family:'Archivo Condensed','Archivo',Arial,sans-serif;font-weight:700;font-size:18px;line-height:normal;text-transform:uppercase;color:#b5c3d6; }
      .ref-copy { font-family:'Archivo',Arial,sans-serif;font-weight:500;font-size:10px;line-height:1.3;color:#b5c3d6;margin:0; }
      .card { background-color:#ffffff;border-radius:20px;padding:32px 24px; }
      .img-rounded { border-radius:24px;display:block;width:100%;height:auto; }
      .logo-light,.hex-light { display:block!important; }
      .logo-dark,.hex-dark { display:none!important;max-height:0;overflow:hidden; }
      @media screen and (max-width:620px) {
        .container,.w-full { width:100%!important;max-width:100%!important; }
        .px-m { padding-left:12px!important;padding-right:12px!important; }
        .h1 { font-size:28px!important; }
        .h3-section { font-size:20px!important; }
        .body-copy { font-size:16px!important;line-height:22px!important; }
        .hero-side { display:none!important;max-height:0!important;overflow:hidden!important; }
        .stack { display:block!important;width:100%!important; }
        .btn-cerise { font-size:16px!important; }
      }
      @media (prefers-color-scheme:dark) {
        body,.wrapper,.bg-pebble-lt { background-color:#21263a!important; }
        .card,.bg-white { background-color:#2a3050!important; }
        .h1,.h3,.h3-section,.body-copy,.body-sm { color:#f5f6f7!important; }
        .exp-tag { color:#8097b5!important;border-color:#465b7a!important; }
        .logo-light,.hex-light { display:none!important;max-height:0!important;overflow:hidden!important; }
        .logo-dark,.hex-dark { display:block!important;max-height:none!important;overflow:visible!important; }
        .list-item { color:#f5f6f7!important; }
      }
      [data-ogsc] body,[data-ogsc] .wrapper,[data-ogsc] .bg-pebble-lt { background-color:#21263a!important; }
      [data-ogsc] .card,[data-ogsc] .bg-white { background-color:#2a3050!important; }
      [data-ogsc] .h1,[data-ogsc] .h3,[data-ogsc] .h3-section,[data-ogsc] .body-copy,[data-ogsc] .body-sm { color:#f5f6f7!important; }
      [data-ogsc] .logo-light,[data-ogsc] .hex-light { display:none!important; }
      [data-ogsc] .logo-dark,[data-ogsc] .hex-dark { display:block!important; }
      [data-ogsc] .list-item { color:#f5f6f7!important; }
    </style>
  </head>
  <body>
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:#f5f6f7;">
      {{PREHEADER}}
      &#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;
    </div>
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="wrapper">
      <tr><td align="center" class="bg-pebble-lt" style="padding:0;">
        <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="600" class="container w-full">

          <!-- ========== HEADER ========== -->
          <tr>
            <td class="bg-pebble-lt" style="padding:25px 24px;">
              <a href="https://www.signos.com" target="_blank">
                <img class="logo-light" src="https://funnel-ai-signos.netlify.app/email-assets/experiments/logo-header-light.png" width="150" height="45" alt="Signos" style="display:block;width:150px;height:auto;" />
              </a>
              <a href="https://www.signos.com" target="_blank">
                <img class="logo-dark" src="https://funnel-ai-signos.netlify.app/email-assets/experiments/logo-header-dark.png" width="150" height="45" alt="Signos" style="display:none;max-height:0;overflow:hidden;width:150px;height:auto;" />
              </a>
            </td>
          </tr>

`;

const TEMPLATE_FOOTER = `
          <!-- ========== FOOTER ========== -->
          <tr>
            <td class="bg-stone" style="background-color:#21263a;padding:32px 32px 0 32px;">
              <a href="https://www.signos.com" target="_blank">
                <img src="https://funnel-ai-signos.netlify.app/email-assets/experiments/logo-footer.png" width="150" height="45" alt="Signos" style="display:block;width:150px;height:auto;" />
              </a>
            </td>
          </tr>

          <tr>
            <td class="bg-stone" style="background-color:#21263a;padding:24px 32px 0 32px;">
              <p class="footer-links" style="font-family:'Archivo Condensed','Archivo',Arial,sans-serif;font-weight:700;font-size:18px;line-height:normal;text-transform:uppercase;color:#b5c3d6;margin:0;">
                <a href="https://www.signos.com/contact-us" target="_blank" style="color:#b5c3d6;text-decoration:none;">Contact</a>&nbsp;&nbsp;&nbsp;&nbsp;
                <a href="https://www.signos.com/science" target="_blank" style="color:#b5c3d6;text-decoration:none;">Science</a>&nbsp;&nbsp;&nbsp;&nbsp;
                <a href="https://www.signos.com/blog" target="_blank" style="color:#b5c3d6;text-decoration:none;">Blog</a>&nbsp;&nbsp;&nbsp;&nbsp;
                <a href="https://www.signos.com/about" target="_blank" style="color:#b5c3d6;text-decoration:none;">About Us</a>
              </p>
            </td>
          </tr>

          <tr>
            <td class="bg-stone" style="background-color:#21263a;padding:24px 32px 0 32px;">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0"><tr>
                <td style="padding-right:12px;"><a href="https://apps.apple.com/us/app/signos/id1564313943" target="_blank"><img src="https://funnel-ai-signos.netlify.app/email-assets/experiments/badge-app-store.png" width="120" height="40" alt="Download on the App Store" style="display:block;" /></a></td>
                <td><a href="https://play.google.com/store/apps/details?id=com.signoshealth.signos" target="_blank"><img src="https://funnel-ai-signos.netlify.app/email-assets/experiments/badge-google-play.png" width="135" height="40" alt="Get it on Google Play" style="display:block;" /></a></td>
              </tr></table>
            </td>
          </tr>

          <tr>
            <td class="bg-stone" style="background-color:#21263a;padding:24px 32px 0 32px;">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0"><tr>
                <td style="padding-right:24px;"><a href="https://www.instagram.com/signoshealth/" target="_blank"><img src="https://funnel-ai-signos.netlify.app/email-assets/experiments/icon-instagram-white.png" width="22" height="22" alt="Instagram" style="display:block;" /></a></td>
                <td style="padding-right:24px;"><a href="https://www.facebook.com/signoshealth/" target="_blank"><img src="https://funnel-ai-signos.netlify.app/email-assets/experiments/icon-facebook-white.png" width="22" height="22" alt="Facebook" style="display:block;" /></a></td>
                <td style="padding-right:24px;"><a href="https://www.tiktok.com/@signoshealth" target="_blank"><img src="https://funnel-ai-signos.netlify.app/email-assets/experiments/icon-tiktok-white.png" width="22" height="22" alt="TikTok" style="display:block;" /></a></td>
                <td style="padding-right:24px;"><a href="https://www.pinterest.com/signoshealth/" target="_blank"><img src="https://funnel-ai-signos.netlify.app/email-assets/experiments/icon-pinterest-white.png" width="22" height="22" alt="Pinterest" style="display:block;" /></a></td>
                <td style="padding-right:24px;"><a href="https://www.x.com/signoshealth/" target="_blank"><img src="https://funnel-ai-signos.netlify.app/email-assets/experiments/icon-twitter-white.png" width="22" height="22" alt="X" style="display:block;" /></a></td>
                <td style="padding-right:24px;"><a href="https://www.linkedin.com/company/signoshealth/" target="_blank"><img src="https://funnel-ai-signos.netlify.app/email-assets/experiments/icon-linkedin-white.png" width="22" height="22" alt="LinkedIn" style="display:block;" /></a></td>
                <td><a href="https://www.youtube.com/signoshealth" target="_blank"><img src="https://funnel-ai-signos.netlify.app/email-assets/experiments/icon-youtube-white.png" width="22" height="22" alt="YouTube" style="display:block;" /></a></td>
              </tr></table>
            </td>
          </tr>

          <tr>
            <td class="bg-stone" style="background-color:#21263a;padding:32px 32px 24px 32px;">
              <p class="footer-copy" style="font-family:'Archivo',Arial,sans-serif;font-weight:500;font-size:10px;line-height:1.3;color:#f5f6f7;margin:0 0 8px 0;">Copyright &copy; 2026 Signos Inc. Signos, Inc. 2625 Middlefield Road, #720 Palo Alto, CA 94306</p>
              <p class="footer-copy" style="font-family:'Archivo',Arial,sans-serif;font-weight:500;font-size:10px;line-height:1.3;color:#ffffff;margin:0 0 8px 0;">Indications: The Signos Glucose Monitoring System is an over-the-counter (OTC) mobile device application that uses an integrated Continuous Glucose Monitor (iCGM) intended to continuously measure, record, analyze, and display glucose values in people 18 years and older, not on insulin. The Signos Glucose Monitoring System helps to detect normal (euglycemic) and low or high (dysglycemic) glucose levels. The Signos Glucose Monitoring System may also help the user better understand how lifestyle and behavior modification, including diet and exercise, impact glucose excursions. This information may be useful in helping users to maintain a healthy weight. The user is not intended to take medical action based on the device output without consultation with a qualified healthcare professional. See user guide for important warnings and precautions.</p>
              <p class="footer-copy" style="font-family:'Archivo',Arial,sans-serif;font-weight:500;font-size:10px;line-height:1.3;color:#f5f6f7;margin:0;">
                <a href="https://www.signos.com/privacy-policy" target="_blank" style="color:#f5f6f7;text-decoration:underline;">Privacy Policy</a>&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;
                <a href="{{unsubscribeUrl}}" style="color:#f5f6f7;text-decoration:underline;">Unsubscribe</a>&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;
                <a href="{{viewInBrowserUrl}}" style="color:#f5f6f7;text-decoration:underline;">View in Browser</a>
              </p>
            </td>
          </tr>

        </table>
      </td></tr>
    </table>
  </body>
</html>`;

const CONTENT_SYSTEM = `You produce ONLY the content <tr> blocks for Signos marketing emails. No DOCTYPE, html, head, style, header, or footer — those are pre-built.

CSS CLASSES (already defined in <style>):
.bg-pebble-lt, .card (white card, border-radius:20px, padding:32px 24px), .h1 (Archivo ExtraCondensed, 36px, uppercase), .h3/.h3-section (Archivo Expanded, 22-24px), .body-copy (Archivo, 18px/24px), .body-sm (16px/1.6), .eyebrow (JetBrains Mono, 14px, uppercase, #3b88ff), .blue-bold (#3b88ff bold), .btn-cerise (pink CTA), .exp-tag (gray border tag), .list-item

SECTION PATTERNS — use these exact structures:

INTRO CARD: <tr><td class="bg-pebble-lt" style="padding:0 16px 0 16px;"><table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="card" style="background-color:#ffffff;border-radius:20px;padding:32px 24px;"><tr><td><p class="h1">LINE 1</p><p style="font-family:'Archivo Expanded','Archivo',Arial,sans-serif;font-weight:600;font-size:36px;line-height:1;text-transform:uppercase;margin:0;color:#3b88ff;">LINE 2</p></td></tr><tr><td style="padding-top:16px;"><p class="body-copy">Paragraph</p></td></tr></table></td></tr>

IMAGE: <tr><td class="bg-pebble-lt" style="padding:16px 16px 0 16px;"><img src="URL" width="568" style="display:block;width:100%;height:auto;border-radius:16px;" alt="ALT" /></td></tr>

CTA: <tr><td class="bg-pebble-lt" align="center" style="padding:16px 16px;"><!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="#" style="height:52px;v-text-anchor:middle;width:520px;" arcsize="15%" fillcolor="#fd3576" stroke="f"><v:textbox inset="0,0,0,0"><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:18px;font-weight:bold;">TEXT</center></v:textbox></v:roundrect><![endif]--><!--[if !mso]><!--><a class="btn-cerise" href="#" target="_blank" style="display:block;width:100%;max-width:520px;padding:16px 30px;border-radius:16px;font-family:'Archivo Expanded','Archivo',Arial,sans-serif;font-weight:700;font-size:18px;line-height:normal;text-decoration:none;color:#ffffff;background-color:#fd3576;text-align:center;border-bottom:4px solid #ce0259;box-sizing:border-box;">TEXT</a><!--<![endif]--></td></tr>

TOPIC CARD (tag + heading + body + image + arrow bullets): <tr><td class="bg-pebble-lt" style="padding:0 16px 16px 16px;"><table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="card" style="background-color:#ffffff;border-radius:20px;padding:32px 24px;"><tr><td><p class="exp-tag">TAG</p></td></tr><tr><td style="padding-top:9px;"><p class="h3-section">HEADING</p></td></tr><tr><td style="padding-top:16px;"><p class="body-copy">BODY</p></td></tr><tr><td style="padding-top:24px;"><img src="URL" width="520" style="display:block;width:100%;height:auto;border-radius:24px;" alt="ALT" /></td></tr><tr><td style="padding-top:24px;"><table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%"><tr><td valign="top" width="40" style="padding-right:8px;"><table role="presentation" border="0" cellspacing="0" cellpadding="0"><tr><td style="background-color:#3b88ff;border-radius:50%;width:32px;height:32px;text-align:center;vertical-align:middle;font-family:'Archivo',Arial,sans-serif;font-weight:700;font-size:16px;color:#ffffff;line-height:32px;">&rarr;</td></tr></table></td><td valign="top"><p class="body-sm"><span class="blue-bold">LABEL:</span></p><p class="body-sm">TEXT</p></td></tr></table></td></tr></table></td></tr>

EYEBROW CARD (eyebrow + heading + body + bullets): Same as TOPIC CARD but use <p class="eyebrow">LABEL</p> instead of exp-tag, and <p class="h3">HEADING</p>.

CLOSING: <tr><td class="bg-pebble-lt" style="padding:16px 16px 0 16px;"><p class="h1">LINE 1</p><p style="font-family:'Archivo Expanded','Archivo',Arial,sans-serif;font-weight:600;font-size:28px;line-height:1;text-transform:uppercase;margin:0;color:#3b88ff;">LINE 2</p></td></tr><tr><td class="bg-pebble-lt" style="padding:12px 16px 24px 16px;"><p class="body-sm">PARAGRAPH</p></td></tr>

IMAGES (pick different ones per section):
Hero: https://funnel-ai-signos.netlify.app/email-assets/experiments/hero-composed.jpg | https://cdn.prod.website-files.com/63ed08484c069d0492f5b0bc/695a945193266413762d2199_Option%206.png | https://cdn.prod.website-files.com/63ed08484c069d0492f5b0bc/66ff04ff698cbfcce388ff57_6557d5bba8a8893dbded1969_woman-with-signos-cgm-similing-at-camera.webp
Section: https://funnel-ai-signos.netlify.app/email-assets/experiments/frame-light.jpg | https://funnel-ai-signos.netlify.app/email-assets/experiments/section-photo-1.jpg | https://funnel-ai-signos.netlify.app/email-assets/experiments/section-photo-2.jpg | https://cdn.prod.website-files.com/63ed08484c069d0492f5b0bc/6977bf4595147e56c8aa6cd9_young-asian-couple-traveler-tourists-eating-thai-s-2026-01-06-10-39-06-utc%20(1)-p-800.jpg | https://cdn.prod.website-files.com/63ed08484c069d0492f5b0bc/691a0332bd872eb104526272_multiethnic-diverse-male-friends-having-fun-togeth-2025-10-14-08-35-41-utc-min-p-800.jpg
Closing: https://funnel-ai-signos.netlify.app/email-assets/experiments/footer-composed.jpg

RULES: 6-10 <tr> blocks. Structure: Intro Card → Image → CTA → Topic Cards (2-3) with bullets → Closing → CTA. 2-3 paragraphs per section. 2-3 CTAs total. Output ONLY <tr> blocks.`;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });

function assembleEmail(contentTrs: string, preheader: string, title: string): string {
  let html = TEMPLATE_HEAD
    .replace("{{PREHEADER}}", preheader || "")
    .replace("{{TITLE}}", title || "Signos Email")
    + contentTrs
    + TEMPLATE_FOOTER;
  if (html.startsWith("```")) html = html.replace(/^```html?\n?/, "").replace(/\n?```$/, "");
  return html;
}

function stripMarkdownFences(text: string): string {
  return text.replace(/^```html?\n?/, "").replace(/\n?```$/, "");
}

export default async (req: Request, _ctx: Context) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const action = body.action as string;
  console.log(`[email-hub] action=${action}`);

  if (action === "ping") {
    return json({ ok: true, timestamp: new Date().toISOString(), hasApiKey: !!process.env.ANTHROPIC_API_KEY });
  }

  if (action === "list-drafts") {
    await ensureTables();
    const db = sql();
    const rows = await db`SELECT id, title, theme, audience, updated_at FROM email_hub_drafts ORDER BY updated_at DESC LIMIT 50`;
    return json({ drafts: rows });
  }
  if (action === "load-draft") {
    await ensureTables();
    const db = sql();
    const rows = await db`SELECT * FROM email_hub_drafts WHERE id = ${body.id as string}`;
    return json({ draft: rows[0] || null });
  }
  if (action === "save-draft") {
    await ensureTables();
    const db = sql();
    const now = Date.now();
    const id = (body.id as string) || `ehd_${now}_${Math.random().toString(36).slice(2, 8)}`;
    await db`INSERT INTO email_hub_drafts (id, title, theme, details, audience, html, created_at, updated_at)
      VALUES (${id}, ${(body.title as string) || 'Untitled'}, ${(body.theme as string) || ''}, ${(body.details as string) || ''}, ${(body.audience as string) || 'all'}, ${(body.html as string) || ''}, ${now}, ${now})
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title, theme = EXCLUDED.theme, details = EXCLUDED.details,
        audience = EXCLUDED.audience, html = EXCLUDED.html, updated_at = EXCLUDED.updated_at`;
    return json({ id, saved: true });
  }
  if (action === "delete-draft") {
    await ensureTables();
    const db = sql();
    await db`DELETE FROM email_hub_drafts WHERE id = ${body.id as string}`;
    return json({ deleted: true });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ error: "Missing ANTHROPIC_API_KEY" }, 500);
  const client = new Anthropic({ apiKey });

  if (action === "generate-option") {
    const audience = (body.audience as string) || "non-members";
    const variationId = (body.variationId as string) || "a";
    const theme = (body.theme as string) || "";
    const details = (body.details as string) || "";
    const creativeDirection = (body.creativeDirection as string) || "";
    const visualTheme = (body.visualTheme as string) || "";
    const contextDocuments = (body.contextDocuments as string) || "";
    const contextLinks = (body.contextLinks as string) || "";
    const contentFidelity = (body.contentFidelity as string) || "general";

    const tones: Record<string, string> = {
      a: "Bold and direct. Lead with the problem, create urgency, position Signos as the clear solution.",
      b: "Warm and educational. Focus on practical tips, science-backed advice, and empowering the reader.",
      c: "Storytelling. Paint a relatable scenario, build empathy, then naturally introduce the Signos benefit.",
    };
    const tone = tones[variationId] || tones.a;

    const audienceInstructions = audience === "members"
      ? `AUDIENCE: Current Signos members.
CTA BUTTONS: Use engagement CTAs like "Read More →", "Learn More →", "Try This →", "Explore →". Link to blog/tips content (#). Do NOT use purchase/signup CTAs.`
      : `AUDIENCE: Non-members / prospects.
CTA BUTTONS: Use conversion CTAs like "Get Started →", "Try Signos →", "Start Your Journey →", "See Plans →". Link to signos.com/plans (#). Include at least one discount mention if relevant.`;

    const visualThemeMap: Record<string, string> = {
      "female-focused": "Use imagery that resonates with women — lifestyle, self-care, cooking, yoga, confident women. Warm color tones. Empowering, relatable language.",
      "male-focused": "Use imagery that resonates with men — active lifestyle, outdoor activities, strength training, performance. Bold, direct language.",
      "clinical": "Use clean, clinical imagery — data charts, lab-style visuals, medical professionals. Authoritative, science-forward tone. Reference studies and data points.",
      "lifestyle": "Use aspirational lifestyle imagery — beautiful food, travel, wellness, daily life moments. Aspirational but attainable tone.",
      "food-nutrition": "Use rich food photography — colorful meals, healthy ingredients, cooking scenes, meal prep. Focus on the relationship between food and glucose.",
      "fitness-active": "Use fitness and movement imagery — workouts, running, gym, stretching, recovery. Energetic, performance-driven language.",
      "warm-community": "Use warm, human imagery — families, friends, togetherness, support. Empathetic, community-driven language. Inclusive and supportive.",
    };

    let contextBlock = "";
    if (contextDocuments.trim()) {
      if (contentFidelity === "exact") {
        contextBlock += `\n\nSOURCE CONTENT — FOLLOW CLOSELY:
The user uploaded content that should be followed as closely as possible. Analyze its structure (headings, sections, key points, flow, specific phrases) and reproduce that structure in the email. Preserve the key messaging, section ordering, and important phrases. Adapt formatting to email HTML but keep the content faithful to the source.

SOURCE CONTENT:
${contextDocuments.slice(0, 10000)}`;
      } else {
        contextBlock += `\n\nCONTEXT DOCUMENTS — USE AS GENERAL DIRECTION:
Use the following as background information and inspiration. Extract key themes, data points, and insights but write original email copy. Do not reproduce the source structure verbatim — instead, adapt the best ideas into a compelling email format.

REFERENCE MATERIAL:
${contextDocuments.slice(0, 8000)}`;
      }
    }
    if (contextLinks.trim()) {
      contextBlock += `\n\nREFERENCE LINKS (mention or draw from these):\n${contextLinks}`;
    }

    let creativeBlock = "";
    if (visualTheme && visualThemeMap[visualTheme]) {
      creativeBlock += `\n\nVISUAL THEME: ${visualThemeMap[visualTheme]}
When selecting images from the image pool, prioritize photos that match this visual theme. The overall look and feel of the email should reflect this direction.`;
    }
    if (creativeDirection.trim()) {
      creativeBlock += `\n\nADDITIONAL CREATIVE DIRECTION:\n${creativeDirection}`;
    }

    const prompt = `Generate the CONTENT <tr> BLOCKS for a Signos email.

TOPIC: ${theme}
DETAILS: ${details}
${audienceInstructions}
TONE: ${tone}${creativeBlock}${contextBlock}

REQUIREMENTS:
1. Use 8-12 <tr> blocks from the section patterns in the system prompt
2. Select DIFFERENT images from the image pool — pick ones that match the topic${visualTheme ? ` and the "${visualTheme}" visual theme` : ""}
3. Write compelling, engaging copy — each paragraph 2-4 sentences
4. Include 2-3 CTA buttons spread throughout
5. Use the section patterns EXACTLY as shown — only change text and image URLs
${contentFidelity === "exact" && contextDocuments.trim() ? "6. IMPORTANT: Follow the uploaded source content's structure and key messaging closely — preserve section order, key phrases, and flow while adapting to email HTML format" : ""}

Output a PREHEADER line first (prefixed "PREHEADER: "), then ONLY raw <tr>...</tr> blocks. No markdown fences, no DOCTYPE, no wrapping.`;

    console.log(`[email-hub] generate-option var=${variationId} audience=${audience} theme=${theme}`);

    try {
      const t0 = Date.now();
      const stream = await client.messages.stream({
        model: "claude-sonnet-4-20250514",
        max_tokens: 10000,
        system: CONTENT_SYSTEM,
        messages: [{ role: "user", content: prompt }],
      });

      const encoder = new TextEncoder();

      const readable = new ReadableStream({
        async start(controller) {
          try {
            // Send HEAD immediately so Netlify sees activity
            const headHtml = TEMPLATE_HEAD
              .replace("{{PREHEADER}}", theme.slice(0, 80))
              .replace("{{TITLE}}", theme || "Signos Email");
            controller.enqueue(encoder.encode(headHtml));

            let buffer = "";
            let headerParsed = false;
            let chunks = 0;

            for await (const event of stream) {
              if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
                chunks++;
                const text = event.delta.text;

                if (!headerParsed) {
                  buffer += text;
                  // Wait for first <tr to start streaming content
                  const trIdx = buffer.indexOf("<tr");
                  if (trIdx >= 0) {
                    headerParsed = true;
                    const content = buffer.slice(trIdx);
                    controller.enqueue(encoder.encode(content));
                    buffer = "";
                  }
                } else {
                  // Strip markdown fences if they appear at the end
                  controller.enqueue(encoder.encode(text));
                }
              }
            }

            // If we never found a <tr, dump whatever we have
            if (!headerParsed && buffer.trim()) {
              const cleaned = stripMarkdownFences(buffer.trim());
              controller.enqueue(encoder.encode(cleaned));
            }

            // Send FOOTER
            controller.enqueue(encoder.encode(TEMPLATE_FOOTER));
            controller.close();
            console.log(`[email-hub] stream done: ${chunks} chunks, ${Date.now() - t0}ms`);
          } catch (err) {
            console.error(`[email-hub] stream error:`, err);
            controller.enqueue(encoder.encode(
              `<tr><td style="padding:32px;text-align:center;"><p class="body-copy">Generation error. Please try again.</p></td></tr>`
            ));
            controller.enqueue(encoder.encode(TEMPLATE_FOOTER));
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: { ...cors, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" },
      });
    } catch (err: unknown) {
      console.error(`[email-hub] generate error:`, err);
      return json({ error: err instanceof Error ? err.message : "Generation failed" }, 500);
    }
  }

  if (action === "review-option") {
    const htmlToReview = body.html as string;
    if (!htmlToReview) return json({ error: "Missing html" }, 400);

    const reviewPrompt = `Review and fix this Signos email HTML. Check:
1. All cards have class="card" with border-radius:20px and padding:32px 24px
2. CTA buttons use the VML roundrect + btn-cerise pattern
3. Arrow bullets use the blue circle (background-color:#3b88ff;border-radius:50%) pattern
4. Images have width and style="display:block;width:100%;height:auto;"
5. Wave images have margin-top:-60px
6. Side-by-side sections use width:284px for both columns
7. No text overflow — padding uses fixed pixels, not percentages
8. All class names match the stylesheet (.h1, .h3, .card, .eyebrow, .body-copy, .body-sm, .btn-cerise, etc.)
9. Footer has bg-stone with background-color:#21263a
10. Proper spacing between sections (padding:0 16px 16px 16px or similar)

Return the COMPLETE fixed HTML. Output ONLY HTML — no commentary.

${htmlToReview}`;

    try {
      const stream = await client.messages.stream({
        model: "claude-sonnet-4-20250514",
        max_tokens: 16000,
        system: "You are an email HTML QA engineer for Signos. Fix structural/styling issues and return complete HTML. Output ONLY HTML.",
        messages: [{ role: "user", content: reviewPrompt }],
      });
      const encoder = new TextEncoder();
      let chunks = 0;
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const event of stream) {
              if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
                chunks++;
                controller.enqueue(encoder.encode(event.delta.text));
              }
            }
            console.log(`[email-hub] review done: ${chunks} chunks`);
            controller.close();
          } catch (err) {
            console.error(`[email-hub] review error:`, err);
            controller.close();
          }
        },
      });
      return new Response(readable, {
        headers: { ...cors, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" },
      });
    } catch (err: unknown) {
      return json({ error: err instanceof Error ? err.message : "Review failed" }, 500);
    }
  }

  if (action === "edit") {
    const editPrompt = `Current Signos email HTML:\n\n${body.currentHtml}\n\nEdits requested: ${body.editInstructions}\n\nApply the edits. Maintain ALL existing structure, CSS classes, header, and footer. Output ONLY the complete updated HTML.`;

    try {
      const stream = await client.messages.stream({
        model: "claude-sonnet-4-20250514",
        max_tokens: 16000,
        system: "You edit Signos email HTML. Preserve all structure, classes, and patterns. Output ONLY complete HTML.",
        messages: [{ role: "user", content: editPrompt }],
      });
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const event of stream) {
              if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
                controller.enqueue(encoder.encode(event.delta.text));
              }
            }
            controller.close();
          } catch { controller.close(); }
        },
      });
      return new Response(readable, {
        headers: { ...cors, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" },
      });
    } catch (err: unknown) {
      return json({ error: err instanceof Error ? err.message : "Edit failed" }, 500);
    }
  }

  return json({ error: "Unknown action" }, 400);
};
