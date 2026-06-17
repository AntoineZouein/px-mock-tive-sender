## Mock Tive Sender

UI for sending preset (and editable) Tive webhook payloads to the Integration API through a server-side proxy route.

Design decisions (proxy, presets, timestamp refresh, payload generator): **[DESIGN_DECISIONS.md](./DESIGN_DECISIONS.md)**

### Deploy to Vercel

1. Push this repo to GitHub and **Import** the project in [Vercel](https://vercel.com) (framework: **Next.js**).
2. Set **Environment Variables** (Production):

| Variable | Required | Notes |
|----------|----------|--------|
| `INTEGRATION_API_URL` | Yes | Base URL of the deployed Integration API (no trailing slash), e.g. `https://your-integration-api.vercel.app` |
| `WEBHOOK_API_KEY` | Yes | One secret from Integration API `WEBHOOK_API_KEYS` (e.g. a key under customer `default`) |

3. **Deploy**, then open the Vercel URL.

4. **Smoke test**: open the UI → load a preset → **Update timestamps to now** → **Send**. Expect a `200` response from the Integration API (shown in the UI). Confirm the payload in Neon or Integration API Vercel logs (`webhook_event_id` / `request_id`).

The Mock Sender has **no database**; it only proxies to the Integration API.

### Local development

1. Install deps:

```bash
npm install
```

2. Create `.env.local` from `.env.example` and set:
   - `INTEGRATION_API_URL` (e.g. `http://localhost:3001`)
   - `WEBHOOK_API_KEY` (one secret value from Integration API `WEBHOOK_API_KEYS`)

3. Run:

```bash
npm run dev
```

Then open the UI and use:
- **Presets** from `fixtures/sample-tive-payloads.json`
- **Update timestamps to now** (important because the Integration API rejects stale timestamps)
- **Send** to call `POST /api/send`, which forwards to the Integration API with `X-API-Key`
