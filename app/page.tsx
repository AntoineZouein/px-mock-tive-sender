"use client";

/**
 * Mock sender UI: pick preset payloads, edit JSON, generate valid samples,
 * and send through the server-side proxy route.
 */
import { useMemo, useState } from "react";
import samples from "../fixtures/sample-tive-payloads.json";

type Preset = { kind: "valid" | "invalid"; name: string; description: string; payload: unknown };

function tryParseJson(text: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid JSON" };
  }
}

function updateTimestampsToNow(payload: unknown): unknown {
  if (typeof payload !== "object" || payload === null) return payload;
  const copy = structuredClone(payload) as Record<string, unknown>;
  const now = Date.now();
  copy.EntryTimeEpoch = now;
  copy.EntryTimeUtc = new Date(now).toISOString();
  return copy;
}

function randomDigits(len: number): string {
  let s = "";
  for (let i = 0; i < len; i++) s += Math.floor(Math.random() * 10).toString();
  return s;
}

type LocationMethod = "gps" | "wifi" | "cell";

const LOCATION_METHODS: LocationMethod[] = ["gps", "wifi", "cell"];

function nextLocationMethod(current: LocationMethod): LocationMethod {
  const i = LOCATION_METHODS.indexOf(current);
  return LOCATION_METHODS[(i + 1) % LOCATION_METHODS.length]!;
}

function generateValidPayload(method: LocationMethod): Record<string, unknown> {
  const now = Date.now();
  const deviceLetter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const deviceName = `${deviceLetter}${Math.floor(100000 + Math.random() * 900000)}`;
  const imei = randomDigits(15);

  const accuracyMeters = method === "gps" ? 5 : method === "wifi" ? 23 : 500;
  const wifiCount = method === "wifi" ? 5 : 0;
  const cellCount = method === "cell" ? 3 : method === "wifi" ? 1 : 0;

  return {
    EntityName: deviceName,
    EntryTimeEpoch: now,
    EntryTimeUtc: new Date(now).toISOString(),
    Cellular: { SignalStrength: "Good", Dbm: -75 },
    Temperature: { Celsius: 4.5, Fahrenheit: 40.1 },
    Humidity: { Percentage: 55.3 },
    Accelerometer: { G: 1.012, X: 0.125, Y: -0.25, Z: 0.98 },
    Light: { Lux: 125.5 },
    Battery: { Percentage: 82, Estimation: "Weeks", IsCharging: false },
    AccountId: 478,
    DeviceId: imei,
    DeviceName: deviceName,
    ShipmentId: null,
    PublicShipmentId: null,
    Location: {
      Latitude: 37.7749,
      Longitude: -122.4194,
      FormattedAddress: "San Francisco, CA 94102, USA",
      LocationMethod: method,
      Accuracy: {
        Meters: accuracyMeters,
        Kilometers: accuracyMeters / 1000,
        Miles: accuracyMeters / 1609.34,
      },
      GeolocationSourceName: method === "gps" ? "gnss" : method === "wifi" ? "skyhook" : "cell-triangulation",
      CellTowerUsedCount: cellCount,
      WifiAccessPointUsedCount: wifiCount,
    },
  };
}

export default function Home() {
  const presets: Preset[] = useMemo(() => {
    const valid = samples.payloads.map((p) => ({ kind: "valid" as const, ...p }));
    const invalid = samples.invalid_payloads.map((p) => ({ kind: "invalid" as const, ...p }));
    return [...valid, ...invalid];
  }, []);

  const [selectedName, setSelectedName] = useState(presets[0]?.name ?? "");
  const [jsonText, setJsonText] = useState(() => JSON.stringify((presets[0] as Preset | undefined)?.payload ?? {}, null, 2));
  const [lastResult, setLastResult] = useState<unknown>(null);
  const [sending, setSending] = useState(false);
  const [nextGenerateMethod, setNextGenerateMethod] = useState<LocationMethod>("gps");

  function loadPreset(name: string) {
    const preset = presets.find((p) => p.name === name);
    if (!preset) return;
    setSelectedName(name);
    setJsonText(JSON.stringify(preset.payload, null, 2));
    setLastResult(null);
  }

  async function send() {
    setSending(true);
    setLastResult(null);
    try {
      const parsed = tryParseJson(jsonText);
      if (!parsed.ok) {
        setLastResult({ error: "InvalidJson", message: parsed.error });
        return;
      }
      const resp = await fetch("/api/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.value),
      });
      const body = await resp.json();
      setLastResult(body);
    } catch (e) {
      setLastResult({ error: "SendFailed", message: e instanceof Error ? e.message : String(e) });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6 text-zinc-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Mock Tive Sender</h1>
          <p className="text-sm text-zinc-600">
            Load presets (valid + invalid), edit JSON, optionally update timestamps to now, and send via a server-side proxy.
          </p>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-3 md:col-span-1">
            <label className="block text-sm font-medium">Preset</label>
            <select
              className="w-full rounded border border-zinc-200 bg-white p-2"
              value={selectedName}
              onChange={(e) => loadPreset(e.target.value)}
            >
              {presets.map((p) => (
                <option key={`${p.kind}-${p.name}`} value={p.name}>
                  {p.kind === "valid" ? "[valid]" : "[invalid]"} {p.name}
                </option>
              ))}
            </select>

            <div className="flex flex-col gap-2">
              <button
                className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                onClick={() => {
                  const parsed = tryParseJson(jsonText);
                  setJsonText(JSON.stringify(updateTimestampsToNow(parsed.ok ? parsed.value : {}), null, 2));
                }}
              >
                Update timestamps to now
              </button>
              <button
                className="rounded border border-zinc-200 bg-white px-3 py-2 text-sm font-medium"
                onClick={() => {
                  setJsonText(JSON.stringify(generateValidPayload(nextGenerateMethod), null, 2));
                  setNextGenerateMethod(nextLocationMethod(nextGenerateMethod));
                }}
              >
                Generate valid payload ({nextGenerateMethod})
              </button>
              <button
                className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                onClick={send}
                disabled={sending}
              >
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>

          <div className="space-y-3 md:col-span-2">
            <label className="block text-sm font-medium">Payload JSON</label>
            <textarea
              className="h-[420px] w-full rounded border border-zinc-200 bg-white p-3 font-mono text-xs"
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              spellCheck={false}
            />
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-medium">Last result</h2>
          <pre className="overflow-auto rounded border border-zinc-200 bg-white p-3 text-xs">
            {lastResult === null ? "—" : JSON.stringify(lastResult, null, 2)}
          </pre>
        </section>
      </div>
    </div>
  );
}
