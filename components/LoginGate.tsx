"use client";

import { FormEvent, useEffect, useState } from "react";
import { LockKeyhole, Plane, ShieldCheck, Sparkles } from "lucide-react";
import DestinationMarquee from "@/components/DestinationMarquee";
import { supabase } from "@/lib/supabase";

export default function LoginGate() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");

    if (hash.get("type") === "recovery" && accessToken && refreshToken) {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error }) => {
        if (error) {
          setError("That reset link has expired.");
          return;
        }
        window.history.replaceState(null, "", window.location.pathname);
        setRecoveryMode(true);
      });
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    if (recoveryMode) {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      setLoading(false);

      if (error) {
        setError("That password could not be updated.");
        return;
      }

      await supabase.auth.signOut();
      setRecoveryMode(false);
      setPassword("");
      setNewPassword("");
      setMessage("Password updated. Sign in with the new password.");
      return;
    }

    if (resetMode) {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });

      setLoading(false);
      if (!response.ok) {
        setError("That reset email could not be sent.");
        return;
      }

      setMessage("If that email is registered, a reset link is on the way.");
      return;
    }

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    setLoading(false);
    if (!response.ok) {
      setError("That login did not work.");
      return;
    }

    window.location.reload();
  }

  return (
    <main className="travel-shell relative min-h-screen overflow-hidden bg-[#07111f] text-white">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-80"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=2400&q=85')",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[#07111f]/95 via-[#0f2436]/82 to-[#1d1724]/86" />
      <div className="absolute inset-x-0 bottom-0 z-0 hidden pb-7 opacity-85 md:block">
        <DestinationMarquee compact />
      </div>

      <section className="relative z-10 mx-auto flex min-h-screen max-w-6xl items-start px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="grid w-full min-w-0 gap-8 lg:grid-cols-[420px_minmax(0,1fr)] lg:items-start">
          <form onSubmit={handleSubmit} className="glass-card min-w-0 bg-black/28 p-6 shadow-2xl shadow-black/35 sm:p-7">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-500/15 text-sky-200">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">
                  {recoveryMode ? "New password" : resetMode ? "Reset password" : "Sign in"}
                </h2>
                <p className="text-sm text-slate-400">TravelDash account access</p>
              </div>
            </div>

            {!recoveryMode && (
              <>
                <label className="mb-2 block text-sm font-medium text-slate-300">Email</label>
                <input
                  autoComplete="username"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mb-4 w-full rounded-lg border border-white/10 bg-white/8 px-4 py-3 text-white outline-none transition focus:border-sky-300"
                  placeholder="Email address"
                  required
                />
              </>
            )}

            {!resetMode && !recoveryMode && (
              <>
                <label className="mb-2 block text-sm font-medium text-slate-300">Password</label>
                <input
                  autoComplete="current-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/8 px-4 py-3 text-white outline-none transition focus:border-sky-300"
                  required
                />
              </>
            )}

            {recoveryMode && (
              <>
                <label className="mb-2 block text-sm font-medium text-slate-300">New Password</label>
                <input
                  autoComplete="new-password"
                  minLength={8}
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/8 px-4 py-3 text-white outline-none transition focus:border-sky-300"
                  required
                />
              </>
            )}

            {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}
            {message && <p className="mt-4 text-sm text-emerald-300">{message}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-sky-500 px-5 py-3 font-semibold text-white transition hover:bg-sky-400 disabled:cursor-wait disabled:opacity-70"
            >
              <Plane className="h-4 w-4" />
              {loading
                ? "Checking..."
                : recoveryMode
                  ? "Save Password"
                  : resetMode
                    ? "Send Reset Link"
                    : "Open Dashboard"}
            </button>

            {!recoveryMode && (
              <button
                type="button"
                onClick={() => {
                  setResetMode(!resetMode);
                  setError("");
                  setMessage("");
                }}
                className="mt-4 w-full text-sm font-medium text-sky-200 transition hover:text-white"
              >
                {resetMode ? "Back to sign in" : "Reset password"}
              </button>
            )}
          </form>

          <div className="min-w-0 pb-28 sm:pb-36 lg:pb-24">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/25 px-4 py-2 text-sm text-sky-100 backdrop-blur">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              Private travel deal console
            </div>
            <h1 className="max-w-3xl text-5xl font-bold leading-[1.02] sm:text-7xl">
              TravelDash
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-200">
              Track trip ideas, compare package prices, and turn screenshots or URLs into
              polished getaways across the US and abroad.
            </p>
            <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
              {["Flights", "Hotels", "Cars"].map((label) => (
                <div key={label} className="rounded-lg border border-white/10 bg-black/24 px-4 py-3 backdrop-blur">
                  <Sparkles className="mb-2 h-4 w-4 text-orange-200" />
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <p className="mt-1 text-xs text-slate-300">Watched for fresh deal movement</p>
                </div>
              ))}
            </div>
          </div>

          <div className="min-w-0 overflow-hidden md:hidden">
            <DestinationMarquee compact />
          </div>
        </div>
      </section>
    </main>
  );
}
