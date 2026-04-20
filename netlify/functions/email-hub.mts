import type { Context } from "@netlify/functions";
import Anthropic from "@anthropic-ai/sdk";
import { sql, ensureTables } from "./lib/db.mjs";
import {
  IMAGE_POOL,
  pickImageSet,
  buildPresetPromptBlock,
  LAYOUT_PRESETS,
  PALETTE_PRESETS,
  TYPE_SCALE_PRESETS,
  resolveImageUrl as resolveImageUrlShared,
  type LayoutId,
  type PaletteId,
  type TypeScaleId,
  type ImageMood,
  type ImageSubject,
} from "./lib/email-design.mjs";
import { computeMissingClosers, truncateToLastCompleteTr, healContent, healContentStream, auditContent } from "./lib/email-structure.mjs";
import { parseFigmaUrl, exportFigmaNodes } from "./lib/figma-rest.mjs";
import { runDesignLinter, findingsToPromptText, extractBlocksFromContent } from "./lib/email-design-linter.mjs";

/* ═══════════════════════════════════════════════════════════════════
   TEMPLATE — based on iterable-nutrition reference emails
   Split into HEAD (immutable), CONTENT reference, FOOTER (immutable)
   ═══════════════════════════════════════════════════════════════════ */

const TEMPLATE_HEAD = `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes" />
    <meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="color-scheme" content="only light" />
    <meta name="supported-color-schemes" content="only light" />
    <title>{{TITLE}}</title>
    <!--[if mso]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
    <!--[if mso]><style>* { font-family: Arial, Helvetica, sans-serif !important; }</style><![endif]-->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62.5,600;62.5,700;75,600;75,700;100,400;100,500;100,600;100,700;125,600;125,700&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet" />
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62.5,600;62.5,700;75,600;75,700;100,400;100,500;100,600;100,700;125,600;125,700&family=JetBrains+Mono:wght@500;600&display=swap');
      @font-face { font-family:'Archivo'; font-style:normal; font-weight:400 700; font-stretch:62.5% 125%; font-display:swap; src:url(https://fonts.gstatic.com/s/archivo/v25/k3kQo8UDI-1M0wlSfdnoLmvDIaI.woff2) format('woff2'); }
      @font-face { font-family:'JetBrains Mono'; font-style:normal; font-weight:500 600; font-display:swap; src:url(https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbv2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKwBNntkaToggR7BYRbKPxDcwgknk-4.woff2) format('woff2'); }
      :root { color-scheme: only light; supported-color-schemes: only light; }
      body,table,td,p,a,li,blockquote { -webkit-text-size-adjust:100%;-ms-text-size-adjust:100%; }
      table,td { mso-table-lspace:0;mso-table-rspace:0; }
      img { -ms-interpolation-mode:bicubic;border:0;display:block;outline:none;text-decoration:none; }
      body { margin:0;padding:0;width:100%!important;min-width:100%;background-color:#f5f6f7;font-family:'Archivo',Arial,Helvetica,sans-serif;color:#21263a; }
      .wrapper { width:100%;background-color:#f5f6f7; }
      .container { width:600px;max-width:600px;margin:0 auto; }
      .bg-pebble { background-color:#f5f6f7!important; }
      .bg-gray { background-color:#e3e4e7!important; }
      .bg-white { background-color:#ffffff!important; }
      .bg-stone { background-color:#21263a!important; }
      .eyebrow { font-family:'JetBrains Mono','Courier New',monospace;font-weight:600;font-size:22px;line-height:1;text-transform:uppercase;color:#fd3576;margin:0; }
      .h1 { font-family:'Archivo',Arial,sans-serif;font-weight:600;font-size:30px;line-height:1.05;text-transform:uppercase;margin:0;color:#21263a;font-stretch:extra-condensed;font-variation-settings:'wdth' 62.5; }
      .h2 { font-family:'Archivo',Arial,sans-serif;font-weight:600;font-size:30px;line-height:1.1;text-transform:uppercase;margin:0;color:#fd3576;font-stretch:extra-condensed;font-variation-settings:'wdth' 62.5; }
      .h3 { font-family:'Archivo',Arial,sans-serif;font-weight:600;font-size:26px;line-height:1.2;margin:0;color:#fd3576;font-stretch:expanded;font-variation-settings:'wdth' 125; }
      .body-lg { font-family:'Archivo',Arial,sans-serif;font-weight:400;font-size:16px;line-height:24px;margin:0;color:#21263a; }
      .body-sm { font-family:'Archivo',Arial,sans-serif;font-weight:400;font-size:14px;line-height:1.6;margin:0;color:#21263a; }
      .list-title { font-family:'Archivo',Arial,sans-serif;font-weight:600;font-size:20px;line-height:1;text-transform:uppercase;margin:0;color:#21263a;font-stretch:extra-condensed;font-variation-settings:'wdth' 62.5; }
      .btn-cerise { display:inline-block;padding:16px 30px;border-radius:16px;font-family:'Archivo',Arial,sans-serif;font-weight:700;font-size:18px;line-height:normal;text-decoration:none;color:#ffffff!important;background-color:#fd3576;text-align:center;border:2px solid #ce0259;border-bottom:4px solid #ce0259;max-width:520px;box-sizing:border-box;font-stretch:expanded;font-variation-settings:'wdth' 125; }
      .product-heading { font-family:'Archivo',Arial,sans-serif;font-weight:700;font-stretch:extra-condensed;font-variation-settings:'wdth' 62.5; }
      .footer-copy { font-family:'Archivo',Arial,sans-serif;font-weight:500;font-size:10px;line-height:1.3;color:#f5f6f7;margin:0; }
      .footer-links { font-family:'Archivo',Arial,sans-serif;font-weight:700;font-size:14px;line-height:normal;text-transform:uppercase;color:#b5c3d6;font-stretch:condensed;font-variation-settings:'wdth' 75; }
      .ref-copy { font-family:'Archivo',Arial,sans-serif;font-weight:500;font-size:10px;line-height:1.3;color:#b5c3d6;margin:0; }
      .hex-light { display:block!important; }
      .hex-dark { display:none!important;max-height:0;overflow:hidden; }
      @media screen and (max-width:620px) {
        .container { width:100%!important;max-width:100%!important; }
        .px-m { padding-left:16px!important;padding-right:16px!important; }
        .h1 { font-size:26px!important; }
        .h2 { font-size:26px!important; }
        .h3 { font-size:24px!important; }
        .body-lg { font-size:15px!important;line-height:22px!important; }
        .body-sm { font-size:13px!important; }
        .eyebrow { font-size:20px!important; }
        .list-title { font-size:20px!important; }
        .btn-cerise { font-size:16px!important;padding:14px 24px!important; }
        .product-img { width:257px!important; }
        .product-heading { font-size:28px!important; }
        .footer-links { font-size:12px!important; }
      }
      /* Force-light strategy: meta tags + :root declaration above suppress dark-mode rendering on every client that respects standards. No @media (prefers-color-scheme: dark) block — iPhone 16 Pro Mail partial-inversion incident (2026-04-20) confirmed media-query dark CSS gets corrupted. Same decision applied to the menstrual-cycle emails. */
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:#f5f6f7;">
    <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">{{PREHEADER}}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

    <table class="wrapper" role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="background-color:#f5f6f7;">
      <tr><td align="center">
        <table class="container" role="presentation" border="0" cellspacing="0" cellpadding="0" width="600" style="width:600px;max-width:600px;margin:0 auto;">

          <!-- ===== HEADER ===== -->
          <tr>
            <td style="padding:25px 24px;background-color:#21263a;">
              <a href="https://www.signos.com" target="_blank" style="text-decoration:none;display:block;">
                <img src="https://funnel-ai-signos.netlify.app/email-assets/experiments/logo-header-dark-baked.png?v=5" width="135" height="40" alt="Signos" style="display:block;width:135px;height:auto;color:#f5f6f7;font-size:18px;font-weight:bold;" />
              </a>
            </td>
          </tr>

`;

const TEMPLATE_FOOTER = `
          <!-- ===== FOOTER ===== -->
          <tr>
            <td class="bg-stone" style="background-color:#21263a;padding:32px 32px 0 32px;">
              <a href="https://www.signos.com" target="_blank">
                <img src="https://funnel-ai-signos.netlify.app/email-assets/experiments/logo-footer-baked.png?v=5" width="150" height="45" alt="Signos" style="display:block;width:150px;height:auto;color:#f5f6f7;font-size:16px;font-weight:bold;" />
              </a>
            </td>
          </tr>
          <tr>
            <td class="bg-stone" style="background-color:#21263a;padding:36px 32px 0 32px;">
              <p class="footer-links" style="font-family:'Archivo',Arial,sans-serif;font-weight:700;font-size:14px;line-height:normal;text-transform:uppercase;color:#b5c3d6;margin:0;font-stretch:condensed;font-variation-settings:'wdth' 75;">
                <a href="https://www.signos.com/contact-us" target="_blank" style="color:#b5c3d6;text-decoration:none;">Contact</a>&nbsp;&nbsp;&nbsp;&nbsp;
                <a href="https://www.signos.com/science" target="_blank" style="color:#b5c3d6;text-decoration:none;">Science</a>&nbsp;&nbsp;&nbsp;&nbsp;
                <a href="https://www.signos.com/blog" target="_blank" style="color:#b5c3d6;text-decoration:none;">Blog</a>&nbsp;&nbsp;&nbsp;&nbsp;
                <a href="https://www.signos.com/about" target="_blank" style="color:#b5c3d6;text-decoration:none;">About Us</a>
              </p>
            </td>
          </tr>
          <tr>
            <td class="bg-stone" style="background-color:#21263a;padding:32px 32px 0 32px;">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0"><tr>
                <td style="padding-right:12px;"><a href="https://apps.apple.com/us/app/signos/id1534943157" target="_blank"><img src="https://funnel-ai-signos.netlify.app/email-assets/experiments/badge-app-store.png" width="120" height="40" alt="Download on the App Store" style="display:block;color:#b5c3d6;font-size:11px;" /></a></td>
                <td><a href="https://play.google.com/store/apps/details?id=com.signos.core" target="_blank"><img src="https://funnel-ai-signos.netlify.app/email-assets/experiments/badge-google-play.png" width="135" height="40" alt="Get it on Google Play" style="display:block;color:#b5c3d6;font-size:11px;" /></a></td>
              </tr></table>
            </td>
          </tr>
          <tr>
            <td class="bg-stone" style="background-color:#21263a;padding:24px 32px 0 32px;">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0"><tr>
                <td style="padding-right:24px;background-color:#21263a;"><a href="https://www.instagram.com/signoshealth/" target="_blank"><img src="https://funnel-ai-signos.netlify.app/email-assets/experiments/icon-instagram-white.png?v=5" width="22" height="22" alt="Instagram" style="display:block;" /></a></td>
                <td style="padding-right:24px;background-color:#21263a;"><a href="https://www.facebook.com/signoshealth/" target="_blank"><img src="https://funnel-ai-signos.netlify.app/email-assets/experiments/icon-facebook-white.png?v=5" width="22" height="22" alt="Facebook" style="display:block;" /></a></td>
                <td style="padding-right:24px;background-color:#21263a;"><a href="https://www.tiktok.com/@signoshealth" target="_blank"><img src="https://funnel-ai-signos.netlify.app/email-assets/experiments/icon-tiktok-white.png?v=5" width="22" height="22" alt="TikTok" style="display:block;" /></a></td>
                <td style="padding-right:24px;background-color:#21263a;"><a href="https://www.pinterest.com/signoshealth/" target="_blank"><img src="https://funnel-ai-signos.netlify.app/email-assets/experiments/icon-pinterest-white.png?v=5" width="22" height="22" alt="Pinterest" style="display:block;" /></a></td>
                <td style="padding-right:24px;background-color:#21263a;"><a href="https://www.x.com/signoshealth/" target="_blank"><img src="https://funnel-ai-signos.netlify.app/email-assets/experiments/icon-twitter-white.png?v=5" width="22" height="22" alt="X" style="display:block;" /></a></td>
                <td style="padding-right:24px;background-color:#21263a;"><a href="https://www.linkedin.com/company/signoshealth/" target="_blank"><img src="https://funnel-ai-signos.netlify.app/email-assets/experiments/icon-linkedin-white.png?v=5" width="22" height="22" alt="LinkedIn" style="display:block;" /></a></td>
                <td style="background-color:#21263a;"><a href="https://www.youtube.com/signoshealth" target="_blank"><img src="https://funnel-ai-signos.netlify.app/email-assets/experiments/icon-youtube-white.png?v=5" width="22" height="22" alt="YouTube" style="display:block;" /></a></td>
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

const CONTENT_SYSTEM = `You are a SENIOR EMAIL DESIGNER producing the CONTENT <tr> blocks for Signos marketing emails. You are building an art-directed email that a top-agency designer would be proud of. No DOCTYPE, html, head, style, header, or footer — those are pre-built.

DESIGN PHILOSOPHY (read this carefully):
- Every email you produce will be SEEN NEXT TO the last 20 emails Signos has sent. Your job is to make THIS email feel visually distinct from the last one. Sameness is the failure mode. Variety is the quality bar.
- You have a toolkit of modules and an image pool. You are NOT filling out a template — you are composing a layout. Treat the modules like a typographer treats a type catalog: select, don't stack.
- The user-selected DESIGN PRESET (below) is the primary lever. Respect it. Two emails with different presets should be INSTANTLY visually distinguishable at a glance. A reader should be able to squint at two thumbnails and say "these are different emails" without reading a word.

