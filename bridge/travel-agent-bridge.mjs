import http from "node:http";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const PORT = Number(process.env.PORT || process.env.TRAVEL_AGENT_BRIDGE_PORT || 8787);
const HOST = process.env.TRAVEL_AGENT_BRIDGE_HOST || "127.0.0.1";
const TOKEN = (process.env.OPENCLAW_TRAVEL_AGENT_TOKEN || "").trim();
const MODEL_BASE_URL = (process.env.LOCAL_MAIN_MODEL_BASE_URL || "http://127.0.0.1:18080/v1").replace(/\/$/, "");
const MODEL = process.env.LOCAL_MAIN_MODEL || "local-main";
const MODEL_API_KEY = process.env.LOCAL_MAIN_MODEL_API_KEY || "llama-local";
const TRAVEL_SCRAPER_DIR = process.env.TRAVEL_SCRAPER_DIR || "D:\\OpenClaw\\TravelScraper";
const TRAVEL_SCRAPER_RESULTS_DIR = process.env.TRAVEL_SCRAPER_RESULTS_DIR || path.join(TRAVEL_SCRAPER_DIR, "results");
const CAMOUFOX_PY = process.env.CAMOUFOX_PY || "D:\\OpenClaw\\CamouFox\\.venv\\Scripts\\python.exe";
const SCRAPER_TIMEOUT_MS = Number(process.env.TRAVEL_SCRAPER_TIMEOUT_MS || 240_000);
const MODEL_TIMEOUT_MS = Number(process.env.TRAVEL_AGENT_MODEL_TIMEOUT_MS || 18_000);
const execFileAsync = promisify(execFile);
let activeScrape = null;

const TRAVEL_TERMS = [
  "travel",
  "trip",
  "flight",
  "airfare",
  "hotel",
  "resort",
  "destination",
  "restaurant",
  "attraction",
  "weather",
  "itinerary",
  "cruise",
  "car rental",
  "airport",
  "downtown",
  "beach",
  "package",
  "deal",
  "book",
  "route",
  "fare",
  "stay",
  "vacation",
  "tour",
];

const BLOCKED_TERMS = [
  "shell",
  "powershell",
  "terminal",
  "cmd.exe",
  "ssh",
  "registry",
  "environment variable",
  "service role",
  "credential",
  "password",
  "api key",
  "token",
  "delete files",
  "system config",
  "openclaw config",
  "model config",
];

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || `${HOST}:${PORT}`}`);

    if (request.method === "GET" && url.pathname === "/health") {
      return sendJson(response, 200, {
        ok: true,
        service: "traveldash-openclaw-bridge",
        modelBaseUrl: MODEL_BASE_URL,
        scraperDir: TRAVEL_SCRAPER_DIR,
      });
    }

    if (request.method !== "POST" || url.pathname !== "/travel-agent") {
      return sendJson(response, 404, { error: "Not found" });
    }

    if (TOKEN) {
      const expected = `Bearer ${TOKEN}`;
      if (request.headers.authorization !== expected) {
        return sendJson(response, 401, { error: "Unauthorized" });
      }
    }

    const body = await readJson(request);
    const userMessage = String(body.userMessage || "").trim();
    const history = Array.isArray(body.history) ? body.history : [];

    if (!isTravelRequest(userMessage)) {
      return sendJson(response, 200, {
        answer:
          "I can help with travel planning only: flights, hotels, destinations, restaurants, attractions, weather, itineraries, packages, and trip research.",
        cards: [],
      });
    }

    const scrapePlan = planScrape(userMessage);
    if (scrapePlan && activeScrape) {
      return sendJson(response, 200, {
        answer: `I am already running a live TravelDash check for ${activeScrape.label}. Ask again in a few minutes and I will run this city right then.`,
        cards: [],
      });
    }

    let scrapeResult = null;
    if (scrapePlan) {
      activeScrape = { label: scrapePlan.label, startedAt: Date.now() };
      try {
        scrapeResult = await runScraper(scrapePlan);
      } catch (error) {
        scrapeResult = {
          command: `node src\\index.js ${scrapePlan.args.join(" ")}`,
          label: scrapePlan.label,
          savedPath: undefined,
          stdoutTail: "",
          stderrTail: "",
          error: error instanceof Error ? error.message : "Scraper failed",
          resultJson: null,
        };
      } finally {
        activeScrape = null;
      }
    }
    const agentResponse = scrapeResult
      ? buildDeterministicTravelResponse({ userMessage, scrapePlan, scrapeResult })
      : await callLocalModel({ userMessage, history, scrapePlan, scrapeResult });
    return sendJson(response, 200, normalizeAgentResponse(agentResponse));
  } catch (error) {
    return sendJson(response, 500, {
      answer:
        "The TravelDash bridge is reachable, but the local travel model did not complete the request. Try again in a moment while the local model finishes starting.",
      cards: [],
      error: error instanceof Error ? error.message : "Bridge error",
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`TravelDash OpenClaw bridge listening on http://${HOST}:${PORT}/travel-agent`);
});

