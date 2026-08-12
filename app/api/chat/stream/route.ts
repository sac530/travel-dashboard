import { NextResponse } from "next/server";
import { requireSignedInUserEmail } from "@/lib/server-auth";
import { createServerSupabase } from "@/lib/server-supabase";
import { runTravelAgent } from "@/lib/travel-agent";
import type { TravelChatConversation, TravelChatMessage } from "@/lib/travel-chat-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StreamBody = {
  conversationId?: string;
  message?: string;
};

export async function POST(request: Request) {
  let ownerEmail: string;
  try {
    ownerEmail = await requireSignedInUserEmail();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as StreamBody | null;
  const userMessage = (body?.message || "").trim();

  if (!userMessage) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, payload: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`));
      };

      try {
        const supabase = createServerSupabase();
        const conversation = await getOrCreateConversation({
          supabase,
          ownerEmail,
          conversationId: body?.conversationId,
          titleHint: userMessage,
        });

        send("conversation", conversation);

        const { data: existingMessages, error: historyError } = await supabase
          .from("travel_chat_messages")
          .select("*")
          .eq("conversation_id", conversation.id)
          .eq("owner_email", ownerEmail)
          .order("created_at", { ascending: true })
          .limit(40);

        if (historyError) throw historyError;

        const { data: insertedUser, error: userInsertError } = await supabase
          .from("travel_chat_messages")
          .insert({
            conversation_id: conversation.id,
            owner_email: ownerEmail,
            role: "user",
            content: userMessage,
            structured: null,
          })
          .select("*")
          .single();

        if (userInsertError) throw userInsertError;
        send("message", insertedUser);
        send("status", { label: "Checking travel scope and route" });

        const agentResponse = await runTravelAgent({
          userEmail: ownerEmail,
          userMessage,
          history: (existingMessages || []) as TravelChatMessage[],
        });

        send("status", { label: agentResponse.source === "openclaw" ? "OpenClaw travel tools responded" : "Drafting response" });

        for (const chunk of chunkText(agentResponse.answer)) {
          send("delta", { content: chunk });
          await delay(12);
        }

        if (agentResponse.cards.length) {
          send("cards", { cards: agentResponse.cards });
        }

        const { data: assistantMessage, error: assistantInsertError } = await supabase
          .from("travel_chat_messages")
          .insert({
            conversation_id: conversation.id,
            owner_email: ownerEmail,
            role: "assistant",
            content: agentResponse.answer,
            structured: {
              cards: agentResponse.cards,
              source: agentResponse.source,
            },
          })
          .select("*")
          .single();

        if (assistantInsertError) throw assistantInsertError;

        await supabase
          .from("travel_chat_conversations")
          .update({
            title: conversation.title === "New travel chat" ? titleFromMessage(userMessage) : conversation.title,
            updated_at: new Date().toISOString(),
          })
          .eq("id", conversation.id)
          .eq("owner_email", ownerEmail);

        send("done", { message: assistantMessage });
      } catch (error) {
        send("error", { error: error instanceof Error ? error.message : "Chat stream failed" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}

async function getOrCreateConversation({
  supabase,
  ownerEmail,
  conversationId,
  titleHint,
}: {
  supabase: ReturnType<typeof createServerSupabase>;
  ownerEmail: string;
  conversationId?: string;
  titleHint: string;
}): Promise<TravelChatConversation> {
  if (conversationId) {
    const { data, error } = await supabase
      .from("travel_chat_conversations")
      .select("*")
      .eq("id", conversationId)
      .eq("owner_email", ownerEmail)
      .single();
    if (error || !data) throw new Error("Conversation not found");
    return data as TravelChatConversation;
  }

  const { data, error } = await supabase
    .from("travel_chat_conversations")
    .insert({
      owner_email: ownerEmail,
      title: titleFromMessage(titleHint),
    })
    .select("*")
    .single();

  if (error || !data) throw error || new Error("Could not create conversation");
  return data as TravelChatConversation;
}

function titleFromMessage(message: string) {
  return message.replace(/\s+/g, " ").slice(0, 58) || "New travel chat";
}

function chunkText(input: string) {
  const words = input.split(/(\s+)/);
  const chunks: string[] = [];
  let buffer = "";

  for (const word of words) {
    buffer += word;
    if (buffer.length >= 28) {
      chunks.push(buffer);
      buffer = "";
    }
  }

  if (buffer) chunks.push(buffer);
  return chunks;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
