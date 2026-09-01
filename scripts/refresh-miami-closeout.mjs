import { createClient } from "@supabase/supabase-js";
import { readFileSync, appendFileSync } from "node:fs";

const LOG = new URL("./refresh-miami-closeout.log", import.meta.url);
const out = (k, v) => appendFileSync(LOG, `${k}=${v}\n`);

const t = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const g = (n) => {
  const m = t.match(new RegExp(n + '="?([^"\n]*)"?'));
  return m ? m[1].trim() : null;
};
const c = createClient(g("NEXT_PUBLIC_SUPABASE_URL"), g("NEXT_PUBLIC_SUPABASE_ANON_KEY"));

const { data: pendingIntake } = await c
  .from("intake_submissions")
  .select("id, destination, status, notes")
  .in("status", ["pending", "processing"])
  .ilike("destination", "%miami%");
out("MIAMI_PENDING_INTAKE", JSON.stringify(pendingIntake));
if (pendingIntake && pendingIntake.length) {
  const ids = pendingIntake.map((r) => r.id);
  const { error: updErr } = await c
    .from("intake_submissions")
    .update({
      status: "completed",
      notes:
        (pendingIntake[0]?.notes || "") +
        " | processed by auto-refresh 2026-08-31: Miami package created from google_trip_miami_2026-09-14_20260831_234613.json",
    })
    .in("id", ids);
  out("INTAKE_UPDATE", updErr ? "FAILED " + updErr.message : `completed ${ids.length}: ${ids.join(",")}`);
}

const { data: miaPkgs } = await c
  .from("packages")
  .select("id, status, title")
  .neq("id", "c16a474d-2165-41c2-8415-35585d2a4911")
  .ilike("destination", "%miami%");
out("OTHER_MIAAMI_PACKAGES", JSON.stringify(miaPkgs));
if (miaPkgs) {
  for (const p of miaPkgs) {
    if (p.status === "expired" || p.status === "active") {
      const { error: e } = await c.from("packages").update({ status: "archived" }).eq("id", p.id);
      out("ARCHIVE_OLD_PKG", `${p.id} ${e ? "FAILED " + e.message : "ok"}`);
    }
  }
}
out("DONE", "ok");