function isTravelRequest(input) {
  const normalized = input.toLowerCase();
  return (TRAVEL_TERMS.some((term) => normalized.includes(term)) || hasRouteRequest(input)) &&
    !BLOCKED_TERMS.some((term) => normalized.includes(term));
}

async function callLocalModel({ userMessage, history, scrapePlan, scrapeResult }) {
  const liveContext = scrapeResult
    ? buildLiveScrapeContext({ scrapePlan, scrapeResult })
    : "No live scraper command was run for this request. If the user asked for live prices without a supported destination, ask for one destination or cruise port.";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${MODEL_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${MODEL_API_KEY}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.3,
        max_tokens: 1800,
        messages: [
          {
            role: "system",
            content: [
              "You are TravelDash AI, a private travel planning agent.",
              "Only answer travel tasks: hotels, flights, destinations, restaurants, attractions, weather, itineraries, trip research, comparisons, recommendations, and travel package updates.",
              "Do not perform shell, admin, system, config, credential, or unrelated OpenClaw tasks.",
              "For city flight and hotel requests, Google Flights and Google Hotels are the first check. Kayak is only the second check/fallback.",
              "When live scraper results are provided, use them as the primary source. Mention that prices and availability can change before booking.",
              "If a request mentions multiple destinations, explain that TravelDash runs one destination at a time and only summarize the destination that was scraped.",
              "Return strict JSON only with shape: {\"answer\":\"...\",\"cards\":[{\"type\":\"hotel|flight|deal|restaurant|attraction|weather|itinerary\",\"title\":\"...\",\"subtitle\":\"...\",\"imageUrl\":\"\",\"price\":\"\",\"rating\":\"\",\"details\":\"...\",\"provider\":\"...\",\"url\":\"https://...\",\"actionLabel\":\"View Deal\"}]}",
              "Use cards for concrete options. If live prices are not verified, say they need verification.",
            ].join(" "),
          },
          {
            role: "system",
            content: liveContext,
          },
          ...history.slice(-10).map((message) => ({
            role: message.role === "assistant" ? "assistant" : "user",
            content: String(message.content || ""),
          })),
          { role: "user", content: userMessage },
        ],
      }),
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) throw new Error(`Local model returned HTTP ${response.status}`);
  const json = await response.json();
  return parseJsonish(json?.choices?.[0]?.message?.content);
}

