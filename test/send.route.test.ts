/**
 * Send proxy route tests (mocked fetch to Integration API).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockFetch = vi.fn();

vi.stubGlobal("fetch", mockFetch);

import { POST } from "@/app/api/send/route";

function sendRequest(body: string): Request {
  return new Request("http://localhost/api/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

describe("POST /api/send", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    delete process.env.INTEGRATION_API_URL;
    delete process.env.WEBHOOK_API_KEY;
    process.env.INTEGRATION_API_URL = "http://integration.test";
    process.env.WEBHOOK_API_KEY = "proxy-secret";
  });

  afterEach(() => {
    delete process.env.INTEGRATION_API_URL;
    delete process.env.WEBHOOK_API_KEY;
  });

  it("returns 500 when INTEGRATION_API_URL is missing", async () => {
    delete process.env.INTEGRATION_API_URL;
    const resp = await POST(sendRequest("{}"));
    expect(resp.status).toBe(500);
    const body = await resp.json();
    expect(body.error).toBe("Missing INTEGRATION_API_URL");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns 500 when WEBHOOK_API_KEY is missing", async () => {
    delete process.env.WEBHOOK_API_KEY;
    const resp = await POST(sendRequest("{}"));
    expect(resp.status).toBe(500);
    const body = await resp.json();
    expect(body.error).toBe("Missing WEBHOOK_API_KEY");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns 400 when request body is not valid JSON", async () => {
    const resp = await POST(sendRequest("{not-json"));
    expect(resp.status).toBe(400);
    const body = await resp.json();
    expect(body.error).toBe("InvalidJson");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("forwards payload to Integration API and returns status + response", async () => {
    const integrationBody = { webhook_event_id: "evt-1", sensor: { device_id: "A571992" } };
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify(integrationBody), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const payload = { EntryTimeEpoch: 1, EntityName: "A571992" };
    const resp = await POST(sendRequest(JSON.stringify(payload)));
    expect(resp.status).toBe(200);
    const body = await resp.json();
    expect(body.integration_status).toBe(200);
    expect(body.integration_response).toEqual(integrationBody);
    expect(typeof body.latency_ms).toBe("number");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://integration.test/api/webhook/tive",
      expect.objectContaining({
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": "proxy-secret",
        },
        body: JSON.stringify(payload),
      }),
    );
  });

  it("returns 502 when Integration API is unreachable", async () => {
    mockFetch.mockRejectedValue(new Error("network down"));
    const resp = await POST(sendRequest("{}"));
    expect(resp.status).toBe(502);
    const body = await resp.json();
    expect(body.error).toBe("IntegrationApiUnreachable");
  });
});