QUALITY BAR — what a 9/10 email looks like:
- Clear information hierarchy — one dominant message, supporting content organized beneath it
- Deliberate rhythm of color, imagery, and type — never a wall of similar blocks
- At least one unexpected design moment per email (an unusual opener, an oversized stat, a full-bleed pull quote, a comparison block)
- Type discipline matching the selected type scale
- Image choices that feel coherent — all images pulled from the preset's mood, never a random grab

CSS CLASSES (defined in head — use these):
.bg-pebble (#f5f6f7), .bg-gray (#e3e4e7), .bg-white (#ffffff), .bg-stone (#21263a)
.eyebrow — JetBrains Mono 22px cerise uppercase
.h1 — Archivo extra-condensed 30px navy uppercase (font-stretch:extra-condensed;font-variation-settings:'wdth' 62.5)
.h2 — Archivo extra-condensed 30px cerise uppercase
.h3 — Archivo expanded 26px cerise (font-stretch:expanded;font-variation-settings:'wdth' 125)
.body-lg — 16px/24px, .body-sm — 14px/1.6
.list-title — 20px extra-condensed uppercase navy
.btn-cerise — cerise button with border + bottom shadow, expanded font
.product-heading — bold extra-condensed
.px-m — mobile side padding helper (add to content tds)
.hex-light / .hex-dark — dark-mode wave image toggle

GUIDING PRINCIPLES (follow, but let the preset override specifics):
- Visual hierarchy matters more than structural completeness. One clear dominant headline > three medium-weight ones.
- Signal section changes with SOMETHING visual — a wave, a cerise band, a pull quote, a section image, a stat card. Never let two text blocks in different moods sit adjacent with no visual break.
- Never stack the same module type back-to-back (no three body paragraphs in a row, no three list-items without a visual break). If the copy needs to continue, switch modules.
- Rotate your opener moves across emails. Not every email needs a numbered section-intro unit. Sometimes a pull quote opens a section. Sometimes a stat. Sometimes a bicolor headline. The preset rhythm will tell you which.
- Every email should have at least one "design moment" that isn't just text — a cerise band, a stat card, a pull quote, a comparison, or a large typographic flourish. Pick ONE and make it land, don't scatter three.

WAVE TRANSITIONS (copy exactly — includes dark-mode variants):

A) Pebble → Gray:
<tr><td class="bg-pebble" style="background-color:#f5f6f7;padding:0;line-height:0;font-size:0;"><img class="hex-light" src="https://funnel-ai-signos.netlify.app/email-assets/nutrition/wave-pebble-to-gray.png?v=5" width="600" alt="" style="display:block;width:100%;height:auto;" /><!--[if !mso]><!--><img class="hex-dark" src="https://funnel-ai-signos.netlify.app/email-assets/nutrition/wave-pebble-to-gray-dark.png?v=5" width="600" alt="" style="display:none;max-height:0;overflow:hidden;width:100%;height:auto;" /><!--<![endif]--></td></tr>

B) Gray → Pebble:
<tr><td class="bg-gray" style="background-color:#e3e4e7;padding:0;line-height:0;font-size:0;"><img class="hex-light" src="https://funnel-ai-signos.netlify.app/email-assets/nutrition/wave-gray-to-pebble.png?v=5" width="600" alt="" style="display:block;width:100%;height:auto;" /><!--[if !mso]><!--><img class="hex-dark" src="https://funnel-ai-signos.netlify.app/email-assets/nutrition/wave-gray-to-pebble-dark.png?v=5" width="600" alt="" style="display:none;max-height:0;overflow:hidden;width:100%;height:auto;" /><!--<![endif]--></td></tr>

C) Pebble → White:
<tr><td class="bg-pebble" style="background-color:#f5f6f7;padding:0;line-height:0;font-size:0;"><img class="hex-light" src="https://funnel-ai-signos.netlify.app/email-assets/nutrition/wave-pebble-to-white.png?v=5" width="600" alt="" style="display:block;width:100%;height:auto;" /><!--[if !mso]><!--><img class="hex-dark" src="https://funnel-ai-signos.netlify.app/email-assets/nutrition/wave-pebble-to-white-dark.png?v=5" width="600" alt="" style="display:none;max-height:0;overflow:hidden;width:100%;height:auto;" /><!--<![endif]--></td></tr>

D) White → Pebble:
<tr><td class="bg-white" style="background-color:#ffffff;padding:0;line-height:0;font-size:0;"><img class="hex-light" src="https://funnel-ai-signos.netlify.app/email-assets/nutrition/wave-white-to-pebble.png?v=5" width="600" alt="" style="display:block;width:100%;height:auto;" /><!--[if !mso]><!--><img class="hex-dark" src="https://funnel-ai-signos.netlify.app/email-assets/nutrition/wave-white-to-pebble-dark.png?v=5" width="600" alt="" style="display:none;max-height:0;overflow:hidden;width:100%;height:auto;" /><!--<![endif]--></td></tr>

CONTENT MODULES (mix and match — only change text/URLs):

1) HERO IMAGE (single composed image — no stacked overlay, no wave inside hero td):
<tr><td class="bg-pebble" style="background-color:#f5f6f7;padding:0;line-height:0;font-size:0;"><img src="IMAGE_URL" width="600" alt="ALT" style="display:block;width:100%;height:auto;" /></td></tr>

2) EYEBROW + H1 HEADLINE + BODY-LG INTRO (on pebble):
<tr><td class="bg-pebble px-m" style="background-color:#f5f6f7;padding:16px 16px 8px 16px;"><p class="eyebrow" style="font-family:'JetBrains Mono','Courier New',monospace;font-weight:600;font-size:22px;line-height:1;text-transform:uppercase;color:#fd3576;margin:0;">EYEBROW</p></td></tr>
<tr><td class="bg-pebble px-m" style="background-color:#f5f6f7;padding:0 16px 16px 16px;"><p class="h1" style="font-family:'Archivo',Arial,sans-serif;font-weight:600;font-size:30px;line-height:1.05;text-transform:uppercase;margin:0;color:#21263a;font-stretch:extra-condensed;font-variation-settings:'wdth' 62.5;">HEADLINE</p></td></tr>
<tr><td class="bg-pebble px-m" style="background-color:#f5f6f7;padding:0 16px 24px 16px;"><p class="body-lg" style="font-family:'Archivo',Arial,sans-serif;font-weight:400;font-size:16px;line-height:24px;margin:0;color:#21263a;">INTRO PARAGRAPH</p></td></tr>

3) CTA BUTTON (on pebble — also works on white with bg-white):
<tr><td class="bg-pebble px-m" style="background-color:#f5f6f7;padding:0 16px 32px 16px;"><table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%"><tr><td align="center"><!--[if !mso]><!--><a href="URL" class="btn-cerise" style="display:inline-block;padding:16px 30px;border-radius:16px;font-family:'Archivo',Arial,sans-serif;font-weight:700;font-size:18px;line-height:normal;text-decoration:none;color:#ffffff;background-color:#fd3576;text-align:center;border:2px solid #ce0259;border-bottom:4px solid #ce0259;max-width:520px;box-sizing:border-box;width:100%;font-stretch:expanded;font-variation-settings:'wdth' 125;">CTA TEXT &rarr;</a><!--<![endif]--></td></tr></table></td></tr>

4) GRAY SECTION (h2 cerise heading + body text on gray background):
<tr><td class="bg-gray px-m" style="background-color:#e3e4e7;padding:32px 16px 0 16px;"><p class="h2" style="font-family:'Archivo',Arial,sans-serif;font-weight:600;font-size:30px;line-height:1.1;text-transform:uppercase;margin:0 0 16px 0;color:#fd3576;font-stretch:extra-condensed;font-variation-settings:'wdth' 62.5;">SECTION HEADING</p></td></tr>
<tr><td class="bg-gray px-m" style="background-color:#e3e4e7;padding:0 16px 32px 16px;"><p class="body-sm" style="font-family:'Archivo',Arial,sans-serif;font-weight:400;font-size:14px;line-height:1.5;margin:0 0 16px 0;color:#21263a;">PARAGRAPH 1</p><p class="body-sm" style="font-family:'Archivo',Arial,sans-serif;font-weight:400;font-size:14px;line-height:1.5;margin:0;color:#21263a;">PARAGRAPH 2</p></td></tr>

5) ROUNDED SECTION IMAGE (on pebble):
<tr><td class="bg-pebble px-m" style="background-color:#f5f6f7;padding:16px 32px 24px 32px;"><img src="IMAGE_URL" width="536" alt="ALT" style="display:block;width:100%;height:auto;border-radius:16px;" /></td></tr>

6) H3 SECTION HEADING (cerise expanded, on pebble):
<tr><td class="bg-pebble px-m" style="background-color:#f5f6f7;padding:0 32px 24px 32px;"><p class="h3" style="font-family:'Archivo',Arial,sans-serif;font-weight:600;font-size:26px;line-height:1.2;margin:0;color:#fd3576;font-stretch:expanded;font-variation-settings:'wdth' 125;">HEADING</p></td></tr>

7) NUMBERED LIST ITEM (icon bullet + title + body, on pebble):
<tr><td class="bg-pebble px-m" style="background-color:#f5f6f7;padding:0 32px 16px 32px;"><table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%"><tr><td width="32" valign="top" style="padding-right:16px;"><img src="https://funnel-ai-signos.netlify.app/email-assets/nutrition/numbered-button.png" width="32" height="32" alt="" style="display:block;" /></td><td valign="top"><p class="list-title" style="font-family:'Archivo',Arial,sans-serif;font-weight:600;font-size:20px;line-height:1;text-transform:uppercase;margin:0 0 6px 0;color:#21263a;font-stretch:extra-condensed;font-variation-settings:'wdth' 62.5;">ITEM TITLE</p><p class="body-sm" style="font-family:'Archivo',Arial,sans-serif;font-weight:400;font-size:14px;line-height:1.6;margin:0;color:#21263a;">ITEM BODY TEXT</p></td></tr></table></td></tr>

8) BICOLOR HEADING (two-tone uppercase, on pebble):
<tr><td class="bg-pebble px-m" style="background-color:#f5f6f7;padding:16px 16px 0 16px;"><p style="font-family:'Archivo',Arial,sans-serif;font-weight:600;font-size:28px;line-height:1;text-transform:uppercase;margin:0 0 16px 0;font-stretch:extra-condensed;font-variation-settings:'wdth' 62.5;"><span style="color:#21263a;">PART ONE </span><span style="color:#fd3576;">CERISE PART </span><span style="color:#21263a;">PART THREE</span></p></td></tr>

9) BODY TEXT BLOCK (on pebble):
<tr><td class="bg-pebble px-m" style="background-color:#f5f6f7;padding:0 16px 24px 16px;"><p class="body-sm" style="font-family:'Archivo',Arial,sans-serif;font-weight:400;font-size:14px;line-height:1.5;margin:0;color:#21263a;">PARAGRAPH</p></td></tr>

10) WHITE PRODUCT SECTION (centered heading + product image + body + CTA on white):
<tr><td class="bg-white px-m" style="background-color:#ffffff;padding:50px 24px 0 24px;"><p class="product-heading" style="font-family:'Archivo',Arial,sans-serif;font-weight:700;font-size:32px;line-height:1;text-transform:uppercase;margin:0;color:#21263a;text-align:center;font-stretch:extra-condensed;font-variation-settings:'wdth' 62.5;">PRODUCT HEADING LINE 1<br/>LINE 2</p></td></tr>
<tr><td class="bg-white" style="background-color:#ffffff;padding:17px 0;text-align:center;"><img class="product-img" src="https://funnel-ai-signos.netlify.app/email-assets/nutrition/product-desktop.png" width="346" alt="Signos CGM kit" style="display:inline-block;width:346px;height:auto;margin:0 auto;" /></td></tr>
<tr><td class="bg-white px-m" style="background-color:#ffffff;padding:0 24px 0 24px;"><p class="body-sm" style="font-family:'Archivo',Arial,sans-serif;font-weight:400;font-size:14px;line-height:1.6;margin:0;color:#21263a;">PRODUCT BODY</p></td></tr>

11) CERISE ACCENT BAND (bold color break — white text on cerise background, great for key insight or callout):
<tr><td style="background-color:#fd3576;padding:40px 24px;text-align:center;"><p style="font-family:'Archivo',Arial,sans-serif;font-weight:700;font-size:28px;line-height:1.1;text-transform:uppercase;margin:0 0 12px 0;color:#ffffff;font-stretch:extra-condensed;font-variation-settings:'wdth' 62.5;">BOLD CALLOUT HEADLINE</p><p style="font-family:'Archivo',Arial,sans-serif;font-weight:400;font-size:15px;line-height:1.5;margin:0;color:#ffffff;opacity:0.92;">Supporting sentence or key insight that stands out from the rest of the email.</p></td></tr>

