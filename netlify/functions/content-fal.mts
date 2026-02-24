import type { Context } from "@netlify/functions";

const FAL_QUEUE_API = "https://queue.fal.run";

function queueBase(model: string): string {
  const parts = model.split("/");
  return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : model;
}

interface SubmitRequest {
  action: "submit";
  model: string;
  input: Record<string, unknown>;
}

interface StatusRequest {
  action: "status";
  model: string;
  requestId: string;
}

interface ResultRequest {
  action: "result";
  model: string;
  requestId: string;
}

type FalRequest = SubmitRequest | StatusRequest | ResultRequest;

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

  const falKey = Netlify.env.get("FAL_KEY");
  if (!falKey) {
    return Response.json({ error: "FAL_KEY not configured. Add your fal.ai API key in Netlify environment variables." }, { status: 500 });
  }

  try {
    const body: FalRequest = await req.json();

    const authHeader = { Authorization: `Key ${falKey}` };
    const getHeaders = { ...authHeader, Accept: "application/json" };
    const postHeaders = { ...authHeader, Accept: "application/json", "Content-Type": "application/json" };

    switch (body.action) {
      case "submit": {
        const falUrl = `${FAL_QUEUE_API}/${body.model}`;
        const res = await fetch(falUrl, {
          method: "POST",
          headers: postHeaders,
          body: JSON.stringify(body.input),
        });

        if (!res.ok) {
          const errText = await res.text();
          return Response.json({ error: `fal.ai submit error: ${res.status}`, details: errText, _debug: { falUrl, status: res.status } }, { status: 502 });
        }

        const data = await res.json();
        return Response.json({
          success: true,
          requestId: data.request_id,
          model: body.model,
          _debug: { falUrl, rawKeys: Object.keys(data), statusUrl: data.status_url, responseUrl: data.response_url },
        });
      }

      case "status": {
        const base = queueBase(body.model);
        const falUrl = `${FAL_QUEUE_API}/${base}/requests/${body.requestId}/status`;
        const res = await fetch(falUrl, { method: "GET", headers: getHeaders });

        if (!res.ok) {
          const errText = await res.text();
          return Response.json({ error: `fal.ai status error: ${res.status}`, details: errText, _debug: { falUrl, status: res.status, base, model: body.model } }, { status: 502 });
        }

        const data = await res.json();
        return Response.json({
          success: true,
          status: data.status,
          progress: data.progress || null,
          queuePosition: data.queue_position ?? null,
          _raw: data,
          _debug: { falUrl, rawStatus: data.status, rawKeys: Object.keys(data) },
        });
      }

      case "result": {
        const base = queueBase(body.model);
        const falUrl = `${FAL_QUEUE_API}/${base}/requests/${body.requestId}`;

        // Try with Accept-only headers first (no Content-Type on GET)
        const res1 = await fetch(falUrl, { method: "GET", headers: getHeaders });

        if (res1.ok) {
          const data = await res1.json();

          // If response contains actual model output, return it
          if (data.response && typeof data.response === "object") {
            return Response.json({
              success: true,
              output: data.response,
              _debug: { falUrl, method: "GET-response-key", outputKeys: Object.keys(data.response), wrapperKeys: Object.keys(data) },
            });
          }

          // Check for direct model output (images/audio/video at top level)
          if (data.images || data.audio || data.video || data.image) {
            return Response.json({
              success: true,
              output: data,
              _debug: { falUrl, method: "GET-direct", outputKeys: Object.keys(data) },
            });
          }

          // Got queue metadata instead of output — return it with diagnostic info
          return Response.json({
            success: true,
            output: data,
            _debug: { falUrl, method: "GET-metadata", outputKeys: Object.keys(data), note: "Got queue metadata, not model output" },
          });
        }

        // GET failed — capture full error for diagnostics
        const err1Status = res1.status;
        const err1Text = await res1.text();

        // Retry with Content-Type header (matching SDK behavior)
        const res2 = await fetch(falUrl, { method: "GET", headers: postHeaders });
        if (res2.ok) {
          const data = await res2.json();
          const output = data.response && typeof data.response === "object" ? data.response : data;
          return Response.json({
            success: true,
            output,
            _debug: { falUrl, method: "GET-with-ct", outputKeys: Object.keys(output), wrapperKeys: Object.keys(data) },
          });
        }

        const err2Status = res2.status;
        const err2Text = await res2.text();

        return Response.json({
          error: `fal.ai result error: ${err1Status}`,
          details: err1Text,
          _debug: {
            falUrl,
            attempt1: { status: err1Status, body: err1Text?.substring(0, 500) },
            attempt2: { status: err2Status, body: err2Text?.substring(0, 500) },
          },
        }, { status: 502 });
      }

      default:
        return Response.json({ error: "Invalid action. Use: submit, status, result" }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
