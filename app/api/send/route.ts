/**
 * Server-side proxy that forwards a user-provided payload to the Integration API
 * and returns status + response for display in the UI.
 */
import { safeError } from "@/lib/safeError";

export const runtime = "nodejs";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function POST(request: Request): Promise<Response> {
  const integrationBaseUrl = process.env.INTEGRATION_API_URL;
  const apiKey = process.env.WEBHOOK_API_KEY;
  if (!integrationBaseUrl) return jsonResponse(500, { error: "Missing INTEGRATION_API_URL" });
  if (!apiKey) return jsonResponse(500, { error: "Missing WEBHOOK_API_KEY" });

  const raw = await request.text();
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return jsonResponse(400, { error: "InvalidJson" });
  }

  const url = new URL("/api/webhook/tive", integrationBaseUrl).toString();
  const startedAt = Date.now();
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });
    const latencyMs = Date.now() - startedAt;

    const text = await resp.text();
    let parsedResp: unknown = text;
    try {
      parsedResp = text ? JSON.parse(text) : null;
    } catch {
      // keep as text
    }

    return jsonResponse(200, {
      integration_status: resp.status,
      latency_ms: latencyMs,
      integration_response: parsedResp,
    });
  } catch (e) {
    console.error("send_proxy_error", { error: safeError(e) });
    return jsonResponse(502, { error: "IntegrationApiUnreachable" });
  }
}