const CITY_ALIASES = [
  { match: /\b(miami|mia)\b/i, command: "city", value: "Miami", label: "Miami", airport: "MIA" },
  { match: /\b(san francisco|sfo|sf)\b/i, command: "city", value: "San Francisco", label: "San Francisco", airport: "SFO" },
  { match: /\b(seattle|sea)\b/i, command: "city", value: "Seattle", label: "Seattle", airport: "SEA" },
  { match: /\b(boston|bos)\b/i, command: "city", value: "Boston", label: "Boston", airport: "BOS" },
  { match: /\b(new york city|new york|nyc|jfk|lga|ewr)\b/i, command: "city", value: "New York", label: "New York City", airport: "JFK" },
  { match: /\b(portland|pdx)\b/i, command: "city", value: "Portland", label: "Portland", airport: "PDX" },
  { match: /\b(denver|den)\b/i, command: "city", value: "Denver", label: "Denver", airport: "DEN" },
  { match: /\b(paris|cdg)\b/i, command: "city", value: "Paris", label: "Paris", airport: "CDG" },
  { match: /\b(dublin|dub)\b/i, command: "city", value: "Dublin", label: "Dublin", airport: "DUB" },
];

const AIRPORT_CITY_MAP = {
  AUS: "Austin",
  BOS: "Boston",
  CDG: "Paris",
  DEN: "Denver",
  DFW: "Dallas",
  DUB: "Dublin",
  EWR: "New York",
  JFK: "New York",
  LGA: "New York",
  MIA: "Miami",
  PDX: "Portland",
  SEA: "Seattle",
  SFO: "San Francisco",
  XNA: "Northwest Arkansas",
};

const MONTH_WORDS = "january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec";
const CITY_STOP_WORDS = new Set([
  "a",
  "about",
  "and",
  "any",
  "book",
  "cheap",
  "check",
  "city",
  "deal",
  "deals",
  "find",
  "flight",
  "flights",
  "for",
  "from",
  "hotel",
  "hotels",
  "in",
  "live",
  "me",
  "package",
  "prices",
  "search",
  "the",
  "to",
  "trip",
]);

const CRUISE_PORT_ALIASES = [
  { match: /\b(galveston)\b/i, command: "cruise", value: "Galveston", label: "Galveston cruise" },
  { match: /\b(miami)\b/i, command: "cruise", value: "Miami", label: "Miami cruise" },
];

function planScrape(userMessage) {
  const wantsLiveScrape = /\b(scrape|search|find|check|deal|price|cheap|flight|hotel|cruise|package|live|book)\b/i.test(userMessage) || hasRouteRequest(userMessage);
  if (!wantsLiveScrape) return null;

  const wantsCruise = /\b(cruise|sailing|port)\b/i.test(userMessage);
  if (wantsCruise) {
    const port = CRUISE_PORT_ALIASES.find((item) => item.match.test(userMessage));
    if (port) return { kind: "cruise", label: port.label, args: [port.command, port.value] };
  }

  const route = resolveRoutePlan(userMessage);
  const city = route || resolveCityPlan(userMessage);
  if (city) {
    const dates = inferTripDates(userMessage);
    return {
      kind: "google-city",
      label: city.label,
      args: [city.command, city.value],
      city: city.value,
      airport: city.airport,
      origin: city.origin || inferOrigin(userMessage),
      depart: dates.depart,
      returnDate: dates.returnDate,
      wantsFlight: /\b(flight|airfare|route|fare)\b/i.test(userMessage) || Boolean(route),
      wantsHotel: /\b(hotel|hotels|stay|resort)\b/i.test(userMessage),
      fallbackArgs: [city.command, city.value],
    };
  }

  if (/\b(deal|cheap|search|scrape|flight|hotel|cruise|package)\b/i.test(userMessage)) {
    return {
      kind: "deal-discovery",
      label: "general travel deal discovery",
      args: ["deals", `--query=${sanitizeDealQuery(userMessage)}`],
    };
  }

  return null;
}

