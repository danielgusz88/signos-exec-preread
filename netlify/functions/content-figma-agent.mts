import type { Context } from "@netlify/functions";

const CURSOR_API = "https://api.cursor.com/v0";
const REPO_URL = "https://github.com/danielgusz88/signos-exec-preread";

interface FigmaAgentRequest {
  action: "launch" | "status" | "followup" | "list";
  agentId?: string;
  adConcept?: {
    contentType: string;
    headline: string;
    subheadline?: string;
    ctaText: string;
    attribution?: string;
    backgroundImageUrl: string;
    figmaTemplateUrl?: string;
    style?: string;
    targetEmotion?: string;
    notes?: string;
  };
  followupText?: string;
}

function buildFigmaPrompt(concept: FigmaAgentRequest["adConcept"]): string {
  if (!concept) return "";

  const {
    contentType,
    headline,
    subheadline,
    ctaText,
    attribution,
    backgroundImageUrl,
    figmaTemplateUrl,
    style,
    targetEmotion,
    notes,
  } = concept;

  const templateInstruction = figmaTemplateUrl
    ? `Open this Figma template file: ${figmaTemplateUrl}`
    : `Create a new Figma Design file in the browser at figma.com`;

  return `# Task: Create a Signos Ad in Figma

You are creating a professional advertising image for Signos, a CGM/metabolic health company. Your job is to open Figma in the browser, create the ad design, and export the final result as a PNG.

## Step 1: Open Figma
${templateInstruction}

If Figma asks you to log in, stop and report that login is needed.

## Step 2: Set Up the Frame
- Create a new frame: 1080 x 1350 pixels (Instagram 4:5 ratio)
- Name the frame: "Signos_${contentType}_ad_${Date.now()}"

## Step 3: Place the Background Image
- Download or paste this image as the background: ${backgroundImageUrl}
- The image should fill the entire frame (use "Fill" mode, not "Fit")
- If needed, adjust the image position so the most important part is visible

## Step 4: Add a Dark Gradient Overlay
- Add a rectangle over the entire frame
- Set its fill to a linear gradient:
  - Top: transparent (rgba 0,0,0, 0%)
  - Bottom: dark (rgba 0,0,0, 70%)
- This ensures text is readable over the background image

## Step 5: Add Text Content
Content type: **${contentType}**

${contentType === "testimonial" ? `
### Testimonial Quote Card Layout:
1. **Main Quote** — Place in the center-upper area of the frame:
   - Text: "${headline}"
   - Font: Playfair Display, Italic
   - Size: 42-48px
   - Color: White (#FFFFFF)
   - Add quotation marks around the text
   - Center-aligned
   - Max width: 900px (leave padding on sides)

2. **Attribution** — Below the quote, centered:
   - Text: "${attribution || "— Signos Member"}"
   - Font: Inter, Regular
   - Size: 18px
   - Color: White at 70% opacity (#FFFFFFB3)
   - Center-aligned
` : contentType === "data_card" ? `
### Data Card Layout:
1. **Big Stat/Headline** — Center of the frame, large and bold:
   - Text: "${headline}"
   - Font: Inter, Black (900 weight)
   - Size: 56-64px
   - Color: White (#FFFFFF)
   - ALL CAPS
   - Center-aligned
   - Max width: 900px

2. **Supporting Text** — Below the headline:
   - Text: "${subheadline || ""}"
   - Font: Inter, Regular
   - Size: 20px
   - Color: White at 80% opacity
   - Center-aligned
` : contentType === "lifestyle" ? `
### Lifestyle Ad Layout:
1. **Headline** — Bottom third of the frame, over the gradient:
   - Text: "${headline}"
   - Font: Inter, Bold
   - Size: 40-48px
   - Color: White (#FFFFFF)
   - Left-aligned or center-aligned
   - Max width: 850px

2. **Subheadline** — Below the headline:
   - Text: "${subheadline || ""}"
   - Font: Inter, Regular
   - Size: 18px
   - Color: White at 80% opacity
` : `
### Food Comparison Layout:
1. **Headline** — Top or center of the frame:
   - Text: "${headline}"
   - Font: Inter, Bold
   - Size: 44-52px
   - Color: White (#FFFFFF)
   - Center-aligned

2. **Supporting Text** — Below:
   - Text: "${subheadline || ""}"
   - Font: Inter, Regular
   - Size: 20px
   - Color: White at 80% opacity
`}

## Step 6: Add the CTA Button
- At the bottom of the frame (about 80px from the bottom edge), centered:
- Create a rounded rectangle (pill shape): ~300px wide, 48px tall, corner radius 24px
- Fill color: Teal (#0D9488)
- Inside the pill, add text:
  - Text: "${ctaText}"
  - Font: Inter, Bold
  - Size: 16px
  - Color: White (#FFFFFF)
  - Center-aligned both horizontally and vertically within the pill

## Step 7: Add Signos Branding (Subtle)
- In the top-left or top-right corner, add small text:
  - Text: "signos"
  - Font: Inter, Medium
  - Size: 14px
  - Color: White at 50% opacity
  - This is a subtle brand watermark

## Step 8: Review the Design
Before exporting, check:
- [ ] All text is readable over the background
- [ ] No text is cut off or overflowing
- [ ] The gradient overlay makes text legible
- [ ] The CTA button is clearly visible
- [ ] Overall composition looks professional and balanced
- [ ] No spelling errors in any text

If anything looks wrong, fix it. Adjust font sizes, move elements, change the gradient opacity — use your visual judgment.

## Step 9: Export
- Select the frame
- Go to File → Export or use the export panel
- Export as PNG at 2x scale
- Save to the desktop or downloads folder

## Step 10: Commit the Result
- Save the exported PNG to this repository under: generated-ads/
- Name it: signos_${contentType}_${Date.now()}.png
- Commit with message: "Generated Signos ${contentType} ad: ${headline.substring(0, 50)}"

${style ? `\nDesign style notes: ${style}` : ""}
${targetEmotion ? `\nTarget emotion: ${targetEmotion}` : ""}
${notes ? `\nAdditional notes: ${notes}` : ""}

## IMPORTANT RULES
- Use ONLY real, properly spelled text. Double-check every word.
- NEVER include CGM devices, glucose monitors, or medical sensors in the design.
- The ad should look like it was made by a professional designer, not AI.
- If Figma is slow or unresponsive, wait and retry — don't skip steps.
- Record your screen as you work so the result can be verified.`;
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

  const apiKey = Netlify.env.get("CURSOR_API_KEY");
  if (!apiKey) {
    return Response.json(
      { error: "CURSOR_API_KEY not configured" },
      { status: 500 }
    );
  }

  const authHeader =
    "Basic " + Buffer.from(apiKey + ":").toString("base64");

  try {
    const body: FigmaAgentRequest = await req.json();

    switch (body.action) {
      case "launch": {
        if (!body.adConcept) {
          return Response.json(
            { error: "adConcept required for launch" },
            { status: 400 }
          );
        }

        const prompt = buildFigmaPrompt(body.adConcept);

        const response = await fetch(`${CURSOR_API}/agents`, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: { text: prompt },
            source: {
              repository: REPO_URL,
              ref: "main",
            },
            model: "claude-4.6-opus-high-thinking",
            target: {
              branchName: `ad-gen/${body.adConcept.contentType}-${Date.now()}`,
              autoCreatePr: false,
            },
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          return Response.json(
            {
              error: `Cursor API error: ${response.status}`,
              details: errText,
            },
            { status: 502 }
          );
        }

        const data = await response.json();
        return Response.json({
          success: true,
          agentId: data.id,
          status: data.status,
          agent: data,
        });
      }

      case "status": {
        if (!body.agentId) {
          return Response.json(
            { error: "agentId required" },
            { status: 400 }
          );
        }

        const response = await fetch(
          `${CURSOR_API}/agents/${body.agentId}`,
          {
            headers: { Authorization: authHeader },
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          return Response.json(
            { error: `Status check failed: ${response.status}`, details: errText },
            { status: 502 }
          );
        }

        const data = await response.json();
        return Response.json({ success: true, agent: data });
      }

      case "followup": {
        if (!body.agentId || !body.followupText) {
          return Response.json(
            { error: "agentId and followupText required" },
            { status: 400 }
          );
        }

        const response = await fetch(
          `${CURSOR_API}/agents/${body.agentId}/followup`,
          {
            method: "POST",
            headers: {
              Authorization: authHeader,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              prompt: { text: body.followupText },
            }),
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          return Response.json(
            { error: `Followup failed: ${response.status}`, details: errText },
            { status: 502 }
          );
        }

        const data = await response.json();
        return Response.json({ success: true, agent: data });
      }

      case "list": {
        const response = await fetch(`${CURSOR_API}/agents?limit=20`, {
          headers: { Authorization: authHeader },
        });

        if (!response.ok) {
          const errText = await response.text();
          return Response.json(
            { error: `List failed: ${response.status}`, details: errText },
            { status: 502 }
          );
        }

        const data = await response.json();
        return Response.json({ success: true, agents: data.agents || [] });
      }

      default:
        return Response.json(
          { error: "Invalid action. Use: launch, status, followup, list" },
          { status: 400 }
        );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
