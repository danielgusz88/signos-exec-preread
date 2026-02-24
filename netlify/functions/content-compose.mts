import type { Context } from "@netlify/functions";

const SHOTSTACK_SANDBOX = "https://api.shotstack.io/stage";
const SHOTSTACK_PROD = "https://api.shotstack.io/v1";

interface ComposeSubmitRequest {
  action: "submit";
  clipUrls: string[];
  audioUrl: string;
  hookText?: string;
  ctaText?: string;
  enableTextOverlay?: boolean;
  aspectRatio?: string;
  videoDuration?: number;
}

interface ImageComposeSubmitRequest {
  action: "submit_image";
  imageUrl: string;
  headline: string;
  subheadline?: string;
  ctaText: string;
  textColor?: "white" | "dark";
  aspectRatio?: string;
  adStyle?: "standard" | "testimonial" | "data_card";
}

interface ComposeStatusRequest {
  action: "status";
  renderId: string;
}

type ComposeRequest = ComposeSubmitRequest | ImageComposeSubmitRequest | ComposeStatusRequest;

function buildImageAdTimeline(req: ImageComposeSubmitRequest) {
  const isDark = req.textColor === "dark";
  const headlineColor = isDark ? "#1a1a1a" : "#ffffff";
  const subColor = isDark ? "#444444" : "#e0e0e0";
  const shadowColor = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.6)";
  const ctaBg = "#0D9488";
  const style = req.adStyle || "standard";

  const outputWidth = 1080;
  const outputHeight = req.aspectRatio === "1:1" ? 1080 : 1440;
  const textClips: Array<Record<string, unknown>> = [];

  if (style === "testimonial") {
    // Large centered quote with quotation marks
    if (req.headline) {
      textClips.push({
        asset: {
          type: "html",
          html: `<div style="font-family:Georgia,'Times New Roman',serif;color:${headlineColor};font-size:50px;font-weight:400;text-align:center;font-style:italic;line-height:1.35;padding:20px 60px;text-shadow:0 2px 10px ${shadowColor};">&ldquo;${escapeHtml(req.headline)}&rdquo;</div>`,
          width: 960,
          height: 500,
        },
        start: 0, length: 1,
        offset: { y: -0.08 },
      });
    }
    if (req.subheadline) {
      textClips.push({
        asset: {
          type: "html",
          html: `<div style="font-family:'Helvetica Neue',Arial,sans-serif;color:${subColor};font-size:28px;font-weight:500;text-align:center;letter-spacing:1px;padding:5px 60px;text-shadow:0 1px 6px ${shadowColor};">${escapeHtml(req.subheadline)}</div>`,
          width: 800,
          height: 120,
        },
        start: 0, length: 1,
        offset: { y: 0.18 },
      });
    }
  } else if (style === "data_card") {
    // Big bold stat headline centered, subheadline below
    if (req.headline) {
      textClips.push({
        asset: {
          type: "html",
          html: `<div style="font-family:'Helvetica Neue',Arial,sans-serif;color:${headlineColor};font-size:72px;font-weight:900;text-align:center;text-transform:uppercase;letter-spacing:-2px;line-height:1.05;padding:20px 50px;text-shadow:0 2px 10px ${shadowColor};">${escapeHtml(req.headline)}</div>`,
          width: 1000,
          height: 400,
        },
        start: 0, length: 1,
        offset: { y: -0.15 },
      });
    }
    if (req.subheadline) {
      textClips.push({
        asset: {
          type: "html",
          html: `<div style="font-family:'Helvetica Neue',Arial,sans-serif;color:${subColor};font-size:30px;font-weight:400;text-align:center;line-height:1.4;padding:10px 80px;text-shadow:0 1px 6px ${shadowColor};">${escapeHtml(req.subheadline)}</div>`,
          width: 1000,
          height: 250,
        },
        start: 0, length: 1,
        offset: { y: 0.08 },
      });
    }
  } else {
    // Standard: headline top, subheadline middle
    if (req.headline) {
      textClips.push({
        asset: {
          type: "html",
          html: `<div style="font-family:'Helvetica Neue',Arial,sans-serif;color:${headlineColor};font-size:62px;font-weight:900;text-align:center;text-transform:uppercase;letter-spacing:-1px;line-height:1.1;padding:30px 50px;text-shadow:0 2px 12px ${shadowColor},0 1px 3px ${shadowColor};">${escapeHtml(req.headline)}</div>`,
          width: 1000,
          height: 350,
        },
        start: 0, length: 1,
        offset: { y: -0.33 },
      });
    }
    if (req.subheadline) {
      textClips.push({
        asset: {
          type: "html",
          html: `<div style="font-family:'Helvetica Neue',Arial,sans-serif;color:${subColor};font-size:34px;font-weight:500;text-align:center;line-height:1.3;padding:10px 60px;text-shadow:0 1px 8px ${shadowColor};">${escapeHtml(req.subheadline)}</div>`,
          width: 1000,
          height: 200,
        },
        start: 0, length: 1,
        offset: { y: -0.12 },
      });
    }
  }

  // CTA button — bottom area (all styles)
  if (req.ctaText) {
    textClips.push({
      asset: {
        type: "html",
        html: `<div style="display:inline-block;font-family:'Helvetica Neue',Arial,sans-serif;color:#ffffff;font-size:30px;font-weight:700;text-align:center;padding:16px 48px;background:${ctaBg};border-radius:50px;letter-spacing:0.5px;box-shadow:0 4px 16px rgba(0,0,0,0.3);">${escapeHtml(req.ctaText)}</div>`,
        width: 600,
        height: 110,
      },
      start: 0, length: 1,
      offset: { y: 0.38 },
    });
  }

  // Gradient overlay for readability
  const gradientOverlay = isDark
    ? `<div style="width:100%;height:100%;background:linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 30%, rgba(255,255,255,0) 75%, rgba(255,255,255,0.2) 100%);"></div>`
    : `<div style="width:100%;height:100%;background:linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.1) 30%, rgba(0,0,0,0.1) 75%, rgba(0,0,0,0.35) 100%);"></div>`;

  const tracks = [
    { clips: textClips },
    { clips: [{ asset: { type: "html", html: gradientOverlay, width: outputWidth, height: outputHeight }, start: 0, length: 1 }] },
    { clips: [{ asset: { type: "image", src: req.imageUrl }, start: 0, length: 1, fit: "cover" }] },
  ];

  return {
    timeline: { tracks },
    output: {
      format: "jpg" as const,
      quality: "high" as const,
      size: { width: outputWidth, height: outputHeight },
    },
  };
}

