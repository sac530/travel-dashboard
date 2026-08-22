"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import PackageGrid from "@/components/PackageGrid";
import IntakeSection from "@/components/IntakeSection";
import UploadSection from "@/components/UploadSection";
import StatsBar from "@/components/StatsBar";
import TravelChat from "@/components/TravelChat";
import MasterCalendar from "@/components/MasterCalendar";

export type ActiveTab = "packages" | "calendar" | "intake" | "upload" | "chat";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("packages");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 450);
    return () => window.clearTimeout(timer);
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.reload();
  }

  return (
    <div className="travel-shell min-h-screen bg-[#07111f]">
      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-70"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=2400&q=80')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#06111f]/95 via-[#0b1c2d]/91 to-[#211420]/94" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:72px_72px]" />
      </div>

      <div className="relative z-10">
        <Navbar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={logout} />

        {activeTab === "packages" && (
          <>
            <Hero onOpenIntake={() => setActiveTab("intake")} />
            <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
              {!loading && <StatsBar />}
              <PackageGrid loading={loading} onOpenIntake={() => setActiveTab("intake")} />
            </main>
          </>
        )}

        {activeTab === "intake" && (
          <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
            <IntakeSection />
          </main>
        )}

        {activeTab === "calendar" && (
          <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <MasterCalendar />
          </main>
        )}

        {activeTab === "upload" && (
          <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
            <UploadSection />
          </main>
        )}

        {activeTab === "chat" && (
          <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <TravelChat />
          </main>
        )}

        <footer className="relative z-10 mt-20 border-t border-white/8 bg-black/18 py-8 text-center text-sm text-slate-400 backdrop-blur">
          TravelDash 2026 - monitored travel packages, fresh deal checks, and 7-day price freshness windows
        </footer>
      </div>
    </div>
  );
}