function hasRouteRequest(input) {
  return /\b[A-Z]{3}\s*(?:to|->|→|-)\s*(?:[A-Z]{3}|[a-z][a-z .'-]{1,60})\b/i.test(input);
}

function resolveRoutePlan(userMessage) {
  const airportToAirport = userMessage.match(/\b([A-Z]{3})\s*(?:to|->|→|-)\s*([A-Z]{3})\b/i);
  if (airportToAirport) {
    const origin = airportToAirport[1].toUpperCase();
    const airport = airportToAirport[2].toUpperCase();
    const city = AIRPORT_CITY_MAP[airport] || airport;
    return {
      command: "city",
      value: city,
      label: `${origin} to ${city}`,
      airport,
      origin,
    };
  }

  const airportToCity = userMessage.match(/\b([A-Z]{3})\s*(?:to|->|→|-)\s*([a-z][a-z .'-]{1,60}?)(?=\s+(?:from|during|on|this|next|in|flights?|hotels?|packages?|deals?|prices?|cheap|live|book|round\s*trip)\b|[?.!,]|$)/i);
  if (airportToCity) {
    const origin = airportToCity[1].toUpperCase();
    const city = cleanCityName(airportToCity[2]);
    if (!city) return null;
    return {
      command: "city",
      value: city,
      label: `${origin} to ${city}`,
      airport: inferAirportForCity(city),
      origin,
    };
  }

  return null;
}

function resolveCityPlan(userMessage) {
  const knownCity = CITY_ALIASES.find((item) => item.match.test(userMessage));
  if (knownCity) return knownCity;

  const extractedCity = extractRequestedCity(userMessage);
  if (!extractedCity) return null;

  const airport = inferDestinationAirport(userMessage, extractedCity);
  return {
    command: "city",
    value: extractedCity,
    label: extractedCity,
    airport,
  };
}

function extractRequestedCity(input) {
  const patterns = [
    new RegExp(`\\b(?:to|in|for|near)\\s+([a-z][a-z .'-]{1,60}?)(?=\\s+(?:from|during|on|this|next|${MONTH_WORDS}|flights?|hotels?|packages?|deals?|prices?|cheap|live|book|round\\s*trip)\\b|[?.!,]|$)`, "i"),
    /\b([a-z][a-z .'-]{1,60}?)\s+(?:flights?\s+(?:and|&|\+)\s+hotels?|hotels?\s+(?:and|&|\+)\s+flights?)\b/i,
    /\b(?:flights?|hotels?|packages?|deals?)\s+(?:to|in|for|near)\s+([a-z][a-z .'-]{1,60}?)(?=\s+(?:from|during|on|this|next|flights?|hotels?|packages?|deals?|prices?|cheap|live|book)\b|[?.!,]|$)/i,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    const city = cleanCityName(match?.[1]);
    if (city) return city;
  }

  return null;
}

function cleanCityName(value) {
  const words = String(value || "")
    .replace(/\b(20\d{2}-\d{2}-\d{2})\b/g, " ")
    .replace(new RegExp(`\\b(${MONTH_WORDS})\\b`, "gi"), " ")
    .replace(/\b[A-Z]{3}\b/g, " ")
    .replace(/[^a-zA-Z .'-]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)
    .filter((word) => !CITY_STOP_WORDS.has(word.toLowerCase()));

  if (!words.length || words.length > 5) return null;
  return words.map(titleCaseWord).join(" ");
}

function titleCaseWord(value) {
  return value
    .split(/([.'-])/)
    .map((part) => /^[a-z]/i.test(part) ? `${part[0].toUpperCase()}${part.slice(1).toLowerCase()}` : part)
    .join("");
}

function inferDestinationAirport(input, city) {
  const routeMatch = input.match(/\bto\s+([A-Z]{3})\b/);
  if (routeMatch && routeMatch[1].toUpperCase() !== inferOrigin(input)) return routeMatch[1].toUpperCase();
  return inferAirportForCity(city);
}

function inferAirportForCity(city) {
  const known = CITY_ALIASES.find((item) => item.value.toLowerCase() === city.toLowerCase());
  return known?.airport || city;
}

function sanitizeDealQuery(value) {
  return value
    .replace(/[^\w\s$.,:/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140) || "cheap travel deals";
}

async function runScraper(plan) {
  if (plan.kind === "google-city") {
    const googleResult = await runGoogleTrip(plan).catch((error) => ({
      command: `${CAMOUFOX_PY} src\\scrape_google_trip.py --city ${plan.city} --airport ${plan.airport}`,
      label: `${plan.label} Google Flights/Hotels`,
      savedPath: undefined,
      stdoutTail: "",
      stderrTail: "",
      error: error instanceof Error ? error.message : "Google trip scraper failed",
      resultJson: null,
    }));

    if (hasUsableGoogleTrip(googleResult.resultJson, plan)) return googleResult;

    const kayakResult = await runNodeScraper({
      ...plan,
      kind: "city",
      label: `${plan.label} Kayak fallback`,
      args: plan.fallbackArgs,
    }).catch((error) => ({
      command: `node src\\index.js ${plan.fallbackArgs.join(" ")}`,
      label: `${plan.label} Kayak fallback`,
      savedPath: googleResult.savedPath,
      stdoutTail: googleResult.stdoutTail,
      stderrTail: googleResult.stderrTail,
      error: `Google first check did not return usable flight/hotel rows; Kayak fallback failed: ${
        error instanceof Error ? error.message : "Scraper failed"
      }`,
      resultJson: googleResult.resultJson,
    }));

    return {
      ...kayakResult,
      googleFirst: {
        command: googleResult.command,
        resultFile: googleResult.savedPath,
        error: googleResult.error,
      },
    };
  }

  return runNodeScraper(plan);
}

async function runGoogleTrip(plan) {
  const startedAt = Date.now();
  const command = CAMOUFOX_PY;
  const args = [
    "src\\scrape_google_trip.py",
    "--origin",
    plan.origin,
    "--city",
    plan.city,
    "--airport",
    plan.airport,
    "--depart",
    plan.depart,
    "--return",
    plan.returnDate,
  ];
  const { stdout, stderr } = await execFileAsync(command, args, {
    cwd: TRAVEL_SCRAPER_DIR,
    timeout: SCRAPER_TIMEOUT_MS,
    windowsHide: true,
    maxBuffer: 4 * 1024 * 1024,
  });

  const parsedStdout = parseJsonish(stdout);
  const savedPath = parsedStdout?.output || await findSavedResultPath({ stdout, startedAt });
  const resultJson = savedPath ? await readJsonFile(savedPath).catch(() => null) : null;

  return {
    command: `${command} ${args.join(" ")}`,
    label: `${plan.label} Google Flights/Hotels`,
    savedPath,
    stdoutTail: tail(stdout, 3000),
    stderrTail: tail(stderr, 1200),
    resultJson,
  };
}

async function runNodeScraper(plan) {
  const startedAt = Date.now();
  const command = "node";
  const args = ["src\\index.js", ...plan.args];
  const { stdout, stderr } = await execFileAsync(command, args, {
    cwd: TRAVEL_SCRAPER_DIR,
    timeout: SCRAPER_TIMEOUT_MS,
    windowsHide: true,
    maxBuffer: 4 * 1024 * 1024,
  });

  const savedPath = await findSavedResultPath({ stdout, startedAt });
  const resultJson = savedPath ? await readJsonFile(savedPath).catch(() => null) : null;

  return {
    command: `${command} ${args.join(" ")}`,
    label: plan.label,
    savedPath,
    stdoutTail: tail(stdout, 3000),
    stderrTail: tail(stderr, 1200),
    resultJson,
  };
}

function hasUsableGoogleTrip(value, plan = {}) {
  if (value?.source !== "google_trip") return false;

  const hasFlights = Array.isArray(value?.flight?.deals) && value.flight.deals.length > 0;
  const hasHotels = Array.isArray(value?.hotel?.hotels) && value.hotel.hotels.length > 0;
  if (plan.wantsFlight && !plan.wantsHotel) return hasFlights;
  if (plan.wantsHotel && !plan.wantsFlight) return hasHotels;
  return hasFlights && hasHotels;
}

async function findSavedResultPath({ stdout, startedAt }) {
  const match = stdout.match(/Saved to:\s*([^\r\n]+)|Saved to\s+([^\r\n]+)/i);
  const stdoutPath = (match?.[1] || match?.[2] || "").trim();
  if (stdoutPath) return stdoutPath;

  const entries = await fs.readdir(TRAVEL_SCRAPER_RESULTS_DIR, { withFileTypes: true }).catch(() => []);
  const files = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".json"))
      .map(async (entry) => {
        const fullPath = path.join(TRAVEL_SCRAPER_RESULTS_DIR, entry.name);
        const stat = await fs.stat(fullPath);
        return { fullPath, mtimeMs: stat.mtimeMs };
      }),
  );

  const newest = files
    .filter((file) => file.mtimeMs >= startedAt - 2000)
    .sort((a, b) => b.mtimeMs - a.mtimeMs)[0];
  return newest?.fullPath;
}

async function readJsonFile(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  return JSON.parse(text);
}

function buildLiveScrapeContext({ scrapePlan, scrapeResult }) {
  const compactResults = compactScrapeJson(scrapeResult.resultJson);
  return [
    "LIVE_TRAVEL_SCRAPER_RESULTS:",
    JSON.stringify({
      requestType: scrapePlan?.kind,
      scraped: scrapeResult.label,
      command: scrapeResult.command,
      resultFile: scrapeResult.savedPath,
      error: scrapeResult.error,
      googleFirst: scrapeResult.googleFirst,
      stderr: scrapeResult.stderrTail,
      results: compactResults,
    }),
  ].join("\n");
}

function compactScrapeJson(value) {
  if (value?.source === "google_trip") {
    return [
      {
        site: "google",
        type: "flight",
        label: `${value.origin || "DFW"} to ${value.airport || value.city}`,
        title: value.flight?.title,
        url: value.flight?.url,
        deals: Array.isArray(value.flight?.deals)
          ? value.flight.deals.slice(0, 8).map((deal) => ({
              title: `${deal.airline || "Flight"} ${deal.nonstop ? "nonstop" : `${deal.stops ?? "unknown"} stop`}`,
              price: deal.price,
              provider: "Google Flights",
              details: trimText(deal.snippet, 500),
              url: value.flight?.url,
            }))
          : [],
      },
      {
        site: "google",
        type: "hotel",
        label: `${value.city} hotels`,
        title: value.hotel?.title,
        url: value.hotel?.url,
        deals: Array.isArray(value.hotel?.hotels)
          ? value.hotel.hotels.slice(0, 8).map((hotel) => ({
              title: hotel.name,
              price: hotel.price_per_night,
              provider: "Google Hotels",
              details: `$${hotel.price_per_night}/night before final checkout taxes and fees.`,
              url: value.hotel?.url,
            }))
          : [],
      },
    ];
  }

  const items = Array.isArray(value) ? value : Array.isArray(value?.results) ? value.results : [];
  return items.slice(0, 8).map((item) => ({
    site: item?.site,
    type: item?.type,
    label: item?.label,
    title: item?.title,
    status: item?.status,
    dealCount: item?.dealCount,
    url: item?.url || item?.finalUrl,
    deals: Array.isArray(item?.deals)
      ? item.deals.slice(0, 8).map((deal) => ({
          title: deal?.title,
          price: deal?.price,
          provider: deal?.provider || deal?.airline,
          details: trimText(deal?.details || deal?.description || deal?.snippet || deal?.text, 500),
          url: deal?.url,
        }))
      : undefined,
    details: trimText(item?.details || item?.description || item?.content || item?.snippet, 600),
  }));
}

function normalizeAgentResponse(value) {
  const record = value && typeof value === "object" ? value : {};
  return {
    answer: typeof record.answer === "string" && record.answer.trim()
      ? record.answer.trim()
      : "I can help plan that trip, but I did not get a clean summary back from the local travel model.",
    cards: Array.isArray(record.cards) ? record.cards.map(normalizeCard).filter(Boolean).slice(0, 8) : [],
  };
}

function buildDeterministicTravelResponse({ userMessage, scrapePlan, scrapeResult }) {
  const result = scrapeResult.resultJson;
  const cards = buildCardsFromScrapeResult(result);
  const resultFile = scrapeResult.savedPath ? `\n\nResult file: ${scrapeResult.savedPath}` : "";
  const caveat = "Prices and availability can change before checkout.";

  if (scrapeResult.error && !cards.length) {
    return {
      answer: `I ran the TravelDash live search for ${scrapePlan?.label || "that trip"}, but it did not return usable deal rows. ${scrapeResult.error}${resultFile}`,
      cards: [],
    };
  }

  if (cards.length) {
    const flightCards = cards.filter((card) => card.type === "flight");
    const hotelCards = cards.filter((card) => card.type === "hotel");
    const bestFlight = flightCards[0]?.price ? ` Best flight found: ${flightCards[0].price}.` : "";
    const bestHotel = hotelCards[0]?.price ? ` Best hotel rate found: ${hotelCards[0].price}.` : "";

    return {
      answer: `I ran the TravelDash live search for ${scrapePlan?.label || userMessage}.${bestFlight}${bestHotel} ${caveat}${resultFile}`,
      cards,
    };
  }

  return {
    answer: `I ran the TravelDash live search for ${scrapePlan?.label || userMessage}, but the result file did not include displayable deal rows yet. ${caveat}${resultFile}`,
    cards: [],
  };
}

function buildCardsFromScrapeResult(value) {
  if (value?.source === "google_trip") {
    const flightUrl = textValue(value.flight?.url);
    const hotelUrl = textValue(value.hotel?.url);
    const flights = Array.isArray(value.flight?.deals)
      ? value.flight.deals.slice(0, 4).map((deal) => ({
          type: "flight",
          title: textValue(deal.airline) || "Flight option",
          subtitle: `${value.origin || "DFW"} to ${value.airport || value.city || "destination"}`,
          price: priceValue(deal.price),
          provider: "Google Flights",
          details: trimText(deal.snippet || `${deal.nonstop ? "Nonstop" : `${deal.stops ?? "Unknown"} stop`} flight option.`, 500),
          url: flightUrl,
          actionLabel: "View Flights",
        }))
      : [];

    const hotels = Array.isArray(value.hotel?.hotels)
      ? value.hotel.hotels.slice(0, 4).map((hotel) => ({
          type: "hotel",
          title: textValue(hotel.name) || "Hotel option",
          subtitle: `${value.city || "Destination"} hotel`,
          price: hotel.price_per_night ? `$${hotel.price_per_night}/night` : undefined,
          provider: "Google Hotels",
          details: hotel.price_per_night
            ? `$${hotel.price_per_night}/night before final checkout taxes and fees.`
            : "Hotel rate found in Google Hotels.",
          url: hotelUrl,
          actionLabel: "View Hotels",
        }))
        .filter((hotel) => hotel.title && !/accessibility feedback/i.test(hotel.title))
      : [];

    return [...flights, ...hotels].filter((card) => card.title).slice(0, 8);
  }

  const items = Array.isArray(value) ? value : Array.isArray(value?.results) ? value.results : [];
  return items.flatMap((item) => {
    if (Array.isArray(item?.deals) && item.deals.length) {
      return item.deals.slice(0, 4).map((deal) => ({
        type: normalizeCardType(item.type),
        title: textValue(deal.title) || textValue(item.title) || "Travel deal",
        subtitle: textValue(item.label),
        price: textValue(deal.price),
        provider: textValue(deal.provider || deal.airline || item.site),
        details: trimText(deal.details || deal.description || deal.snippet || deal.text, 500),
        url: textValue(deal.url || item.url || item.finalUrl),
        actionLabel: "View Deal",
      }));
    }

    return [{
      type: normalizeCardType(item?.type),
      title: textValue(item?.title) || textValue(item?.label) || "Travel result",
      subtitle: textValue(item?.site),
      provider: textValue(item?.site),
      details: trimText(item?.details || item?.description || item?.content || item?.snippet, 500),
      url: textValue(item?.url || item?.finalUrl),
      actionLabel: "View Deal",
    }];
  }).filter((card) => card.title).slice(0, 8);
}

function normalizeCardType(value) {
  const type = textValue(value);
  return ["hotel", "flight", "deal", "restaurant", "attraction", "weather", "itinerary"].includes(type) ? type : "deal";
}

function normalizeCard(card) {
  if (!card || typeof card !== "object") return null;
  const title = textValue(card.title);
  if (!title) return null;
  const type = textValue(card.type);
  return {
    type: ["hotel", "flight", "deal", "restaurant", "attraction", "weather", "itinerary"].includes(type) ? type : "deal",
    title,
    subtitle: textValue(card.subtitle),
    imageUrl: textValue(card.imageUrl),
    price: textValue(card.price),
    rating: textValue(card.rating),
    details: textValue(card.details),
    provider: textValue(card.provider),
    url: textValue(card.url),
    actionLabel: textValue(card.actionLabel) || "View Deal",
  };
}

function textValue(value) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function priceValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) return `$${value}`;
  const text = textValue(value);
  if (!text) return undefined;
  return /^\d+(?:\.\d+)?$/.test(text) ? `$${text}` : text;
}

function parseJsonish(content) {
  if (typeof content !== "string") return {};
  const trimmed = content.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return { answer: trimmed, cards: [] };
    try {
      return JSON.parse(match[0]);
    } catch {
      return { answer: trimmed, cards: [] };
    }
  }
}

function tail(value, maxChars) {
  const text = String(value || "");
  return text.length > maxChars ? text.slice(-maxChars) : text;
}

function trimText(value, maxChars) {
  const text = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  return text.length > maxChars ? `${text.slice(0, maxChars - 3)}...` : text;
}

function inferOrigin(input) {
  const match = input.match(/\bfrom\s+([A-Z]{3})\b/i);
  return match ? match[1].toUpperCase() : "DFW";
}

function inferTripDates(input) {
  const explicitDates = [...input.matchAll(/\b(20\d{2}-\d{2}-\d{2})\b/g)].map((match) => match[1]);
  if (explicitDates.length >= 2) return { depart: explicitDates[0], returnDate: explicitDates[1] };
  if (explicitDates.length === 1) return { depart: explicitDates[0], returnDate: addDaysIso(explicitDates[0], 3) };

  const today = todayIsoCentral();
  if (/\btoday\s+(?:or|\/|and)\s+tomorrow\b/i.test(input) || /\btomorrow\s+(?:or|\/|and)\s+today\b/i.test(input)) {
    return { depart: today, returnDate: addDaysIso(today, 1) };
  }
  if (/\btomorrow\b/i.test(input)) {
    const depart = addDaysIso(today, 1);
    return { depart, returnDate: addDaysIso(depart, 1) };
  }
  if (/\btoday\b/i.test(input)) {
    return { depart: today, returnDate: addDaysIso(today, 1) };
  }

  const monthMatch = input.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\b/i);
  if (monthMatch) {
    const now = new Date();
    const month = monthNumber(monthMatch[1]);
    let year = now.getFullYear();
    if (month < now.getMonth()) year += 1;
    const depart = firstThursdayIso(year, month);
    return { depart, returnDate: addDaysIso(depart, 3) };
  }

  const fallbackDepart = addDaysIso(new Date().toISOString().slice(0, 10), 28);
  return { depart: fallbackDepart, returnDate: addDaysIso(fallbackDepart, 3) };
}

function todayIsoCentral() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function monthNumber(value) {
  const key = value.toLowerCase().slice(0, 3);
  return ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(key);
}

function firstThursdayIso(year, monthIndex) {
  const date = new Date(Date.UTC(year, monthIndex, 1));
  while (date.getUTCDay() !== 4) date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function addDaysIso(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 128_000) {
        request.destroy();
        reject(new Error("Request body too large"));
      }
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function sendJson(response, status, value) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(value));
}
