import "server-only";

import { cookies } from "next/headers";
import { AUTH_COOKIE, readSessionToken } from "@/lib/auth";

export async function getSignedInUserEmail() {
  const cookieStore = await cookies();
  return readSessionToken(cookieStore.get(AUTH_COOKIE)?.value)?.sub.toLowerCase() || null;
}

export async function requireSignedInUserEmail() {
  const email = await getSignedInUserEmail();
  if (!email) throw new Error("Unauthorized");
  return email;
}
