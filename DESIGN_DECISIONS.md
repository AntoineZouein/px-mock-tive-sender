# Design Decisions & Assumptions

Record of decided behavior for the Mock Tive Sender. Integration API transform, schema, and ingest rules live in that repo’s `DESIGN_DECISIONS.md`.

Each entry uses:
- **Decision** — what we do
- **Justification** — why
- **Alternatives** — close options considered (when applicable)

---

## Server-side proxy (`POST /api/send`)

**Decision**

Browser calls **Mock Sender** `POST /api/send`; the route forwards the JSON body to Integration API `POST /api/webhook/tive` with `X-API-Key` from server env (`WEBHOOK_API_KEY` must match one of the secrets in Integration API `WEBHOOK_API_KEYS`). UI displays `integration_status`, `latency_ms`, and parsed `integration_response`.

**Justification**

Keeps the API key off the client. Matches how a real integrator would call the webhook from a backend. Proxy returns **200** with wrapped integration status even when the Integration API returns 4xx (so the UI can always show the downstream body).

**Alternatives**

- Browser calls Integration API directly — exposes secret; CORS configuration on the API.

---

## Presets and editable JSON

**Decision**

UI loads `fixtures/sample-tive-payloads.json` (`payloads` + `invalid_payloads`) as presets. User can edit JSON in a textarea before send.

**Justification**

Exercise provides sample payloads; editable JSON supports ad-hoc edge-case testing without redeploying.

---

## Timestamp refresh

**Decision**

**Update timestamps to now** sets `EntryTimeEpoch` and `EntryTimeUtc` on the current editor JSON to `Date.now()` / ISO string.

**Justification**

Integration API rejects stale/future timestamps (12-hour past / 5-minute future window). Presets ship with fixed epochs that would fail without refresh.

---

## Generated valid payloads (cycling location method)

**Decision**

**Generate valid payload** builds a minimal valid Tive object in the browser: uppercase letter + digits `device_id` / `DeviceName` (`^[A-Z]\d+$`), random 15-digit `DeviceId`, current timestamps, and `Location.LocationMethod` rotating **gps → wifi → cell** on each click (button label shows the method used for that generation).

**Justification**

Quick smoke tests without hand-editing. Cycling methods exercises `location_source` / accuracy paths without a dropdown. Letter-prefixed device IDs align with Integration API `^[A-Z]\d+$` rule.

**Alternatives**

- Fixed method per generator — less coverage per click.
- Location-method dropdown — removed in favor of rotate-on-click.

---

## Scope

**Decision**

No database. No transform logic — pass-through to Integration API only. No automated tests in this repo (manual UI testing).

**Justification**

Part 2 is a thin sender; correctness is validated by Integration API tests and end-to-end sends.
