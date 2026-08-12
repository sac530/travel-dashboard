import http from "node:http";

const PORT = Number(process.env.PORT || process.env.TRAVEL_AGENT_BRIDGE_PORT || 8787);
const HOST = process.env.TRAVEL_AGENT_BRIDGE_HOST || "127.0.0.1";
const TOKEN = (process.env.OPENCLAW_TRAVEL_AGENT_TOKEN || "").trim();
const MODEL_BASE_URL = (process.env.LOCAL_MAIN_MODEL_BASE_URL || "http://127.0.0.1:18080/v1").replace(/\/$/, "");
const MODEL = process.env.LOCAL_MAIN_MODEL || "local-main";
const MODEL_API_KEY = process.env.LOCAL_MAIN_MODEL_API_KEY || "llama-local";

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

    const agentResponse = await callLocalModel({ userMessage, history });
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

async function callLocalModel({ userMessage, history }) {
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
            "Return strict JSON only with shape: {\"answer\":\"...\",\"cards\":[{\"type\":\"hotel|flight|deal|restaurant|attraction|weather|itinerary\",\"title\":\"...\",\"subtitle\":\"...\",\"imageUrl\":\"\",\"price\":\"\",\"rating\":\"\",\"details\":\"...\",\"provider\":\"...\",\"url\":\"https://...\",\"actionLabel\":\"View Deal\"}]}",
            "Use cards for concrete options. If live prices are not verified, say they need verification.",
          ].join(" "),
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
