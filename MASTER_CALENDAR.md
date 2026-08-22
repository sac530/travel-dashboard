# Master Calendar

This is the workspace source of truth for TravelDash calendar notes.

When I check, research, scrape, compare, or refresh any travel destination, add an entry here and mirror it in `data/master-calendar.json` so the dashboard calendar tab stays current.

## Color Categories

- `destination`: US city package checks, usually flights + hotels + cars/activities.
- `international`: international package checks, usually flights + hotels.
- `cruise`: cruise port and sailing checks.
- `research`: exploratory destination, route, provider, or booking research.
- `follow-up`: item that needs another check, retry, or decision.
- `note`: setup notes and general calendar context.

## Entries

| Date | Category | Destination | Brief Description | Source |
| --- | --- | --- | --- | --- |
| 2026-08-13 | note | TravelDash | Master calendar started so checked destinations, research runs, and follow-ups have one place to land. | Telegram request 5540 |
| 2026-08-14 | destination | Miami | Check DFW to MIA flights, hotels, and car/activity options. | Travel scraper curated destination list |
| 2026-08-14 | research | DFW Group A Flight Sweep | Completed DFW to BOS/NYC/MIA flight deal sweep; best finds included MIA $114, NYC $142, BOS $159. | D:\OpenClaw\TravelScraper\results\flights-us-a-2026-08-14.json |
| 2026-08-15 | destination | San Francisco | Check DFW to SFO flights, hotels, and car/activity options. | Travel scraper curated destination list |
| 2026-08-16 | destination | Seattle | Check DFW to SEA flights, hotels, and car/activity options. | Travel scraper curated destination list |
| 2026-08-17 | destination | Boston | Check DFW to BOS flights, hotels, and car/activity options. | Travel scraper curated destination list |
| 2026-08-18 | destination | New York City | Check DFW to JFK/LGA/EWR flights, hotels, and car/activity options. | Travel scraper curated destination list |
| 2026-08-19 | international | Paris | Check DFW to CDG flights and hotel options; skip cars unless asked. | Travel scraper curated destination list |
| 2026-08-20 | international | Dublin | Check DFW to DUB flights and hotel options; skip cars unless asked. | Travel scraper curated destination list |
| 2026-08-21 | cruise | Galveston | Check iCruise, Carnival, and Royal Caribbean cruise departures. | Travel scraper curated destination list |
| 2026-08-22 | cruise | Miami | Check iCruise, Carnival, and Royal Caribbean cruise departures. | Travel scraper curated destination list |
| 2026-08-20 | note | TravelDash | Nightly intake check: 0 pending, 0 processing. Marked 4 expired packages (Miami Beach Weekend, Paris Rail, Cancun All-Inclusive, AL Gulf Coast) as expired. 3 active packages remain (2x Miami, 1x Seattle). | Cron job travel-dashboard-intake-check |
| 2026-08-17 | note | TravelDash | Intake check: 0 pending submissions. 3 total rows (2 completed, 1 archived). Paris/Cancun packages expired today; Alabama Gulf Coast expires tomorrow; 3 Miami/Seattle packages expire 8/20. | Cron intake check |
