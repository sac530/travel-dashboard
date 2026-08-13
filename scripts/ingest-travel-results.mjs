import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const DEFAULT_RESULTS_DIR = "D:\\OpenClaw\\TravelScraper\\results";
const DEFAULT_STATE_DIR = "D:\\OpenClaw\\TravelDashData";

const CITY_META = {
  miami: {
    destination: "Miami, FL",
    airport: "MIA",
    title: "Miami Google Deal Watch",
    hotelQuery: "Miami hotels",
    extras: [
      ["beach", "Reef-safe sunscreen", "Good fit for Miami beach days.", 18, "https://www.amazon.com"],
      ["transport", "Airport rideshare buffer", "Set aside a buffer for rideshare or airport transfer costs.", 55, null],
      ["safety", "Travel insurance", "Reprice coverage before booking because fare and hotel policies vary.", 89, "https://www.squaremouth.com"],
    ],
  },
  seattle: {
    destination: "Seattle, WA",
    airport: "SEA",
    title: "Seattle Google Deal Watch",
    hotelQuery: "Seattle hotels",
    extras: [
      ["transport", "ORCA transit card", "Useful for light rail from SEA plus city transit.", 30, "https://www.myorca.com"],
      ["activity", "City activity buffer", "Hold a small budget for museums, observation decks, or ferry rides.", 75, null],
      ["misc", "Rain layer", "October Seattle weather can turn quickly; pack or buy a compact rain layer.", 40, "https://www.amazon.com"],
    ],
  },
};

const HOTEL_NAME_ALLOW = [
  "airport",
  "best western",
  "comfort",
  "courtyard",
  "crowne",
  "doubletree",
  "executive hotel",
  "hampton",
  "hilton",
  "hotel",
  "hyatt",
  "ihg",
  "inn",
  "kimpton",
  "marriott",
  "metropole",
  "novotel",
  "palihotel",
  "princess",
  "regency",
  "sonesta",
  "staypineapple",
  "suites",
  "travelodge",
  "westin",
];

const HOTEL_NAME_BLOCK = [
  "accessibility",
  "air conditioning",
  "areas for",
  "currency",
  "displayed",
  "feedback",
  "full-service",
  "keyboard",
  "less than usual",
  "near ",
  "shortcut",
];

function readEnv() {
  const envPath = path.resolve(".env.local");
  const env = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    env[line.slice(0, index).trim()] = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
  }
  return env;
}

function money(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function daysBetween(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const days = Math.round((end - start) / (24 * 60 * 60 * 1000));
  return Math.max(days, 1);
}

function cityKeyFromRaw(raw, fallbackCity) {
  return (raw?.city || raw?.destination || fallbackCity || "miami").toLowerCase().split(",")[0].trim();
}

function newestFileForCity(resultsDir, city) {
  const lower = city.toLowerCase();
  const airport = CITY_META[lower]?.airport.toLowerCase();
  const files = fs.readdirSync(resultsDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => {
      const full = path.join(resultsDir, file);
      return { full, stat: fs.statSync(full) };
    })
    .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);

  return files.find((file) => {
    const text = fs.readFileSync(file.full, "utf8").slice(0, 4000).toLowerCase();
    return text.includes(lower) || (airport && text.includes(airport));
  })?.full;
}

function inferAirline(deal) {
  if (deal.airline && deal.airline !== "Unknown airline") return deal.airline;
  const snippet = deal.snippet || "";
  const match = snippet.match(/\b(American|Alaska|Delta|Frontier|Southwest|United|JetBlue|Spirit)\b/i);
  return match ? match[1].replace(/\b\w/g, (char) => char.toUpperCase()) : "Google Flights";
}

function pickBestFlight(deals = []) {
  const priced = deals.filter((deal) => money(deal.price));
  const reasonable = priced.filter((deal) => deal.nonstop || money(deal.price) <= 250);
  return (reasonable.length ? reasonable : priced).sort((a, b) => Number(a.price) - Number(b.price))[0];
}

function isRealHotelName(name = "") {
  const lower = name.toLowerCase();
  if (HOTEL_NAME_BLOCK.some((blocked) => lower.includes(blocked))) return false;
  return HOTEL_NAME_ALLOW.some((allowed) => lower.includes(allowed));
}

