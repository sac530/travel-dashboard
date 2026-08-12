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
const SCRAPER_TIMEOUT_MS = Number(process.env.TRAVEL_SCRAPER_TIMEOUT_MS || 240_000);
const execFileAsync = promisify(execFile);

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
    const scrapeResult = scrapePlan
      ? await runScraper(scrapePlan).catch((error) => ({
          command: `node src\\index.js ${scrapePlan.args.join(" ")}`,
          label: scrapePlan.label,
          savedPath: undefined,
          stdoutTail: "",
          stderrTail: "",
          error: error instanceof Error ? error.message : "Scraper failed",
          resultJson: null,
        }))
      : null;
    const agentResponse = await callLocalModel({ userMessage, history, scrapePlan, scrapeResult });
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
  return TRAVEL_TERMS.some((term) => normalized.includes(term)) &&
    !BLOCKED_TERMS.some((term) => normalized.includes(term));
}

async function callLocalModel({ userMessage, history, scrapePlan, scrapeResult }) {
  const liveContext = scrapeResult
    ? buildLiveScrapeContext({ scrapePlan, scrapeResult })
    : "No live scraper command was run for this request. If the user asked for live prices without a supported destination, ask for one destination or cruise port.";

  const response = await fetch(`${MODEL_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${MODEL_API_KEY}`,
    },
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

  if (!response.ok) throw new Error(`Local model returned HTTP ${response.status}`);
  const json = await response.json();
  return parseJsonish(json?.choices?.[0]?.message?.content);
}

const CITY_ALIASES = [
  { match: /\b(miami|mia)\b/i, command: "city", value: "Miami", label: "Miami" },
  { match: /\b(san francisco|sfo|sf)\b/i, command: "city", value: "San Francisco", label: "San Francisco" },
  { match: /\b(seattle|sea)\b/i, command: "city", value: "Seattle", label: "Seattle" },
  { match: /\b(boston|bos)\b/i, command: "city", value: "Boston", label: "Boston" },
  { match: /\b(new york city|new york|nyc|jfk|lga|ewr)\b/i, command: "city", value: "New York", label: "New York City" },
  { match: /\b(paris|cdg)\b/i, command: "city", value: "Paris", label: "Paris" },
  { match: /\b(dublin|dub)\b/i, command: "city", value: "Dublin", label: "Dublin" },
];

const CRUISE_PORT_ALIASES = [
  { match: /\b(galveston)\b/i, command: "cruise", value: "Galveston", label: "Galveston cruise" },
  { match: /\b(miami)\b/i, command: "cruise", value: "Miami", label: "Miami cruise" },
];

function planScrape(userMessage) {
  const wantsLiveScrape = /\b(scrape|search|find|deal|price|cheap|flight|hotel|cruise|package|live|book)\b/i.test(userMessage);
  if (!wantsLiveScrape) return null;

  const wantsCruise = /\b(cruise|sailing|port)\b/i.test(userMessage);
  if (wantsCruise) {
    const port = CRUISE_PORT_ALIASES.find((item) => item.match.test(userMessage));
    if (port) return { kind: "cruise", label: port.label, args: [port.command, port.value] };
  }

  const city = CITY_ALIASES.find((item) => item.match.test(userMessage));
  if (city) return { kind: "city", label: city.label, args: [city.command, city.value] };

  if (/\b(deal|cheap|search|scrape|flight|hotel|cruise|package)\b/i.test(userMessage)) {
    return {
      kind: "deal-discovery",
      label: "general travel deal discovery",
      args: ["deals", `--query=${sanitizeDealQuery(userMessage)}`],
    };
  }

  return null;
}

function sanitizeDealQuery(value) {
  return value
    .replace(/[^\w\s$.,:/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140) || "cheap travel deals";
}

async function runScraper(plan) {
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
      stderr: scrapeResult.stderrTail,
      results: compactResults,
    }),
  ].join("\n");
}

function compactScrapeJson(value) {
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
  return typeof value === "string" ? value.trim() : undefined;
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
