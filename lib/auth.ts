import "server-only";

import crypto from "crypto";

export const AUTH_COOKIE = "travel_dash_session";

const SESSION_SECRET =
  process.env.TRAVEL_DASHBOARD_SESSION_SECRET ||
  "local-travel-dashboard-change-me-on-vercel";

function sign(payload: string) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
}

export type SessionPayload = {
  sub: string;
  exp: number;
};

export function createSessionToken(subject: string) {
  const payload = JSON.stringify({
    sub: subject,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 14,
  });
  const encoded = Buffer.from(payload).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function readSessionToken(token?: string): SessionPayload | null {
  if (!token) return null;

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature || sign(encoded) !== signature) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Partial<SessionPayload>;
    if (!payload.sub || typeof payload.exp !== "number" || payload.exp <= Date.now()) return null;
    return { sub: payload.sub, exp: payload.exp };
  } catch {
    return null;
  }
}

export function verifySessionToken(token?: string) {
  return Boolean(readSessionToken(token));
}