function pickBestHotel(hotels = []) {
  const realHotels = hotels.filter((hotel) => money(hotel.price_per_night) && isRealHotelName(hotel.name));
  return (realHotels.length ? realHotels : hotels.filter((hotel) => money(hotel.price_per_night)))
    .sort((a, b) => Number(a.price_per_night) - Number(b.price_per_night))[0];
}

function parseGoogleTrip(raw, filePath, cityKey) {
  const meta = CITY_META[cityKey];
  const startDate = raw.depart_date;
  const endDate = raw.return_date;
  const nights = daysBetween(startDate, endDate);
  const flight = pickBestFlight(raw.flight?.deals);
  const hotel = pickBestHotel(raw.hotel?.hotels);
  if (!flight?.price) throw new Error(`No usable Google flight deal found in ${filePath}`);
  if (!hotel?.price_per_night) throw new Error(`No usable Google hotel deal found in ${filePath}`);

  const airline = inferAirline(flight);
  const hotelTotal = Number(hotel.price_per_night) * nights;

  return {
    startDate,
    endDate,
    titlePrefix: meta.title,
    totalPrice: Number(flight.price) + hotelTotal,
    notes: [
      `Built from fresh Google Flights/Hotels scraper output ${path.basename(filePath)}.`,
      `Trip dates assumed from request as ${startDate} to ${endDate} (${nights} nights).`,
      "Car rental was not added in this Google-only run.",
      `Raw evidence: ${raw.flight?.raw_file || "flight raw text unavailable"}; ${raw.hotel?.raw_file || "hotel raw text unavailable"}.`,
    ].join(" "),
    deals: [
      {
        deal_type: "flight",
        provider: "Google Flights",
        title: `DFW to ${meta.airport} roundtrip`,
        description: `${airline} ${flight.nonstop ? "nonstop" : `${flight.stops ?? "unknown"} stop`} roundtrip found in Google Flights for ${startDate} to ${endDate}.`,
        price: money(flight.price),
        url: raw.flight?.url,
        rating: null,
        details: {
          sourceFile: path.basename(filePath),
          rawFile: raw.flight?.raw_file,
          airline,
          departureTime: flight.departure_time,
          duration: flight.duration,
          nonstop: flight.nonstop,
          stops: flight.stops,
          snippet: flight.snippet,
        },
      },
      {
        deal_type: "hotel",
        provider: "Google Hotels",
        title: hotel.name,
        description: `${hotel.name} from $${hotel.price_per_night}/night on Google Hotels; priced for ${nights} nights before final checkout taxes/fees.`,
        price: hotelTotal,
        url: raw.hotel?.url,
        rating: null,
        details: {
          sourceFile: path.basename(filePath),
          rawFile: raw.hotel?.raw_file,
          nights,
          pricePerNight: Number(hotel.price_per_night),
        },
      },
    ],
  };
}

function parseLegacyScraperFile(raw, filePath, cityKey) {
  const meta = CITY_META[cityKey];
  const startDate = "2026-08-27";
  const endDate = "2026-09-03";
  const flightSource = Array.isArray(raw)
    ? raw.find((item) => item.type === "flight" && item.status === "ok" && item.deals?.length)
    : null;
  const flight = flightSource?.deals
    ?.filter((deal) => money(deal.price) && new RegExp(`${meta.airport}|${cityKey}`, "i").test(deal.text || ""))
    .sort((a, b) => Number(a.price) - Number(b.price))[0];

  if (!flight) throw new Error(`No usable legacy flight deal found in ${filePath}`);

  const hotelPrice = cityKey === "miami" ? 707 : 770;
  return {
    startDate,
    endDate,
    titlePrefix: meta.title.replace("Google", "Real"),
    totalPrice: Number(flight.price) + hotelPrice,
    notes: `Built from legacy D-drive scraper output ${path.basename(filePath)}. Hotel pricing uses public comparison pricing because live hotel scraping redirected.`,
    deals: [
      {
        deal_type: "flight",
        provider: flightSource.site === "skyscanner" ? "Skyscanner" : flightSource.site,
        title: `DFW to ${meta.airport} roundtrip`,
        description: `${flight.rawPrice || `$${flight.price}`} roundtrip fare found in rendered ${flightSource.site} results.`,
        price: money(flight.price),
        url: flightSource.finalUrl || flightSource.url,
        details: { sourceFile: path.basename(filePath), label: flightSource.label, snippet: flight.text },
      },
      {
        deal_type: "hotel",
        provider: "Public comparison",
        title: `${meta.destination} hotel comparison`,
        description: "Fallback hotel comparison row from public rate pages.",
        price: hotelPrice,
        url: null,
        details: { sourceFile: path.basename(filePath), source: "legacy_fallback" },
      },
    ],
  };
}

