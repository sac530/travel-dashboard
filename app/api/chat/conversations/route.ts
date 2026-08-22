import { NextResponse } from "next/server";
import { requireSignedInUserEmail } from "@/lib/server-auth";
import { createServerSupabase } from "@/lib/server-supabase";

export async function GET() {
  try {
    const ownerEmail = await requireSignedInUserEmail();
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("travel_chat_conversations")
      .select("*")
      .eq("owner_email", ownerEmail)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ conversations: data || [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load conversations" },
      { status: 401 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const ownerEmail = await requireSignedInUserEmail();
    const body = (await request.json().catch(() => null)) as { title?: string } | null;
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("travel_chat_conversations")
      .insert({
        owner_email: ownerEmail,
        title: (body?.title || "New travel chat").trim().slice(0, 80),
      })
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ conversation: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create conversation" },
      { status: 401 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const ownerEmail = await requireSignedInUserEmail();
    const searchParams = new URL(request.url).searchParams;
    const conversationId = searchParams.get("conversationId");
    const deleteAll = searchParams.get("all") === "true";

    if (!conversationId && !deleteAll) {
      return NextResponse.json({ error: "conversationId or all=true is required" }, { status: 400 });
    }

    const supabase = createServerSupabase();
    let query = supabase
      .from("travel_chat_conversations")
      .delete()
      .eq("owner_email", ownerEmail);

    if (!deleteAll && conversationId) {
      query = query.eq("id", conversationId);
    }

    const { error } = await query;

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not delete conversations" },
      { status: 401 },
    );
  }
}
