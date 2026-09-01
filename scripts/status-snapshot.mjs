import fs from "fs";
const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const g = (k) => {
  const m = env.match(new RegExp("^" + k + "=(.*)$", "m"));
  return m ? m[1].trim().replace(/^['"]|['"]$/g, "") : null;
};
const base = (g("NEXT_PUBLIC_SUPABASE_URL") || g("SUPABASE_URL")).replace(/\/+$/, "");
const key = g("NEXT_PUBLIC_SUPABASE_ANON_KEY") || g("SUPABASE_ANON_KEY");
const H = { apikey: key, Authorization: "Bearer " + key };
const j = async (t, q) => {
  const r = await fetch(`${base}/rest/v1/${t}?${q}`, { headers: H });
  const b = await r.json();
  if (!Array.isArray(b)) console.log(t, "ERROR", r.status, JSON.stringify(b));
  return Array.isArray(b) ? b : [];
};

const intake = await j("intake_submissions", "select=id,status,destination,origin,notes,created_at&order=created_at.desc&limit=20");
console.log("INTAKE:", JSON.stringify(intake.map((x) => ({ id: String(x.id).slice(0, 8), status: x.status, destination: x.destination, origin: x.origin, created: String(x.created_at).slice(0, 10) }))));

const uploads = await j("manual_uploads", "select=id,parsed,created_at&order=created_at.desc&limit=10");
console.log("UPLOADS:", JSON.stringify(uploads.map((x) => ({ id: String(x.id).slice(0, 8), parsed: x.parsed, created: String(x.created_at).slice(0, 10) }))));

const pkgs = await j("packages", "select=id,title,status,destination,expires_at&order=expires_at.desc&limit=20");
console.log("PACKAGES:", JSON.stringify(pkgs.map((x) => ({ id: String(x.id).slice(0, 8), title: x.title, status: x.status, destination: x.destination, expires: x.expires_at ? String(x.expires_at).slice(0, 10) : null }))));
