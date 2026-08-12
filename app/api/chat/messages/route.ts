import { NextResponse } from "next/server";
import { requireSignedInUserEmail } from "@/lib/server-auth";
import { createServerSupabase } from "@/lib/server-supabase";

export async function GET(request: Request) {
  try {
    const ownerEmail = await requireSignedInUserEmail();
    const conversationId = new URL(request.url).searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
    }

    const supabase = createServerSupabase();
    const { data: conversation, error: conversationError } = await supabase
      .from("travel_chat_conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("owner_email", ownerEmail)
      .single();

    if (conversationError || !conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("travel_chat_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .eq("owner_email", ownerEmail)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ messages: data || [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load messages" },
      { status: 401 },
    );
  }
}
