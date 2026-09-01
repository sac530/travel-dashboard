import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { appendFileSync } from "node:fs";

const LOG = new URL("./probe-db.log", import.meta.url);
function log(...args) {
  appendFileSync(LOG, args.join(" ") + "\n");
}

const t = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const g = (n) => {
  const m = t.match(new RegExp(n + '="?([^"\n]*)"?'));
  return m ? m[1].trim() : null;
};
const url = g("NEXT_PUBLIC_SUPABASE_URL");
const key = g("NEXT_PUBLIC_SUPABASE_ANON_KEY");
log("url?", !!url, "key?", !!key);

const c = createClient(url, key);
const tables = ["packages", "deals", "extras"];
for (const tbl of tables) {
  const { data, error } = await c.from(tbl).select("*").limit(1).order("id", { ascending: false });
  if (error) log(tbl, "ERR", error.message);
  else log(tbl, "COLS", (data[0] ? Object.keys(data[0]).join(",") : "(empty)"));
}
log("DONE");