function parseScraperFile(filePath, requestedCity) {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const cityKey = cityKeyFromRaw(raw, requestedCity);
  const meta = CITY_META[cityKey];
  if (!meta) throw new Error(`Unsupported city: ${cityKey}`);

  const parsed = raw?.source === "google_trip"
    ? parseGoogleTrip(raw, filePath, cityKey)
    : parseLegacyScraperFile(raw, filePath, cityKey);

  return { cityKey, meta, ...parsed };
}

async function main() {
  const requestedCity = (process.argv[2] || "miami").toLowerCase();
  const explicitFile = process.argv[3];
  const resultsDir = process.env.TRAVEL_SCRAPER_RESULTS_DIR || DEFAULT_RESULTS_DIR;
  const stateDir = process.env.TRAVEL_DASH_DATA_DIR || DEFAULT_STATE_DIR;
  fs.mkdirSync(stateDir, { recursive: true });

  const filePath = explicitFile ? path.resolve(explicitFile) : newestFileForCity(resultsDir, requestedCity);
  if (!filePath) throw new Error(`No result file found for ${requestedCity} in ${resultsDir}`);

  const env = readEnv();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const parsed = parseScraperFile(filePath, requestedCity);
  const title = `${parsed.titlePrefix} - ${parsed.startDate}`;

  const { data: existing } = await supabase
    .from("packages")
    .select("id")
    .eq("title", title)
    .maybeSingle();

  if (existing?.id) {
    console.log(JSON.stringify({ skipped: true, packageId: existing.id, reason: "Package already exists", title }, null, 2));
    return;
  }

  const { data: pkg, error: packageError } = await supabase
    .from("packages")
    .insert({
      title,
      destination: parsed.meta.destination,
      origin: "DFW",
      start_date: parsed.startDate,
      end_date: parsed.endDate,
      total_price: parsed.totalPrice,
      status: "active",
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      notes: parsed.notes,
      user_created: false,
    })
    .select()
    .single();
  if (packageError) throw packageError;

  const deals = parsed.deals.map((deal) => ({
    package_id: pkg.id,
    deal_type: deal.deal_type,
    provider: deal.provider,
    title: deal.title,
    description: deal.description,
    price: deal.price,
    original_price: null,
    order_url: deal.url,
    booking_details: deal.details || {},
    rating: deal.rating || null,
  }));

  const { error: dealsError } = await supabase.from("deals").insert(deals);
  if (dealsError) throw dealsError;

  const extras = parsed.meta.extras.map(([category, name, description, estimated_price, suggested_url]) => ({
    package_id: pkg.id,
    category,
    name,
    description,
    estimated_price,
    suggested_url,
    purchased: false,
  }));
  const { error: extrasError } = await supabase.from("extras").insert(extras);
  if (extrasError) throw extrasError;

  fs.writeFileSync(
    path.join(stateDir, `last-ingest-${parsed.cityKey}.json`),
    JSON.stringify({
      packageId: pkg.id,
      title,
      sourceFile: filePath,
      insertedAt: new Date().toISOString(),
      totalPrice: parsed.totalPrice,
      deals: deals.length,
      extras: extras.length,
    }, null, 2),
  );

  console.log(JSON.stringify({
    packageId: pkg.id,
    title,
    sourceFile: filePath,
    totalPrice: parsed.totalPrice,
    deals: deals.length,
    extras: extras.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
