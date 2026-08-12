import "server-only";

import { createClient } from "@supabase/supabase-js";

function cleanEnv(value?: string) {
  return (value || "").trim().replace(/^\uFEFF/, "").replace(/^['"]|['"]$/g, "");
}

export function createServerSupabase() {
  return createClient(
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL),
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    { auth: { persistSession: false } },
  );
}
