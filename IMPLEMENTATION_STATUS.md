# TravelDash AI Chat Implementation Status

Last updated: 2026-08-11 21:45 CDT.

## Current Architecture

- Next.js 16 App Router site hosted on Vercel.
- `app/page.tsx` renders `LoginGate` or `Dashboard` based on the signed
  `travel_dash_session` HTTP-only cookie.
- Login uses Supabase email/password auth in `app/api/auth/login/route.ts`.
- Supabase users must have `travel_dash_access = true` in app metadata.
- Frontend data helpers in `lib/api.ts` use the public Supabase anon client.
- Core tables are `packages`, `deals`, `extras`, `manual_uploads`, and
  `intake_submissions`; base schema is in `sup_schema.sql`.
- Travel scraping/intake work is handled by local OpenClaw tooling and the
  scraper at `D:\OpenClaw\TravelScraper`.
- Production deploys through GitHub/Vercel from
  `https://github.com/sac530/travel-dashboard`.

## Requested Feature

Add private ChatGPT-style travel chat inside the logged-in website.

Required behavior:

- Authenticated users only.
- Stream replies via SSE or WebSocket.
- Store per-user conversation/session history.
- Travel-only scope: hotels, flights, destinations, restaurants, attractions,
  weather, itineraries, trip research, comparisons, recommendations, and
  updating travel-related data/pages.
- No shell/admin/system/config actions, credential exposure, or unrelated
  OpenClaw work.
- Return structured cards for hotels, flights, deals, restaurants, attractions,
  weather, and itineraries when possible.
- Support follow-ups in the same conversation.
- Preserve existing auth/design/functionality.

## Planned Implementation

1. Commit current working redesign/auth baseline before major changes.
2. Add Supabase chat schema for conversations/messages.
3. Add server-side auth helpers that expose the current user email from the
   signed session token.
4. Add `app/api/chat/*` routes:
   - list/create conversations
   - fetch messages
   - stream assistant responses over SSE
5. Add a restricted OpenClaw travel-agent adapter:
   - default to configured `OPENCLAW_TRAVEL_AGENT_URL` when present
   - otherwise use the local OpenAI-compatible main model endpoint for
     reasoning-only travel responses
   - enforce travel-only input/output guardrails server-side
6. Add `components/TravelChat.tsx` and a `Chat` navbar tab.
7. Render structured result cards in the chat transcript.
8. Run build/lint, local UI smoke tests, deploy, and commit completed feature.

## Continuation Notes

- Keep credentials out of committed files.
- Do not commit scratch scripts ignored by `.gitignore`.
- If OpenClaw does not expose a web-callable bridge yet, ship the app with the
  `OPENCLAW_TRAVEL_AGENT_URL` adapter and local model fallback, then configure
  the bridge as a production env var.
