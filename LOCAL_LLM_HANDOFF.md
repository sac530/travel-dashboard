# TravelDash Local LLM Handoff

This project is a private travel package dashboard. Keep changes narrow and preserve the existing Supabase, Vercel, and OpenClaw setup.

Use this file as the first stop for smaller/local models. The job is not to redesign the app; it is to keep intake moving into useful travel package cards.

## What Matters

- Main app: `app/page.tsx` renders either `components/LoginGate.tsx` or `components/Dashboard.tsx`.
- Auth gate: Supabase email/password auth plus a signed HTTP-only app cookie.
  Users must have `travel_dash_access = true` in Supabase auth app metadata.
  Production uses `TRAVEL_DASHBOARD_SESSION_SECRET` in Vercel.
- Data client: `lib/supabase.ts`.
- Data helpers: `lib/api.ts`.
- Package cards: `components/PackageGrid.tsx`.
- Master calendar: `MASTER_CALENDAR.md` plus `data/master-calendar.json`, rendered by `components/MasterCalendar.tsx`.
- Intake form: `components/IntakeSection.tsx`, writes pending rows to `intake_submissions`.
- Upload form: `components/UploadSection.tsx`, writes rows to `manual_uploads`.
- Scraper engine: `D:\OpenClaw\TravelScraper`.
- Scraper results: `D:\OpenClaw\TravelScraper\results`.

## Database Expectations

Run `sup_schema.sql` if tables are missing. The app expects these tables:

- `packages`
- `deals`
- `extras`
- `manual_uploads`
- `intake_submissions`

If Supabase has no active packages, the dashboard shows a clean empty state ("No packages yet") and automatically queues an auto-refresh. It NEVER shows sample cards (removed 2026-08-31 per Boss).

## Local Commands

From the dashboard directory:

```powershell
cd C:\Users\sac73\.openclaw\workspace\travel-dashboard
npm run build
npm run dev
```

From the scraper directory:

```powershell
cd D:\OpenClaw\TravelScraper
node src\index.js city Seattle
node src\index.js cruise Galveston
node src\index.js search "cheap cruise under $500" kayak icruise carnival
node src\index.js test
```

One destination per run. Do not batch several cities in one prompt or one long local-model context. Finish one intake row, write the package/deals/extras, then move to the next row.

## Master Calendar Rule

When checking, researching, scraping, comparing, or refreshing any destination or route, add a brief entry to `MASTER_CALENDAR.md` and mirror it in `data/master-calendar.json`.

Use the existing color categories:

- `destination`: US city package checks.
- `international`: international package checks.
- `cruise`: cruise port and sailing checks.
- `research`: exploratory destination, route, provider, or booking research.
- `follow-up`: retry, decision, or future check needed.
- `note`: setup/context entries.

Keep descriptions short and useful: what was checked, where results came from, and the next action if one exists.

## Safe Editing Rules

- Do not touch `.env.local` values unless Boss asks.
- Do not remove the auth gate.
- Do not put user passwords, Supabase service keys, cookies, or OpenClaw tokens
  in source, docs, build output, or chat reports.
- Do not delete untracked intake scripts without checking why they exist.
- Run `npm run build` before deploying.
- If a Supabase insert fails, check table permissions/RLS policies before changing UI code.
- Do not paste Supabase keys, cookies, Vercel tokens, or login passwords into chat reports.
- Do not delete package rows just because they are expired; set `status = 'expired'` or ask Boss about refresh.

## Intake Processing Notes

A pending intake row should become a package like this:

1. Read `intake_submissions` where `status = 'pending'`.
2. Mark one row `processing`.
3. Determine whether it is a city trip, international trip, or cruise request.
4. Run the matching scraper command for only that destination.
5. Review the newest JSON file in `D:\OpenClaw\TravelScraper\results`.
6. Create a `packages` row with `expires_at` about 7 days out.
7. Create related `deals` and destination-specific `extras`.
8. Mark the intake row `completed`.

For manual uploads, read `manual_uploads` where `parsed = false`, extract provider, destination, dates, price, and URL from `content` plus `caption`, then attach it to an existing package or create a new intake row.

## Source Order (set by Boss, 2026-08-23)

For city packages and refreshes:

1. Google Flights + Google Hotels first (use `D:\OpenClaw\TravelScraper\src\scrape_google_trip.py` for flight/hotel checks).
2. Kayak second, as comparison/fallback for flights/hotels.
3. For US destinations, check car rental after flights/hotels; if Kayak cars fail, use Skyscanner, direct rental companies, or other public comparison sources.