12) STAT HIGHLIGHT CARD (large data point with label — use for key numbers/percentages, on pebble or gray):
<tr><td class="bg-pebble px-m" style="background-color:#f5f6f7;padding:24px 16px 24px 16px;"><table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top:4px solid #fd3576;padding-top:24px;"><tr><td style="text-align:center;"><p style="font-family:'Archivo',Arial,sans-serif;font-weight:700;font-size:52px;line-height:1;margin:0 0 8px 0;color:#fd3576;font-stretch:extra-condensed;font-variation-settings:'wdth' 62.5;">STAT</p><p style="font-family:'JetBrains Mono','Courier New',monospace;font-weight:600;font-size:13px;line-height:1.4;text-transform:uppercase;margin:0 0 12px 0;color:#21263a;letter-spacing:0.5px;">STAT LABEL</p><p style="font-family:'Archivo',Arial,sans-serif;font-weight:400;font-size:14px;line-height:1.5;margin:0;color:#21263a;">Context paragraph explaining what this stat means.</p></td></tr></table></td></tr>

13) SECTION-INTRO UNIT (eyebrow + heading + deck paragraph as a delineated intro to every new thematic section — use this to signal transitions and create clear hierarchy):
<tr><td class="bg-pebble px-m" style="background-color:#f5f6f7;padding:40px 24px 0 24px;"><table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td style="border-top:2px solid #21263a;padding-top:20px;"><p class="eyebrow" style="font-family:'JetBrains Mono','Courier New',monospace;font-weight:600;font-size:13px;line-height:1;text-transform:uppercase;color:#fd3576;margin:0 0 12px 0;letter-spacing:1.5px;">SECTION LABEL · 01</p><p class="h2" style="font-family:'Archivo',Arial,sans-serif;font-weight:700;font-size:32px;line-height:1.05;text-transform:uppercase;margin:0 0 12px 0;color:#21263a;font-stretch:extra-condensed;font-variation-settings:'wdth' 62.5;">SECTION HEADLINE HERE</p><p style="font-family:'Archivo',Arial,sans-serif;font-weight:400;font-size:16px;line-height:1.55;margin:0;color:#4a5068;">One-sentence deck that frames this section and sets up what follows.</p></td></tr></table></td></tr>

14) PULL QUOTE (editorial quote with big cerise quote mark, attribution — use for testimonials, expert quotes, or dramatic emphasis):
<tr><td class="bg-white px-m" style="background-color:#ffffff;padding:40px 32px;"><table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td><p style="font-family:'Archivo',Arial,sans-serif;font-weight:700;font-size:64px;line-height:1;margin:0;color:#fd3576;font-stretch:extra-condensed;font-variation-settings:'wdth' 62.5;">&ldquo;</p><p style="font-family:'Archivo',Arial,sans-serif;font-weight:500;font-size:22px;line-height:1.35;margin:0 0 16px 0;color:#21263a;font-style:italic;">Quote text goes here — keep it under 25 words for impact.</p><p style="font-family:'JetBrains Mono','Courier New',monospace;font-weight:600;font-size:12px;line-height:1;text-transform:uppercase;color:#4a5068;margin:0;letter-spacing:1.2px;">— Attribution Name, Title</p></td></tr></table></td></tr>

15) SECTION DIVIDER (subtle thin rule for intra-section breaks when a full wave is too heavy, on pebble):
<tr><td class="bg-pebble px-m" style="background-color:#f5f6f7;padding:8px 24px 24px 24px;"><table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td style="border-top:1px solid #d9dadf;height:1px;font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>

16) TWO-COLUMN COMPARISON (side-by-side contrast block — use to juxtapose "before/after", "old way/new way", "member/non-member"):
<tr><td class="bg-gray px-m" style="background-color:#e3e4e7;padding:32px 16px;"><table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td valign="top" width="50%" style="padding-right:8px;"><p style="font-family:'JetBrains Mono','Courier New',monospace;font-weight:600;font-size:11px;line-height:1;text-transform:uppercase;color:#4a5068;margin:0 0 8px 0;letter-spacing:1.2px;">LEFT LABEL</p><p style="font-family:'Archivo',Arial,sans-serif;font-weight:600;font-size:22px;line-height:1.1;margin:0 0 8px 0;color:#21263a;font-stretch:extra-condensed;font-variation-settings:'wdth' 62.5;">LEFT HEADLINE</p><p style="font-family:'Archivo',Arial,sans-serif;font-weight:400;font-size:13px;line-height:1.5;margin:0;color:#21263a;">Left column supporting text.</p></td><td valign="top" width="50%" style="padding-left:8px;border-left:2px solid #fd3576;padding-left:16px;"><p style="font-family:'JetBrains Mono','Courier New',monospace;font-weight:600;font-size:11px;line-height:1;text-transform:uppercase;color:#fd3576;margin:0 0 8px 0;letter-spacing:1.2px;">RIGHT LABEL</p><p style="font-family:'Archivo',Arial,sans-serif;font-weight:600;font-size:22px;line-height:1.1;margin:0 0 8px 0;color:#21263a;font-stretch:extra-condensed;font-variation-settings:'wdth' 62.5;">RIGHT HEADLINE</p><p style="font-family:'Archivo',Arial,sans-serif;font-weight:400;font-size:13px;line-height:1.5;margin:0;color:#21263a;">Right column supporting text.</p></td></tr></table></td></tr>

