import { cookies } from "next/headers";
import Dashboard from "@/components/Dashboard";
import LoginGate from "@/components/LoginGate";
import { AUTH_COOKIE, verifySessionToken } from "@/lib/auth";

export default async function Home() {
  const cookieStore = await cookies();
  const signedIn = verifySessionToken(cookieStore.get(AUTH_COOKIE)?.value);
  return signedIn ? <Dashboard /> : <LoginGate />;
}