## Scraping Rules For The Local Model

- Default origin is `DFW` unless the intake row has a different `origin`.
- US city packages should include flight, hotel, and car/activity deals when available.
- International packages should include flight and hotel deals; skip car rentals unless Boss specifically asks.
- Cruises should use cruise searches and should not be mixed with city flight/hotel runs.
- Google-first order above applies; Kayak is the fallback/comparison source, not the first try.
- Kayak can be flaky. If route scraping fails or returns empty data, check existing `D:\OpenClaw\CamouFox` scripts before inventing a new scraper.
- Skyscanner often blocks with CAPTCHA. Avoid it unless there is already a working local script for the exact purpose; exception: allowed for US car rental when Kayak cars fail.
- For Kayak pages, wait for JavaScript rendering before deciding there are no results. Empty static HTML does not mean no deals.

Recommended destination order for proactive package refreshes:

1. Miami
2. San Francisco
3. Seattle
4. Boston
5. New York City
6. Paris
7. Dublin
8. Galveston cruise
9. Miami cruise

## Auto-Refresh Policy (Boss directive, 2026-08-31)

- **Never show sample cards.** The dashboard has no sample fallback. An empty grid means "refresh in progress".
- **Always auto-refresh.** A daily cron job (`TravelDash Auto-Refresh`, isolated agent) checks `intake_submissions` (pending/processing) and expired/refresh-requested packages, then processes ONE destination per run in the curated order above. The front-end also auto-queues renewals for expired packages when the dashboard is viewed.
- **Look 1-2 months out.** When refreshing, target travel dates 30-60 days from today (not the old expired dates). If an expired package has dates, shift the trip to a comparable window 1-2 months out unless the intake row says otherwise. Keep `expires_at` at +7 days from creation.
- Process one destination per run. When done, the grid updates automatically (front-end polls every 60s for up to 15 minutes after auto-refresh is queued).

## How To Turn Scraper Output Into Cards

Create one `packages` row per trip idea:

- `title`: short useful label, like `Seattle Long Weekend` or `Paris Fall Escape`.
- `destination`: city/port and state/country.
- `origin`: usually `DFW`.
- `start_date` / `end_date`: from intake if present; otherwise leave null rather than guessing.
- `total_price`: sum the best realistic flight + hotel + car/activity choices. If only partial data exists, use the best package estimate and explain missing parts in `notes`.
- `status`: `active`.
- `expires_at`: current time plus 7 days.
- `notes`: include source result file name, assumptions, and anything Boss needs to verify before booking.
- `user_created`: `false` for scraper-created packages, `true` only when Boss manually requested that exact package.

Create several `deals` rows for the package:

- `deal_type`: one of `flight`, `hotel`, `car`, `activity`.
- `provider`: airline, hotel site, rental company, cruise line, or source site.
- `title`: human-readable deal name.
- `description`: concise summary with dates, route, room/car class, stops, or restrictions.
- `price`: current scraped price.
- `original_price`: higher comparison price only when the source provides one; otherwise null.
- `order_url`: direct booking URL if available.
- `booking_details`: JSON with structured scraps like stops, rating, source file, route, nights, or cabin type.
- `rating`: hotel/activity rating if available; otherwise null.

Create `extras` rows that fit the destination, not generic filler:

- Beach: sunscreen, beach transfer, snorkel/beach gear.
- City: transit pass, museum/activity pass, airport transfer.
- International: travel adapter, travel insurance reminder, airport transfer.
- Cruise: port parking/shuttle, gratuities reminder, excursion placeholder.

## Supabase Status Transitions

Use status values exactly as the schema defines:

- `pending`: new intake row waiting for processing.
- `processing`: local model is actively working it.
- `completed`: package/deals/extras were created, or the row was a verified test row that was handled.
- `archived`: old, duplicate, or intentionally ignored row.

If a run fails, do not leave the row stuck in `processing` without a note somewhere. Either restore it to `pending` for retry or mark it `archived` only when it is clearly not actionable.

## Minimum QA Before Saying It Works

1. `npm run build` passes.
2. Login page appears before dashboard content.
3. Login with Boss credentials reaches the package dashboard.
4. Package cards render from Supabase data when available.
5. Intake form creates an `intake_submissions` row.
6. Upload form creates a `manual_uploads` row.
7. Pending test rows created by QA are marked `completed` or removed from the active queue.

## Reporting Back To Boss

Keep reports concise:

- how many pending intake rows were found;
- which destination was processed;
- which scraper command ran;
- how many package/deal/extra rows were created;
- any missing data or failed source;
- whether pending intake is now zero.