IMAGE POOL (when the user's design preset narrows the mood, the generator will pass you a pre-filtered shortlist; otherwise use this full pool):

{{IMAGE_POOL_LIST}}

Pick images that match BOTH the email topic and the preset mood. Don't drop a warm lifestyle food photo into a clinical/cool preset.

OUTPUT RULES:

IMAGE STRATEGY:
- Use the image count specified by your preset. Do NOT default to "exactly 3 images" — preset rules.
- Pick images whose mood matches the preset mood hint. If the preset is "cool/clinical", do not drop in a warm-food lifestyle photo.
- The HERO image always opens the email (module 1). Remaining images: module 5 (rounded section image) or module 10 (product section) placed where narrative pacing wants a visual beat.
- Never reuse the same image twice in one email.

STRUCTURE GUIDANCE (adapt to the preset, don't force the three-act template on every email):
- Editorial preset: 2-3 long sections, open with a section-intro OR an editorial pull quote, one big moment in the middle, CTA at the close.
- Newsletter preset: 3-5 equal-weight sections, each with its own section-intro + short body + CTA. Shorter sections, more of them.
- Announcement preset: ONE focus. Hero + oversized headline + cerise band + one CTA. Keep it tight.
- Digest preset: small hero, then a stack of short numbered list items with one mid-point visual break.
- Across ALL presets: never more than 2 same-background modules in a row without a wave or accent break.

EDITORIAL CRAFT — every email needs these elements but not all of them:
- At least ONE editorial moment from this menu: pull-quote (module 14), cerise-band (module 11), stat-highlight (module 12), or bicolor-heading (module 8). Pick the one that matches the preset and the story.
- Eyebrow labels should be SPECIFIC ("WHAT THE DATA SHOWS", "A NEW APPROACH") — not generic ("READ MORE", "SECTION TWO"). Numbering ("· 01", "· 02") is OPTIONAL, used only when structural navigation helps.
- Deck paragraphs: 10-18 words. Sharp, declarative, preview what's coming.
- Headings: 3-7 words, uppercase, punchy.
- CTA count = layout-dependent: announcement uses 1, editorial uses 2, newsletter/digest use 2-3.

STRUCTURE:
- Use as many <tr> blocks as the layout needs — editorial 12-20, newsletter 18-28, announcement 8-14, digest 15-22. Never truncate.
- Inline all critical styles on elements (classes alone may not render in all clients).
- Output only valid <tr> blocks — no markdown fences, no doctype.`;

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

  /* heal-html: client calls this after streaming completes to produce a
     structurally-sound HTML blob for saving/patching. Extracts the content
     region between the ===== CONTENT ===== / ===== FOOTER ===== markers
     and runs healContent() on it. Returns { healed, audit, before, after }. */
  if (action === "heal-html") {
    const html = (body.html as string) || "";
    if (!html) return json({ error: "No html provided" }, 400);

    const startMark = "<!-- ===== CONTENT =====";
    const endMark = "<!-- ===== FOOTER =====";
    const startIdx = html.indexOf(startMark);
    const endIdx = html.indexOf(endMark);
    if (startIdx < 0 || endIdx < 0 || endIdx < startIdx) {
      // No markers — treat whole body as content-ish; run audit only.
      const before = auditContent(html);
      return json({ healed: html, before, after: before, healedBlocks: 0, note: "no content markers; returned as-is" });
    }
    const contentStart = html.indexOf("\n", startIdx) + 1;
    const contentEnd = endIdx;
    const content = html.slice(contentStart, contentEnd);
    // Use the stream-style healer, which can insert closers BETWEEN blocks.
    const before = auditContent(content);
    const stream = healContentStream(content);
    const after = auditContent(stream.healed);
    const healed = html.slice(0, contentStart) + stream.healed + html.slice(contentEnd);
    return json({
      healed,
      before,
      after,
      healedBlocks: stream.blocksRepaired,
      healEvents: stream.events,
      topLevelTrCount: stream.topLevelTrCount,
    });
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
  const client = new Anthropic({
    apiKey,
    defaultHeaders: { "anthropic-beta": "output-128k-2025-02-19" },
  });

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

    /* ── Design presets (B) — optional. If user didn't choose, pick
       reasonable defaults so emails still get variety. ──
       Also rotate the default layout based on variationId so the two
       generated options in a pair look DIFFERENT from each other. ── */
    const DEFAULT_LAYOUT_ROTATION: LayoutId[] = ["editorial", "newsletter", "announcement", "digest"];
    const rotationIdx = variationId === "b" ? 1 : variationId === "c" ? 2 : 0;

    const rawLayout = (body.layout as string) || "";
    const rawPalette = (body.palette as string) || "";
    const rawTypeScale = (body.typeScale as string) || "";

    const layout: LayoutId = (LAYOUT_PRESETS[rawLayout as LayoutId] ? rawLayout : DEFAULT_LAYOUT_ROTATION[rotationIdx]) as LayoutId;
    const palette: PaletteId = (PALETTE_PRESETS[rawPalette as PaletteId] ? rawPalette : "cerise") as PaletteId;
    const typeScale: TypeScaleId = (TYPE_SCALE_PRESETS[rawTypeScale as TypeScaleId] ? rawTypeScale : "editorial") as TypeScaleId;
    const layoutPreset = LAYOUT_PRESETS[layout];

    /* ── A: pick images matched to preset mood ──
       The visualTheme input can also narrow subject; we map it. ── */
    const visualThemeToSubject: Record<string, ImageSubject[]> = {
      "female-focused": ["people", "lifestyle"],
      "male-focused": ["fitness", "people"],
      "clinical": ["device", "abstract"],
      "lifestyle": ["lifestyle", "food"],
      "food-nutrition": ["food"],
      "fitness-active": ["fitness"],
      "warm-community": ["people", "lifestyle"],
    };
    const subjectHints = visualThemeToSubject[visualTheme] || [];
    const shortlist = pickImageSet({
      moods: layoutPreset.moodHints,
      subjectHints,
      count: Math.max(layoutPreset.imageCount, 4) + 2, // give Claude a few extra to pick from
    });
    const imagePoolList = shortlist
      .map((i) => `- ${i.key} → ${i.url}  (${i.role}, moods: ${i.moods.join("/")}, subject: ${i.subjects.join("/")}, alt: ${i.alt})`)
      .join("\n");

    const presetBlock = buildPresetPromptBlock({ layout, palette, typeScale });

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

    const prompt = `Generate the CONTENT <tr> BLOCKS for a Signos email. The design preset has been injected into your system prompt — respect it.

TOPIC: ${theme}
DETAILS: ${details}
${audienceInstructions}
TONE: ${tone}${creativeBlock}${contextBlock}

RESOLVED DESIGN CHOICES:
- Layout: ${LAYOUT_PRESETS[layout].label} (${LAYOUT_PRESETS[layout].description})
- Palette: ${PALETTE_PRESETS[palette].label} — accent ${PALETTE_PRESETS[palette].accentHex}
- Type Scale: ${TYPE_SCALE_PRESETS[typeScale].label}
- Target image count: ${layoutPreset.imageCount}
- Section count guidance: ${layoutPreset.sectionCount}

WHAT TO PRODUCE:
${layoutPreset.rhythm}

IMAGE SET (pre-selected to match the preset mood — use these; do NOT reach outside this list):
${imagePoolList}

CONSTRAINTS (binding):
- Use ${layoutPreset.imageCount} images (±1 OK). Hero first, others where narrative pacing wants a visual beat.
- Use the palette accent color (${PALETTE_PRESETS[palette].accentHex}) for buttons/eyebrows/accent bands. Don't mix accent colors.
- Follow the type scale (${TYPE_SCALE_PRESETS[typeScale].label}) for heading sizes.
- At least ONE editorial moment (pull-quote, cerise-band, stat-highlight, or bicolor-heading) — choose the one that fits this layout and story.
- Never more than 2 same-background modules in a row without a wave or accent break.
- Headings 3-7 words, uppercase, punchy. Decks 10-18 words.
- Follow module HTML patterns exactly — only change text/image URLs/content details.
${contentFidelity === "exact" && contextDocuments.trim() ? "- IMPORTANT: Follow the uploaded source content's structure and key messaging closely — preserve section order, key phrases, and flow while adapting to premium email design.\n" : ""}
MAKE THIS EMAIL FEEL DIFFERENT FROM THE LAST FEW SIGNOS EMAILS. Different opener. Different section pattern. Different editorial moment. If every Signos email opens with a numbered section-intro on pebble, do something else — bicolor headline, big pull quote, oversized stat. Variety is the point.

Output a PREHEADER line first (prefixed "PREHEADER: "), then ONLY raw <tr>...</tr> blocks. No markdown fences, no DOCTYPE, no wrapping.`;

    console.log(`[email-hub] generate-option var=${variationId} audience=${audience} theme=${theme}`);

    try {
      const t0 = Date.now();
      const OPTION_MAX_TOKENS = 24000;
      const OPTION_MAX_CONT = 5;

      const encoder = new TextEncoder();

      const readable = new ReadableStream({
        async start(controller) {
          try {
            const headHtml = TEMPLATE_HEAD
              .replace("{{PREHEADER}}", theme.slice(0, 80))
              .replace("{{TITLE}}", theme || "Signos Email");
            controller.enqueue(encoder.encode(headHtml));

            let fullOutput = "";
            let headerParsed = false;
            let totalChunks = 0;

            const streamChunk = async (s: ReturnType<typeof client.messages.stream>) => {
              for await (const event of s) {
                if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
                  totalChunks++;
                  const text = event.delta.text;
                  fullOutput += text;
                  if (!headerParsed) {
                    const trIdx = fullOutput.indexOf("<tr");
                    if (trIdx >= 0) { headerParsed = true; controller.enqueue(encoder.encode(fullOutput.slice(trIdx))); }
                  } else {
                    controller.enqueue(encoder.encode(text));
                  }
                }
              }
              return s.finalMessage();
            };

            // Inject preset prompt block + filtered image shortlist into system prompt.
            const systemPrompt = CONTENT_SYSTEM
              .replace("{{IMAGE_POOL_LIST}}", imagePoolList || "(no images available)")
              + "\n\n" + presetBlock;

            let finalMsg = await streamChunk(client.messages.stream({
              model: "claude-sonnet-4-20250514",
              max_tokens: OPTION_MAX_TOKENS,
              system: systemPrompt,
              messages: [{ role: "user", content: prompt }],
            }));

            let conts = 0;
            while (finalMsg.stop_reason === "max_tokens" && conts < OPTION_MAX_CONT) {
              conts++;
              console.log(`[email-hub] option continuation ${conts}...`);
              finalMsg = await streamChunk(client.messages.stream({
                model: "claude-sonnet-4-20250514",
                max_tokens: OPTION_MAX_TOKENS,
                system: "Continue generating the Signos email HTML <tr> blocks. Pick up EXACTLY where you stopped. Output ONLY <tr> blocks.",
                messages: [{ role: "user", content: prompt }, { role: "assistant", content: fullOutput }],
              }));
            }

            if (!headerParsed && fullOutput.trim()) {
              controller.enqueue(encoder.encode(stripMarkdownFences(fullOutput.trim())));
            }

            // STREAM TERMINATION GUARD: if Claude stopped mid-tag (e.g.
            // `<p class="eyebrow" style="font-family:'` — which happened
            // on the 2026-04-20 Peptides email), the browser's HTML parser
            // will consume the rest of the page as attribute content and
            // the footer never renders. Detect trailing `<` without a
            // matching `>` and emit a browser-safe recovery so the footer
            // always gets through.
            const tailLt = fullOutput.lastIndexOf("<");
            const tailGt = fullOutput.lastIndexOf(">");
            if (tailLt > tailGt) {
              console.warn(`[email-hub] stream cut mid-tag at offset ${tailLt}; emitting recovery closers`);
              // Close any dangling attribute quote (single OR double) and the
              // open angle bracket, then close likely-open p/td/tr tags.
              controller.enqueue(encoder.encode("'\">"));
              controller.enqueue(encoder.encode("</p></td></tr>"));
            }

            // Smart stream-end closer: count unbalanced tags in the
            // accumulated stream and emit the exact closing tags needed.
            // Replaces the old hardcoded "</p></td></tr></table></td></tr>"
            // which was wrong for most block types.
            // truncateToLastCompleteTr strips any trailing partial <tr>
            // block so the balance-counter doesn't see the broken fragment.
            const cleanedOutput = truncateToLastCompleteTr(fullOutput);
            const missingClosers = computeMissingClosers(cleanedOutput);
            if (missingClosers) {
              controller.enqueue(encoder.encode(missingClosers));
            }

            controller.enqueue(encoder.encode(TEMPLATE_FOOTER));
            controller.close();
            console.log(`[email-hub] stream done: ${totalChunks} chunks, ${conts} conts, ${Date.now() - t0}ms`);
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

  /* ────────────────── generate-from-figma ──────────────────
   * Build an email from Figma design links + user-uploaded reference images
   * with notes. Renders each Figma node via the REST API as a PNG, sends
   * the images + notes + instructions to Claude as multi-modal input, and
   * streams HTML that uses the menstrual-cycle email as a structural base
   * (per user's "go-forward template" direction).
   *
   * Auto-saves the result as a draft (stable id from concept+timestamp) so
   * users see it in Saved Emails immediately after generation completes.
   *
   * Input:
   *   {
   *     figmaUrls: string[],           // Figma share URLs (any of /design /file /board /make)
   *     uploadedImages: Array<{
   *       dataUrl: string,             // "data:image/png;base64,..." (<5MB each)
   *       note: string,                // where/how to use this image
   *       filename?: string
   *     }>,
   *     instructions: string,          // free-form user instructions
   *     concept: string,               // email concept / short title
   *     audience: "members"|"leads"|"both",
   *     draftId?: string               // optional stable draft id (else autogen)
   *   }
   */
  if (action === "generate-from-figma") {
    const figmaUrls = (body.figmaUrls as string[]) || [];
    const uploadedImages = (body.uploadedImages as Array<{ dataUrl: string; note: string; filename?: string }>) || [];
    const instructions = ((body.instructions as string) || "").trim();
    const concept = ((body.concept as string) || "Email from Figma").trim();
    const audience = (body.audience as string) || "both";
    const providedDraftId = (body.draftId as string) || "";

    if (!figmaUrls.length && !uploadedImages.length && !instructions) {
      return json({ error: "Need at least one Figma URL, uploaded image, or instructions" }, 400);
    }

    // Parse Figma URLs. Invalid URLs are reported but don't abort.
    const parsed = figmaUrls
      .map((u) => ({ raw: u, parsed: parseFigmaUrl(u) }))
      .filter((p) => p.parsed !== null) as { raw: string; parsed: NonNullable<ReturnType<typeof parseFigmaUrl>> }[];
    const invalidUrls = figmaUrls.length - parsed.length;

    // Fetch renders for each Figma node. Requires FIGMA_ACCESS_TOKEN.
    // If token missing, we still proceed — Claude gets URLs as text context
    // and uploaded images as the only visual reference.
    const figmaToken = process.env.FIGMA_ACCESS_TOKEN || "";
    type FigmaRender = { url: string; fileKey: string; nodeId: string | null; imageBase64: string };
    const renders: FigmaRender[] = [];
    if (figmaToken && parsed.length) {
      // Group by fileKey so we can batch per-file
      const byFile = new Map<string, string[]>();
      for (const p of parsed) {
        if (!p.parsed.nodeId) continue; // need a specific node to render
        const arr = byFile.get(p.parsed.fileKey) || [];
        arr.push(p.parsed.nodeId);
        byFile.set(p.parsed.fileKey, arr);
      }
      for (const [fileKey, nodeIds] of byFile) {
        try {
          const exported = await exportFigmaNodes(figmaToken, fileKey, nodeIds, 2);
          for (const e of exported) {
            const originalUrl = parsed.find((p) => p.parsed.fileKey === fileKey && p.parsed.nodeId === e.nodeId)?.raw || "";
            renders.push({ url: originalUrl, fileKey, nodeId: e.nodeId, imageBase64: e.imageBase64 });
          }
        } catch (err) {
          console.warn(`[email-hub] figma export failed for ${fileKey}:`, err);
        }
      }
    }

    console.log(`[email-hub] generate-from-figma: ${figmaUrls.length} urls (${parsed.length} valid), ${renders.length} renders, ${uploadedImages.length} uploads, invalid=${invalidUrls}`);

    /* System prompt: pin Claude to the menstrual-cycle email structure but
     * tell it to adapt copy + colors to the user's topic + Figma designs. */
    const systemPrompt = `You are a SENIOR EMAIL DESIGNER producing a Signos marketing email.

BASE TEMPLATE: Model the structure on the Signos menstrual-cycle email (live at https://funnel-ai-signos.netlify.app/email-hub/?draft=ehd_cycle_members). Its anatomy:
  1. Dark-navy header with Signos logo
  2. Full-width hero image (600×408)
  3. H1 + intro paragraph + primary CTA on pebble bg (#f5f6f7)
  4. Transition wave band (pebble → pebble-alt gray #e3e4e7)
  5. Large H2 intro headline — 56px Archivo Extra Condensed SemiBold, all caps (lh 1)
  6. Phase rail image (600×149) with hex-cut + phase icon
  7. H2 phase title + H2-sub subtitle (color-themed per phase) + body paragraphs with numbered citations
  8. Transition wave band
  9. Polygon-cut "How to" card image (568 CSS wide), H3 eyebrow, H3-main colored phase title, body bullets
  Repeat rail → title → body → wave → card for each of 3 themed sections.
  10. Bottom hero image
  11. Final CTA section (H1-accent + H1-cta-alt + body + CTA button)
  12. References list in dark-navy footer
  13. Standard Signos footer (logo, links, social, app badges, disclaimer)

CSS CLASSES AVAILABLE (already in the <head>): .h1, .h1-accent, .h1-cta-alt, .h2-intro, .h2, .h2-sub-follicular, .h2-sub-ovulatory, .h2-sub-luteal, .h3-eyebrow, .h3-main-follicular, .h3-main-ovulatory, .h3-main-luteal, .body-lg, .body-bold-follicular, .body-bold-ovulatory, .body-bold-luteal, .body-bold-cerise, .btn-cerise, .ref-copy, .footer-copy, .footer-links, .bg-pebble (#f5f6f7), .bg-gray (#e3e4e7), .bg-stone (#21263a).

COLOR THEMES (reuse for the 3 sections — the user's topic may not be "cycle"; substitute section meaning):
  - Section 1 theme: stone-light #8097b5 (h2-sub) + stone-med #465b7a (h3-main + body-bold) — "beginning / foundational" feel
  - Section 2 theme: sky #3b88ff — "peak / energetic" feel
  - Section 3 theme: gold pitch #6b4700 — "integration / maintenance" feel

OUTPUT RULES:
  - Output ONLY the email <tr> content blocks (no <!doctype>, no <head>, no <style>, no <body>, no footer). The head + footer are prepended/appended by the pipeline.
  - Use the reference images (Figma renders + user uploads below) as the visual source of truth for layout, hierarchy, imagery, and overall feel.
  - Respect the user's image-placement notes: if a note says "this goes in the top hero", use that image as the hero.
  - Pull image URLs from the attached references by saying [USE REFERENCE IMAGE #N for hero] inline; the pipeline will substitute.
  - Headings 3-7 words, uppercase for h1/h2/h3, body-lg 18px, body-bold-* 18px bold colored for emphasis.
  - Always produce all 3 themed sections, a bottom hero, a final CTA, and a references list (even if numbered bullets only). Never skip the references — they're a Signos signature element.
  - Citations in body: use <sup style="font-size:11px;line-height:0;vertical-align:super;position:relative;top:-0.1em;">N</sup>
  - CTA URLs: use https://www.signos.com/mobileapp/home for members, /plans for leads, fallback /.

EMAIL ASSETS (preload these URLs for band + rail + card imagery):
  - Wave band pebble→gray: https://funnel-ai-signos.netlify.app/email-assets/menstrual-cycle/band-light-to-alt.png?v=3 (600×60)
  - Wave band gray→pebble: https://funnel-ai-signos.netlify.app/email-assets/menstrual-cycle/band-alt-to-light.png?v=3 (600×60)
  - Rail images with phase icons: rail-follicular.png (seedling, blue-gray), rail-ovulatory.png (lightning, blue), rail-luteal.png (waves, amber) — all 600×149 at /email-assets/menstrual-cycle/rail-*.png?v=3
  - How-to card images: card-follicular/ovulatory/luteal.jpg at /email-assets/menstrual-cycle/ (568 CSS wide)

Produce the email now. Output raw <tr> blocks only.`;

    // Build multi-modal user message content blocks.
    // Order matters for Claude: reference images first (with labels), then text instructions.
    const content: Array<
      { type: "text"; text: string } |
      { type: "image"; source: { type: "base64"; media_type: "image/png" | "image/jpeg" | "image/webp" | "image/gif"; data: string } }
    > = [];

    // Figma renders
    renders.forEach((r, i) => {
      if (r.imageBase64) {
        content.push({
          type: "text",
          text: `FIGMA REFERENCE #${i + 1} — ${r.url} (fileKey=${r.fileKey}, node=${r.nodeId}):`,
        });
        content.push({
          type: "image",
          source: { type: "base64", media_type: "image/png", data: r.imageBase64 },
        });
      }
    });

    // User-uploaded images with notes
    uploadedImages.forEach((img, i) => {
      // dataUrl format: "data:image/png;base64,XXXX"
      const match = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(img.dataUrl || "");
      if (!match) return;
      const mediaType = match[1];
      const data = match[2];
      // Claude only accepts specific media types; narrow to supported set
      const safeType: "image/png" | "image/jpeg" | "image/webp" | "image/gif" =
        mediaType === "image/jpeg" ? "image/jpeg"
        : mediaType === "image/webp" ? "image/webp"
        : mediaType === "image/gif" ? "image/gif"
        : "image/png";
      const idx = renders.length + i + 1;
      content.push({
        type: "text",
        text: `UPLOADED IMAGE #${idx}${img.filename ? ` (${img.filename})` : ""} — USAGE NOTE: ${img.note || "(no note provided)"}`,
      });
      content.push({ type: "image", source: { type: "base64", media_type: safeType, data } });
    });

    // Unrendered Figma URLs as text-only context (token missing or render failed)
    const unrenderedUrls = figmaUrls.filter((u) => !renders.some((r) => r.url === u));
    if (unrenderedUrls.length) {
      content.push({
        type: "text",
        text: `REFERENCE FIGMA URLS (not rendered${figmaToken ? "" : "; FIGMA_ACCESS_TOKEN not configured"}):\n${unrenderedUrls.map((u) => `  - ${u}`).join("\n")}`,
      });
    }

    // Main instructions block
    content.push({
      type: "text",
      text: `EMAIL CONCEPT: ${concept}\nAUDIENCE: ${audience}\n\nINSTRUCTIONS:\n${instructions || "(no additional instructions — use the references as source of truth)"}\n\nProduce the complete email body as <tr> blocks now. Match the cycle template structure. Adapt all copy to this topic.`,
    });

    // Stable draft id (either provided or derived)
    const now = Date.now();
    const draftId = providedDraftId || `ehd_figma_${now}_${Math.random().toString(36).slice(2, 8)}`;

    try {
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          let fullOutput = "";
          let totalChunks = 0;

          try {
            // Prepend the same TEMPLATE_HEAD used by generate-option so the
            // output is a complete standalone email with cycle-matching CSS.
            const headHtml = TEMPLATE_HEAD
              .replace("{{PREHEADER}}", concept.slice(0, 80))
              .replace("{{TITLE}}", concept || "Signos Email");
            controller.enqueue(encoder.encode(headHtml));

            const FIGMA_MAX_TOKENS = 24000;
            const FIGMA_MAX_CONT = 5;

            const streamChunk = async (s: ReturnType<typeof client.messages.stream>) => {
              let headerParsed = false;
              for await (const event of s) {
                if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
                  totalChunks++;
                  const text = event.delta.text;
                  fullOutput += text;
                  if (!headerParsed) {
                    const trIdx = fullOutput.indexOf("<tr");
                    if (trIdx >= 0) {
                      headerParsed = true;
                      controller.enqueue(encoder.encode(fullOutput.slice(trIdx)));
                    }
                  } else {
                    controller.enqueue(encoder.encode(text));
                  }
                }
              }
              return s.finalMessage();
            };

            let finalMsg = await streamChunk(client.messages.stream({
              model: "claude-sonnet-4-20250514",
              max_tokens: FIGMA_MAX_TOKENS,
              system: systemPrompt,
              messages: [{ role: "user", content }],
            }));

            let conts = 0;
            while (finalMsg.stop_reason === "max_tokens" && conts < FIGMA_MAX_CONT) {
              conts++;
              console.log(`[email-hub] figma generation continuation ${conts}/${FIGMA_MAX_CONT}`);
              finalMsg = await streamChunk(client.messages.stream({
                model: "claude-sonnet-4-20250514",
                max_tokens: FIGMA_MAX_TOKENS,
                system: "Continue generating the Signos email HTML <tr> blocks EXACTLY where you stopped. Output ONLY <tr> blocks.",
                messages: [
                  { role: "user", content },
                  { role: "assistant", content: fullOutput },
                ],
              }));
            }

            // Truncation guard — same recovery pattern as generate-option
            const tailLt = fullOutput.lastIndexOf("<");
            const tailGt = fullOutput.lastIndexOf(">");
            if (tailLt > tailGt) {
              console.warn(`[email-hub] figma stream cut mid-tag at ${tailLt}; emitting recovery`);
              controller.enqueue(encoder.encode("'\">"));
              controller.enqueue(encoder.encode("</p></td></tr>"));
            }
            const cleanedOutput = truncateToLastCompleteTr(fullOutput);
            const missingClosers = computeMissingClosers(cleanedOutput);
            if (missingClosers) controller.enqueue(encoder.encode(missingClosers));

            // Append TEMPLATE_FOOTER so the doc closes with </body></html>
            controller.enqueue(encoder.encode(TEMPLATE_FOOTER));

            // Auto-save as a draft so it appears in Saved Emails immediately.
            // We re-assemble the full HTML by concatenating head + cleaned
            // content + closers + footer (same order we just streamed).
            const fullHtml =
              headHtml +
              cleanedOutput +
              (missingClosers || "") +
              TEMPLATE_FOOTER;
            await ensureTables();
            const db = sql();
            await db/* sql */`
              INSERT INTO email_hub_drafts
                (id, title, theme, details, audience, html, created_at, updated_at)
              VALUES
                (${draftId}, ${concept || "Email from Figma"}, ${concept || ""},
                 ${instructions || ""}, ${audience}, ${fullHtml}, ${now}, ${now})
              ON CONFLICT (id) DO UPDATE SET
                title = EXCLUDED.title,
                theme = EXCLUDED.theme,
                details = EXCLUDED.details,
                audience = EXCLUDED.audience,
                html = EXCLUDED.html,
                updated_at = EXCLUDED.updated_at
            `;
            console.log(`[email-hub] figma generation done: ${totalChunks} chunks, ${conts} conts, ${fullHtml.length} bytes, saved as ${draftId}`);

            // Emit a trailing HTML comment the client can parse for the draft id
            controller.enqueue(encoder.encode(`\n<!-- EMAIL_HUB_DRAFT_ID: ${draftId} -->\n`));
            controller.close();
          } catch (streamErr) {
            console.error(`[email-hub] figma generation stream error:`, streamErr);
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          ...cors,
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-cache",
          "X-Email-Hub-Draft-Id": draftId,
        },
      });
    } catch (err: unknown) {
      console.error(`[email-hub] generate-from-figma error:`, err);
      return json({ error: err instanceof Error ? err.message : "Figma generation failed" }, 500);
    }
  }

  if (action === "generate-direct-copy") {
    const theme = (body.theme as string) || "Email";
    const sourceText = (body.sourceText as string) || "";
    const details = (body.details as string) || "";

    if (!sourceText.trim()) return json({ error: "No source text provided" }, 400);

    /* ── Markup-to-HTML converter ──
       The model outputs compact shorthand; this converts to full Signos HTML.
       This cuts model output by ~70%, avoiding the Netlify function timeout.
       Image pool + resolver live in lib/email-design.mts (see IMAGE_POOL). */
    const bgColors: Record<string, string> = { pebble: "#f5f6f7", gray: "#e3e4e7", white: "#ffffff" };
    const resolveImageUrl = resolveImageUrlShared;

    const waveHtml = (from: string, to: string) => {
      const bgClass = `bg-${from}`;
      const bgColor = bgColors[from] || "#f5f6f7";
      const slug = `wave-${from}-to-${to}`;
      return `<tr><td class="${bgClass}" style="background-color:${bgColor};padding:0;line-height:0;font-size:0;"><img class="hex-light" src="https://funnel-ai-signos.netlify.app/email-assets/nutrition/${slug}.png?v=5" width="600" alt="" style="display:block;width:100%;height:auto;" /><!--[if !mso]><!--><img class="hex-dark" src="https://funnel-ai-signos.netlify.app/email-assets/nutrition/${slug}-dark.png?v=5" width="600" alt="" style="display:none;max-height:0;overflow:hidden;width:100%;height:auto;" /><!--<![endif]--></td></tr>`;
    };

    const convertMarkup = (markup: string): string => {
      const lines = markup.split("\n");
      const out: string[] = [];
      let bg = "pebble";

      for (const raw of lines) {
        const line = raw.trim();
        if (!line || line.startsWith("PREHEADER:")) continue;

        const m = line.match(/^\[([^\]]+)\]\s*(.*)/);
        if (!m) continue;
        const tag = m[1].toLowerCase().trim();
        const content = m[2].trim();

        const bgClass = `bg-${bg}`;
        const bgColor = bgColors[bg] || "#f5f6f7";

        if (tag === "hero-image") {
          const url = resolveImageUrl(content);
          out.push(`<tr><td class="bg-pebble" style="background-color:#f5f6f7;padding:0;line-height:0;font-size:0;"><img src="${url}" width="600" alt="Hero" style="display:block;width:100%;height:auto;" /></td></tr>`);
          bg = "pebble";
        } else if (tag === "eyebrow") {
          out.push(`<tr><td class="${bgClass} px-m" style="background-color:${bgColor};padding:16px 16px 8px 16px;"><p class="eyebrow" style="font-family:'JetBrains Mono','Courier New',monospace;font-weight:600;font-size:22px;line-height:1;text-transform:uppercase;color:#fd3576;margin:0;">${content}</p></td></tr>`);
        } else if (tag === "h1") {
          out.push(`<tr><td class="${bgClass} px-m" style="background-color:${bgColor};padding:0 16px 16px 16px;"><p class="h1" style="font-family:'Archivo',Arial,sans-serif;font-weight:600;font-size:30px;line-height:1.05;text-transform:uppercase;margin:0;color:#21263a;font-stretch:extra-condensed;font-variation-settings:'wdth' 62.5;">${content}</p></td></tr>`);
        } else if (tag === "h2") {
          out.push(`<tr><td class="${bgClass} px-m" style="background-color:${bgColor};padding:32px 16px 0 16px;"><p class="h2" style="font-family:'Archivo',Arial,sans-serif;font-weight:600;font-size:30px;line-height:1.1;text-transform:uppercase;margin:0 0 16px 0;color:#fd3576;font-stretch:extra-condensed;font-variation-settings:'wdth' 62.5;">${content}</p></td></tr>`);
        } else if (tag === "h3") {
          out.push(`<tr><td class="${bgClass} px-m" style="background-color:${bgColor};padding:16px 16px 8px 16px;"><p class="h3" style="font-family:'Archivo',Arial,sans-serif;font-weight:600;font-size:26px;line-height:1.1;text-transform:uppercase;margin:0;color:#fd3576;font-stretch:expanded;font-variation-settings:'wdth' 125;">${content}</p></td></tr>`);
        } else if (tag === "body" || tag === "body-lg") {
          out.push(`<tr><td class="${bgClass} px-m" style="background-color:${bgColor};padding:0 16px 24px 16px;"><p class="body-lg" style="font-family:'Archivo',Arial,sans-serif;font-weight:400;font-size:16px;line-height:24px;margin:0;color:#21263a;">${content}</p></td></tr>`);
        } else if (tag === "body-sm") {
          out.push(`<tr><td class="${bgClass} px-m" style="background-color:${bgColor};padding:0 16px 20px 16px;"><p class="body-sm" style="font-family:'Archivo',Arial,sans-serif;font-weight:400;font-size:14px;line-height:1.6;margin:0;color:#21263a;">${content}</p></td></tr>`);
        } else if (tag === "cta") {
          out.push(`<tr><td class="${bgClass} px-m" style="background-color:${bgColor};padding:0 16px 32px 16px;"><table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%"><tr><td align="center"><!--[if !mso]><!--><a href="#" class="btn-cerise" style="display:inline-block;padding:16px 30px;border-radius:16px;font-family:'Archivo',Arial,sans-serif;font-weight:700;font-size:18px;line-height:normal;text-decoration:none;color:#ffffff;background-color:#fd3576;text-align:center;border:2px solid #ce0259;border-bottom:4px solid #ce0259;max-width:520px;box-sizing:border-box;width:100%;font-stretch:expanded;font-variation-settings:'wdth' 125;">${content} &rarr;</a><!--<![endif]--></td></tr></table></td></tr>`);
        } else if (tag.startsWith("list-item") || tag === "bullet") {
          const parts = content.split("|").map(s => s.trim());
          const title = parts[0] || "Item";
          const body = parts[1] || "";
          out.push(`<tr><td class="${bgClass} px-m" style="background-color:${bgColor};padding:0 32px 16px 32px;"><table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%"><tr><td width="32" valign="top" style="padding-right:16px;"><img src="https://funnel-ai-signos.netlify.app/email-assets/nutrition/numbered-button.png" width="32" height="32" alt="" style="display:block;" /></td><td valign="top"><p class="list-title" style="font-family:'Archivo',Arial,sans-serif;font-weight:600;font-size:20px;line-height:1;text-transform:uppercase;margin:0 0 6px 0;color:#21263a;font-stretch:extra-condensed;font-variation-settings:'wdth' 62.5;">${title}</p><p class="body-sm" style="font-family:'Archivo',Arial,sans-serif;font-weight:400;font-size:14px;line-height:1.6;margin:0;color:#21263a;">${body}</p></td></tr></table></td></tr>`);
        } else if (tag.startsWith("wave:")) {
          const parts = tag.replace("wave:", "").split("-to-");
          if (parts.length === 2) {
            out.push(waveHtml(parts[0], parts[1]));
            bg = parts[1];
          }
        } else if (tag === "cerise-band") {
          const parts = content.split("|").map(s => s.trim());
          const headline = parts[0] || "Headline";
          const sub = parts[1] || "";
          out.push(`<tr><td style="background-color:#fd3576;padding:40px 24px;text-align:center;"><p style="font-family:'Archivo',Arial,sans-serif;font-weight:700;font-size:28px;line-height:1.1;text-transform:uppercase;margin:0 0 12px 0;color:#ffffff;font-stretch:extra-condensed;font-variation-settings:'wdth' 62.5;">${headline}</p><p style="font-family:'Archivo',Arial,sans-serif;font-weight:400;font-size:15px;line-height:1.5;margin:0;color:#ffffff;opacity:0.92;">${sub}</p></td></tr>`);
        } else if (tag.startsWith("stat")) {
          const parts = content.split("|").map(s => s.trim());
          const stat = parts[0] || "0";
          const label = parts[1] || "STAT";
          const ctx = parts[2] || "";
          out.push(`<tr><td class="${bgClass} px-m" style="background-color:${bgColor};padding:24px 16px;"><table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top:4px solid #fd3576;padding-top:24px;"><tr><td style="text-align:center;"><p style="font-family:'Archivo',Arial,sans-serif;font-weight:700;font-size:52px;line-height:1;margin:0 0 8px 0;color:#fd3576;font-stretch:extra-condensed;font-variation-settings:'wdth' 62.5;">${stat}</p><p style="font-family:'JetBrains Mono','Courier New',monospace;font-weight:600;font-size:13px;line-height:1.4;text-transform:uppercase;margin:0 0 12px 0;color:#21263a;letter-spacing:0.5px;">${label}</p><p style="font-family:'Archivo',Arial,sans-serif;font-weight:400;font-size:14px;line-height:1.5;margin:0;color:#21263a;">${ctx}</p></td></tr></table></td></tr>`);
        } else if (tag === "section-image" || tag === "image") {
          const url = resolveImageUrl(content);
          out.push(`<tr><td class="${bgClass} px-m" style="background-color:${bgColor};padding:16px 32px 24px 32px;"><img src="${url}" width="536" alt="Section image" style="display:block;width:100%;height:auto;border-radius:16px;" /></td></tr>`);
        } else if (tag === "section-intro") {
          const parts = content.split("|").map(s => s.trim());
          const eyebrow = parts[0] || "SECTION";
          const headline = parts[1] || "HEADLINE";
          const deck = parts[2] || "";
          out.push(`<tr><td class="${bgClass} px-m" style="background-color:${bgColor};padding:40px 24px 0 24px;"><table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td style="border-top:2px solid #21263a;padding-top:20px;"><p class="eyebrow" style="font-family:'JetBrains Mono','Courier New',monospace;font-weight:600;font-size:13px;line-height:1;text-transform:uppercase;color:#fd3576;margin:0 0 12px 0;letter-spacing:1.5px;">${eyebrow}</p><p class="h2" style="font-family:'Archivo',Arial,sans-serif;font-weight:700;font-size:32px;line-height:1.05;text-transform:uppercase;margin:0 0 12px 0;color:#21263a;font-stretch:extra-condensed;font-variation-settings:'wdth' 62.5;">${headline}</p>${deck ? `<p style="font-family:'Archivo',Arial,sans-serif;font-weight:400;font-size:16px;line-height:1.55;margin:0;color:#4a5068;">${deck}</p>` : ""}</td></tr></table></td></tr>`);
        } else if (tag === "pull-quote" || tag === "quote") {
          const parts = content.split("|").map(s => s.trim());
          const quote = parts[0] || "Quote text";
          const attribution = parts[1] || "";
          out.push(`<tr><td class="bg-white px-m" style="background-color:#ffffff;padding:40px 32px;"><table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td><p style="font-family:'Archivo',Arial,sans-serif;font-weight:700;font-size:64px;line-height:1;margin:0;color:#fd3576;font-stretch:extra-condensed;font-variation-settings:'wdth' 62.5;">&ldquo;</p><p style="font-family:'Archivo',Arial,sans-serif;font-weight:500;font-size:22px;line-height:1.35;margin:0 0 16px 0;color:#21263a;font-style:italic;">${quote}</p>${attribution ? `<p style="font-family:'JetBrains Mono','Courier New',monospace;font-weight:600;font-size:12px;line-height:1;text-transform:uppercase;color:#4a5068;margin:0;letter-spacing:1.2px;">&mdash; ${attribution}</p>` : ""}</td></tr></table></td></tr>`);
          bg = "white";
        } else if (tag === "divider") {
          out.push(`<tr><td class="${bgClass} px-m" style="background-color:${bgColor};padding:8px 24px 24px 24px;"><table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td style="border-top:1px solid #d9dadf;height:1px;font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>`);
        } else if (tag === "compare" || tag === "comparison") {
          const parts = content.split("|").map(s => s.trim());
          const leftLabel = parts[0] || "OLD";
          const leftHeadline = parts[1] || "";
          const leftBody = parts[2] || "";
          const rightLabel = parts[3] || "NEW";
          const rightHeadline = parts[4] || "";
          const rightBody = parts[5] || "";
          out.push(`<tr><td class="bg-gray px-m" style="background-color:#e3e4e7;padding:32px 16px;"><table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td valign="top" width="50%" style="padding-right:8px;"><p style="font-family:'JetBrains Mono','Courier New',monospace;font-weight:600;font-size:11px;line-height:1;text-transform:uppercase;color:#4a5068;margin:0 0 8px 0;letter-spacing:1.2px;">${leftLabel}</p><p style="font-family:'Archivo',Arial,sans-serif;font-weight:600;font-size:22px;line-height:1.1;margin:0 0 8px 0;color:#21263a;font-stretch:extra-condensed;font-variation-settings:'wdth' 62.5;">${leftHeadline}</p><p style="font-family:'Archivo',Arial,sans-serif;font-weight:400;font-size:13px;line-height:1.5;margin:0;color:#21263a;">${leftBody}</p></td><td valign="top" width="50%" style="padding-left:16px;border-left:2px solid #fd3576;"><p style="font-family:'JetBrains Mono','Courier New',monospace;font-weight:600;font-size:11px;line-height:1;text-transform:uppercase;color:#fd3576;margin:0 0 8px 0;letter-spacing:1.2px;">${rightLabel}</p><p style="font-family:'Archivo',Arial,sans-serif;font-weight:600;font-size:22px;line-height:1.1;margin:0 0 8px 0;color:#21263a;font-stretch:extra-condensed;font-variation-settings:'wdth' 62.5;">${rightHeadline}</p><p style="font-family:'Archivo',Arial,sans-serif;font-weight:400;font-size:13px;line-height:1.5;margin:0;color:#21263a;">${rightBody}</p></td></tr></table></td></tr>`);
          bg = "gray";
        } else if (tag === "product-section") {
          out.push(`<tr><td class="bg-white px-m" style="background-color:#ffffff;padding:50px 24px 0 24px;"><p class="product-heading" style="font-family:'Archivo',Arial,sans-serif;font-weight:700;font-size:32px;line-height:1;text-transform:uppercase;margin:0;color:#21263a;text-align:center;font-stretch:extra-condensed;font-variation-settings:'wdth' 62.5;">${content}</p></td></tr><tr><td class="bg-white" style="background-color:#ffffff;padding:17px 0;text-align:center;"><img class="product-img" src="https://funnel-ai-signos.netlify.app/email-assets/nutrition/product-desktop.png" width="346" alt="Signos CGM kit" style="display:inline-block;width:346px;height:auto;margin:0 auto;" /></td></tr>`);
          bg = "white";
        } else if (tag === "bg") {
          if (content in bgColors) bg = content;
        } else if (tag === "ref" || tag === "references") {
          out.push(`<tr><td class="${bgClass} px-m" style="background-color:${bgColor};padding:16px 16px 32px 16px;"><p class="ref-copy" style="font-family:'Archivo',Arial,sans-serif;font-weight:500;font-size:10px;line-height:1.3;color:#b5c3d6;margin:0;">${content}</p></td></tr>`);
        }
      }
      return out.join("\n");
    };

    const directCopySystem = `You are a SENIOR EMAIL DESIGNER converting source text into a compact markup format. The markup renders as full Signos HTML. Your job is to produce a 9/10 designer-quality email — never a dump of paragraphs, always an editorial composition with clear hierarchy.

FIDELITY: Preserve source text meaning and key phrases closely. Do NOT invent claims or stats not in source. Keep section ordering aligned to the source. Include ALL source content — never truncate.

AVAILABLE TAGS (one per line, format: [tag] content):
[hero-image] IMAGE_NAME — use module 1 hero at top (image #1 of 3)
[eyebrow] UPPERCASE LABEL TEXT
[h1] Main headline text
[h2] Section heading text
[h3] Sub-section heading text
[body] Paragraph text (16px, larger)
[body-sm] Paragraph text (14px, smaller)
[cta] Button label text
[list-item] TITLE | Description text (pipe-separated)
[wave:FROM-to-TO] (pebble-to-gray, gray-to-pebble, pebble-to-white, white-to-pebble)
[cerise-band] HEADLINE | Supporting text (pipe-separated)
[stat] NUMBER | LABEL | Context paragraph (pipe-separated)
[section-image] IMAGE_NAME — rounded section image (image #2 and #3 of 3)
[product-section] Heading text (may replace image #3)
[section-intro] EYEBROW LABEL | HEADLINE | One-sentence deck — USE THIS to open each major section
[pull-quote] Quote text | Attribution — editorial quote block
[compare] LEFT_LABEL | LEFT_HEADLINE | LEFT_BODY | RIGHT_LABEL | RIGHT_HEADLINE | RIGHT_BODY — two-column contrast
[divider] (no content) — thin rule between related subsections
[bg] pebble/gray/white (changes current background)
[ref] Reference text (small footnote)

IMAGE POOL (use these EXACT shorthand names):
hero-photo.jpg — woman in kitchen, food/nutrition theme
hero-composed.jpg — composed lifestyle hero
section-photo-1.jpg — active lifestyle, exercise
section-photo-2.jpg — wellness/self-care
woman-with-signos-cgm.webp — woman wearing Signos CGM, smiling

MANDATORY STRUCTURE — EVERY email follows this 3-act rhythm:

ACT 1 — HOOK (image #1 of 3):
[hero-image] <pick one>
[eyebrow] PRIMARY LABEL · 01
[h1] Main headline
[body] Intro paragraph
[cta] Primary CTA
[wave:pebble-to-gray]

ACT 2 — EDUCATE / PROVE (image #2 of 3):
[section-intro] THE BREAKDOWN · 02 | Section headline | One-sentence deck
[body] or [list-item] content
[section-image] <pick different image>
[pull-quote] ... OR [cerise-band] ...
[stat] ... OR [compare] ...
[cta] Secondary CTA

ACT 3 — CONVERT (image #3 of 3):
[section-intro] WHAT TO DO NEXT · 03 | Closing headline | Deck
[body] Closing paragraph
[section-image] <pick different image> OR [product-section] ...
[cta] Final CTA
[ref] (optional)

HARD REQUIREMENTS:
1) EXACTLY 3 images — one [hero-image] + two [section-image] (or one [section-image] + one [product-section]). Pick 3 DIFFERENT image names.
2) AT LEAST 3 [section-intro] units, one per act, with numbered eyebrow labels ("· 01", "· 02", "· 03").
3) AT LEAST ONE [pull-quote] or [cerise-band].
4) AT LEAST ONE [stat] or [compare].
5) 2-3 [cta] buttons spread across the acts.
6) Max 2 content blocks on same background before [wave:...] or [bg] switch.
7) Max 3 [list-item] in a row before a visual break.
8) Never stack 3+ identical modules (no three [body] in a row, no three [list-item] without a break).
9) Eyebrow labels should be SPECIFIC and numbered — not generic.

OUTPUT: First line must be "PREHEADER: text", then one tag per line. Nothing else.`;

    const prompt = `Convert this text into compact email markup tags.

CRITICAL: Include ALL content — every section, every bullet point, every CTA, and all references. Do NOT stop early.

EMAIL TITLE: ${theme}
${details ? `CONTEXT: ${details}\n` : ""}
SOURCE TEXT:
${sourceText.slice(0, 40000)}

Output PREHEADER: line first, then one [tag] per line. Include ALL content from above.`;

    console.log(`[email-hub] generate-direct-copy theme=${theme} textLen=${sourceText.length}`);

    try {
      const t0 = Date.now();
      const encoder = new TextEncoder();

      const readable = new ReadableStream({
        async start(controller) {
          try {
            const headHtml = TEMPLATE_HEAD
              .replace("{{PREHEADER}}", theme.slice(0, 80))
              .replace("{{TITLE}}", theme || "Signos Email");
            controller.enqueue(encoder.encode(headHtml));

            let fullMarkup = "";
            let totalChunks = 0;

            const stream = client.messages.stream({
              model: "claude-sonnet-4-20250514",
              max_tokens: 8000,
              system: directCopySystem,
              messages: [{ role: "user", content: prompt }],
            });

            for await (const event of stream) {
              if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
                totalChunks++;
                fullMarkup += event.delta.text;
              }
            }

            // #region agent log — debug: log markup stats
            console.log(`[DEBUG-f702a4] markup-done: markupLen=${fullMarkup.length}, chunks=${totalChunks}, elapsed=${Date.now() - t0}ms`);
            // #endregion

            const contentHtml = convertMarkup(fullMarkup);
            controller.enqueue(encoder.encode(contentHtml));

            // #region agent log — debug: embed stats in stream
            const debugPayload = { markupLen: fullMarkup.length, htmlLen: contentHtml.length, chunks: totalChunks, elapsed: Date.now() - t0 };
            controller.enqueue(encoder.encode(`\n<!-- DEBUG_f702a4:${JSON.stringify(debugPayload)} -->\n`));
            console.log(`[DEBUG-f702a4] final: ${JSON.stringify(debugPayload)}`);
            // #endregion

            controller.enqueue(encoder.encode(TEMPLATE_FOOTER));
            controller.close();
          } catch (err) {
            console.error(`[email-hub] direct-copy stream error:`, err);
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
      console.error(`[email-hub] direct-copy error:`, err);
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
        max_tokens: 32000,
        system: "You are an email HTML QA engineer for Signos. Fix structural/styling issues and return complete HTML. Output ONLY HTML — do NOT truncate.",
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

  /* ─────────────────────────────────────────────────────────────────
     AI DESIGN REVIEW — analyzes current email and returns 3 structured
     suggestions the user can accept/dismiss. Returns JSON.
     ───────────────────────────────────────────────────────────────── */
  if (action === "ai-design-review") {
    const htmlToReview = (body.html as string) || "";
    if (!htmlToReview) return json({ error: "Missing html" }, 400);

    // Strip the <head>, footer boilerplate, AND any huge base64 data URLs
    // so the model has context budget left for analysis.
    const contentOnly = (() => {
      const startIdx = htmlToReview.indexOf("<!-- ===== HEADER =====");
      const endIdx = htmlToReview.indexOf("<!-- ===== FOOTER =====");
      const raw = (startIdx >= 0 && endIdx > startIdx)
        ? htmlToReview.slice(startIdx, endIdx)
        : htmlToReview.slice(0, 20000);
      return raw.replace(
        /data:image\/[a-zA-Z+.-]+;base64,[A-Za-z0-9+/=]+/g,
        "[USER_UPLOADED_IMAGE]"
      );
    })();

    const reviewSystem = `You are a SENIOR EMAIL DESIGNER reviewing a Signos marketing email against a 9/10 designer-quality bar.

SIGNOS EMAIL DESIGN STANDARDS (what a 9/10 email looks like):
- Exactly 3 images: one hero at top, one rounded section image in the middle, one rounded section image or product image near the end
- Clear 3-act structure: HOOK (hero + H1 + intro + CTA) → EDUCATE/PROVE (section-intro + content + pull-quote or cerise-band + stat or comparison + CTA) → CONVERT (section-intro + closing + third image + final CTA)
- Every new thematic section opens with a section-intro unit — numbered eyebrow ("· 01", "· 02", "· 03"), H2 headline, 10-18 word deck paragraph
- Rhythm of backgrounds: pebble → wave → gray → wave → white → cerise-band → pebble. Never more than 2 modules on same background
- At least one pull-quote or cerise-band for editorial emphasis
- At least one stat-highlight or two-column comparison for data/contrast
- 2-3 CTAs spread across the 3 acts
- Headings 3-7 words, uppercase, punchy. Decks 10-18 words. Eyebrows specific and numbered.
- Module variety — never 3+ identical blocks stacked

HARD RULES (violations are always worth a suggestion, even if nothing else is wrong):
- NO heading text (h2/h3/list-title) may appear 3+ times across the email. If you see it, the fix is to VARY THE COPY using replace_text on each repeat — e.g. "How to put it to the test" × 3 → "Try this week" / "Put it into practice" / "Your action plan". replace_text has no structural cost; use as many as needed.
- EVERY major narrative section (>=4 blocks) must contain one "design moment": stat-highlight, framed-stat, stats-grid, cerise-band, pull-quote, side-callout, two-column, or editorial-pair. Sections made entirely of body text are FAIL.
- Section openers must be CONSISTENT. Pick one opener pattern (section-intro, or chapter-mark, or cerise-band, or bicolor-heading) and apply it to EVERY major section. Mixing types breaks rhythm.
- No run of 4+ consecutive body-lg/body-sm/row blocks with no accent module between. Break it up.
- Section block-counts should be within 2× of each other. One section 3× another = imbalance.

PREMIUM DESIGN GRAMMAR (what distinguishes a 9/10 from a 6/10 Signos email):
- NO DESIGN-MOMENT MODULE MAY APPEAR 2+ TIMES. If you have two sections needing a stat moment, use stat-highlight for ONE and framed-stat (vertical left-rule, navy number) or stats-grid (3 small stats side-by-side) for the OTHER. Same applies to cerise-band → swap one for pull-quote or side-callout. Premium = variety, not repetition.
- SECTION DNA MUST VARY. If two parallel sections have the same module sequence (e.g. both = section-intro → body × 2 → stat-highlight → h3 → list-item × 2), the email reads copy-paste. Suggest replace_module to swap one section's stat-highlight for editorial-pair, or its section-intro for chapter-mark, so each section has a distinct visual silhouette.
- WAVE FATIGUE. Emails with 3+ wave transitions feel template-y. Replace at least one wave with a photo-divider (full-width image as transition) or with chapter-mark (no divider needed; the oversized numeral IS the break).
- RESTRAINT ON CERISE. Two big cerise-bands feels shouty. Prefer one cerise-band + one pull-quote + one side-callout over three cerise-bands. Cerise is a spot color, not a flood.
- ASYMMETRY + TYPOGRAPHY. chapter-mark (oversized numeral off to the left + text on the right) and editorial-pair (image left + text right) add asymmetry that's rare in templated emails. Suggest them when a section feels too centered/blocky.

PREMIUM MODULES AVAILABLE (use these, not just the standard 4):
- framed-stat: vertical LEFT cerise rule + navy stat + cerise label + body. Editorial alternative to stat-highlight.
- stats-grid: 3 small stats in a horizontal row. Magazine data display.
- chapter-mark: oversized numeral (e.g. "02") + eyebrow + headline. Replaces section-intro for editorial weight.
- side-callout: body with cerise left rule, italicized, no headline. Inline emphasis.
- photo-divider: full-width image as section transition. Replaces a wave.
- editorial-pair: image + body side-by-side (collapses on mobile). Replaces body paragraphs when you want visual interest.

REVIEW PRIORITY (order matters — fix the biggest hierarchy + design issues first):
1. INFORMATION HIERARCHY: are section boundaries clear? Are there section-intro units? Are eyebrows numbered and specific? Are openers consistent across sections?
2. VISUAL DESIGN: is there background/module variety? Does every section have a design moment? Are there pull-quotes, cerise-bands, stat cards, comparisons?
3. CONTENT: is the copy tight and punchy? Are headings short? Are decks sharp? Are there repeated headings that need varying?

Return 5 to 8 suggestions, prioritized by impact. ALWAYS prefer more when the email has room to improve — err toward 7-8, not 3-4. At LEAST 3 of the suggestions MUST have "impact: high" — these are the ones that drive the biggest visual transformation. Each must be:
- SPECIFIC (name the section/module + target blockId(s), don't say "improve the design")
- ACTIONABLE (the "fix" field must be a precise instruction the AI can execute on the HTML)
- DISTINCT (each suggestion addresses a different issue)
- BIG ENOUGH TO NOTICE — if the reviewer would have to squint to see the diff, the suggestion is too small. Prefer "replace the entire first section with a chapter-mark + pull-quote + stat-highlight triptych" over "tweak this eyebrow".
- STRUCTURALLY SOUND — your "fix" must not break the <tr>/<td>/<table> nesting. If a suggestion requires replacing a block, use replace_module (not manual edits) and name the exact blockId. If it requires new content, use insert_module with a specific anchor blockId.

POST-APPLY VERIFICATION EXPECTATION: after the user applies your suggestions, the resulting email MUST still have:
- Header (Signos logo row) intact at the top
- Footer (signos logo + social + copyright + unsubscribe) intact at the bottom
- At least 1 valid hero image
- All <table>/<tr>/<td> tags balanced — no orphan opens, no broken attributes
If any suggestion risks any of the above, leave it out. The email must remain a valid, complete, senderable HTML document after application.

MAPPING LINTER FINDINGS TO SUGGESTIONS (MANDATORY — do not skip these):
- If HARD FACTS shows \`design-moment-repetition\` (e.g. "2 stat-highlight modules used"), one suggestion MUST be of the form:
    "Replace duplicate stat-highlight at [LATER blockId] with [framed-stat | stats-grid]"
  and the fix field MUST say: "Use replace_module (NOT insert_module) on [blockId]. The later/second duplicate should be swapped." Name the exact blockIds from the linter finding.
- If HARD FACTS shows \`section-dna-repetition\` (two sections share module types), one suggestion MUST be:
    "Differentiate [Section X] from [Section Y] by swapping [specific module type] for [alternative]"
  with a concrete replace_module target blockId.
- If HARD FACTS shows \`wave-overuse\`, one suggestion MUST be:
    "Replace one wave at [blockId] with photo-divider"
  Name which wave (by blockId) to replace.
- If HARD FACTS shows \`repeated-heading\`, one suggestion MUST vary each heading with replace_text (no structural cost).
- If HARD FACTS shows \`missing-design-moment\` in a section, one suggestion MUST insert_module a design moment AFTER a specific body-lg block in that section — NOT between complex modules.

OUTPUT FORMAT — valid JSON only, no prose, no markdown fences:
{
  "overview": "2-sentence honest assessment of the current email's design quality",
  "scores": { "content": 7, "design": 6, "hierarchy": 5 },
  "suggestions": [
    {
      "id": "s1",
      "category": "hierarchy" | "design" | "content",
      "title": "Short title (5-8 words)",
      "problem": "1-2 sentences — what's wrong and why it matters",
      "fix": "Precise instruction for an AI editor to execute. Reference specific sections, modules, or text. E.g. 'Replace the generic eyebrow ''FEATURED'' above the ''How to eat'' H1 with ''THE BREAKDOWN · 02'' and add a 12-word deck paragraph below it introducing the three tips.'",
      "impact": "high" | "medium" | "low"
    },
    { "id": "s2", ... },
    { "id": "s3", ... }
  ]
}`;

    // Run the deterministic pattern linter to produce HARD FACTS that
    // Claude can reference by block id. This catches concrete defects
    // (repeated headings, missing design moments, etc.) that a pure-text
    // review often misses.
    const linterBlocks = extractBlocksFromContent(contentOnly);
    const linterResult = runDesignLinter(linterBlocks);
    const linterFactsText = findingsToPromptText(linterResult);

    const reviewPrompt = `Review this Signos email. Return JSON only.

${linterFactsText}

EMAIL CONTENT HTML:
${contentOnly.slice(0, 18000)}`;

    try {
      // Use streaming so the SDK doesn't refuse long-running requests.
      // We still collect the full text before parsing JSON.
      const stream = client.messages.stream({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8000,  // room for up to 8 detailed suggestions (raised 2026-04-20)
        system: reviewSystem,
        messages: [{ role: "user", content: reviewPrompt }],
      });

      let raw = "";
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          raw += event.delta.text;
        }
      }
      raw = raw.trim();
      const cleaned = raw.replace(/^```json?\n?/i, "").replace(/\n?```$/, "").trim();

      let parsed: unknown;
      try { parsed = JSON.parse(cleaned); }
      catch {
        const first = cleaned.indexOf("{");
        const last = cleaned.lastIndexOf("}");
        if (first >= 0 && last > first) {
          try { parsed = JSON.parse(cleaned.slice(first, last + 1)); } catch { parsed = null; }
        }
      }

      if (!parsed || typeof parsed !== "object") {
        return json({ error: "Failed to parse review JSON", raw: cleaned.slice(0, 500) }, 500);
      }

      const review = parsed as {
        overview?: string;
        scores?: Record<string, number>;
        suggestions?: Array<Record<string, unknown>>;
      };

      const suggestions = (review.suggestions || []).slice(0, 8).map((s, i) => ({
        id: (s.id as string) || `s${i + 1}`,
        category: (s.category as string) || "design",
        title: (s.title as string) || "Suggestion",
        problem: (s.problem as string) || "",
        fix: (s.fix as string) || "",
        impact: (s.impact as string) || "medium",
      }));

      return json({
        overview: review.overview || "",
        scores: review.scores || {},
        suggestions,
        linter: linterResult,
      });
    } catch (err: unknown) {
      console.error(`[email-hub] design-review error:`, err);
      return json({ error: err instanceof Error ? err.message : "Review failed" }, 500);
    }
  }

  /* ─────────────────────────────────────────────────────────────────
     APPLY DESIGN SUGGESTIONS — extracts just the content region from
     the email (never the head/footer), protects base64 data URLs,
     asks Claude to rewrite ONLY the content blocks, then reassembles
     the full email server-side. This prevents truncation and
     context overflow from inlined uploaded images.
     ───────────────────────────────────────────────────────────────── */
  /* ── APPLY DESIGN SUGGESTIONS — BACKGROUND JOB PATTERN ────────
     Because Claude can take 60-180s to rewrite a full content
     region (which exceeds the 120s synchronous Netlify function
     timeout), we split this into three steps:
       1. apply-start: create a job row, trigger the background
          function, return { jobId } immediately.
       2. background fn `email-hub-apply-background.mts`: runs for
          up to 15 min, does Claude + validation + reassembly,
          writes result back to the job row.
       3. apply-status: client polls this to get progress / result.
     Validates + sanity-checks the HTML before kicking off. ──── */
  if (action === "apply-start") {
    const currentHtml = (body.currentHtml as string) || "";
    const suggestions = (body.suggestions as Array<{ title: string; fix: string; category?: string }>) || [];
    const clientJobId = (body.jobId as string) || "";
    if (!currentHtml) return json({ error: "Missing currentHtml" }, 400);
    if (!suggestions.length) return json({ error: "No suggestions to apply" }, 400);

    // Quick structural validation so we fail fast instead of
    // inside the background fn.
    if (!currentHtml.includes("<!-- ===== HEADER =====") || !currentHtml.includes("<!-- ===== FOOTER =====")) {
      return json({ error: "Email is missing header/footer markers — cannot apply changes." }, 400);
    }

    await ensureTables();
    const db = sql();
    const jobId = clientJobId || `apply_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();

    try {
      await db`
        INSERT INTO email_hub_apply_jobs
          (id, status, current_html, suggestions, created_at, updated_at, progress_note)
        VALUES
          (${jobId}, 'pending', ${currentHtml}, ${JSON.stringify(suggestions)}::jsonb, ${now}, ${now}, 'queued')
        ON CONFLICT (id) DO UPDATE SET
          status = 'pending',
          current_html = EXCLUDED.current_html,
          suggestions = EXCLUDED.suggestions,
          result_html = '',
          error_message = '',
          updated_at = ${now},
          progress_note = 'queued'
      `;
    } catch (err) {
      console.error(`[email-hub] apply-start DB insert failed:`, err);
      return json({
        error: err instanceof Error ? err.message : "Failed to queue job",
      }, 500);
    }

    // Trigger the background function. Netlify sends 202 within
    // ~30s for -background functions, so awaiting this is cheap —
    // and critically, it guarantees the invocation actually
    // completes the handshake (fire-and-forget fetches get killed
    // when the main function returns in the Netlify runtime).
    const reqUrl = new URL(req.url);
    const bgUrl = `${reqUrl.protocol}//${reqUrl.host}/.netlify/functions/email-hub-apply-background`;
    console.log(`[email-hub] apply-start job=${jobId} triggering ${bgUrl}`);
    try {
      const bgRes = await fetch(bgUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      console.log(`[email-hub] apply-start job=${jobId} trigger response: ${bgRes.status}`);
      if (!bgRes.ok && bgRes.status !== 202) {
        const text = await bgRes.text().catch(() => "");
        await db`
          UPDATE email_hub_apply_jobs
          SET status = 'error',
              error_message = ${`Background function returned ${bgRes.status}: ${text.slice(0, 200)}`},
              updated_at = ${Date.now()}
          WHERE id = ${jobId}
        `;
        return json({ error: `Failed to start background worker (${bgRes.status})` }, 502);
      }
    } catch (err) {
      console.error(`[email-hub] apply-start trigger fetch failed:`, err);
      await db`
        UPDATE email_hub_apply_jobs
        SET status = 'error',
            error_message = ${`Failed to trigger background worker: ${err instanceof Error ? err.message : String(err)}`},
            updated_at = ${Date.now()}
        WHERE id = ${jobId}
      `;
      return json({ error: "Failed to start background worker" }, 502);
    }

    return json({ ok: true, jobId, status: "pending" });
  }

  if (action === "apply-status") {
    const jobId = (body.jobId as string) || "";
    const wantDebug = body.debug === true;
    if (!jobId) return json({ error: "Missing jobId" }, 400);
    await ensureTables();
    const db = sql();
    // When the client asks for debug, pull the expensive JSONB columns too.
    // Otherwise keep the response small for regular polling.
    const rows = wantDebug
      ? (await db`
          SELECT id, status, result_html, preview_html, ops_summary, audit_note,
                 error_message, stop_reason,
                 claude_chars, orig_tr_count, new_tr_count, tokens_restored,
                 elapsed_ms, progress_note, created_at, updated_at,
                 claude_raw, ops_detail, pre_audit, post_audit, heal_events, generator_meta
          FROM email_hub_apply_jobs
          WHERE id = ${jobId}
        `)
      : (await db`
          SELECT id, status, result_html, preview_html, ops_summary, audit_note,
                 error_message, stop_reason,
                 claude_chars, orig_tr_count, new_tr_count, tokens_restored,
                 elapsed_ms, progress_note, created_at, updated_at
          FROM email_hub_apply_jobs
          WHERE id = ${jobId}
        `);
    const row = (rows as Array<Record<string, unknown>>)[0];

    if (!row) return json({ error: "Job not found" }, 404);

    const now = Date.now();
    const ageMs = now - Number(row.created_at || now);
    const sinceUpdateMs = now - Number(row.updated_at || now);

    // Parse ops_summary (stored as JSONB; postgres.js returns it as an object already)
    let opsSummary: unknown[] = [];
    try {
      if (Array.isArray(row.ops_summary)) opsSummary = row.ops_summary as unknown[];
      else if (typeof row.ops_summary === "string") opsSummary = JSON.parse(row.ops_summary);
    } catch { /* leave empty */ }

    const status = row.status as string;
    const isTerminal = status === "preview_ready" || status === "done" || status === "error";

    // Parse a JSONB column defensively — postgres.js usually returns objects
    // but the default value paths can still come back as strings.
    const parseJson = (v: unknown) => {
      if (v == null) return null;
      if (typeof v === "string") {
        try { return JSON.parse(v); } catch { return null; }
      }
      return v;
    };

    const response: Record<string, unknown> = {
      ok: true,
      jobId: row.id as string,
      status,
      progress: row.progress_note as string,
      html: status === "done" ? (row.result_html as string) : undefined,
      previewHtml: (status === "preview_ready" || status === "done") ? (row.preview_html as string) : undefined,
      opsSummary: (status === "preview_ready" || status === "done") ? opsSummary : undefined,
      auditNote: (status === "preview_ready" || status === "done") ? (row.audit_note as string) : undefined,
      error: status === "error" ? (row.error_message as string) : undefined,
      debug: {
        stopReason: row.stop_reason as string,
        claudeChars: row.claude_chars as number,
        origTrCount: row.orig_tr_count as number,
        newTrCount: row.new_tr_count as number,
        tokensRestored: row.tokens_restored as number,
        elapsedMs: row.elapsed_ms as number,
        ageMs,
        sinceUpdateMs,
      },
    };

    if (wantDebug && isTerminal) {
      response.debugBundle = {
        claudeRaw: (row.claude_raw as string) || "",
        opsDetail: parseJson(row.ops_detail) || [],
        preAudit: parseJson(row.pre_audit),
        postAudit: parseJson(row.post_audit),
        healEvents: parseJson(row.heal_events) || [],
        generatorMeta: parseJson(row.generator_meta),
      };
    }

    return json(response);
  }

  /* ── apply-commit: user approved the preview; promote it to result_html ── */
  if (action === "apply-commit") {
    const jobId = (body.jobId as string) || "";
    if (!jobId) return json({ error: "Missing jobId" }, 400);
    await ensureTables();
    const db = sql();
    const rows = await db`SELECT status, preview_html FROM email_hub_apply_jobs WHERE id = ${jobId}`;
    if (!rows.length) return json({ error: "Job not found" }, 404);
    const row = rows[0];
    if (row.status !== "preview_ready" && row.status !== "done") {
      return json({ error: `Cannot commit job in status '${row.status}'` }, 409);
    }
    if (!row.preview_html) {
      return json({ error: "No preview available to commit" }, 409);
    }
    await db`
      UPDATE email_hub_apply_jobs
      SET status = 'done', result_html = ${row.preview_html as string}, updated_at = ${Date.now()}
      WHERE id = ${jobId}
    `;
    return json({ ok: true, jobId, status: "done", html: row.preview_html });
  }

  /* ── apply-cancel: user rejected the preview; discard the job ── */
  if (action === "apply-cancel") {
    const jobId = (body.jobId as string) || "";
    if (!jobId) return json({ error: "Missing jobId" }, 400);
    await ensureTables();
    const db = sql();
    await db`
      UPDATE email_hub_apply_jobs
      SET status = 'cancelled', preview_html = '', ops_summary = '[]'::jsonb, updated_at = ${Date.now()}
      WHERE id = ${jobId}
    `;
    return json({ ok: true, jobId, status: "cancelled" });
  }

  if (action === "edit") {
    const editPrompt = `Current Signos email HTML:\n\n${body.currentHtml}\n\nEdits requested: ${body.editInstructions}\n\nApply the edits. Maintain ALL existing structure, CSS classes, header, and footer. Output ONLY the complete updated HTML, from <!doctype html> through </html>. Do not skip, abbreviate, or omit any sections — the bottom of the email (references, footer, closing tags) must be present.`;

    // Stream with continuation support + truncation recovery.
    // Earlier single-shot implementation truncated emails where Claude ran past
    // max_tokens — the bottom (references + footer) would be cut off mid-tag.
    // User-reported on 2026-04-20: "it did the change but did not complete the
    // bottom of the email - make sure it rebuilds the entire email".
    const EDIT_MAX_TOKENS = 48000;      // bumped from 32000 (beta output-128k enabled)
    const EDIT_MAX_CONT = 5;            // continuation retries when max_tokens hit

    try {
      const encoder = new TextEncoder();
      const editSystem = "You edit Signos email HTML. Preserve all structure, classes, and patterns. Output the COMPLETE HTML document from <!doctype html> through </html>. Never truncate or skip sections — the references, footer, and closing tags must always be present.";

      const readable = new ReadableStream({
        async start(controller) {
          let fullOutput = "";
          let totalChunks = 0;

          const streamChunk = async (s: ReturnType<typeof client.messages.stream>) => {
            for await (const event of s) {
              if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
                totalChunks++;
                const text = event.delta.text;
                fullOutput += text;
                controller.enqueue(encoder.encode(text));
              }
            }
            return s.finalMessage();
          };

          try {
            let finalMsg = await streamChunk(client.messages.stream({
              model: "claude-sonnet-4-20250514",
              max_tokens: EDIT_MAX_TOKENS,
              system: editSystem,
              messages: [{ role: "user", content: editPrompt }],
            }));

            // CONTINUATION LOOP — pick up exactly where Claude stopped until the
            // document actually closes with </html> or we exhaust retries.
            let conts = 0;
            while (
              finalMsg.stop_reason === "max_tokens" &&
              conts < EDIT_MAX_CONT &&
              !fullOutput.trimEnd().endsWith("</html>")
            ) {
              conts++;
              console.log(`[email-hub] edit continuation ${conts}/${EDIT_MAX_CONT}, output so far: ${fullOutput.length} chars`);
              finalMsg = await streamChunk(client.messages.stream({
                model: "claude-sonnet-4-20250514",
                max_tokens: EDIT_MAX_TOKENS,
                system: "Continue generating the Signos email HTML EXACTLY where you stopped. Output ONLY the remaining content until </html>. Do not repeat content already generated.",
                messages: [
                  { role: "user", content: editPrompt },
                  { role: "assistant", content: fullOutput },
                ],
              }));
            }

            // STREAM TERMINATION GUARD — if we still ended mid-tag (max continuations
            // hit, or stream errored), emit recovery bytes so the HTML is at least
            // parseable and the browser doesn't eat the footer as attribute content.
            const tailLt = fullOutput.lastIndexOf("<");
            const tailGt = fullOutput.lastIndexOf(">");
            if (tailLt > tailGt) {
              console.warn(`[email-hub] edit stream cut mid-tag at offset ${tailLt}; emitting recovery`);
              controller.enqueue(encoder.encode("'\">"));
              controller.enqueue(encoder.encode("</p></td></tr>"));
            }

            // Final safety net: if the document didn't close properly with </html>,
            // append the minimum structure to make it valid HTML so the browser
            // parses + renders whatever we have.
            if (!fullOutput.trimEnd().endsWith("</html>")) {
              console.warn(`[email-hub] edit output missing </html>; appending closers`);
              const needsBody = !/<\/body>\s*$/i.test(fullOutput.trimEnd());
              const needsHtml = !/<\/html>\s*$/i.test(fullOutput.trimEnd());
              if (needsBody) controller.enqueue(encoder.encode("</body>"));
              if (needsHtml) controller.enqueue(encoder.encode("</html>"));
            }

            console.log(`[email-hub] edit done: ${totalChunks} chunks, ${conts} conts, ${fullOutput.length} chars`);
            controller.close();
          } catch (streamErr) {
            console.error(`[email-hub] edit stream error:`, streamErr);
            controller.close();
          }
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
