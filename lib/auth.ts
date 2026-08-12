import "server-only";

import crypto from "crypto";

export const AUTH_COOKIE = "travel_dash_session";

const SESSION_SECRET =
  process.env.TRAVEL_DASHBOARD_SESSION_SECRET ||
  "local-travel-dashboard-change-me-on-vercel";

function sign(payload: string) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
}

export function createSessionToken(subject: string) {
  const payload = JSON.stringify({
    sub: subject,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 14,
  });
  const encoded = Buffer.from(payload).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifySessionToken(token?: string) {
  if (!token) return false;

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature || sign(encoded) !== signature) return false;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as {
      exp?: number;
      sub?: string;
    };
    return Boolean(payload.sub) && typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}
