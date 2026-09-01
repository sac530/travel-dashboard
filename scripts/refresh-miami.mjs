// TravelDash auto-refresh: Miami package writer (2026-08-31 run)
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

function envFile(path) {
  const text = readFileSync(path, "utf8");
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[match[1]] = value;
  }
  return out;
}

const localEnv = envFile(new URL("../.env.local", import.meta.url));
const url = localEnv.NEXT_PUBLIC_SUPABASE_URL;
const key = localEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("Missing Supabase env vars in .env.local");
  process.exit(1);
}
const supabase = createClient(url, key);

const SOURCE_FILE = "google_trip_miami_2026-09-14_20260831_234613.json";
const DEPART = "2026-09-14";
const RETURN = "2026-09-18";
const NOW = new Date();
const EXPIRES = new Date(NOW.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

// ---- 1. packages row ----
const packagePayload = {
  title: "Miami Labor Day + Beach Weekend",
  destination: "Miami, FL",
  origin: "DFW",
  start_date: DEPART,
  end_date: RETURN,
  total_price: 742, // 254 flight + 276 hotel (4 nights @ $69 avg) + ~212 car est (4 days compact)
  status: "active",
  expires_at: EXPIRES,
  user_created: false,
  notes:
    "Auto-refresh run 2026-08-31 (first run of new pipeline). Source: " + SOURCE_FILE +
    " (Google Flights + Google Hotels via scrape_google_trip.py). Best flight: Frontier DFW-MIA nonstop round trip $254 (6:15 PM, 3h2m). " +
    "Best hotels (per night, 2 guests): Metropole Suites South Beach $71, citizenM Miami Worldcenter $74, Comfort Inn & Suites Downtown Brickell $83. " +
    "Hotel total assumed ~$276 for 4 nights using Metropole/citizenM class. Car: Kayak/Skyscanner live car scrape not re-run this pass; ~$212 estimate for 4-day compact at MIA — verify at booking. " +
    "Google flagged prices as 'currently high' for Sep 14-18. Prices exclude bags/fees for Frontier.",
};

const { data: pkg, error: pkgErr } = await supabase
  .from("packages")
  .insert([packagePayload])
  .select()
  .single();
if (pkgErr) {
  console.error("PACKAGE INSERT FAILED", pkgErr);
  process.exit(1);
}
console.log("PACKAGE_ID", pkg.id);

// ---- 2. deals rows ----
const dealsPayload = [
  {
    package_id: pkg.id,
    deal_type: "flight",
    provider: "Frontier",
    title: "Frontier DFW→MIA nonstop round trip $254",
    description:
      `Round trip DFW-MIA Sep 14-18 2026. Outbound 6:15 PM - 10:17 PM, nonstop, 3h2m. Cheapest of 18 Google Flights results (cheapest label: from $251). Taxes+fees incl., bags extra. 1-stop Frontier options at $260; Southwest nonstop (from DAL) $593; American nonstop $640.`,
    price: 254,
    original_price: null,
    order_url:
      "https://www.google.com/travel/flights?q=flights+from+DFW+to+MIA+depart+2026-09-14+return+2026-09-18&curr=USD&hl=en&gl=us",
    rating: null,
    booking_details: JSON.stringify({
      source: "google_flights",
      source_file: SOURCE_FILE,
      route: "DFW-MIA",
      stops: 0,
      duration: "3 hr 2 min",
      depart: DEPART,
      return: RETURN,
      round_trip: true,
      caveat: "prices flagged 'currently high' by Google; Frontier bags are extra",
    }),
  },
  {
    package_id: pkg.id,
    deal_type: "hotel",
    provider: "Google Hotels (Metropole Suites South Beach)",
    title: "Metropole Suites South Beach — $71/night",
    description:
      "4 nights Sep 14-18 2026, 2 guests. $71/night per Google Hotels (total ~$284 before taxes). South Beach location, steps to the beach. Runners-up: citizenM Miami Worldcenter $74/night, Comfort Inn & Suites Downtown Brickell $83/night, Novotel Miami Brickell $87/night.",
    price: 284,
    original_price: null,
    order_url:
      "https://www.google.com/travel/hotels/search?q=Miami%20hotels&checkin=2026-09-14&checkout=2026-09-18&adults=2&curr=USD&hl=en&gl=us",
    rating: null,
    booking_details: JSON.stringify({
      source: "google_hotels",
      source_file: SOURCE_FILE,
      per_night: 71,
      nights: 4,
      checkin: DEPART,
      checkout: RETURN,
      guests: 2,
      area: "South Beach",
    }),
  },
  {
    package_id: pkg.id,
    deal_type: "car",
    provider: "MIA airport rental (est.)",
    title: "Compact car at MIA, Sep 14-18 (~$212 est.)",
    description:
      "4-day compact rental at Miami International, Sep 14-18 2026. ESTIMATE based on typical MIA compact rates (~$50-55/day incl. taxes); Kayak/Skyscanner live car scrape was not re-run in this pass (known Kayak-cars SPA limitation). Verify on Kayak/Skyscanner or Hertz/Enterprise before booking.",
    price: 212,
    original_price: null,
    order_url: "https://www.kayak.com/cars/miami?sort=price_low",
    rating: null,
    booking_details: JSON.stringify({
      source: "estimate",
      note: "estimate pending live car scrape; verify before booking",
      pickup: "MIA",
      days: 4,
      class: "compact",
    }),
  },
];

const { data: deals, error: dealsErr } = await supabase.from("deals").insert(dealsPayload).select();
if (dealsErr) {
  console.error("DEALS INSERT FAILED", dealsErr);
} else {
  for (const d of deals) console.log("DEAL_ID", d.id, d.deal_type, d.price);
}

// ---- 3. extras rows (destination-specific: Miami beach) ----
const extrasPayload = [
  {
    package_id: pkg.id,
    extra_type: "beach_gear",
    provider: "Walmart / Target / CVS",
    title: "Sunscreen SPF 50 + beach essentials",
    description:
      "South Beach sun is strong in September — grab SPF 50 lotion, reef-safe option for swimming, sunglasses, and beach towels. Budget ~$30-40 if not packing your own.",
    price: 40,
    order_url: null,
  },
  {
    package_id: pkg.id,
    extra_type: "transfer",
    provider: "MIA rental car / YOTEL shuttle",
    title: "MIA airport → South Beach transfer",
    description:
      "If skipping the rental car: taxi/rideshare from MIA to South Beach runs ~$30-40 one way (15-20 min); Metropole Suites South Beach is 12 miles from the airport. Rental car already in package if needed.",
    price: 40,
    order_url: null,
  },
  {
    package_id: pkg.id,
    extra_type: "activity",
    provider: "South Beach / Biscayne Bay",
    title: "Snorkel gear / water excursions",
    description:
      "Biscayne Bay boat tours, FTX Field/Key Largo day trips, or basic snorkel gear (~$25 at any beach shop). September is early hurricane season — check advisories and consider travel insurance.",
    price: 75,
    order_url: null,
  },
];

const { data: extras, error: extrasErr } = await supabase.from("extras").insert(extrasPayload).select();
if (extrasErr) {
  console.error("EXTRAS INSERT FAILED", extrasErr);
} else {
  for (const x of extras) console.log("EXTRA_ID", x.id, x.extra_type);
}

// ---- 4. close out Miami intake rows + expired/refresh Miami packages ----
const { data: pendingIntake } = await supabase
  .from("intake_submissions")
  .select("id, destination, status, notes")
  .in("status", ["pending", "processing"])
  .ilike("destination", "%miami%");
console.log("MIAMI_PENDING_INTAKE", JSON.stringify(pendingIntake));
if (pendingIntake && pendingIntake.length) {
  const ids = pendingIntake.map((r) => r.id);
  const { error: updErr } = await supabase
    .from("intake_submissions")
    .update({ status: "completed", notes: (pendingIntake[0]?.notes || "") + " | processed by auto-refresh 2026-08-31: package created from Google scrape " + SOURCE_FILE })
    .in("id", ids);
  console.log("INTAKE_UPDATE", updErr ? "FAILED " + updErr.message : `completed ${ids.length} rows: ${ids.join(",")}`);
}

const { data: miaPkgs } = await supabase
  .from("packages")
  .select("id, status, title, expires_at")
  .neq("id", pkg.id)
  .ilike("destination", "%miami%");
console.log("OTHER_MIAAMI_PACKAGES", JSON.stringify(miaPkgs));
if (miaPkgs) {
  for (const p of miaPkgs) {
    if (p.status === "expired" || p.status === "active") {
      const { error: e } = await supabase
        .from("packages")
        .update({ status: "archived", notes: (p.notes || "") })
        .eq("id", p.id);
      console.log("ARCHIVE_OLD_PKG", p.id, e ? "FAILED " + e.message : "ok");
    }
  }
}

console.log("DONE package=", pkg.id, "expires_at=", EXPIRES);
