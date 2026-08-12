# TravelDash OpenClaw Bridge

This bridge is the narrow HTTP endpoint Vercel calls through
`OPENCLAW_TRAVEL_AGENT_URL`.

## Endpoints

- `GET /health` returns bridge health.
- `POST /travel-agent` accepts the TravelDash chat payload and returns
  `{ "answer": "...", "cards": [] }`.

`POST /travel-agent` requires `Authorization: Bearer <token>` when
`OPENCLAW_TRAVEL_AGENT_TOKEN` is set.

## Local Runtime

- Bridge script: `bridge/travel-agent-bridge.mjs`
- Launcher: `bridge/start-travel-agent-bridge.ps1`
- Local URL: `http://127.0.0.1:8787/travel-agent`
- Startup task: `TravelDash-OpenClaw-Bridge`
- Token file:
  `C:\Users\sac73\.openclaw\state\secrets\traveldash-openclaw-bridge-token.txt`

The bridge calls the local model endpoint at `http://127.0.0.1:18080/v1` by
default. Keep the Qwen local model task `OpenClaw-Qwen36-27B` running.

For live travel-search requests, the bridge can run the local scraper at
`D:\OpenClaw\TravelScraper`. It only routes known travel requests into fixed
scraper commands, one destination or cruise port per request. Supported direct
targets are Miami, San Francisco, Seattle, Boston, New York City, Paris,
Dublin, Galveston cruises, and Miami cruises; broad deal requests use the
scraper's deal-discovery command.

## Public Tunnel

The current public path uses an accountless Cloudflare quick tunnel pointed at
`127.0.0.1:8787`. It is suitable for testing and temporary production use, but
the URL is not guaranteed to survive restarts. Replace it with a named
Cloudflare tunnel for durable uptime.
