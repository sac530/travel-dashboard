import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { AUTH_COOKIE, createSessionToken } from "@/lib/auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    loginId?: string;
    email?: string;
    password?: string;
  } | null;

  const email = (body?.email || body?.loginId || "").trim().toLowerCase();
  const password = body?.password || "";

  if (!email || !password) {
    return NextResponse.json({ ok: false, error: "Invalid login" }, { status: 401 });
  }

  const supabaseUrl = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnonKey = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user?.email || data.user.app_metadata?.travel_dash_access !== true) {
    console.warn("TravelDash login failed", {
      supabaseHost: getHost(supabaseUrl),
      hasAnonKey: Boolean(supabaseAnonKey),
      code: error?.code,
      status: error?.status,
      name: error?.name,
      approved: data.user?.app_metadata?.travel_dash_access === true,
    });
    return NextResponse.json({ ok: false, error: "Invalid login" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, createSessionToken(data.user.email), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  return response;
}

function cleanEnv(value?: string) {
  return (value || "").trim().replace(/^\uFEFF/, "").replace(/^['"]|['"]$/g, "");
}

function getHost(value: string) {
  try {
    return value ? new URL(value).host : "missing";
  } catch {
    return "invalid";
  }
}
