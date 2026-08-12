"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  Bot,
  CalendarDays,
  ExternalLink,
  Hotel,
  Loader2,
  MessageCircle,
  Plane,
  Plus,
  Send,
  Sparkles,
  Star,
  Utensils,
} from "lucide-react";
import type { TravelChatConversation, TravelChatMessage, TravelResultCard } from "@/lib/travel-chat-types";

type DraftAssistant = {
  content: string;
  cards: TravelResultCard[];
};

export default function TravelChat() {
  const [conversations, setConversations] = useState<TravelChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TravelChatMessage[]>([]);
  const [draftAssistant, setDraftAssistant] = useState<DraftAssistant | null>(null);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId);

  async function loadConversations() {
    const response = await fetch("/api/chat/conversations");
    if (!response.ok) throw new Error("Could not load chats");
    const json = await response.json();
    const next = (json.conversations || []) as TravelChatConversation[];
    setConversations(next);
    return next;
  }

  async function loadMessages(conversationId: string) {
    const response = await fetch(`/api/chat/messages?conversationId=${encodeURIComponent(conversationId)}`);
    if (!response.ok) throw new Error("Could not load messages");
    const json = await response.json();
    setMessages((json.messages || []) as TravelChatMessage[]);
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      const next = await loadConversations();
      if (alive && !activeConversationId && next[0]) setActiveConversationId(next[0].id);
    })()
      .catch(() => {
        if (alive) setConversations([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
    // Initial load only; selection changes are handled by the message-loading effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeConversationId) return;
    const timer = window.setTimeout(() => {
      void loadMessages(activeConversationId);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeConversationId]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, draftAssistant?.content, draftAssistant?.cards.length]);

  async function startNewChat() {
    const response = await fetch("/api/chat/conversations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "New travel chat" }),
    });
    if (!response.ok) return;
    const json = await response.json();
    const conversation = json.conversation as TravelChatConversation;
    setConversations((current) => [conversation, ...current]);
    setActiveConversationId(conversation.id);
    setMessages([]);
    setDraftAssistant(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();
    if (!message || sending) return;

    setInput("");
    setSending(true);
    setStatus("Connecting to TravelDash AI");
    setDraftAssistant({ content: "", cards: [] });

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversationId: activeConversationId, message }),
      });

      if (!response.ok || !response.body) throw new Error("Chat stream failed");
      await readEventStream(response.body);
      await loadConversations();
    } catch (error) {
      setDraftAssistant({
        content: error instanceof Error ? error.message : "Chat failed.",
        cards: [],
      });
    } finally {
      setSending(false);
      setStatus("");
    }
  }

  async function readEventStream(body: ReadableStream<Uint8Array>) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";
      for (const part of parts) {
        handleSseEvent(part);
      }
    }
  }

  function handleSseEvent(raw: string) {
    const event = raw.match(/^event: (.+)$/m)?.[1];
    const dataLine = raw.match(/^data: (.+)$/m)?.[1];
    if (!event || !dataLine) return;
    const data = JSON.parse(dataLine);

    if (event === "conversation") {
      const conversation = data as TravelChatConversation;
      setActiveConversationId(conversation.id);
      setConversations((current) =>
        current.some((item) => item.id === conversation.id) ? current : [conversation, ...current],
      );
    }

    if (event === "message") {
      setMessages((current) => [...current, data as TravelChatMessage]);
    }

    if (event === "status") {
      setStatus(data.label || "");
    }

    if (event === "delta") {
      setDraftAssistant((current) => ({
        content: `${current?.content || ""}${data.content || ""}`,
        cards: current?.cards || [],
      }));
    }

    if (event === "cards") {
      setDraftAssistant((current) => ({
        content: current?.content || "",
        cards: data.cards || [],
      }));
    }

    if (event === "done") {
      setMessages((current) => [...current, data.message as TravelChatMessage]);
      setDraftAssistant(null);
    }

    if (event === "error") {
      setDraftAssistant({ content: data.error || "Chat stream failed.", cards: [] });
    }
  }

  return (
    <section className="grid min-h-[calc(100vh-12rem)] gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="glass-card flex min-h-0 flex-col p-3">
        <div className="mb-3 flex items-center justify-between gap-2 px-1">
          <div>
            <p className="text-xs uppercase text-slate-500">Private</p>
            <h2 className="font-semibold text-white">Travel chats</h2>
          </div>
          <button
            type="button"
            onClick={startNewChat}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500 text-white transition hover:bg-sky-400"
            title="New chat"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {loading && <p className="px-2 py-3 text-sm text-slate-500">Loading chats...</p>}
          {!loading && !conversations.length && (
            <button
              type="button"
              onClick={startNewChat}
              className="w-full rounded-lg border border-dashed border-white/12 p-4 text-left text-sm text-slate-400 transition hover:border-sky-300/30 hover:text-sky-200"
            >
              Start your first trip chat
            </button>
          )}
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              onClick={() => setActiveConversationId(conversation.id)}
              className={`w-full rounded-lg px-3 py-3 text-left transition ${
                activeConversationId === conversation.id
                  ? "bg-sky-500/18 text-sky-100"
                  : "text-slate-400 hover:bg-white/7 hover:text-white"
              }`}
            >
              <span className="line-clamp-2 text-sm font-medium">{conversation.title}</span>
              <span className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                <CalendarDays className="h-3 w-3" />
                {new Date(conversation.updated_at).toLocaleDateString()}
              </span>
            </button>
          ))}
        </div>
      </aside>

      <div className="glass-card flex min-h-0 flex-col overflow-hidden">
        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="mb-1 flex items-center gap-2 text-sm font-medium text-sky-300">
                <Bot className="h-4 w-4" />
                TravelDash AI
              </div>
              <h1 className="text-2xl font-bold text-white">{activeConversation?.title || "Ask about a trip"}</h1>
            </div>
            <div className="rounded-lg border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">
              Travel-only tools
            </div>
          </div>
        </div>

        <div ref={transcriptRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
          {!messages.length && !draftAssistant && (
            <div className="mx-auto max-w-3xl py-14 text-center">
              <MessageCircle className="mx-auto mb-4 h-10 w-10 text-sky-300" />
              <h2 className="text-2xl font-bold text-white">Plan, compare, and refine travel ideas</h2>
              <p className="mx-auto mt-3 max-w-xl text-slate-400">
                Ask for flights, hotels, restaurants, attractions, weather, itineraries, or package comparisons.
              </p>
              <div className="mt-6 grid gap-3 text-left sm:grid-cols-3">
                {["Find hotels downtown", "Compare beach trips", "Build a 3-day itinerary"].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setInput(prompt)}
                    className="rounded-lg border border-white/10 bg-white/6 p-4 text-sm text-slate-300 transition hover:border-sky-300/30 hover:text-sky-200"
                  >
                    <Sparkles className="mb-2 h-4 w-4 text-orange-200" />
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <ChatBubble key={message.id} message={message} />
          ))}

          {draftAssistant && (
            <div className="flex justify-start">
              <div className="max-w-3xl rounded-lg border border-white/10 bg-white/6 p-4 text-slate-200">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-sky-300">
                  {sending && !draftAssistant.content ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                  {status || "TravelDash AI"}
                </div>
                {draftAssistant.content && <p className="whitespace-pre-wrap leading-7">{draftAssistant.content}</p>}
                <ResultCards cards={draftAssistant.cards} />
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="border-t border-white/10 p-4">
          <div className="flex gap-3">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask for flights, hotels, restaurants, weather, itineraries..."
              className="field-input h-12"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-sky-500 text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
              title="Send"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function ChatBubble({ message }: { message: TravelChatMessage }) {
  const user = message.role === "user";
  return (
    <div className={`flex ${user ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-3xl rounded-lg p-4 ${
          user
            ? "bg-sky-500 text-white"
            : "border border-white/10 bg-white/6 text-slate-200"
        }`}
      >
        <p className="whitespace-pre-wrap leading-7">{message.content}</p>
        {!user && <ResultCards cards={message.structured?.cards || []} />}
      </div>
    </div>
  );
}

function ResultCards({ cards }: { cards: TravelResultCard[] }) {
  if (!cards.length) return null;
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {cards.map((card, index) => (
        <article key={`${card.title}-${index}`} className="overflow-hidden rounded-lg border border-white/10 bg-black/20">
          {card.imageUrl && (
            <img src={card.imageUrl} alt="" className="h-36 w-full object-cover" />
          )}
          <div className="p-4">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase text-sky-300">
              <CardIcon type={card.type} />
              {card.type}
            </div>
            <h3 className="font-semibold text-white">{card.title}</h3>
            {card.subtitle && <p className="mt-1 text-sm text-slate-400">{card.subtitle}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              {card.price && <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 font-semibold text-emerald-200">{card.price}</span>}
              {card.rating && (
                <span className="flex items-center gap-1 rounded-full bg-amber-400/10 px-2.5 py-1 text-amber-200">
                  <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                  {card.rating}
                </span>
              )}
              {card.provider && <span className="rounded-full bg-white/8 px-2.5 py-1 text-slate-300">{card.provider}</span>}
            </div>
            {card.details && <p className="mt-3 text-sm leading-6 text-slate-400">{card.details}</p>}
            {card.url && (
              <a
                href={card.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-400"
              >
                {card.actionLabel || "View Deal"}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

function CardIcon({ type }: { type: TravelResultCard["type"] }) {
  if (type === "flight") return <Plane className="h-3.5 w-3.5" />;
  if (type === "hotel") return <Hotel className="h-3.5 w-3.5" />;
  if (type === "restaurant") return <Utensils className="h-3.5 w-3.5" />;
  return <Sparkles className="h-3.5 w-3.5" />;
}
