import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  const email = (body?.email || "").trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ ok: false, error: "Email is required" }, { status: 400 });
  }

  const supabase = createClient(
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL),
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    { auth: { persistSession: false } },
  );
  const origin = new URL(request.url).origin;

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/`,
  });

  return NextResponse.json({ ok: true });
}

function cleanEnv(value?: string) {
  return (value || "").trim().replace(/^\uFEFF/, "").replace(/^['"]|['"]$/g, "");
}
