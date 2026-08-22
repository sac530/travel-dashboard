import "server-only";

import type { TravelAgentResponse, TravelChatMessage, TravelResultCard } from "@/lib/travel-chat-types";

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

export function isTravelRequest(input: string) {
  const normalized = input.toLowerCase();
  const blocked = BLOCKED_TERMS.some((term) => normalized.includes(term));
  const travelRelated = TRAVEL_TERMS.some((term) => normalized.includes(term)) || hasRouteRequest(input);
  return travelRelated && !blocked;
}

function hasRouteRequest(input: string) {
  return /\b[A-Z]{3}\s*(?:to|->|→|-)\s*(?:[A-Z]{3}|[a-z][a-z .'-]{1,60})\b/i.test(input);
}

export async function runTravelAgent({
  userEmail,
  userMessage,
  history,
}: {
  userEmail: string;
  userMessage: string;
  history: TravelChatMessage[];
}): Promise<TravelAgentResponse> {
  if (!isTravelRequest(userMessage)) {
    return {
      answer:
        "I can help with travel planning only: flights, hotels, destinations, restaurants, attractions, weather, itineraries, packages, and trip research. Send me a travel request and I will dig in.",
      cards: [],
      source: "offline",
    };
  }

  const bridgeUrl = cleanEnv(process.env.OPENCLAW_TRAVEL_AGENT_URL);
  if (bridgeUrl) {
    const fromBridge = await callOpenClawBridge({ bridgeUrl, userEmail, userMessage, history }).catch(() => null);
    if (fromBridge) return fromBridge;
  }

  const fromLocal = await callLocalMainModel({ userMessage, history }).catch(() => null);
  if (fromLocal) return fromLocal;

  return buildOfflineTravelResponse(userMessage);
}

async function callOpenClawBridge({
  bridgeUrl,
  userEmail,
  userMessage,
  history,
}: {
  bridgeUrl: string;
  userEmail: string;
  userMessage: string;
  history: TravelChatMessage[];
}): Promise<TravelAgentResponse> {
  const response = await fetch(bridgeUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(process.env.OPENCLAW_TRAVEL_AGENT_TOKEN
        ? { authorization: `Bearer ${process.env.OPENCLAW_TRAVEL_AGENT_TOKEN}` }
        : {}),
    },
    body: JSON.stringify({
      userEmail,
      userMessage,
      history: history.slice(-12).map((message) => ({
        role: message.role,
        content: message.content,
        structured: message.structured,
      })),
      restrictions: {
        domain: "travel-only",
        forbidden:
          "No shell/admin/system/config actions, credential exposure, non-travel OpenClaw tasks, or machine changes.",
      },
    }),
  });

  if (!response.ok) throw new Error("OpenClaw bridge failed");
  return normalizeAgentResponse(await response.json(), "openclaw");
}

async function callLocalMainModel({
  userMessage,
  history,
}: {
  userMessage: string;
  history: TravelChatMessage[];
}): Promise<TravelAgentResponse> {
  const baseUrl = cleanEnv(process.env.OPENAI_BASE_URL || process.env.LOCAL_MAIN_MODEL_BASE_URL || "http://127.0.0.1:18080/v1");
  const model = cleanEnv(process.env.OPENAI_MODEL || process.env.LOCAL_MAIN_MODEL || "local-main");
  const apiKey = cleanEnv(process.env.OPENAI_API_KEY || process.env.LOCAL_MAIN_MODEL_API_KEY || "not-needed");

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.35,
      max_tokens: 1800,
      messages: [
        {
          role: "system",
          content: [
            "You are TravelDash AI, a private travel planning agent inside a logged-in website.",
            "You may only answer travel tasks: hotels, flights, destinations, restaurants, attractions, weather, itineraries, trip research, comparisons, recommendations, and travel package updates.",
            "Refuse unrelated shell/admin/system/config tasks and never reveal credentials.",
            "Return strict JSON only with shape: {\"answer\":\"...\",\"cards\":[{\"type\":\"hotel|flight|deal|restaurant|attraction|weather|itinerary\",\"title\":\"...\",\"subtitle\":\"...\",\"imageUrl\":\"\",\"price\":\"\",\"rating\":\"\",\"details\":\"...\",\"provider\":\"...\",\"url\":\"https://...\",\"actionLabel\":\"View Deal\"}]}",
            "Use cards when you mention specific hotels, flights, restaurants, attractions, weather, itineraries, or deals. If live prices are not confirmed, say they need verification.",
          ].join(" "),
        },
        ...history.slice(-10).map((message) => ({
          role: message.role === "assistant" ? "assistant" : "user",
          content: message.content,
        })),
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!response.ok) throw new Error("Local model failed");
  const json = await response.json();
  const content = json?.choices?.[0]?.message?.content;
  return normalizeAgentResponse(parseJsonish(content), "local-main");
}

function normalizeAgentResponse(value: unknown, source: TravelAgentResponse["source"]): TravelAgentResponse {
  const record = typeof value === "object" && value ? (value as Record<string, unknown>) : {};
  const answer = typeof record.answer === "string" && record.answer.trim()
    ? record.answer.trim()
    : "I found a travel-planning angle for that, but the response came back without a clean summary.";
  const cards = Array.isArray(record.cards) ? record.cards.map(normalizeCard).filter(Boolean) as TravelResultCard[] : [];
  return { answer, cards: cards.slice(0, 8), source };
}

function normalizeCard(card: unknown): TravelResultCard | null {
  if (!card || typeof card !== "object") return null;
  const item = card as Record<string, unknown>;
  const title = textValue(item.title);
  if (!title) return null;
  const type = textValue(item.type);
  return {
    type: isCardType(type) ? type : "deal",
    title,
    subtitle: textValue(item.subtitle),
    imageUrl: textValue(item.imageUrl),
    price: textValue(item.price),
    rating: textValue(item.rating),
    details: textValue(item.details),
    provider: textValue(item.provider),
    url: textValue(item.url),
    actionLabel: textValue(item.actionLabel) || "View Deal",
  };
}

function parseJsonish(content: unknown) {
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

function buildOfflineTravelResponse(userMessage: string): TravelAgentResponse {
  return {
    answer:
      "I can help with that travel request, but the live OpenClaw travel bridge is not configured for this deployment yet. I can still keep the conversation organized here; once the bridge URL is set, I can run travel searches and return live deal cards.",
    cards: [
      {
        type: "itinerary",
        title: "Travel agent bridge needed",
        subtitle: "OpenClaw connection",
        details: `Request saved for follow-up: ${userMessage.slice(0, 180)}`,
        provider: "TravelDash",
      },
    ],
    source: "offline",
  };
}

function cleanEnv(value?: string) {
  return (value || "").trim().replace(/^\uFEFF/, "").replace(/^['"]|['"]$/g, "");
}

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : undefined;
}

function isCardType(value: string | undefined): value is TravelResultCard["type"] {
  return Boolean(value && ["hotel", "flight", "deal", "restaurant", "attraction", "weather", "itinerary"].includes(value));
}