function buildTimeline(req: ComposeSubmitRequest) {
  const isSingleClip = req.clipUrls.length === 1;
  const totalDuration = req.videoDuration || (isSingleClip ? 30 : req.clipUrls.length * 10);
  const clipDuration = isSingleClip ? totalDuration : 10;

  const videoClips = req.clipUrls.map((url, i) => ({
    asset: { type: "video", src: url, trim: 0 },
    start: i * clipDuration,
    length: clipDuration,
    transition: isSingleClip ? undefined : (i > 0 ? { in: "fade", out: "fade" } : { out: "fade" }),
  }));

  const tracks: Array<{ clips: Array<Record<string, unknown>> }> = [
    { clips: videoClips },
  ];

  if (req.enableTextOverlay && (req.hookText || req.ctaText)) {
    const textClips: Array<Record<string, unknown>> = [];

    if (req.hookText) {
      textClips.push({
        asset: {
          type: "html",
          html: `<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:white;font-size:48px;font-weight:800;text-align:center;text-shadow:0 2px 8px rgba(0,0,0,0.7);padding:0 40px;line-height:1.2;">${escapeHtml(req.hookText)}</div>`,
          width: 1080,
          height: 400,
          position: "center",
        },
        start: 0,
        length: 4,
        transition: { in: "fade", out: "fade" },
        offset: { y: -0.15 },
      });
    }

    if (req.ctaText) {
      textClips.push({
        asset: {
          type: "html",
          html: `<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:white;font-size:40px;font-weight:700;text-align:center;text-shadow:0 2px 8px rgba(0,0,0,0.7);padding:20px 40px;background:rgba(0,0,0,0.4);border-radius:16px;">${escapeHtml(req.ctaText)}</div>`,
          width: 1080,
          height: 300,
          position: "center",
        },
        start: totalDuration - 5,
        length: 5,
        transition: { in: "fade" },
        offset: { y: 0.2 },
      });
    }

    if (textClips.length > 0) {
      tracks.unshift({ clips: textClips });
    }
  }

  const timeline: Record<string, unknown> = { tracks };

  if (req.audioUrl) {
    timeline.soundtrack = {
      src: req.audioUrl,
      effect: "fadeOut",
    };
  }

  const isVertical = !req.aspectRatio || req.aspectRatio.includes("9:16");

  return {
    timeline,
    output: {
      format: "mp4",
      resolution: "hd",
      size: isVertical ? { width: 1080, height: 1920 } : { width: 1080, height: 1080 },
      fps: 30,
    },
  };
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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

  const apiKey = Netlify.env.get("SHOTSTACK_API_KEY");
  if (!apiKey) {
    return Response.json({ error: "SHOTSTACK_API_KEY not configured. Sign up free at https://dashboard.shotstack.io/register" }, { status: 500 });
  }

  const useProd = Netlify.env.get("SHOTSTACK_ENV") === "production";
  const baseUrl = useProd ? SHOTSTACK_PROD : SHOTSTACK_SANDBOX;

  try {
    const body: ComposeRequest = await req.json();

    switch (body.action) {
      case "submit": {
        if (!body.clipUrls?.length) {
          return Response.json({ error: "clipUrls required" }, { status: 400 });
        }

        const edit = buildTimeline(body);

        const res = await fetch(`${baseUrl}/render`, {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(edit),
        });

        if (!res.ok) {
          const errText = await res.text();
          return Response.json({ error: `Shotstack render error: ${res.status}`, details: errText }, { status: 502 });
        }

        const data = await res.json();
        return Response.json({
          success: true,
          renderId: data.response?.id,
          message: data.response?.message,
        });
      }

      case "submit_image": {
        if (!body.imageUrl || !body.headline) {
          return Response.json({ error: "imageUrl and headline required" }, { status: 400 });
        }

        const imgEdit = buildImageAdTimeline(body);

        const res = await fetch(`${baseUrl}/render`, {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(imgEdit),
        });

        if (!res.ok) {
          const errText = await res.text();
          return Response.json({ error: `Shotstack image render error: ${res.status}`, details: errText }, { status: 502 });
        }

        const data = await res.json();
        return Response.json({
          success: true,
          renderId: data.response?.id,
          message: data.response?.message,
        });
      }

      case "status": {
        if (!body.renderId) {
          return Response.json({ error: "renderId required" }, { status: 400 });
        }

        const res = await fetch(`${baseUrl}/render/${body.renderId}`, {
          headers: { "x-api-key": apiKey },
        });

        if (!res.ok) {
          const errText = await res.text();
          return Response.json({ error: `Shotstack status error: ${res.status}`, details: errText }, { status: 502 });
        }

        const data = await res.json();
        const render = data.response;

        return Response.json({
          success: true,
          status: render?.status,
          url: render?.url || null,
          poster: render?.poster || null,
          _debug: { rawStatus: render?.status, rawKeys: render ? Object.keys(render) : [] },
        });
      }

      default:
        return Response.json({ error: "Invalid action. Use: submit, submit_image, status" }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
